import {
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    ViewChild,
    computed,
    effect,
    inject,
    signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { AvatarModule } from 'primeng/avatar';
import * as maplibregl from 'maplibre-gl';
import { GraderiaStore } from '@/app/core/store/graderia.store';
import { AuthStore } from '@/app/core/store/auth.store';
import { RutaStore } from '@/app/core/store/ruta.store';
import { LayoutService } from '@/app/layout/service/layout.service';
import { NotificacionService } from '@/app/core/services/notificacion.service';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import {
    configurarMapLibreWorker,
    resolverEstiloMapa,
    ModoEstiloMapa,
    dibujarRutaEnMapa,
    removerRutaDeMapa
} from '@/app/core/helpers/maplibre.helper';
import { normalizarPunto } from '@/app/core/helpers/geo.helper';
import { GraderiaDetalleComponent } from '../graderia-detalle/graderia-detalle.component';
import { MapaCoordenadasDialogComponent } from '../mapa-coordenadas-dialog/mapa-coordenadas-dialog.component';
import { GraderiaFormComponent } from '../graderia-form/graderia-form.component';

type FiltroMapa = 'todas' | 'con_coordenadas' | 'sin_coordenadas' | 'alta_ocupacion';

@Component({
    selector: 'app-graderia-mapa-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        TagModule,
        TooltipModule,
        ProgressBarModule,
        AvatarModule,
        GraderiaDetalleComponent,
        MapaCoordenadasDialogComponent,
        GraderiaFormComponent
    ],
    templateUrl: './graderia-mapa-page.component.html'
})
export class GraderiaMapaPageComponent implements OnInit, OnDestroy {
    readonly store = inject(GraderiaStore);
    readonly authStore = inject(AuthStore);
    readonly rutaStore = inject(RutaStore);
    readonly layoutService = inject(LayoutService);
    private readonly notificacion = inject(NotificacionService);
    private readonly router = inject(Router);

    @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

    // Estado reactivo de selección y filtrado
    filtroBusqueda = signal<string>('');
    filtroTipo = signal<FiltroMapa>('todas');
    graderiaSeleccionada = signal<Graderia | null>(null);
    graderiaEnFoco = signal<Graderia | null>(null);
    vista3D = signal<boolean>(false);
    panelLateralVisible = signal<boolean>(true);
    tipoCapa = signal<ModoEstiloMapa>('vector');
    private fallbackRasterActivado = false;

    // Estado para creación de graderías desde el mapa
    modoCreacion = signal<boolean>(false);
    puntoCreacion = signal<{ latitud: number; longitud: number } | null>(null);
    modalCrearFormVisible = signal<boolean>(false);
    private marcadorCreacion: maplibregl.Marker | null = null;

    // =========================================================================
    // ESTADO DE RUTA OFICIAL Y TRAZADO (EXCLUSIVO ADMINISTRADOR)
    // =========================================================================
    modoTrazadoRuta = signal<boolean>(false);
    panelTrazadoMinimizado = signal<boolean>(false);
    puntosTrazado = signal<[number, number][]>([]); // Array de [lng, lat]
    nombreRutaTrazado = signal<string>('Ruta Oficial Carnaval de Oruro');
    descripcionRutaTrazado = signal<string>('Recorrido principal de la entrada folklórica');
    toleranciaMetrosTrazado = signal<number>(50);
    colorRutaTrazado = signal<string>('#960023');
    mostrarRutaOficial = signal<boolean>(true);

    private marcadoresTrazado: maplibregl.Marker[] = [];
    private marcadorInicioRuta: maplibregl.Marker | null = null;
    private marcadorFinRuta: maplibregl.Marker | null = null;

    // Modales secundarios
    modalDetalleVisible = signal<boolean>(false);
    modalCoordenadasVisible = signal<boolean>(false);
    graderiaParaCoordenadas = signal<Graderia | null>(null);

    // Instancia de MapLibre y marcadores
    private map: maplibregl.Map | null = null;
    private markersMap: Map<number, maplibregl.Marker> = new Map();
    private activeMarkerEl: HTMLElement | null = null;

    // Coordenadas centrales por defecto: Oruro (Plaza 10 de Febrero)
    readonly CENTRO_ORURO: [number, number] = [-67.1105, -17.9657];

