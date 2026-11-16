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
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { AvatarModule } from 'primeng/avatar';
import * as maplibregl from 'maplibre-gl';
import { GraderiaStore } from '@/app/core/store/graderia.store';
import { AuthStore } from '@/app/core/store/auth.store';
import { LayoutService } from '@/app/layout/service/layout.service';
import { NotificacionService } from '@/app/core/services/notificacion.service';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import {
    configurarMapLibreWorker,
    resolverEstiloMapa,
    ModoEstiloMapa
} from '@/app/core/helpers/maplibre.helper';
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
            // Filtro de texto
            const coincideTexto =
                !query ||
                (g.nombre && g.nombre.toLowerCase().includes(query)) ||
                (g.direccion && g.direccion.toLowerCase().includes(query)) ||
                (g.user?.name && g.user.name.toLowerCase().includes(query)) ||
                (g.codigo && g.codigo.toLowerCase().includes(query));

            if (!coincideTexto) return false;

            // Filtro por tipo
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
        });

        // Clic en el lienzo del mapa
        this.map.on('click', (e) => {
            const target = e.originalEvent.target as HTMLElement;
            if (target.closest('.carnaval-marker-pin') || target.closest('.creacion-marker-pin')) {
                return; // Clic sobre un pin existente
            }

            const lat = Number(e.lngLat.lat.toFixed(6));
            const lng = Number(e.lngLat.lng.toFixed(6));

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

        items.forEach((g) => {
            if (g.latitud == null || g.longitud == null) return;

            const lat = Number(g.latitud);
            const lng = Number(g.longitud);

            const capacidad = Number(g.capacidad_total) || Number(g.filas) * Number(g.columnas) || 1;
            const pagados = Number(g.pagados_count) || 0;
            const porcentaje = Math.min(100, Math.round((pagados / capacidad) * 100));
            const esFoco = focoId === g.id;

            // Color según ocupación
            let colorBg = '#2563eb'; // Azul por defecto
            if (porcentaje >= 75) {
                colorBg = '#059669'; // Verde esmeralda (Alta ocupación)
            } else if (porcentaje >= 30) {
                colorBg = '#d97706'; // Ámbar / Naranja (Media ocupación)
            }

            // Elemento HTML con halo de persistencia si está en foco
            const el = document.createElement('div');
            el.className = 'carnaval-marker-pin cursor-pointer transition-transform duration-200 hover:scale-110';
            el.dataset['id'] = String(g.id);

            const beaconHtml = esFoco
                ? `<div style="position: absolute; top: -8px; left: -8px; right: -8px; bottom: -8px; border-radius: 9999px; background: rgba(150, 0, 35, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>`
                : '';

            el.innerHTML = `
                <div style="position: relative; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.35));">
                    ${beaconHtml}
                    <div style="background: ${colorBg}; color: #ffffff; padding: 4px 8px; border-radius: 9999px; font-weight: 700; font-size: 11px; display: flex; align-items: center; gap: 5px; border: ${esFoco ? '2.5px solid #fbbf24' : '2px solid #ffffff'}; box-shadow: 0 4px 10px rgba(0,0,0,0.35); white-space: nowrap;">
                        <i class="pi pi-map-marker" style="font-size: 11px;"></i>
                        <span style="max-width: 120px; overflow: hidden; text-overflow: ellipsis;">${g.nombre}</span>
                        <span style="background: rgba(255,255,255,0.25); padding: 1px 5px; border-radius: 9999px; font-size: 10px;">${porcentaje}%</span>
                    </div>
                    <div style="width: 3px; height: 10px; background: ${colorBg};"></div>
                    <div style="width: 7px; height: 7px; background: ${colorBg}; border-radius: 50%; border: 1.5px solid #ffffff;"></div>
                </div>
            `;

            if (esFoco) {
                el.style.transform = 'scale(1.22)';
                el.style.filter = 'drop-shadow(0 0 12px rgba(150, 0, 35, 0.85))';
                this.activeMarkerEl = el;
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

    /**
     * Cierra la tarjeta flotante de detalles, PERO conserva el foco visual en el pin
     * para que el usuario no se pierda en el mapa.
     */
    cerrarCardDetalle(): void {
        this.graderiaSeleccionada.set(null);
        // NOTA: graderiaEnFoco() SE MANTIENE para no perder el pin en el mapa
    }

    /**
     * Reabre la tarjeta de detalles de la gradería que actualmente está en foco
     */
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

    /**
     * Quita por completo el foco visual del pin seleccionado
     */
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
    // CREACIÓN DE GRADERÍAS MEDIANTE CLIC EN EL MAPA
    // =========================================================================

    alternarModoCreacion(): void {
        const nuevoEstado = !this.modoCreacion();
        this.modoCreacion.set(nuevoEstado);

        if (!nuevoEstado) {
            this.limpiarPuntoCreacion();
        } else {
            this.deseleccionar();
            this.notificacion.info('Modo Creación: Haz clic en el mapa para ubicar la nueva gradería.');
        }
    }

    fijarPuntoCreacion(lat: number, lng: number): void {
        this.puntoCreacion.set({ latitud: lat, longitud: lng });
        this.graderiaSeleccionada.set(null); // Ocultar tarjeta de detalle para mostrar tarjeta de creación

        if (this.marcadorCreacion) {
            this.marcadorCreacion.setLngLat([lng, lat]);
        } else if (this.map) {
            const el = document.createElement('div');
            el.className = 'creacion-marker-pin cursor-pointer';
            el.innerHTML = `
                <div style="position: relative; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 12px rgba(16, 185, 129, 0.8));">
                    <div style="position: absolute; top: -6px; left: -6px; right: -6px; bottom: -6px; border-radius: 9999px; background: rgba(16, 185, 129, 0.4); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>
                    <div style="background: #059669; color: #ffffff; padding: 5px 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 5px; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.35);">
                        <i class="pi pi-plus" style="font-size: 10px;"></i>
                        <span>Nueva Gradería Aquí</span>
                    </div>
                    <div style="width: 3px; height: 12px; background: #059669;"></div>
                    <div style="width: 8px; height: 8px; background: #059669; border-radius: 50%; border: 2px solid #ffffff;"></div>
                </div>
            `;

            this.marcadorCreacion = new maplibregl.Marker({ element: el })
                .setLngLat([lng, lat])
                .addTo(this.map);
        }
    }

    abrirModalCrearEnPunto(): void {
        this.modalCrearFormVisible.set(true);
    }

    disenarEnPaginaNueva(): void {
        const coords = this.puntoCreacion();
        if (coords) {
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
        this.limpiarPuntoCreacion();
    }
}
