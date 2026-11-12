import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SeguimientoVentasStore } from '@/app/core/store/seguimiento-ventas.store';
import { AuditoriaAsiento } from '@/app/core/interfaces/seguimiento-ventas.interface';

@Component({
    selector: 'app-tabla-auditoria-asientos',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        TagModule,
        ButtonModule,
        TooltipModule
    ],
    templateUrl: './tabla-auditoria-asientos.component.html'
})
export class TablaAuditoriaAsientosComponent {
    store = inject(SeguimientoVentasStore);

    getEstadoSeverity(estado: string): 'success' | 'warn' | 'danger' | 'info' {
        switch (estado) {
            case 'PAGADO': return 'success';
            case 'RESERVADO': return 'warn';
            case 'BLOQUEADO': return 'danger';
            default: return 'info';
        }
    }

    formatMoney(val: number | null | undefined): string {
        return Number(val || 0).toFixed(2);
    }
}