    // Graderías filtradas para el panel y el mapa
    readonly graderiasFiltradas = computed(() => {
        const query = this.filtroBusqueda().toLowerCase().trim();
        const tipo = this.filtroTipo();
        const items = this.store.items();

        return items.filter((g) => {
            const coincideTexto =
                !query ||
                (g.nombre && g.nombre.toLowerCase().includes(query)) ||
                (g.direccion && g.direccion.toLowerCase().includes(query)) ||
                (g.user?.name && g.user.name.toLowerCase().includes(query)) ||
                (g.codigo && g.codigo.toLowerCase().includes(query));

            if (!coincideTexto) return false;

            const tieneCoords = g.latitud != null && g.longitud != null;
            const cap = Number(g.capacidad_total) || Number(g.filas) * Number(g.columnas) || 1;
            const pagados = Number(g.pagados_count) || 0;
            const pct = Math.round((pagados / cap) * 100);

            if (tipo === 'con_coordenadas') return tieneCoords;
            if (tipo === 'sin_coordenadas') return !tieneCoords;
            if (tipo === 'alta_ocupacion') return pct >= 70;

            return true;
        });
    });

    // Validación reactiva del punto de creación según la ruta oficial
    readonly validacionPuntoCreacion = computed(() => {
        const p = this.puntoCreacion();
        if (!p) return null;
        return this.rutaStore.validarPunto(p.latitud, p.longitud);
    });

    // Métricas del mapa
    readonly totalConCoords = computed(() =>
        this.store.items().filter((g) => g.latitud != null && g.longitud != null).length
    );

    readonly totalSinCoords = computed(() =>
        this.store.items().filter((g) => g.latitud == null || g.longitud == null).length
    );

    constructor() {
        // Efecto para sincronizar el estilo del mapa cuando cambia el tema claro/oscuro o la capa
        effect(() => {
            const isDark = this.layoutService.isDarkTheme();
            const capa = this.tipoCapa();
            if (this.map) {
                this.map.setStyle(resolverEstiloMapa(isDark, capa));
                this.map.once('styledata', () => {
                    this.dibujarRutaOficial();
                    this.actualizarMarcadores(this.graderiasFiltradas());
                    if (this.modoTrazadoRuta()) {
                        this.dibujarRutaTrazado();
                    }
                });
            }
        });

        // Efecto para actualizar los pines del mapa cuando la lista filtrada cambia
        effect(() => {
            const items = this.graderiasFiltradas();
            if (this.map) {
                this.actualizarMarcadores(items);
            }
        });
    }

