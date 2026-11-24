import { AfterViewInit, Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import * as maplibregl from 'maplibre-gl';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import { Ruta } from '@/app/core/interfaces/ruta.interface';
import { GraderiaService } from '@/app/core/services/graderia.service';
import { RutaService } from '@/app/core/services/ruta.service';
import { LayoutService } from '@/app/layout/service/layout.service';
import {
    configurarMapLibreWorker,
    resolverEstiloMapa,
    dibujarRutaEnMapa,
    ModoEstiloMapa,
    ESTILO_RASTER_OSM,
    normalizarPunto
} from '@/app/core/helpers/maplibre.helper';

type FiltroDisponibilidad = 'todas' | 'con_libres' | 'llenas';

@Component({
    selector: 'app-public-mapa',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        TagModule,
        ProgressBarModule,
        TooltipModule
    ],
    templateUrl: './public-mapa.component.html',
    styleUrl: './public-mapa.component.scss'
})
export class PublicMapaComponent implements OnInit, AfterViewInit, OnDestroy {
    private graderiaService = inject(GraderiaService);
    private rutaService = inject(RutaService);
    layoutService = inject(LayoutService);

    @ViewChild('publicMapContainer') mapContainer!: ElementRef<HTMLDivElement>;

    // Estado reactivo
    cargando = signal<boolean>(true);
    graderias = signal<Graderia[]>([]);
    rutaActiva = signal<Ruta | null>(null);
    filtroTexto = signal<string>('');
    filtroEstado = signal<FiltroDisponibilidad>('todas');
    graderiaSeleccionada = signal<Graderia | null>(null);
    listaLateralVisible = signal<boolean>(true);
    tipoCapa = signal<ModoEstiloMapa>('vector');
    private fallbackRasterActivado = false;

    private map: maplibregl.Map | null = null;
    private markersMap: Map<number, maplibregl.Marker> = new Map();
    private resizeObserver: ResizeObserver | null = null;

    // Coordenadas centrales de Oruro (Plaza 10 de Febrero)
    readonly CENTRO_ORURO: [number, number] = [-67.1105, -17.9657];

    constructor() {
        // Sincronizar estilo al cambiar tema claro/oscuro
        effect(() => {
            const isDark = this.layoutService.isDarkTheme();
            const capa = this.tipoCapa();
            if (this.map) {
                this.map.setStyle(resolverEstiloMapa(isDark, capa));
                this.map.once('styledata', () => {
                    this.dibujarRutaOficial();
                    this.actualizarMarcadores();
                });
            }
        });

        // Actualizar pines reactivamente cuando cambia la lista filtrada
        effect(() => {
            const items = this.graderiasFiltradas();
            if (this.map) {
                this.actualizarMarcadores();
            }
        });
    }

    // Graderías filtradas para búsqueda y pines
    readonly graderiasFiltradas = computed(() => {
        const query = this.filtroTexto().toLowerCase().trim();
        const estado = this.filtroEstado();
        const lista = this.graderias();

        return lista.filter((g) => {
            const coincideTexto =
                !query ||
                (g.nombre && g.nombre.toLowerCase().includes(query)) ||
                (g.direccion && g.direccion.toLowerCase().includes(query)) ||
                (g.codigo && g.codigo.toLowerCase().includes(query));

            if (!coincideTexto) return false;

            const libres = g.libres_count ?? 0;
            if (estado === 'con_libres') return libres > 0;
            if (estado === 'llenas') return libres === 0;

            return true;
        });
    });

    // Métricas globales del mapa
    readonly estadisticas = computed(() => {
        const lista = this.graderias();
        let totalAsientos = 0;
        let totalLibres = 0;
        let totalOcupados = 0;

        for (const g of lista) {
            const cap = g.capacidad_total || (g.filas * g.columnas) || 0;
            const lib = g.libres_count ?? 0;
            const pag = g.pagados_count ?? 0;
            const res = g.reservados_count ?? 0;
            totalAsientos += cap;
            totalLibres += lib;
            totalOcupados += (pag + res);
        }

        return {
            totalGraderias: lista.length,
            totalAsientos,
            totalLibres,
            totalOcupados
        };
    });

    ngOnInit(): void {
        this.cargarDatos();
    }

