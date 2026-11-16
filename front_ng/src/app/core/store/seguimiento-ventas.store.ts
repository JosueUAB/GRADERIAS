import { Injectable, computed, inject, signal } from '@angular/core';
import { SeguimientoVentasService } from '../services/seguimiento-ventas.service';
import { NotificacionService } from '../services/notificacion.service';
import {
    ResumenGlobalVentas,
    UsuarioVentaStat,
    AuditoriaAsiento,
    GraderiaFiltro,
    FiltrosSeguimiento,
    DetalleUsuarioVentasResponse,
    ReporteDiarioResponse,
    DiaVentaItem,
    UsuarioReporteDiarioItem,
    AsientoDetalleItem,
    FiltrosReporteDiario
} from '../interfaces/seguimiento-ventas.interface';

@Injectable({
    providedIn: 'root'
})
export class SeguimientoVentasStore {
    private apiService = inject(SeguimientoVentasService);
    private notificacion = inject(NotificacionService);

    // Estado reactivo principal
    readonly cargando = signal<boolean>(false);
    readonly resumenGlobal = signal<ResumenGlobalVentas | null>(null);
    readonly usuarios = signal<UsuarioVentaStat[]>([]);
    readonly auditoriaAsientos = signal<AuditoriaAsiento[]>([]);
    readonly graderiasFiltro = signal<GraderiaFiltro[]>([]);

    // Filtros activos generales
    readonly filtros = signal<FiltrosSeguimiento>({
        user_id: null,
        graderia_id: null,
        estado: 'ALL',
        fecha_desde: null,
        fecha_hasta: null,
        search: ''
    });

    // Detalle modal por usuario
    readonly cargandoDetalle = signal<boolean>(false);
    readonly usuarioDetalle = signal<DetalleUsuarioVentasResponse | null>(null);
    readonly dialogDetalleVisible = signal<boolean>(false);

    // --- ESTADO REPORTE DE INGRESOS DIARIOS ---
    readonly cargandoDiario = signal<boolean>(false);
    readonly reporteDiario = signal<ReporteDiarioResponse | null>(null);
    readonly filtrosDiario = signal<FiltrosReporteDiario>({
        user_id: null,
        graderia_id: null,
        fecha_desde: null,
        fecha_hasta: null,
        search: ''
    });

    // Modal detalle de butacas de un día específico
    readonly dialogDiaDetalleVisible = signal<boolean>(false);
    readonly diaDetalleSeleccionado = signal<{
        fecha: string;
        asientos: AsientoDetalleItem[];
        totalRecaudado: number;
        totalButacas: number;
    } | null>(null);

    // Computados reactivos
    readonly totalOperadoresConVentas = computed(() =>
        this.usuarios().filter(u => u.total_recaudado > 0).length
    );

    readonly rankingOperadores = computed(() =>
        [...this.usuarios()].sort((a, b) => b.total_recaudado - a.total_recaudado)
    );

    readonly totalRecaudadoGlobal = computed(() =>
        this.resumenGlobal()?.total_recaudado ?? 0
    );

    readonly totalReservadoGlobal = computed(() =>
        this.resumenGlobal()?.total_reservado_monto ?? 0
    );

    readonly totalButacasVendidas = computed(() =>
        this.resumenGlobal()?.total_pagados ?? 0
    );

    readonly totalButacasReservadas = computed(() =>
        this.resumenGlobal()?.total_reservados ?? 0
    );

    readonly totalCapacidad = computed(() =>
        this.resumenGlobal()?.capacidad_total ?? 0
    );

    readonly porcentajeOcupacion = computed(() =>
        this.resumenGlobal()?.porcentaje_ocupacion ?? 0
    );

    // Computados reactivos para el reporte de ingresos diarios
    readonly diasVenta = computed<DiaVentaItem[]>(() =>
        this.reporteDiario()?.dias ?? []
    );

    readonly usuariosDiario = computed<UsuarioReporteDiarioItem[]>(() =>
        this.reporteDiario()?.usuarios ?? []
    );

    readonly totalRecaudadoDiario = computed(() =>
        this.reporteDiario()?.resumen?.total_recaudado ?? 0
    );

    readonly totalButacasDiario = computed(() =>
        this.reporteDiario()?.resumen?.total_butacas ?? 0
    );

    readonly diasActivosDiario = computed(() =>
        this.reporteDiario()?.resumen?.dias_activos ?? 0
    );

    readonly promedioRecaudacionDiaria = computed(() =>
        this.reporteDiario()?.resumen?.promedio_diario ?? 0
    );

    readonly diaPico = computed(() =>
        this.reporteDiario()?.resumen?.dia_pico ?? null
    );

    readonly ventasHoy = computed(() =>
        this.reporteDiario()?.resumen?.hoy ?? null
    );

    readonly asientosDetalle = computed<AsientoDetalleItem[]>(() =>
        this.reporteDiario()?.asientos_detalle ?? []
    );

