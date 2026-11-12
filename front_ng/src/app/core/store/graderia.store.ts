import { computed, inject, Injectable, signal } from '@angular/core';
import { tap, catchError, of } from 'rxjs';
import { GraderiaService } from '../services/graderia.service';
import {
    Graderia,
    CrearGraderiaDTO,
    ActualizarGraderiaDTO,
    GraderiaDetalleRespuesta
} from '../interfaces/graderia.interface';

interface EstadoGraderia {
    items: Graderia[];
    seleccionada: Graderia | null;
    detalleActual: GraderiaDetalleRespuesta | null;
    cargando: boolean;
    guardando: boolean;
    error: string | null;
    filtro: string;
}

@Injectable({
    providedIn: 'root'
})
export class GraderiaStore {
    private service = inject(GraderiaService);

    // Estado principal en Signal (Redux Immutable State)
    private readonly estado = signal<EstadoGraderia>({
        items: [],
        seleccionada: null,
        detalleActual: null,
        cargando: false,
        guardando: false,
        error: null,
        filtro: ''
    });

    // Selectores Computados (Readonly Getters)
    readonly items = computed(() => this.estado().items);
    readonly cargando = computed(() => this.estado().cargando);
    readonly guardando = computed(() => this.estado().guardando);
    readonly error = computed(() => this.estado().error);
    readonly filtro = computed(() => this.estado().filtro);
    readonly seleccionada = computed(() => this.estado().seleccionada);
    readonly detalleActual = computed(() => this.estado().detalleActual);

    // Métricas y estadísticas reactivas
    readonly totalGraderias = computed(() => this.items().length);

    readonly capacidadTotalAcumulada = computed(() =>
        this.items().reduce((total, g) => total + (Number(g.capacidad_total) || Number(g.filas) * Number(g.columnas) || 0), 0)
    );

    readonly totalActivas = computed(() =>
        this.items().filter((g) => g.activo).length
    );

    readonly itemsFiltrados = computed(() => {
        const query = this.filtro().toLowerCase().trim();
        if (!query) return this.items();
        return this.items().filter(
            (g) =>
                (g.nombre && g.nombre.toLowerCase().includes(query)) ||
                (g.direccion && g.direccion.toLowerCase().includes(query)) ||
                (g.code && g.code.toLowerCase().includes(query)) ||
                (g.codigo && g.codigo.toLowerCase().includes(query))
        );
    });

    // ACCIONES (Dispatchers)

    setFiltro(query: string) {
        this.estado.update((prev) => ({ ...prev, filtro: query }));
    }

    seleccionar(graderia: Graderia | null) {
        this.estado.update((prev) => ({ ...prev, seleccionada: graderia }));
    }

    cargarGraderias() {
        this.estado.update((prev) => ({ ...prev, cargando: true, error: null }));

        return this.service.listar().pipe(
            tap((items) => {
                this.estado.update((prev) => ({
                    ...prev,
                    items,
                    cargando: false
                }));
            }),
            catchError((err) => {
                const msg = err?.error?.message || 'Error al cargar las graderías';
                this.estado.update((prev) => ({
                    ...prev,
                    cargando: false,
                    error: msg
                }));
                return of([]);
            })
        ).subscribe();
    }

    cargarDetalle(id: number) {
        this.estado.update((prev) => ({ ...prev, cargando: true }));

        return this.service.obtenerDetalle(id).pipe(
            tap((detalle) => {
                this.estado.update((prev) => ({
                    ...prev,
                    detalleActual: detalle,
                    seleccionada: detalle.graderia,
                    cargando: false
                }));
            }),
            catchError((err) => {
                const msg = err?.error?.message || 'Error al obtener el detalle de la gradería';
                this.estado.update((prev) => ({
                    ...prev,
                    cargando: false,
                    error: msg
                }));
                return of(null);
            })
        ).subscribe();
    }

    crear(dto: CrearGraderiaDTO, onSuccess?: (g: Graderia) => void, onError?: (msg: string) => void) {
        this.estado.update((prev) => ({ ...prev, guardando: true, error: null }));

        return this.service.crear(dto).pipe(
            tap((nueva) => {
                this.estado.update((prev) => ({
                    ...prev,
                    items: [nueva, ...prev.items],
                    guardando: false
                }));
                if (onSuccess) onSuccess(nueva);
            }),
            catchError((err) => {
                const msg = err?.error?.message || 'No se pudo crear la gradería';
                this.estado.update((prev) => ({ ...prev, guardando: false, error: msg }));
                if (onError) onError(msg);
                return of(null);
            })
        ).subscribe();
    }

    actualizar(id: number, dto: ActualizarGraderiaDTO, onSuccess?: (g: Graderia) => void, onError?: (msg: string) => void) {
        this.estado.update((prev) => ({ ...prev, guardando: true, error: null }));

        return this.service.actualizar(id, dto).pipe(
            tap((res) => {
                this.estado.update((prev) => ({
                    ...prev,
                    items: prev.items.map((item) => (item.id === id ? res.graderia : item)),
                    seleccionada: res.graderia,
                    guardando: false
                }));
                if (onSuccess) onSuccess(res.graderia);
            }),
            catchError((err) => {
                const msg = err?.error?.message || 'No se pudo actualizar la gradería';
                this.estado.update((prev) => ({ ...prev, guardando: false, error: msg }));
                if (onError) onError(msg);
                return of(null);
            })
        ).subscribe();
    }

    eliminar(id: number, onSuccess?: () => void, onError?: (msg: string) => void) {
        return this.service.eliminar(id).pipe(
            tap(() => {
                this.estado.update((prev) => ({
                    ...prev,
                    items: prev.items.filter((item) => item.id !== id),
                    seleccionada: prev.seleccionada?.id === id ? null : prev.seleccionada
                }));
                if (onSuccess) onSuccess();
            }),
            catchError((err) => {
                const msg = err?.error?.message || 'Error al eliminar la gradería';
                if (onError) onError(msg);
                return of(null);
            })
        ).subscribe();
    }

    reparar(id: number, onSuccess?: (res: { count: number; missing: number }) => void, onError?: (msg: string) => void) {
        return this.service.reparar(id).pipe(
            tap((res) => {
                if (onSuccess) onSuccess({ count: res.count, missing: res.missing });
                // Refrescar lista o detalle si está abierto
                this.cargarGraderias();
            }),
            catchError((err) => {
                const msg = err?.error?.message || 'Error al reparar asientos';
                if (onError) onError(msg);
                return of(null);
            })
        ).subscribe();
    }
}
