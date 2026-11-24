import {
    Component,
    computed,
    ElementRef,
    EventEmitter,
    inject,
    input,
    OnDestroy,
    Output,
    signal,
    ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import * as maplibregl from 'maplibre-gl';
import { LayoutService } from '@/app/layout/service/layout.service';
import { NotificacionService } from '@/app/core/services/notificacion.service';
import { RutaStore } from '@/app/core/store/ruta.store';
import {
    configurarMapLibreWorker,
    resolverEstiloMapa,
    dibujarRutaEnMapa
} from '@/app/core/helpers/maplibre.helper';

@Component({
    selector: 'app-mapa-coordenadas-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        TagModule,
        TooltipModule
    ],
    templateUrl: './mapa-coordenadas-dialog.component.html'
})
export class MapaCoordenadasDialogComponent implements OnDestroy {
    readonly layoutService = inject(LayoutService);
    readonly rutaStore = inject(RutaStore);
    private readonly notificacion = inject(NotificacionService);

    @ViewChild('mapPickerContainer') mapPickerContainer!: ElementRef<HTMLDivElement>;

    visible = input<boolean>(false);
    latitud = input<number | null | undefined>(null);
    longitud = input<number | null | undefined>(null);
    nombreGraderia = input<string>('');

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() coordenadasConfirmadas = new EventEmitter<{ latitud: number; longitud: number }>();

    latTemporal = signal<number>(-17.9657);
    lngTemporal = signal<number>(-67.1105);
    fallbackRasterActivo = signal<boolean>(false);

    readonly validacionRuta = computed(() => {
        return this.rutaStore.validarPunto(this.latTemporal(), this.lngTemporal());
    });

    private map: maplibregl.Map | null = null;
    private marker: maplibregl.Marker | null = null;

    get visibleModel(): boolean {
        return this.visible();
    }
    set visibleModel(v: boolean) {
        this.visibleChange.emit(v);
    }

    onDialogShow() {
        this.rutaStore.cargarRutaActiva(() => {
            this.dibujarRutaSiExiste();
        });

        const tieneCoords = this.latitud() != null && this.longitud() != null;
        const latInicial = tieneCoords ? Number(this.latitud()) : -17.9657;
        const lngInicial = tieneCoords ? Number(this.longitud()) : -67.1105;

        this.latTemporal.set(latInicial);
        this.lngTemporal.set(lngInicial);

        setTimeout(() => {
            this.inicializarMapa(latInicial, lngInicial, tieneCoords ? 17 : 15.5);
        }, 150);
    }

    private inicializarMapa(lat: number, lng: number, zoomInicial: number) {
        if (!this.mapPickerContainer) return;

        configurarMapLibreWorker();

        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        const isDark = this.layoutService.isDarkTheme();
        const estilo = resolverEstiloMapa(isDark);

        this.map = new maplibregl.Map({
            container: this.mapPickerContainer.nativeElement,
            style: estilo,
            center: [lng, lat],
            zoom: zoomInicial,
            pitch: 0
        });

        // Controles de navegación y zoom
        this.map.addControl(
            new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
            'top-right'
        );

        this.map.on('error', (e) => {
            console.warn('[MapLibre Dialog] Error en mapa:', e);
            if (!this.fallbackRasterActivo()) {
                this.fallbackRasterActivo.set(true);
                this.map?.setStyle(resolverEstiloMapa(isDark, 'raster'));
            }
        });

        this.map.on('style.load', () => {
            this.dibujarRutaSiExiste();
        });

        this.map.on('load', () => {
            this.dibujarRutaSiExiste();
            this.map?.resize();
        });

        this.crearMarcador(lat, lng);

        // Clic en cualquier punto del mapa reposiciona el pin
        this.map.on('click', (e) => {
            const nuevoLat = Number(e.lngLat.lat.toFixed(6));
            const nuevoLng = Number(e.lngLat.lng.toFixed(6));
            this.latTemporal.set(nuevoLat);
            this.lngTemporal.set(nuevoLng);
            this.marker?.setLngLat([nuevoLng, nuevoLat]);
        });
    }

    private dibujarRutaSiExiste(): void {
        if (!this.map) return;
        const ruta = this.rutaStore.rutaActiva();
        if (ruta && ruta.coordenadas && ruta.coordenadas.length >= 2) {
            const primaryColor = this.layoutService.getPrimary() || '#960023';
            dibujarRutaEnMapa(this.map, ruta.coordenadas, ruta.color || primaryColor, 'picker-ruta-source');
        }
    }

    private crearMarcador(lat: number, lng: number): void {
        const primaryColor = this.layoutService.getPrimary() || '#960023';
        const el = document.createElement('div');
        el.className = 'carnaval-picker-marker';
        el.innerHTML = `
            <div style="cursor: grab; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
                <div style="background: ${primaryColor}; color: #ffffff; padding: 5px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px; display: flex; align-items: center; gap: 4px; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
                    <i class="pi pi-map-marker" style="font-size: 12px;"></i>
                    <span>${this.nombreGraderia() || 'Gradería'}</span>
                </div>
                <div style="width: 3px; height: 12px; background: ${primaryColor};"></div>
                <div style="width: 8px; height: 8px; background: ${primaryColor}; border-radius: 50%; border: 2px solid #fff;"></div>
            </div>
        `;

        this.marker = new maplibregl.Marker({
            element: el,
            draggable: true
        })
            .setLngLat([lng, lat])
            .addTo(this.map!);

        this.marker.on('dragend', () => {
            const lngLat = this.marker!.getLngLat();
            this.latTemporal.set(Number(lngLat.lat.toFixed(6)));
            this.lngTemporal.set(Number(lngLat.lng.toFixed(6)));
        });
    }

    centrarEnOruro(): void {
        if (!this.map) return;
        this.map.flyTo({
            center: [-67.1105, -17.9657],
            zoom: 16,
            speed: 1.2
        });
    }

    confirmar(): void {
        const validacion = this.validacionRuta();
        if (this.rutaStore.tieneRutaActiva() && !validacion.valido) {
            this.notificacion.advertencia(
                `Ubicación fuera de rango: está a ${validacion.distancia}m de la ruta oficial. El límite máximo autorizado es de ${validacion.tolerancia}m.`
            );
            return;
        }

        this.coordenadasConfirmadas.emit({
            latitud: this.latTemporal(),
            longitud: this.lngTemporal()
        });
        this.cerrar();
    }

    cerrar(): void {
        this.visibleChange.emit(false);
    }

    onDialogHide(): void {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.marker = null;
        }
    }

    ngOnDestroy(): void {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.marker = null;
        }
    }
}