    /**
     * Carga o recarga los datos consolidados de ventas aplicando los filtros actuales.
     */
    cargarSeguimiento(filtrosExtra?: Partial<FiltrosSeguimiento>, callback?: () => void): void {
        this.cargando.set(true);

        const currentFiltros = { ...this.filtros(), ...(filtrosExtra || {}) };
        this.filtros.set(currentFiltros);

        this.apiService.obtenerSeguimiento(currentFiltros).subscribe({
            next: (data) => {
                this.resumenGlobal.set(data.resumen_global);
                this.usuarios.set(data.usuarios);
                this.auditoriaAsientos.set(data.auditoria_asientos);
                this.graderiasFiltro.set(data.graderias_filtro);
                this.cargando.set(false);
                if (callback) callback();
            },
            error: (err) => {
                this.cargando.set(false);
                this.notificacion.error(
                    'Error al cargar ventas',
                    err?.error?.message || 'No se pudo obtener el consolidado de ventas.'
                );
            }
        });
    }

    /**
     * Actualiza filtros y ejecuta recarga
     */
    actualizarFiltros(parciales: Partial<FiltrosSeguimiento>): void {
        const nuevos = { ...this.filtros(), ...parciales };
        this.cargarSeguimiento(nuevos);
    }

    /**
     * Reinicia los filtros a su estado por defecto
     */
    limpiarFiltros(): void {
        const porDefecto: FiltrosSeguimiento = {
            user_id: null,
            graderia_id: null,
            estado: 'ALL',
            fecha_desde: null,
            fecha_hasta: null,
            search: ''
        };
        this.filtros.set(porDefecto);
        this.cargarSeguimiento(porDefecto);
    }

    /**
     * Consulta el desglose individual de un operador y abre el modal
     */
    abrirDetalleOperador(userId: number): void {
        this.cargandoDetalle.set(true);
        this.dialogDetalleVisible.set(true);
        this.usuarioDetalle.set(null);

        this.apiService.obtenerDetalleUsuario(userId).subscribe({
            next: (res) => {
                this.usuarioDetalle.set(res);
                this.cargandoDetalle.set(false);
            },
            error: (err) => {
                this.cargandoDetalle.set(false);
                this.dialogDetalleVisible.set(false);
                this.notificacion.error(
                    'Error al cargar detalle',
                    err?.error?.message || 'No se pudo cargar el historial del usuario.'
                );
            }
        });
    }

    /**
     * Cierra el modal de detalle
     */
    cerrarDetalleOperador(): void {
        this.dialogDetalleVisible.set(false);
        this.usuarioDetalle.set(null);
    }

    /**
     * Carga o actualiza el reporte de ingresos diarios y totales por usuario.
     */
    cargarReporteDiario(filtrosExtra?: Partial<FiltrosReporteDiario>, callback?: () => void): void {
        this.cargandoDiario.set(true);

        const currentFiltros = { ...this.filtrosDiario(), ...(filtrosExtra || {}) };
        this.filtrosDiario.set(currentFiltros);

        this.apiService.obtenerReporteDiario(currentFiltros).subscribe({
            next: (data) => {
                this.reporteDiario.set(data);
                this.cargandoDiario.set(false);
                if (callback) callback();
            },
            error: (err) => {
                this.cargandoDiario.set(false);
                this.notificacion.error(
                    'Error al cargar reporte diario',
                    err?.error?.message || 'No se pudo obtener el reporte de ingresos diarios.'
                );
            }
        });
    }

    /**
     * Aplica filtros al reporte de ingresos diarios
     */
    actualizarFiltrosDiario(parciales: Partial<FiltrosReporteDiario>): void {
        const nuevos = { ...this.filtrosDiario(), ...parciales };
        this.cargarReporteDiario(nuevos);
    }

    /**
     * Reinicia los filtros del reporte diario
     */
    limpiarFiltrosDiario(): void {
        const porDefecto: FiltrosReporteDiario = {
            user_id: null,
            graderia_id: null,
            fecha_desde: null,
            fecha_hasta: null,
            search: ''
        };
        this.filtrosDiario.set(porDefecto);
        this.cargarReporteDiario(porDefecto);
    }

    /**
     * Abre el modal de auditoría de butacas vendidas en un día en particular.
     */
    abrirDetalleDia(fecha: string, operadorId?: number): void {
        let asientos = this.asientosDetalle().filter(a => a.fecha_pago === fecha);
        if (operadorId) {
            asientos = asientos.filter(a => a.operador_id === operadorId);
        }

        const totalRecaudado = asientos.reduce((sum, a) => sum + Number(a.monto || 0), 0);

        this.diaDetalleSeleccionado.set({
            fecha,
            asientos,
            totalRecaudado,
            totalButacas: asientos.length
        });
        this.dialogDiaDetalleVisible.set(true);
    }

    /**
     * Cierra el modal de auditoría por día
     */
    cerrarDetalleDia(): void {
        this.dialogDiaDetalleVisible.set(false);
        this.diaDetalleSeleccionado.set(null);
    }
}
