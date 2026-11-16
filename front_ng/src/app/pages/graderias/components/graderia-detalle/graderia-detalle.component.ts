import { Component, computed, ElementRef, EventEmitter, inject, input, OnChanges, OnDestroy, Output, signal, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import * as maplibregl from 'maplibre-gl';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import { Asiento } from '@/app/core/interfaces/asiento.interface';
import { GraderiaService } from '@/app/core/services/graderia.service';
import { GraderiaStore } from '@/app/core/store/graderia.store';
import { NotificacionService } from '@/app/core/services/notificacion.service';
import { LayoutService } from '@/app/layout/service/layout.service';
import { configurarMapLibreWorker, resolverEstiloMapa } from '@/app/core/helpers/maplibre.helper';
import { MapaCoordenadasDialogComponent } from '../mapa-coordenadas-dialog/mapa-coordenadas-dialog.component';

interface CeldaMatriz {
    r: number;
    c: number;
    codigo: string;
    asiento: Asiento | null;
}

interface FilaMatriz {
    r: number;
    etiqueta: string;
    celdas: CeldaMatriz[];
}

@Component({
    selector: 'app-graderia-detalle',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        DialogModule,
        ButtonModule,
        TagModule,
        TooltipModule,
        MapaCoordenadasDialogComponent
    ],
    templateUrl: './graderia-detalle.component.html'
})
export class GraderiaDetalleComponent implements OnChanges, OnDestroy {
    private graderiaService = inject(GraderiaService);
    private layoutService = inject(LayoutService);
    private router = inject(Router);
    store = inject(GraderiaStore);
    notificacion = inject(NotificacionService);

    @ViewChild('miniMapContainer') miniMapContainer?: ElementRef<HTMLDivElement>;

    visible = input<boolean>(false);
    graderia = input<Graderia | null>(null);

    @Output() visibleChange = new EventEmitter<boolean>();

    asientos = signal<Asiento[]>([]);
    cargandoAsientos = signal<boolean>(false);
    reparando = signal<boolean>(false);
    modalCoordenadasVisible = signal<boolean>(false);

    private miniMap: maplibregl.Map | null = null;
    private miniMarker: maplibregl.Marker | null = null;

    get visibleModel(): boolean {
        return this.visible();
    }
    set visibleModel(v: boolean) {
        this.visibleChange.emit(v);
    }

    conteos = computed(() => {
        const c = { libre: 0, reservado: 0, pagado: 0, bloqueado: 0 };
        for (const a of this.asientos()) {
            if (a.estado === 'LIBRE') c.libre++;
            else if (a.estado === 'RESERVADO') c.reservado++;
            else if (a.estado === 'PAGADO') c.pagado++;
            else if (a.estado === 'BLOQUEADO') c.bloqueado++;
        }
        return c;
    });

    totalMontoRecaudado = computed(() => {
        return this.asientos().reduce((acc, a) => {
            if (a.estado === 'PAGADO') {
                return acc + (Number(a.monto) || 0);
            }
            return acc;
        }, 0);
    });

    matriz = computed<FilaMatriz[]>(() => {
        const g = this.graderia();
        const listaAsientos = this.asientos();
        if (!g) return [];

        const filasCount = Number(g.filas) || 1;
        const colsCount = Number(g.columnas) || 1;
        const modo = g.etiqueta_modo || 'fila';
        const startTop = !!g.start_top;
        const startLeft = !!g.start_left;

        const mapaCodigos = new Map<string, Asiento>();
        for (const a of listaAsientos) {
            mapaCodigos.set(a.codigo, a);
        }

        const ordenFilas = this.generarRango(1, filasCount, startTop);
        const ordenCols = this.generarRango(1, colsCount, startLeft);

        return ordenFilas.map((r) => {
            const etiquetaFila = modo === 'fila' ? this.numALetras(r) : `F${r}`;
            const celdas: CeldaMatriz[] = ordenCols.map((c) => {
                const codigo = modo === 'fila' ? `${this.numALetras(r)}${c}` : `${this.numALetras(c)}${r}`;
                const asiento = mapaCodigos.get(codigo) || null;
                return { r, c, codigo, asiento };
            });

            return { r, etiqueta: etiquetaFila, celdas };
        });
    });

    ngOnChanges(changes: SimpleChanges) {
        if (this.visible() && this.graderia() && (changes['visible'] || changes['graderia'])) {
            this.cargarAsientosReales();
            setTimeout(() => this.inicializarMiniMapa(), 200);
        }
    }

    onDialogShow(): void {
        this.cargarAsientosReales();
        setTimeout(() => this.inicializarMiniMapa(), 200);
    }

