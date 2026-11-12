import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import { Asiento } from '@/app/core/interfaces/asiento.interface';
import { GraderiaService } from '@/app/core/services/graderia.service';
import { LayoutService } from '@/app/layout/service/layout.service';

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
    selector: 'app-public-graderia',
    standalone: true,
    imports: [CommonModule, ButtonModule, TagModule, TooltipModule],
    templateUrl: './public-graderia.component.html'
})
export class PublicGraderiaComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private graderiaService = inject(GraderiaService);
    layoutService = inject(LayoutService);

    codigoPublico = signal<string>('');
    graderia = signal<Graderia | null>(null);
    asientos = signal<Asiento[]>([]);
    cargando = signal<boolean>(false);

    telefonosContacto = computed(() => {
        const g: any = this.graderia();
        const tels: string[] = [];
        if (g?.user?.telefono_contacto_1) tels.push(g.user.telefono_contacto_1);
        if (g?.user?.telefono_contacto_2) tels.push(g.user.telefono_contacto_2);
        return tels;
    });

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

    ngOnInit() {
        this.route.paramMap.subscribe((params) => {
            const code = params.get('code');
            if (code) {
                this.codigoPublico.set(code);
                this.cargarPublica();
            }
        });
    }

    cargarPublica() {
        const code = this.codigoPublico();
        if (!code) return;

        this.cargando.set(true);
        this.graderiaService.obtenerPublica(code).subscribe({
            next: (res) => {
                this.graderia.set(res.graderia);
                this.asientos.set(res.asientos as Asiento[]);
                this.cargando.set(false);
            },
            error: () => {
                this.cargando.set(false);
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
                return 'bg-slate-400/20 text-slate-500 border-slate-400/40 opacity-50';
            default:
                return 'bg-surface-100 dark:bg-surface-800 text-muted-color border-surface-300';
        }
    }

    sanitizarTelefono(tel: string): string {
        return tel.replace(/\D/g, '');
    }

    toggleTema() {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            darkTheme: !state.darkTheme
        }));
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