    ngAfterViewInit(): void {
        this.inicializarMapa();
    }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.markersMap.forEach((m) => m.remove());
        this.markersMap.clear();
        this.map?.remove();
        this.map = null;
    }

    cargarDatos(): void {
        this.cargando.set(true);

        // Cargar ruta oficial activa pública (sin autenticación)
        this.rutaService.obtenerActivaPublica().subscribe({
            next: (res) => {
                if (res?.ruta) {
                    this.rutaActiva.set(res.ruta);
                    this.dibujarRutaOficial();
                    if (this.graderias().length > 0) {
                        this.ajustarVista();
                    }
                }
            },
            error: (err) => {
                console.warn('[PublicMapa] Error al cargar ruta oficial pública:', err);
            }
        });

        // Cargar graderías activas con coordenadas
        this.graderiaService.obtenerMapaPublico().subscribe({
            next: (res) => {
                this.graderias.set(res.graderias || []);
                this.cargando.set(false);
                this.actualizarMarcadores();
                this.ajustarVista();
            },
            error: (err) => {
                console.warn('[PublicMapa] Error al cargar graderías públicas:', err);
                this.cargando.set(false);
            }
        });
    }

    private inicializarMapa(): void {
        if (!this.mapContainer?.nativeElement) return;

        configurarMapLibreWorker();

        const isDark = this.layoutService.isDarkTheme();
        const estilo = resolverEstiloMapa(isDark, this.tipoCapa());

        this.map = new maplibregl.Map({
            container: this.mapContainer.nativeElement,
            style: estilo,
            center: this.CENTRO_ORURO,
            zoom: 15.3,
            pitch: 20,
            bearing: -10,
            attributionControl: false
        });

        // Controles de navegación y pantalla completa
        this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), 'top-right');
        this.map.addControl(new maplibregl.FullscreenControl(), 'top-right');

        // Observer para auto-ajustar canvas dinámicamente si el tamaño del contenedor cambia
        if (typeof ResizeObserver !== 'undefined' && this.mapContainer?.nativeElement) {
            this.resizeObserver = new ResizeObserver(() => {
                this.map?.resize();
            });
            this.resizeObserver.observe(this.mapContainer.nativeElement);
        }

        this.map.on('load', () => {
            this.map?.resize();
            this.dibujarRutaOficial();
            this.actualizarMarcadores();
            this.ajustarVista();
        });

        this.map.on('style.load', () => {
            this.dibujarRutaOficial();
            this.actualizarMarcadores();
        });

        // Garantizar que la ruta oficial se mantenga siempre activa tras cambios de tema o estilo
        this.map.on('styledata', () => {
            if (this.map?.isStyleLoaded()) {
                if (this.rutaActiva() && !this.map.getSource('public-ruta-source')) {
                    this.dibujarRutaOficial();
                }
            }
        });

        // Clic en el fondo del mapa: deselecciona si no se hizo clic en un marcador
        this.map.on('click', (e) => {
            const target = e.originalEvent.target as HTMLElement;
            if (
                target.closest('.public-graderia-marker') ||
                target.closest('.maplibregl-marker')
            ) {
                return;
            }
            this.deseleccionar();
        });

        // Fallback a capa estándar OpenStreetMap ante eventual problema de red
        this.map.on('error', (e) => {
            console.warn('[PublicMapa] Error en mapa:', e);
            const errStr = String(e?.error?.message || e?.error || '');
            if (
                !this.fallbackRasterActivado &&
                this.tipoCapa() === 'vector' &&
                (errStr.includes('Failed to fetch') || errStr.includes('404') || errStr.includes('NetworkError') || errStr.includes('CORS'))
            ) {
                this.fallbackRasterActivado = true;
                this.tipoCapa.set('raster');
                this.map?.setStyle(ESTILO_RASTER_OSM);
            }
        });

        // Múltiples reajustes tras montaje para garantizar lienzo nítido
        requestAnimationFrame(() => this.map?.resize());
        setTimeout(() => this.map?.resize(), 150);
        setTimeout(() => this.map?.resize(), 400);
        setTimeout(() => this.map?.resize(), 1000);
    }

    private dibujarRutaOficial(): void {
        if (!this.map) return;
        const ruta = this.rutaActiva();
        if (!ruta || !ruta.coordenadas || ruta.coordenadas.length < 2) return;

        const colorPrimario = this.layoutService.getPrimary() || '#960023';
        dibujarRutaEnMapa(this.map, ruta.coordenadas, ruta.color || colorPrimario, 'public-ruta-source');
    }

    actualizarMarcadores(): void {
        if (!this.map) return;

        // Limpiar marcadores existentes
        this.markersMap.forEach((m) => m.remove());
        this.markersMap.clear();

        const lista = this.graderiasFiltradas();
        const selId = this.graderiaSeleccionada()?.id;
        const hayAlgunaSeleccionada = selId != null;

        for (const g of lista) {
            if (g.latitud == null || g.longitud == null) continue;

            const esSeleccionada = selId === g.id;
            const el = this.crearElementoPin(g, esSeleccionada, hayAlgunaSeleccionada);
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([g.longitud, g.latitud])
                .addTo(this.map);

            this.markersMap.set(g.id, marker);
        }
    }

    private crearElementoPin(g: Graderia, esSeleccionada: boolean = false, hayAlgunaSeleccionada: boolean = false): HTMLElement {
        const el = document.createElement('div');
        el.className = 'public-graderia-marker';
        el.dataset['id'] = String(g.id);

        const cap = g.capacidad_total || (g.filas * g.columnas) || 1;
        const libres = g.libres_count ?? 0;
        const pctLibre = Math.round((libres / cap) * 100);

        let statusClass = 'pin-status-disponible';
        let textoBadge = `${libres} libres`;

        if (libres === 0) {
            statusClass = 'pin-status-agotado';
            textoBadge = 'Agotado';
        } else if (pctLibre < 30) {
            statusClass = 'pin-status-pocas';
            textoBadge = `${libres} libres`;
        }

        const wrapClasses = [
            'graderia-pin-wrap',
            statusClass,
            esSeleccionada ? 'is-selected' : '',
            hayAlgunaSeleccionada && !esSeleccionada ? 'is-dimmed' : ''
        ].filter(Boolean).join(' ');

        const icono = esSeleccionada ? 'pi-star-fill' : 'pi-ticket';

        el.innerHTML = `
            <div class="${wrapClasses}">
                <div class="graderia-pin-pill">
                    <i class="pi ${icono}" style="font-size: 10px;"></i>
                    <span class="pin-title">${g.nombre || 'Gradería'}</span>
                    <span class="pin-badge">${textoBadge}</span>
                </div>
                <div class="graderia-pin-pointer"></div>
                <div class="graderia-pin-dot"></div>
            </div>
        `;

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.seleccionarGraderia(g);
        });

        return el;
    }

    seleccionarGraderia(g: Graderia): void {
        this.graderiaSeleccionada.set(g);

        // 1. Re-renderizar marcadores con el pin seleccionado resaltado
        this.actualizarMarcadores();

        // 2. Centrar suavemente la cámara en la gradería seleccionada
        if (this.map && g.latitud != null && g.longitud != null) {
            this.map.flyTo({
                center: [g.longitud, g.latitud],
                zoom: 16.5,
                duration: 600
            });
        }

        // 3. Sincronización bidireccional: hacer scroll automático al ítem correspondiente en la lista lateral
        setTimeout(() => {
            const card = document.getElementById(`sector-card-${g.id}`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    }

    deseleccionar(): void {
        if (!this.graderiaSeleccionada()) return;
        this.graderiaSeleccionada.set(null);
        this.actualizarMarcadores();
    }

    ajustarVista(): void {
        if (!this.map) return;
        const bounds = new maplibregl.LngLatBounds();
        let hayPuntos = false;

        const ruta = this.rutaActiva();
        if (ruta?.coordenadas && ruta.coordenadas.length > 0) {
            for (const c of ruta.coordenadas) {
                const p = normalizarPunto(c);
                if (p) {
                    bounds.extend([p[1], p[0]]); // [lng, lat]
                    hayPuntos = true;
                }
            }
        }

        for (const g of this.graderias()) {
            if (g.latitud != null && g.longitud != null) {
                bounds.extend([g.longitud, g.latitud]);
                hayPuntos = true;
            }
        }

        if (hayPuntos) {
            try {
                this.map.fitBounds(bounds, { padding: 60, maxZoom: 16.5, duration: 1000 });
            } catch {
                this.centrarEnOruro();
            }
        } else {
            this.centrarEnOruro();
        }
    }

    centrarEnOruro(): void {
        if (!this.map) return;
        this.map.flyTo({
            center: this.CENTRO_ORURO,
            zoom: 15.3,
            pitch: 20,
            bearing: -10,
            duration: 1200
        });
    }

    alternarTipoCapa(): void {
        const nuevaCapa: ModoEstiloMapa = this.tipoCapa() === 'vector' ? 'raster' : 'vector';
        this.tipoCapa.set(nuevaCapa);
        if (this.map) {
            const isDark = this.layoutService.isDarkTheme();
            this.map.setStyle(resolverEstiloMapa(isDark, nuevaCapa));
        }
    }

    alternarListaLateral(): void {
        this.listaLateralVisible.update((v) => !v);
        setTimeout(() => this.map?.resize(), 200);
    }

    calcularPorcentajeOcupacion(g: Graderia): number {
        const cap = g.capacidad_total || (g.filas * g.columnas) || 1;
        const ocupados = (g.pagados_count ?? 0) + (g.reservados_count ?? 0);
        return Math.min(100, Math.round((ocupados / cap) * 100));
    }

    obtenerTelefono(g: Graderia): string | null {
        return g.user?.telefono_contacto_1 || g.user?.telefono_contacto_2 || null;
    }

    obtenerWhatsAppUrl(g: Graderia): string {
        const tel = g.user?.telefono_contacto_1 || g.user?.telefono_contacto_2 || '';
        let clean = tel.replace(/\D/g, '');
        if (clean.startsWith('0')) clean = clean.substring(1);
        if (clean.length === 8) clean = `591${clean}`;

        const mensaje = encodeURIComponent(
            `¡Hola! Vi en el mapa oficial del Carnaval la gradería "${g.nombre || 'Gradería'}". ¿Tienen butacas disponibles y cuáles son los precios?`
        );
        if (clean) {
            return `https://wa.me/${clean}?text=${mensaje}`;
        }
        return `https://api.whatsapp.com/send?text=${mensaje}`;
    }

    obtenerGoogleMapsNavUrl(g: Graderia): string {
        if (g.latitud != null && g.longitud != null) {
            return `https://www.google.com/maps/dir/?api=1&destination=${g.latitud},${g.longitud}`;
        }
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(g.nombre || 'Oruro')}`;
    }

    toggleTema(): void {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            darkTheme: !state.darkTheme
        }));
    }
}