    inicializarMiniMapa(): void {
        const g = this.graderia();
        if (!this.miniMapContainer?.nativeElement || !g || g.latitud == null || g.longitud == null) return;

        configurarMapLibreWorker();

        if (this.miniMap) {
            this.miniMap.remove();
            this.miniMap = null;
            this.miniMarker = null;
        }

        const lat = Number(g.latitud);
        const lng = Number(g.longitud);

        const isDark = this.layoutService.isDarkTheme();

        this.miniMap = new maplibregl.Map({
            container: this.miniMapContainer.nativeElement,
            style: resolverEstiloMapa(isDark),
            center: [lng, lat],
            zoom: 16.5,
            pitch: 0
        });

        this.miniMap.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

        const el = document.createElement('div');
        el.innerHTML = `
            <div style="background: #960023; color: white; border-radius: 9999px; padding: 4px 9px; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 4px;">
                <i class="pi pi-map-marker" style="font-size: 11px;"></i>
                <span>${g.nombre}</span>
            </div>
        `;

        this.miniMarker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(this.miniMap);
    }

    guardarNuevasCoordenadas(coords: { latitud: number; longitud: number }): void {
        const g = this.graderia();
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
                setTimeout(() => this.inicializarMiniMapa(), 150);
            },
            (err) => this.notificacion.error(err)
        );
    }

    irAlMapa(): void {
        this.cerrar();
        this.router.navigate(['/graderias/mapa']);
    }

    ngOnDestroy(): void {
        if (this.miniMap) {
            this.miniMap.remove();
            this.miniMap = null;
            this.miniMarker = null;
        }
    }

    cargarAsientosReales() {
        const g = this.graderia();
        if (!g) return;

        this.cargandoAsientos.set(true);
        this.graderiaService.obtenerVenta(g.id).subscribe({
            next: (res) => {
                this.asientos.set(res.asientos as Asiento[]);
                this.cargandoAsientos.set(false);
            },
            error: () => {
                this.cargandoAsientos.set(false);
            }
        });
    }

    obtenerClaseButaca(celda: CeldaMatriz): string {
        const st = celda.asiento?.estado || 'LIBRE';
        switch (st) {
            case 'LIBRE':
                return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40';
            case 'RESERVADO':
                return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/50';
            case 'PAGADO':
                return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/50';
            case 'BLOQUEADO':
                return 'bg-slate-400/20 text-slate-500 border-slate-400/40 opacity-60';
            default:
                return 'bg-surface-100 dark:bg-surface-800 text-muted-color border-surface-300';
        }
    }

    construirTooltipButaca(celda: CeldaMatriz): string {
        const a = celda.asiento;
        if (!a) return `Butaca ${celda.codigo}`;

        let base = `Butaca ${a.codigo} [${a.estado}]`;
        if (a.cliente_nombre) {
            base += `\nCliente: ${a.cliente_nombre}`;
        }
        if (a.cliente_celular) {
            base += `\nCelular: ${a.cliente_celular}`;
        }
        if (a.monto) {
            base += `\nPrecio: Bs. ${Number(a.monto).toFixed(2)}`;
        }
        return base;
    }

    obtenerUrlPublica(): string {
        const code = this.graderia()?.code || '';
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/g/${code}`;
        }
        return `/g/${code}`;
    }

    copiarEnlacePublico() {
        const url = this.obtenerUrlPublica();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                this.notificacion.exito('Enlace público copiado al portapapeles');
            });
        }
    }

    abrirEnlacePublico() {
        window.open(this.obtenerUrlPublica(), '_blank');
    }

    repararAsientos() {
        const g = this.graderia();
        if (!g) return;

        this.reparando.set(true);
        this.store.reparar(
            g.id,
            (res) => {
                this.reparando.set(false);
                if (res.missing > 0) {
                    this.notificacion.exito(`Se repararon y crearon ${res.missing} asientos faltantes.`);
                } else {
                    this.notificacion.info(`La gradería está completa (${res.count} asientos verificados).`);
                }
                this.cargarAsientosReales();
            },
            (err) => {
                this.reparando.set(false);
                this.notificacion.error(err);
            }
        );
    }

    cerrar() {
        this.visibleChange.emit(false);
    }

    private generarRango(inicio: number, fin: number, directo: boolean): number[] {
        const arr: number[] = [];
        for (let i = inicio; i <= fin; i++) arr.push(i);
        return directo ? arr : arr.reverse();
    }

    private numALetras(n: number): string {
        let s = '';
        while (n > 0) {
            n--;
            s = String.fromCharCode(65 + (n % 26)) + s;
            n = Math.floor(n / 26);
        }
        return s;
    }
}
