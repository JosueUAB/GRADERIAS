import { Component, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-graderia-preview-matriz',
    standalone: true,
    imports: [CommonModule, TooltipModule, TagModule, ButtonModule],
    templateUrl: './graderia-preview-matriz.component.html'
})
export class GraderiaPreviewMatrizComponent {
    filas = input<number>(10);
    columnas = input<number>(20);
    etiquetaModo = input<'fila' | 'columna'>('fila');
    startTop = input<boolean>(true);
    startLeft = input<boolean>(true);

    tamano = signal<'sm' | 'md' | 'lg'>('md');

    // Límite de seguridad en el DOM para previsualización fluida
    readonly MAX_PREVIEW_ROWS = 25;
    readonly MAX_PREVIEW_COLS = 35;

    filasValidas = computed(() => Math.max(1, Math.min(this.filas() || 1, this.MAX_PREVIEW_ROWS)));
    colsValidas = computed(() => Math.max(1, Math.min(this.columnas() || 1, this.MAX_PREVIEW_COLS)));

    capacidadCalculada = computed(() => (this.filas() || 0) * (this.columnas() || 0));

    matriz = computed(() => {
        const rows = this.filasValidas();
        const cols = this.colsValidas();
        const modo = this.etiquetaModo();
        const top = this.startTop();
        const left = this.startLeft();

        const ordenFilas = this.generarRango(1, rows, top);
        const ordenCols = this.generarRango(1, cols, left);

        return ordenFilas.map((r) => {
            const asientos = ordenCols.map((c) => ({
                r,
                c,
                codigo: this.generarCodigo(modo, r, c)
            }));

            const etiquetaFila = modo === 'fila' ? this.numALetras(r) : `F${r}`;

            return {
                r,
                etiqueta: etiquetaFila,
                asientos
            };
        });
    });

    obtenerClaseTamano(): string {
        switch (this.tamano()) {
            case 'sm':
                return 'w-7 h-7 text-[9px]';
            case 'lg':
                return 'w-11 h-11 text-xs';
            case 'md':
            default:
                return 'w-9 h-9 text-[10px]';
        }
    }

    private generarRango(inicio: number, fin: number, directo: boolean): number[] {
        const arr: number[] = [];
        for (let i = inicio; i <= fin; i++) arr.push(i);
        return directo ? arr : arr.reverse();
    }

    private generarCodigo(modo: 'fila' | 'columna', r: number, c: number): string {
        if (modo === 'fila') {
            return `${this.numALetras(r)}${c}`;
        }
        return `${this.numALetras(c)}${r}`;
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
