import { Injectable, computed, inject, signal } from '@angular/core';
import { SeguimientoVentasService } from '../services/seguimiento-ventas.service';
import { NotificacionService } from '../services/notificacion.service';
import {
    ResumenGlobalVentas,
    UsuarioVentaStat,
    AuditoriaAsiento,
    GraderiaFiltro,
    FiltrosSeguimiento,
    DetalleUsuarioVentasResponse
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

    // Filtros activos
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
}
