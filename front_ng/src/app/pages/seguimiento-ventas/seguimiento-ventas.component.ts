import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { SeguimientoVentasStore } from '@/app/core/store/seguimiento-ventas.store';
import { AuthStore } from '@/app/core/store/auth.store';
import { ReportePdfService } from '@/app/core/services/reporte-pdf.service';
import { TablaOperadoresComponent } from './components/tabla-operadores/tabla-operadores.component';
import { TablaAuditoriaAsientosComponent } from './components/tabla-auditoria-asientos/tabla-auditoria-asientos.component';
import { DialogDetalleOperadorComponent } from './components/dialog-detalle-operador/dialog-detalle-operador.component';

@Component({
    selector: 'app-seguimiento-ventas',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        SelectModule,
        SelectButtonModule,
        InputTextModule,
        IconFieldModule,
        InputIconModule,
        ProgressBarModule,
        TooltipModule,
        TablaOperadoresComponent,
        TablaAuditoriaAsientosComponent,
        DialogDetalleOperadorComponent
    ],
    templateUrl: './seguimiento-ventas.component.html'
})
export class SeguimientoVentasComponent implements OnInit {
    store = inject(SeguimientoVentasStore);
    authStore = inject(AuthStore);
    reportePdf = inject(ReportePdfService);

    vistaActiva = signal<'operadores' | 'auditoria'>('operadores');

    vistasOpciones = [
        { label: 'Rendimiento por Operador', value: 'operadores', icon: 'pi pi-users' },
        { label: 'Auditoría Global de Butacas', value: 'auditoria', icon: 'pi pi-history' }
    ];

    // Filtros locales
    filtroGraderiaId: number | null = null;
    filtroEstado: string = 'ALL';
    filtroSearch: string = '';
    filtroFechaDesde: string = '';
    filtroFechaHasta: string = '';

    estadosOpciones = [
        { label: 'Todos los estados', value: 'ALL' },
        { label: 'Pagados (Ventas efectivas)', value: 'PAGADO' },
        { label: 'Reservados (Por cobrar)', value: 'RESERVADO' },
        { label: 'Bloqueados', value: 'BLOQUEADO' },
        { label: 'Libres', value: 'LIBRE' }
    ];

    ngOnInit(): void {
        this.store.cargarSeguimiento();
    }

    onFiltrar(): void {
        this.store.actualizarFiltros({
            graderia_id: this.filtroGraderiaId,
            estado: this.filtroEstado,
            search: this.filtroSearch,
            fecha_desde: this.filtroFechaDesde || null,
            fecha_hasta: this.filtroFechaHasta || null
        });
    }

    onLimpiarFiltros(): void {
        this.filtroGraderiaId = null;
        this.filtroEstado = 'ALL';
        this.filtroSearch = '';
        this.filtroFechaDesde = '';
        this.filtroFechaHasta = '';
        this.store.limpiarFiltros();
    }

    recargar(): void {
        this.store.cargarSeguimiento();
    }

    exportarConsolidadoPdf(): void {
        const resumen = this.store.resumenGlobal();
        if (!resumen) return;

        const supervisor = this.authStore.usuario()?.name || 'Administrador General';
        this.reportePdf.generarPdfSeguimientoOperadores(resumen, this.store.usuarios(), supervisor, true);
    }

    formatMoney(val: number | null | undefined): string {
        return Number(val || 0).toFixed(2);
    }
}
