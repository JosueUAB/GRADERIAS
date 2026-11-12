import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { SeguimientoVentasStore } from '@/app/core/store/seguimiento-ventas.store';
import { AuthStore } from '@/app/core/store/auth.store';
import { UsuarioService } from '@/app/core/services/usuario.service';
import { ReportePdfService } from '@/app/core/services/reporte-pdf.service';

@Component({
    selector: 'app-dialog-detalle-operador',
    standalone: true,
    imports: [
        CommonModule,
        DialogModule,
        ButtonModule,
        TagModule,
        TableModule,
        ProgressBarModule
    ],
    templateUrl: './dialog-detalle-operador.component.html'
})
export class DialogDetalleOperadorComponent {
    store = inject(SeguimientoVentasStore);
    authStore = inject(AuthStore);
    reportePdf = inject(ReportePdfService);
    private usuarioService = inject(UsuarioService);

    obtenerAvatar(avatar?: string | null): string {
        return this.usuarioService.obtenerUrlAvatar(avatar) || 'assets/layout/images/avatar.png';
    }

    onCerrar(): void {
        this.store.cerrarDetalleOperador();
    }

    descargarLiquidacionPdf(): void {
        const detalle = this.store.usuarioDetalle();
        if (!detalle) return;

        const supervisorName = this.authStore.usuario()?.name || 'Administrador General';
        this.reportePdf.generarPdfLiquidacionUsuario(detalle, supervisorName, true);
    }

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
