import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SeguimientoVentasStore } from '@/app/core/store/seguimiento-ventas.store';
import { AuthStore } from '@/app/core/store/auth.store';
import { UsuarioService } from '@/app/core/services/usuario.service';
import { ReportePdfService } from '@/app/core/services/reporte-pdf.service';
import { DialogDetalleDiaComponent } from '../dialog-detalle-dia/dialog-detalle-dia.component';

@Component({
    selector: 'app-reporte-ingresos-diarios',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        SelectModule,
        SelectButtonModule,
        InputTextModule,
        IconFieldModule,
        InputIconModule,
        ProgressBarModule,
        TagModule,
        TooltipModule,
        DialogDetalleDiaComponent
    ],
    templateUrl: './reporte-ingresos-diarios.component.html'
})
export class ReporteIngresosDiariosComponent implements OnInit {
    store = inject(SeguimientoVentasStore);
    authStore = inject(AuthStore);
    private usuarioService = inject(UsuarioService);
    private reportePdf = inject(ReportePdfService);

    // Modo de agrupación activo
    modoVista = signal<'dias' | 'usuarios'>('dias');

    modosVistaOpciones = [
        { label: 'Evolución Cronológica por Día', value: 'dias', icon: 'pi pi-calendar' },
        { label: 'Desglose y Totales por Operador', value: 'usuarios', icon: 'pi pi-users' }
    ];

    // Preset activo
    presetActivo = signal<'hoy' | 'ayer' | '7dias' | '30dias' | 'todo'>('todo');

    // Filtros locales
    filtroFechaDesde: string = '';
    filtroFechaHasta: string = '';
    filtroUserId: number | null = null;
    filtroGraderiaId: number | null = null;
    filtroBusquedaLocal: string = '';

    ngOnInit(): void {
        this.store.cargarReporteDiario();
    }

    aplicarPreset(preset: 'hoy' | 'ayer' | '7dias' | '30dias' | 'todo'): void {
        this.presetActivo.set(preset);
        const hoy = new Date();

        const toIso = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        if (preset === 'hoy') {
            const f = toIso(hoy);
            this.filtroFechaDesde = f;
            this.filtroFechaHasta = f;
        } else if (preset === 'ayer') {
            const ayer = new Date(hoy);
            ayer.setDate(ayer.getDate() - 1);
            const f = toIso(ayer);
            this.filtroFechaDesde = f;
            this.filtroFechaHasta = f;
        } else if (preset === '7dias') {
            const d7 = new Date(hoy);
            d7.setDate(d7.getDate() - 6);
            this.filtroFechaDesde = toIso(d7);
            this.filtroFechaHasta = toIso(hoy);
        } else if (preset === '30dias') {
            const d30 = new Date(hoy);
            d30.setDate(d30.getDate() - 29);
            this.filtroFechaDesde = toIso(d30);
            this.filtroFechaHasta = toIso(hoy);
        } else {
            // Todo el historial
            this.filtroFechaDesde = '';
            this.filtroFechaHasta = '';
        }

        this.onFiltrar();
    }

    onFiltrar(): void {
        this.store.actualizarFiltrosDiario({
            user_id: this.filtroUserId,
            graderia_id: this.filtroGraderiaId,
            fecha_desde: this.filtroFechaDesde || null,
            fecha_hasta: this.filtroFechaHasta || null
        });
    }

    limpiarFiltros(): void {
        this.presetActivo.set('todo');
        this.filtroFechaDesde = '';
        this.filtroFechaHasta = '';
        this.filtroUserId = null;
        this.filtroGraderiaId = null;
        this.filtroBusquedaLocal = '';
        this.store.limpiarFiltrosDiario();
    }

    recargar(): void {
        this.store.cargarReporteDiario();
    }

    exportarPdf(): void {
        const reporte = this.store.reporteDiario();
        if (!reporte) return;

        let rangoTexto = 'Histórico Completo';
        if (this.filtroFechaDesde && this.filtroFechaHasta) {
            rangoTexto = `${this.filtroFechaDesde} al ${this.filtroFechaHasta}`;
        } else if (this.filtroFechaDesde) {
            rangoTexto = `Desde ${this.filtroFechaDesde}`;
        } else if (this.filtroFechaHasta) {
            rangoTexto = `Hasta ${this.filtroFechaHasta}`;
        }

        const supervisor = this.authStore.usuario()?.name || 'Administración';
        this.reportePdf.generarPdfReporteDiario(reporte, rangoTexto, supervisor, true);
    }

    verButacasDia(fecha: string, operadorId?: number): void {
        this.store.abrirDetalleDia(fecha, operadorId);
    }

    verDetalleOperador(userId: number): void {
        this.store.abrirDetalleOperador(userId);
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
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return fechaStr;
        }
    }
}
