import {
    Component,
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
import {
    configurarMapLibreWorker,
    resolverEstiloMapa
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

    private map: maplibregl.Map | null = null;
    private marker: maplibregl.Marker | null = null;

    get visibleModel(): boolean {
        return this.visible();
    }
    set visibleModel(v: boolean) {
        this.visibleChange.emit(v);
    }

    onDialogShow() {
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

        this.crearMarcador(lat, lng);

        // Clic en cualquier punto del mapa reposiciona el pin
        this.map.on('click', (e) => {
            const nuevoLat = Number(e.lngLat.lat.toFixed(6));
            const nuevoLng = Number(e.lngLat.lng.toFixed(6));
            this.latTemporal.set(nuevoLat);
            this.lngTemporal.set(nuevoLng);
            this.marker?.setLngLat([nuevoLng, nuevoLat]);
        });

        this.map.on('load', () => {
            this.map?.resize();
        });
    }

    private crearMarcador(lat: number, lng: number): void {
        const el = document.createElement('div');
        el.className = 'carnaval-picker-marker';
        el.innerHTML = `
            <div style="cursor: grab; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
                <div style="background: #960023; color: #ffffff; padding: 5px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px; display: flex; align-items: center; gap: 4px; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
                    <i class="pi pi-map-marker" style="font-size: 12px;"></i>
                    <span>${this.nombreGraderia() || 'Gradería'}</span>
                </div>
                <div style="width: 3px; height: 12px; background: #960023;"></div>
                <div style="width: 8px; height: 8px; background: #960023; border-radius: 50%; border: 2px solid #fff;"></div>
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
