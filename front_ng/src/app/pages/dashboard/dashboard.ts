import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { AuthStore } from '@/app/core/store/auth.store';
import { SeguimientoVentasStore } from '@/app/core/store/seguimiento-ventas.store';
import { GraderiaService } from '@/app/core/services/graderia.service';
import { UsuarioService } from '@/app/core/services/usuario.service';
import { ReportePdfService } from '@/app/core/services/reporte-pdf.service';
import { NotificacionService } from '@/app/core/services/notificacion.service';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import { Asiento } from '@/app/core/interfaces/asiento.interface';
import { DialogDetalleOperadorComponent } from '../seguimiento-ventas/components/dialog-detalle-operador/dialog-detalle-operador.component';
import { DialogDetalleDiaComponent } from '../seguimiento-ventas/components/dialog-detalle-dia/dialog-detalle-dia.component';
import { GraderiaReportesDialogComponent } from '../graderias/components/graderia-reportes-dialog/graderia-reportes-dialog.component';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        TableModule,
        ButtonModule,
        TagModule,
        ProgressBarModule,
        TooltipModule,
        DialogDetalleOperadorComponent,
        DialogDetalleDiaComponent,
        GraderiaReportesDialogComponent
    ],
    templateUrl: './dashboard.component.html'
})
export class Dashboard implements OnInit {
    authStore = inject(AuthStore);
    store = inject(SeguimientoVentasStore);
    private graderiaService = inject(GraderiaService);
    private usuarioService = inject(UsuarioService);
    private reportePdf = inject(ReportePdfService);
    private notificacion = inject(NotificacionService);

    misGraderias = signal<Graderia[]>([]);
    cargandoGraderias = signal<boolean>(false);

    // Diálogo de Reportes de Gradería
    modalReportesVisible = signal<boolean>(false);
    graderiaSeleccionadaReporte = signal<Graderia | null>(null);
    asientosSeleccionadosReporte = signal<Asiento[]>([]);

    ngOnInit(): void {
        this.cargarTodo();
    }

    cargarTodo(): void {
        this.store.cargarSeguimiento();
        this.store.cargarReporteDiario();
        this.cargarMisGraderias();
    }

    cargarMisGraderias(): void {
        this.cargandoGraderias.set(true);
        this.graderiaService.listar().subscribe({
            next: (data) => {
                this.misGraderias.set(data);
                this.cargandoGraderias.set(false);
            },
            error: () => {
                this.cargandoGraderias.set(false);
            }
        });
    }

    abrirReporteGraderia(graderia: Graderia): void {
        this.graderiaSeleccionadaReporte.set(graderia);
        this.graderiaService.obtenerVenta(graderia.id).subscribe({
            next: (res) => {
                this.asientosSeleccionadosReporte.set(res.asientos as Asiento[]);
                this.modalReportesVisible.set(true);
            },
            error: () => {
                this.asientosSeleccionadosReporte.set([]);
                this.modalReportesVisible.set(true);
            }
        });
    }

    abrirReportesConsolidado(): void {
        this.graderiaSeleccionadaReporte.set(null);
        this.asientosSeleccionadosReporte.set([]);
        this.modalReportesVisible.set(true);
    }

    abrirDetalleOperador(userId: number): void {
        this.store.abrirDetalleOperador(userId);
    }

    abrirDetalleDia(fecha: string): void {
        this.store.abrirDetalleDia(fecha);
    }

    copiarLinkPublico(code?: string): void {
        if (!code) return;
        const url = `${window.location.origin}/g/${code}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                this.notificacion.exito(`Enlace público copiado: ${url}`);
            });
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

    exportarConsolidadoPdf(): void {
        const resumen = this.store.resumenGlobal();
        if (!resumen) return;
        const supervisor = this.authStore.usuario()?.name || 'Administración Central';
        this.reportePdf.generarPdfSeguimientoOperadores(resumen, this.store.usuarios(), supervisor, true);
    }

    exportarReporteDiarioPdf(): void {
        const reporte = this.store.reporteDiario();
        if (!reporte) return;
        const supervisor = this.authStore.usuario()?.name || 'Administración Central';
        this.reportePdf.generarPdfReporteDiario(reporte, 'Histórico Completo', supervisor, true);
    }

    obtenerAvatar(avatar?: string | null): string {
        return this.usuarioService.obtenerUrlAvatar(avatar) || 'assets/layout/images/avatar.png';
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
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return fechaStr;
        }
    }

    getFechaActualFormateada(): string {
        const hoy = new Date();
        return hoy.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}
