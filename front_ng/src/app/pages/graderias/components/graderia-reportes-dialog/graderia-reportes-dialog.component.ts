import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import { Asiento } from '@/app/core/interfaces/asiento.interface';
import {
    ReporteDiarioResponse,
    DetalleUsuarioVentasResponse
} from '@/app/core/interfaces/seguimiento-ventas.interface';
import { SeguimientoVentasService } from '@/app/core/services/seguimiento-ventas.service';
import { ReportePdfService } from '@/app/core/services/reporte-pdf.service';
import { AuthStore } from '@/app/core/store/auth.store';
import { NotificacionService } from '@/app/core/services/notificacion.service';

@Component({
    selector: 'app-graderia-reportes-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        SelectButtonModule,
        ButtonModule,
        TableModule,
        ProgressBarModule,
        TagModule,
        TooltipModule
    ],
    templateUrl: './graderia-reportes-dialog.component.html'
})
export class GraderiaReportesDialogComponent {
    visible = input<boolean>(false);
    graderiaActual = input<Graderia | null>(null);
    asientosGraderiaActual = input<Asiento[]>([]);
    onClose = output<void>();

    private seguimientoVentasService = inject(SeguimientoVentasService);
    private reportePdfService = inject(ReportePdfService);
    authStore = inject(AuthStore);
    private notificacion = inject(NotificacionService);

    modoAmbito = signal<'esta' | 'todas'>('esta');

    opcionesAmbito = [
        { label: 'Esta Gradería', value: 'esta', icon: 'pi pi-building' },
        { label: 'Todas Mis Graderías (Consolidado)', value: 'todas', icon: 'pi pi-objects-column' }
    ];

    cargando = signal<boolean>(false);
    reporteDiarioEsta = signal<ReporteDiarioResponse | null>(null);
    detalleUsuarioTodas = signal<DetalleUsuarioVentasResponse | null>(null);
    reporteDiarioTodas = signal<ReporteDiarioResponse | null>(null);

    // Métricas calculadas para Esta Gradería
    totalRecaudadoEsta = computed(() => {
        return this.asientosGraderiaActual().reduce((sum, a) => {
            if (a.estado === 'PAGADO') return sum + (Number(a.monto) || 0);
            return sum;
        }, 0);
    });

    totalPagadosEsta = computed(() =>
        this.asientosGraderiaActual().filter(a => a.estado === 'PAGADO').length
    );

    totalReservadosEsta = computed(() =>
        this.asientosGraderiaActual().filter(a => a.estado === 'RESERVADO').length
    );

    totalReservadoMontoEsta = computed(() => {
        return this.asientosGraderiaActual().reduce((sum, a) => {
            if (a.estado === 'RESERVADO') return sum + (Number(a.monto) || 0);
            return sum;
        }, 0);
    });

    totalLibresEsta = computed(() =>
        this.asientosGraderiaActual().filter(a => a.estado === 'LIBRE').length
    );

    capacidadEsta = computed(() =>
        this.asientosGraderiaActual().length
    );

    porcentajeOcupacionEsta = computed(() => {
        const cap = this.capacidadEsta();
        if (cap === 0) return 0;
        return Math.round(((this.totalPagadosEsta() + this.totalReservadosEsta()) / cap) * 100);
    });

    diasEsta = computed(() =>
        this.reporteDiarioEsta()?.dias ?? []
    );

    // Métricas calculadas para Todas Mis Graderías
    resumenTodas = computed(() =>
        this.detalleUsuarioTodas()?.resumen ?? null
    );

    graderiasTodas = computed(() =>
        this.detalleUsuarioTodas()?.graderias ?? []
    );

    diasTodas = computed(() =>
        this.reporteDiarioTodas()?.dias ?? []
    );

    constructor() {
        effect(() => {
            if (this.visible()) {
                this.cargarDatos();
            }
        });
    }

    cargarDatos(): void {
        this.cargando.set(true);
        const gActual = this.graderiaActual();
        const uId = this.authStore.usuario()?.id;

        // 1. Cargar reporte diario de ESTA gradería
        if (gActual?.id) {
            this.seguimientoVentasService.obtenerReporteDiario({ graderia_id: gActual.id }).subscribe({
                next: (res) => {
                    this.reporteDiarioEsta.set(res);
                },
                error: () => {
                    this.reporteDiarioEsta.set(null);
                }
            });
        }

        // 2. Cargar detalle consolidado de TODAS las graderías del usuario
        if (uId) {
            this.seguimientoVentasService.obtenerDetalleUsuario(uId).subscribe({
                next: (res) => {
                    this.detalleUsuarioTodas.set(res);
                },
                error: () => {
                    this.detalleUsuarioTodas.set(null);
                }
            });

            // 3. Cargar reporte diario consolidado de TODAS las graderías del usuario
            this.seguimientoVentasService.obtenerReporteDiario().subscribe({
                next: (res) => {
                    this.reporteDiarioTodas.set(res);
                    this.cargando.set(false);
                },
                error: () => {
                    this.cargando.set(false);
                }
            });
        } else {
            this.cargando.set(false);
        }
    }

    descargarPdfEstaGraderia(): void {
        const g = this.graderiaActual();
        if (!g) return;

        const usuario = this.authStore.usuario()?.name || 'Administración';
        this.reportePdfService.generarPdfReporteGraderiaIndividual(
            g,
            this.asientosGraderiaActual(),
            this.reporteDiarioEsta(),
            usuario,
            true
        );
        this.notificacion.exito(`Reporte de ${g.nombre} descargado en PDF.`);
    }

    descargarPdfTodasGraderias(): void {
        const detalle = this.detalleUsuarioTodas();
        if (!detalle) return;

        const usuario = this.authStore.usuario()?.name || 'Administración';
        this.reportePdfService.generarPdfReporteTodasGraderias(
            usuario,
            detalle,
            this.reporteDiarioTodas(),
            true
        );
        this.notificacion.exito('Reporte consolidado de todas tus graderías descargado en PDF.');
    }

    descargarPdfClientesEstaGraderia(): void {
        const g = this.graderiaActual();
        if (!g) return;
        const usuario = this.authStore.usuario()?.name || 'Administración';
        this.reportePdfService.generarPdfPorClientes(g, this.asientosGraderiaActual(), usuario, true);
    }

    cerrar(): void {
        this.onClose.emit();
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
}