    ngOnInit(): void {
        this.store.cargarGraderias();
        this.rutaStore.cargarRutaActiva(() => {
            this.dibujarRutaOficial();
        });
        this.inicializarMapa();
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
            zoom: 15.2,
            pitch: 20,
            bearing: -10
        });

        // Manejo automático de fallback en caso de error de conexión/tiles o WebGL
        this.map.on('error', (e) => {
            console.warn('[MapLibre] Evento de error en mapa:', e);
            if (!this.fallbackRasterActivado && this.tipoCapa() === 'vector') {
                this.fallbackRasterActivado = true;
                this.tipoCapa.set('raster');
                this.notificacion.info('Se activó automáticamente la capa estándar OpenStreetMap para asegurar la visualización.');
            }
        });

        // Controles de navegación y pantalla completa
        this.map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');
        this.map.addControl(new maplibregl.FullscreenControl(), 'top-right');

        // Cuando el estilo termina de cargar o recargar
        this.map.on('style.load', () => {
            this.actualizarMarcadores(this.graderiasFiltradas());
            this.dibujarRutaOficial();
            if (this.modoTrazadoRuta()) {
                this.dibujarRutaTrazado();
            }
        });

        // Garantizar que la ruta no se pierda al alternar modos de tema claro/oscuro
        this.map.on('styledata', () => {
            if (this.map?.isStyleLoaded()) {
                if (this.rutaStore.rutaActiva() && !this.map.getSource('ruta-oficial-source')) {
                    this.dibujarRutaOficial();
                }
            }
        });

        this.map.on('load', () => {
            this.dibujarRutaOficial();
            this.map?.resize();
        });

        // Clic en el lienzo del mapa
        this.map.on('click', (e) => {
            const target = e.originalEvent.target as HTMLElement;
            if (
                target.closest('.carnaval-marker-pin') ||
                target.closest('.creacion-marker-pin') ||
                target.closest('.trazado-node-pin')
            ) {
                return; // Clic sobre un pin existente
            }

            const lat = Number(e.lngLat.lat.toFixed(6));
            const lng = Number(e.lngLat.lng.toFixed(6));

            // Si está en modo trazado de ruta oficial (Solo Admin)
            if (this.modoTrazadoRuta()) {
                this.agregarPuntoTrazado(lng, lat);
                return;
            }

            // Si el modo creación está activo o si se hace clic en un punto libre
            this.fijarPuntoCreacion(lat, lng);
        });
    }

    actualizarMarcadores(items: Graderia[]): void {
        if (!this.map) return;

        // Limpiar marcadores anteriores
        this.markersMap.forEach((m) => m.remove());
        this.markersMap.clear();

        const focoId = this.graderiaEnFoco()?.id;
        const hayFoco = focoId != null;

        items.forEach((g) => {
            if (g.latitud == null || g.longitud == null) return;

            const lat = Number(g.latitud);
            const lng = Number(g.longitud);

            const capacidad = Number(g.capacidad_total) || Number(g.filas) * Number(g.columnas) || 1;
            const pagados = Number(g.pagados_count) || 0;
            const porcentaje = Math.min(100, Math.round((pagados / capacidad) * 100));
            const esFoco = focoId === g.id;

            // Color según ocupación para estados normales
            let colorBg = '#059669'; // Verde
            if (porcentaje >= 80) {
                colorBg = '#dc2626'; // Rojo (Casi llena)
            } else if (porcentaje >= 40) {
                colorBg = '#d97706'; // Ámbar / Naranja (Media ocupación)
            }

            const opacidad = hayFoco && !esFoco ? '0.65' : '1';
            const zIndex = esFoco ? '9999' : '10';

            const el = document.createElement('div');
            el.className = 'carnaval-marker-pin cursor-pointer';
            el.dataset['id'] = String(g.id);

            if (esFoco) {
                // PIN SELECCIONADO: ELEGANTE CON COLOR PRIMARIO Y REALCE LIMPIO
                el.innerHTML = `
                    <div style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: ${zIndex}; transform: scale(1.15); filter: drop-shadow(0 6px 16px rgba(0,0,0,0.45));">
                        <div style="background: var(--p-primary-color, #960023); color: #ffffff; padding: 5px 11px; border-radius: 9999px; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 5px; border: 2px solid #ffffff; box-shadow: 0 0 0 2.5px rgba(150,0,35,0.4); white-space: nowrap;">
                            <i class="pi pi-star-fill" style="font-size: 10px;"></i>
                            <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis;">${g.nombre}</span>
                            <span style="background: rgba(255,255,255,0.25); color: #ffffff; padding: 1px 6px; border-radius: 9999px; font-size: 9px; font-weight: 800;">${porcentaje}%</span>
                        </div>
                        <div style="width: 3px; height: 10px; background: var(--p-primary-color, #960023);"></div>
                        <div style="width: 8px; height: 8px; background: var(--p-primary-color, #960023); border-radius: 50%; border: 2px solid #ffffff;"></div>
                    </div>
                `;
            } else {
                // PIN NORMAL
                el.innerHTML = `
                    <div style="position: relative; display: flex; flex-direction: column; align-items: center; opacity: ${opacidad}; z-index: ${zIndex}; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3)); transition: transform 0.2s;" class="hover:scale-105">
                        <div style="background: ${colorBg}; color: #ffffff; padding: 4px 9px; border-radius: 9999px; font-weight: 700; font-size: 10px; display: flex; align-items: center; gap: 4px; border: 2px solid #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.2); white-space: nowrap;">
                            <i class="pi pi-map-marker" style="font-size: 9px;"></i>
                            <span style="max-width: 110px; overflow: hidden; text-overflow: ellipsis;">${g.nombre}</span>
                            <span style="background: rgba(255,255,255,0.25); padding: 1px 5px; border-radius: 9999px; font-size: 9px;">${porcentaje}%</span>
                        </div>
                        <div style="width: 2px; height: 8px; background: ${colorBg};"></div>
                        <div style="width: 6px; height: 6px; background: ${colorBg}; border-radius: 50%; border: 1.5px solid #ffffff;"></div>
                    </div>
                `;
            }

            el.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.seleccionarGraderia(g, true);
            });

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([lng, lat])
                .addTo(this.map!);

            this.markersMap.set(g.id, marker);
        });
    }

    seleccionarGraderia(g: Graderia, fromMarker = false): void {
        this.graderiaSeleccionada.set(g);
        this.graderiaEnFoco.set(g);
        this.limpiarPuntoCreacion();

        // Resaltar pin anterior y nuevo
        if (this.activeMarkerEl) {
            this.activeMarkerEl.style.transform = '';
            this.activeMarkerEl.style.filter = '';
        }

        const marker = this.markersMap.get(g.id);
        if (marker) {
            this.activeMarkerEl = marker.getElement();
            this.activeMarkerEl.style.transform = 'scale(1.25)';
            this.activeMarkerEl.style.filter = 'drop-shadow(0 0 14px rgba(150, 0, 35, 0.9))';
        }

        if (this.map && g.latitud != null && g.longitud != null) {
            this.map.flyTo({
                center: [Number(g.longitud), Number(g.latitud)],
                zoom: 16.8,
                pitch: this.vista3D() ? 50 : 25,
                speed: 1.3,
                curve: 1.4
            });
        }
    }

    cerrarCardDetalle(): void {
        this.graderiaSeleccionada.set(null);
    }

    reabrirDetalle(g: Graderia): void {
        this.graderiaSeleccionada.set(g);
        if (this.map && g.latitud != null && g.longitud != null) {
            this.map.flyTo({
                center: [Number(g.longitud), Number(g.latitud)],
                zoom: 16.8,
                speed: 1.2
            });
        }
    }

    quitarFoco(): void {
        this.graderiaSeleccionada.set(null);
        this.graderiaEnFoco.set(null);
        if (this.activeMarkerEl) {
            this.activeMarkerEl.style.transform = '';
            this.activeMarkerEl.style.filter = '';
            this.activeMarkerEl = null;
        }
    }

    // =========================================================================
    // CREACIÓN DE GRADERÍAS Y VALIDACIÓN CONTRA LA RUTA OFICIAL
    // =========================================================================

    alternarModoCreacion(): void {
        if (this.modoTrazadoRuta()) {
            this.cancelarTrazadoRuta();
        }

        const nuevoEstado = !this.modoCreacion();
        this.modoCreacion.set(nuevoEstado);

        if (!nuevoEstado) {
            this.limpiarPuntoCreacion();
        } else {
            this.deseleccionar();
            const msg = this.rutaStore.tieneRutaActiva()
                ? `Modo Creación: Haz clic cerca de la ruta oficial (margen máximo: ${this.rutaStore.toleranciaMetros()}m).`
                : 'Modo Creación: Haz clic en el mapa para ubicar la nueva gradería.';
            this.notificacion.info(msg);
        }
    }

    fijarPuntoCreacion(lat: number, lng: number): void {
        this.puntoCreacion.set({ latitud: lat, longitud: lng });
        this.graderiaSeleccionada.set(null);

        const validacion = this.rutaStore.validarPunto(lat, lng);
        const tieneRuta = this.rutaStore.tieneRutaActiva();
        const esValido = !tieneRuta || validacion.valido;

        const colorBg = esValido ? '#059669' : '#dc2626';
        const icono = esValido ? 'pi-check' : 'pi-exclamation-triangle';
        const textoBadge = esValido
            ? (tieneRuta ? `En Ruta (${validacion.distancia}m)` : 'Nueva Gradería')
            : `Fuera de Ruta (${validacion.distancia}m)`;

        if (this.marcadorCreacion) {
            this.marcadorCreacion.remove();
            this.marcadorCreacion = null;
        }

        if (this.map) {
            const el = document.createElement('div');
            el.className = 'creacion-marker-pin cursor-pointer';
            el.innerHTML = `
                <div style="position: relative; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 12px ${esValido ? 'rgba(16, 185, 129, 0.8)' : 'rgba(220, 38, 38, 0.8)'});">
                    <div style="position: absolute; top: -6px; left: -6px; right: -6px; bottom: -6px; border-radius: 9999px; background: ${esValido ? 'rgba(16, 185, 129, 0.4)' : 'rgba(220, 38, 38, 0.4)'}; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>
                    <div style="background: ${colorBg}; color: #ffffff; padding: 5px 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 5px; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.35);">
                        <i class="pi ${icono}" style="font-size: 10px;"></i>
                        <span>${textoBadge}</span>
                    </div>
                    <div style="width: 3px; height: 12px; background: ${colorBg};"></div>
                    <div style="width: 8px; height: 8px; background: ${colorBg}; border-radius: 50%; border: 2px solid #ffffff;"></div>
                </div>
            `;

            this.marcadorCreacion = new maplibregl.Marker({ element: el })
                .setLngLat([lng, lat])
                .addTo(this.map);
        }
    }

    abrirModalCrearEnPunto(): void {
        const v = this.validacionPuntoCreacion();
        if (v && this.rutaStore.tieneRutaActiva() && !v.valido) {
            this.notificacion.advertencia(
                `Ubicación fuera de rango: el punto está a ${v.distancia}m de la ruta oficial (límite máximo: ${v.tolerancia}m). Selecciona un punto dentro del área autorizada.`
            );
            return;
        }
        this.modalCrearFormVisible.set(true);
    }

    disenarEnPaginaNueva(): void {
        const coords = this.puntoCreacion();
        if (coords) {
            const v = this.rutaStore.validarPunto(coords.latitud, coords.longitud);
            if (this.rutaStore.tieneRutaActiva() && !v.valido) {
                this.notificacion.advertencia(
                    `Ubicación fuera de rango: el punto está a ${v.distancia}m de la ruta oficial (límite: ${v.tolerancia}m).`
                );
                return;
            }

            this.router.navigate(['/graderias/nueva'], {
                queryParams: { lat: coords.latitud, lng: coords.longitud }
            });
        } else {
            this.router.navigate(['/graderias/nueva']);
        }
    }

    onGraderiaCreada(nueva: Graderia): void {
        this.modalCrearFormVisible.set(false);
        this.limpiarPuntoCreacion();
        this.modoCreacion.set(false);
        this.store.cargarGraderias();

        if (nueva.latitud != null && nueva.longitud != null) {
            setTimeout(() => {
                this.seleccionarGraderia(nueva);
            }, 350);
        }
    }

    limpiarPuntoCreacion(): void {
        this.puntoCreacion.set(null);
        if (this.marcadorCreacion) {
            this.marcadorCreacion.remove();
            this.marcadorCreacion = null;
        }
    }

    deseleccionar(): void {
        this.quitarFoco();
        this.limpiarPuntoCreacion();
    }

    // =========================================================================
    // TRAZADO DE RUTA OFICIAL (SOLO ADMINISTRADOR)
    // =========================================================================

    iniciarTrazadoRuta(): void {
        if (!this.authStore.esAdmin()) {
            this.notificacion.advertencia('Solo el administrador tiene permisos para trazar o modificar la ruta oficial.');
            return;
        }

        this.modoCreacion.set(false);
        this.limpiarPuntoCreacion();
        this.deseleccionar();

        const rutaActual = this.rutaStore.rutaActiva();
        if (rutaActual && rutaActual.coordenadas && rutaActual.coordenadas.length >= 2) {
            this.nombreRutaTrazado.set(rutaActual.nombre);
            this.descripcionRutaTrazado.set(rutaActual.descripcion || '');
            this.toleranciaMetrosTrazado.set(rutaActual.distancia_tolerancia_metros || 50);
            this.colorRutaTrazado.set(rutaActual.color || this.layoutService.getPrimary() || '#960023');

            const pts: [number, number][] = [];
            for (const raw of rutaActual.coordenadas) {
                const p = normalizarPunto(raw);
                if (p) pts.push([p[1], p[0]]); // [lng, lat]
            }
            this.puntosTrazado.set(pts);
        } else {
            this.puntosTrazado.set([]);
            this.nombreRutaTrazado.set('Ruta Oficial Carnaval de Oruro');
            this.toleranciaMetrosTrazado.set(50);
            this.colorRutaTrazado.set(this.layoutService.getPrimary() || '#960023');
        }

        this.modoTrazadoRuta.set(true);
        this.panelTrazadoMinimizado.set(false);
        this.actualizarMarcadoresTrazado();
        this.dibujarRutaTrazado();

        this.notificacion.info(
            'Modo Trazado de Ruta: Haz clic secuencialmente en el mapa a lo largo del recorrido para marcar la ruta oficial.'
        );
    }

    agregarPuntoTrazado(lng: number, lat: number): void {
        this.puntosTrazado.update((pts) => [...pts, [lng, lat]]);
        this.actualizarMarcadoresTrazado();
        this.dibujarRutaTrazado();
    }

    deshacerUltimoPuntoRuta(): void {
        const pts = this.puntosTrazado();
        if (pts.length === 0) return;
        this.puntosTrazado.set(pts.slice(0, -1));
        this.actualizarMarcadoresTrazado();
        this.dibujarRutaTrazado();
    }

    limpiarTrazadoRuta(): void {
        this.puntosTrazado.set([]);
        this.actualizarMarcadoresTrazado();
        if (this.map) {
            removerRutaDeMapa(this.map, 'ruta-trazado-source');
        }
    }

    cancelarTrazadoRuta(): void {
        this.modoTrazadoRuta.set(false);
        this.puntosTrazado.set([]);
        this.actualizarMarcadoresTrazado();
        if (this.map) {
            removerRutaDeMapa(this.map, 'ruta-trazado-source');
        }
        this.dibujarRutaOficial();
        this.notificacion.info('Trazado de ruta cancelado.');
    }

    private cancelarTrazadoRutaSilencioso(): void {
        this.modoTrazadoRuta.set(false);
        this.puntosTrazado.set([]);
        this.actualizarMarcadoresTrazado();
        if (this.map) {
            removerRutaDeMapa(this.map, 'ruta-trazado-source');
        }
    }

    guardarRutaTrazada(): void {
        const puntos = this.puntosTrazado();
        if (puntos.length < 2) {
            this.notificacion.advertencia('Debes trazar al menos 2 puntos sobre el mapa para formar la ruta oficial.');
            return;
        }

        const nombre = this.nombreRutaTrazado().trim();
        if (!nombre) {
            this.notificacion.advertencia('Ingresa un nombre para la ruta oficial.');
            return;
        }

        const tolerancia = Math.max(5, Number(this.toleranciaMetrosTrazado()) || 50);

        this.rutaStore.guardarRuta(
            {
                nombre,
                descripcion: this.descripcionRutaTrazado().trim() || undefined,
                coordenadas: puntos,
                distancia_tolerancia_metros: tolerancia,
                color: this.colorRutaTrazado(),
                activo: true
            },
            (rutaGuardada) => {
                this.notificacion.exito(
                    `Ruta oficial "${rutaGuardada.nombre}" guardada con éxito (${puntos.length} puntos trazados). Tolerancia: ${tolerancia}m.`
                );
                this.cancelarTrazadoRutaSilencioso();
                this.dibujarRutaOficial();
                this.ajustarVistaARuta();
            },
            (err) => this.notificacion.error(err)
        );
    }

    private actualizarMarcadoresTrazado(): void {
        this.marcadoresTrazado.forEach((m) => m.remove());
        this.marcadoresTrazado = [];

        if (!this.map || !this.modoTrazadoRuta()) return;

        const pts = this.puntosTrazado();
        pts.forEach(([lng, lat], idx) => {
            const el = document.createElement('div');
            el.className = 'trazado-node-pin cursor-pointer';

            const esInicio = idx === 0;
            const esFin = idx === pts.length - 1 && pts.length > 1;

            const primaryColor = this.layoutService.getPrimary() || '#960023';
            let bgColor = primaryColor;
            let label = String(idx + 1);

            if (esInicio) {
                bgColor = '#10b981';
                label = 'INICIO';
            } else if (esFin) {
                bgColor = primaryColor;
                label = 'FIN';
            }

            el.innerHTML = `
                <div style="background: ${bgColor}; color: #ffffff; width: ${esInicio || esFin ? 'auto' : '24px'}; height: 24px; padding: ${esInicio || esFin ? '0 8px' : '0'}; border-radius: 9999px; font-weight: 800; font-size: 10px; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.4); white-space: nowrap;">
                    ${label}
                </div>
            `;

            const m = new maplibregl.Marker({ element: el })
                .setLngLat([lng, lat])
                .addTo(this.map!);

            this.marcadoresTrazado.push(m);
        });
    }

    private dibujarRutaTrazado(): void {
        if (!this.map) return;
        const pts = this.puntosTrazado();
        if (pts.length < 2) {
            removerRutaDeMapa(this.map, 'ruta-trazado-source');
            return;
        }
        dibujarRutaEnMapa(this.map, pts, this.colorRutaTrazado(), 'ruta-trazado-source');
    }

    dibujarRutaOficial(): void {
        if (!this.map) return;

        if (!this.mostrarRutaOficial()) {
            removerRutaDeMapa(this.map, 'ruta-oficial-source');
            this.limpiarMarcadoresExtremosRuta();
            return;
        }

        const ruta = this.rutaStore.rutaActiva();
        if (!ruta || !ruta.coordenadas || ruta.coordenadas.length < 2) {
            removerRutaDeMapa(this.map, 'ruta-oficial-source');
            this.limpiarMarcadoresExtremosRuta();
            return;
        }

        const primaryColor = this.layoutService.getPrimary() || '#960023';
        dibujarRutaEnMapa(this.map, ruta.coordenadas, ruta.color || primaryColor, 'ruta-oficial-source');
        this.dibujarMarcadoresExtremosRuta(ruta);
    }

    private dibujarMarcadoresExtremosRuta(ruta: any): void {
        this.limpiarMarcadoresExtremosRuta();
        if (!this.map || !ruta.coordenadas || ruta.coordenadas.length < 2) return;

        const pInicio = normalizarPunto(ruta.coordenadas[0]);
        const pFin = normalizarPunto(ruta.coordenadas[ruta.coordenadas.length - 1]);
        const primaryColor = this.layoutService.getPrimary() || '#960023';

        if (pInicio) {
            const elInicio = document.createElement('div');
            elInicio.innerHTML = `
                <div style="background: #15803d; color: #ffffff; padding: 4px 9px; border-radius: 9999px; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 5px; border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
                    <i class="pi pi-flag-fill" style="font-size: 11px;"></i>
                    <span>Inicio Ruta</span>
                </div>
            `;
            this.marcadorInicioRuta = new maplibregl.Marker({ element: elInicio })
                .setLngLat([pInicio[1], pInicio[0]])
                .addTo(this.map);
        }

        if (pFin) {
            const elFin = document.createElement('div');
            elFin.innerHTML = `
                <div style="background: ${primaryColor}; color: #ffffff; padding: 4px 9px; border-radius: 9999px; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 5px; border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
                    <i class="pi pi-check-circle" style="font-size: 11px;"></i>
                    <span>Fin Ruta</span>
                </div>
            `;
            this.marcadorFinRuta = new maplibregl.Marker({ element: elFin })
                .setLngLat([pFin[1], pFin[0]])
                .addTo(this.map);
        }
    }

    private limpiarMarcadoresExtremosRuta(): void {
        if (this.marcadorInicioRuta) {
            this.marcadorInicioRuta.remove();
            this.marcadorInicioRuta = null;
        }
        if (this.marcadorFinRuta) {
            this.marcadorFinRuta.remove();
            this.marcadorFinRuta = null;
        }
    }

    ajustarVistaARuta(): void {
        const ruta = this.rutaStore.rutaActiva();
        if (!ruta || !ruta.coordenadas || ruta.coordenadas.length < 2 || !this.map) {
            this.centrarMapa();
            return;
        }

        let minLng = Infinity;
        let maxLng = -Infinity;
        let minLat = Infinity;
        let maxLat = -Infinity;

        ruta.coordenadas.forEach((raw) => {
            const p = normalizarPunto(raw);
            if (p) {
                const lat = p[0];
                const lng = p[1];
                if (lng < minLng) minLng = lng;
                if (lng > maxLng) maxLng = lng;
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
            }
        });

        if (minLng !== Infinity) {
            this.map.fitBounds(
                [
                    [minLng, minLat],
                    [maxLng, maxLat]
                ],
                { padding: 70, duration: 1200 }
            );
        }
    }

    alternarVisibilidadRuta(): void {
        this.mostrarRutaOficial.update((v) => !v);
        this.dibujarRutaOficial();
        this.notificacion.info(
            this.mostrarRutaOficial() ? 'Recorrido oficial visible en el mapa.' : 'Recorrido oficial ocultado temporalmente.'
        );
    }

    centrarMapa(): void {
        if (!this.map) return;
        this.map.flyTo({
            center: this.CENTRO_ORURO,
            zoom: 15.2,
            pitch: this.vista3D() ? 45 : 20,
            bearing: -10,
            speed: 1.2
        });
    }

    alternarVista3D(): void {
        this.vista3D.update((v) => !v);
        if (this.map) {
            this.map.easeTo({
                pitch: this.vista3D() ? 55 : 0,
                bearing: this.vista3D() ? -25 : 0,
                duration: 900
            });
        }
    }

    alternarTipoCapa(): void {
        const nuevo = this.tipoCapa() === 'vector' ? 'raster' : 'vector';
        this.tipoCapa.set(nuevo);
        if (this.map) {
            this.map.setStyle(resolverEstiloMapa(this.layoutService.isDarkTheme(), nuevo));
        }
        this.notificacion.info(
            nuevo === 'raster'
                ? 'Capa estándar (OpenStreetMap) activada.'
                : 'Capa vectorial de alta resolución (OpenFreeMap) activada.'
        );
    }

    alternarPanelLateral(): void {
        this.panelLateralVisible.update((v) => !v);
    }

    gestionarVentas(g: Graderia): void {
        this.router.navigate(['/graderias', g.id, 'venta']);
    }

    abrirMatrizDetalle(g: Graderia): void {
        this.graderiaSeleccionada.set(g);
        this.modalDetalleVisible.set(true);
    }

    abrirEditorCoordenadas(g: Graderia): void {
        this.graderiaParaCoordenadas.set(g);
        this.modalCoordenadasVisible.set(true);
    }

    guardarNuevasCoordenadas(coords: { latitud: number; longitud: number }): void {
        const g = this.graderiaParaCoordenadas();
        if (!g) return;

        this.store.actualizar(
            g.id,
            {
                nombre: g.nombre || 'Gradería',
                direccion: g.direccion || undefined,
                latitud: coords.latitud,
                longitud: coords.longitud,
                filas: Number(g.filas),
                columnas: Number(g.columnas),
                etiqueta_modo: g.etiqueta_modo || 'fila',
                start_top: !!g.start_top,
                start_left: !!g.start_left,
                activo: !!g.activo
            },
            (actualizada) => {
                this.notificacion.exito(`Ubicación de "${actualizada.nombre}" guardada en el mapa.`);
                this.graderiaSeleccionada.set(actualizada);
                this.seleccionarGraderia(actualizada);
            },
            (err) => this.notificacion.error(err)
        );
    }

    copiarUbicacion(g: Graderia): void {
        if (g.latitud == null || g.longitud == null) return;
        const texto = `${g.latitud}, ${g.longitud}`;
        navigator.clipboard.writeText(texto);
        this.notificacion.info(`Coordenadas copiadas: ${texto}`);
    }

    calcularPorcentajeOcupacion(g: Graderia): number {
        const cap = Number(g.capacidad_total) || Number(g.filas) * Number(g.columnas) || 1;
        const pagados = Number(g.pagados_count) || 0;
        return Math.min(100, Math.round((pagados / cap) * 100));
    }

    calcularLibres(g: Graderia): number {
        const cap = Number(g.capacidad_total) || Number(g.filas) * Number(g.columnas) || 0;
        const ocupados = (Number(g.pagados_count) || 0) + (Number(g.reservados_count) || 0);
        return Math.max(0, cap - ocupados);
    }

    ngOnDestroy(): void {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.markersMap.clear();
        this.marcadoresTrazado.forEach((m) => m.remove());
        this.marcadoresTrazado = [];
        this.limpiarMarcadoresExtremosRuta();
        this.limpiarPuntoCreacion();
    }
}
