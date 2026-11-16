import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { SeguimientoVentasStore } from '@/app/core/store/seguimiento-ventas.store';
import { AsientoDetalleItem } from '@/app/core/interfaces/seguimiento-ventas.interface';

@Component({
    selector: 'app-dialog-detalle-dia',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        TableModule,
        ButtonModule,
        TagModule,
        InputTextModule,
        IconFieldModule,
        InputIconModule,
        TooltipModule
    ],
    templateUrl: './dialog-detalle-dia.component.html'
})
export class DialogDetalleDiaComponent {
    store = inject(SeguimientoVentasStore);

    filtroBusqueda = signal<string>('');

    asientosFiltrados = computed(() => {
        const detalle = this.store.diaDetalleSeleccionado();
        if (!detalle) return [];

        const term = this.filtroBusqueda().trim().toLowerCase();
        if (!term) return detalle.asientos;

        return detalle.asientos.filter(a =>
            a.codigo?.toLowerCase().includes(term) ||
            a.cliente_nombre?.toLowerCase().includes(term) ||
            a.cliente_celular?.toLowerCase().includes(term) ||
            a.graderia_nombre?.toLowerCase().includes(term) ||
            a.operador_nombre?.toLowerCase().includes(term)
        );
    });

    cerrar(): void {
        this.filtroBusqueda.set('');
        this.store.cerrarDetalleDia();
    }

    formatMoney(val: number | null | undefined): string {
        return Number(val || 0).toFixed(2);
    }

    formatearFechaLarga(fechaStr: string | undefined): string {
        if (!fechaStr) return '';
        try {
            const [y, m, d] = fechaStr.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            return date.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return fechaStr;
        }
    }

    abrirWhatsApp(celular?: string, cliente?: string, asiento?: string): void {
        if (!celular) return;
        const clean = celular.replace(/\D/g, '');
        const text = encodeURIComponent(
            `Hola ${cliente || ''}, le saludamos de Graderías Carnaval para confirmar su butaca ${asiento || ''}.`
        );
        window.open(`https://wa.me/591${clean}?text=${text}`, '_blank');
    }
}
