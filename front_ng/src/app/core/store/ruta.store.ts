import { computed, inject, Injectable, signal } from '@angular/core';
import { tap, catchError, of } from 'rxjs';
import { RutaService } from '../services/ruta.service';
import { Ruta, CrearRutaDTO } from '../interfaces/ruta.interface';
import { validarPuntoEnRuta } from '../helpers/geo.helper';

interface EstadoRuta {
    rutaActiva: Ruta | null;
    rutas: Ruta[];
    cargando: boolean;
    guardando: boolean;
    error: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class RutaStore {
    private service = inject(RutaService);

    private readonly estado = signal<EstadoRuta>({
        rutaActiva: null,
        rutas: [],
        cargando: false,
        guardando: false,
        error: null
    });

    // Selectores reactivos
    readonly rutaActiva = computed(() => this.estado().rutaActiva);
    readonly rutas = computed(() => this.estado().rutas);
    readonly cargando = computed(() => this.estado().cargando);
    readonly guardando = computed(() => this.estado().guardando);
    readonly error = computed(() => this.estado().error);

    readonly tieneRutaActiva = computed(() => {
        const r = this.estado().rutaActiva;
        return !!r && Array.isArray(r.coordenadas) && r.coordenadas.length >= 2;
    });

    readonly toleranciaMetros = computed(() => {
        return this.estado().rutaActiva?.distancia_tolerancia_metros ?? 50;
    });

    readonly nombreRutaActiva = computed(() => {
        return this.estado().rutaActiva?.nombre ?? 'Ruta Oficial';
    });

    /**
     * Carga la ruta oficial activa desde el backend.
     */
    cargarRutaActiva(callback?: (ruta: Ruta | null) => void): void {
        this.estado.update((s) => ({ ...s, cargando: true, error: null }));

        this.service
            .obtenerActiva()
            .pipe(
                tap((res) => {
                    this.estado.update((s) => ({
                        ...s,
                        rutaActiva: res.ruta,
                        cargando: false
                    }));
                    if (callback) callback(res.ruta);
                }),
                catchError((err) => {
                    const msg = err.error?.message || 'Error al cargar la ruta oficial activa';
                    this.estado.update((s) => ({ ...s, error: msg, cargando: false }));
                    if (callback) callback(null);
                    return of(null);
                })
            )
            .subscribe();
    }

    /**
     * Carga la lista completa de rutas históricas (Solo admin).
     */
    cargarRutas(): void {
        this.estado.update((s) => ({ ...s, cargando: true, error: null }));

        this.service
            .listar()
            .pipe(
                tap((rutas) => {
                    this.estado.update((s) => ({ ...s, rutas, cargando: false }));
                }),
                catchError((err) => {
                    const msg = err.error?.message || 'Error al listar las rutas';
                    this.estado.update((s) => ({ ...s, error: msg, cargando: false }));
                    return of([]);
                })
            )
            .subscribe();
    }

    /**
     * Guarda una nueva ruta trazada y la establece como activa.
     */
    guardarRuta(dto: CrearRutaDTO, onSuccess?: (r: Ruta) => void, onError?: (err: string) => void): void {
        this.estado.update((s) => ({ ...s, guardando: true, error: null }));

        this.service
            .guardar(dto)
            .pipe(
                tap((res) => {
                    this.estado.update((s) => ({
                        ...s,
                        rutaActiva: res.ruta,
                        rutas: [res.ruta, ...s.rutas.map((r) => ({ ...r, activo: false }))],
                        guardando: false
                    }));
                    if (onSuccess) onSuccess(res.ruta);
                }),
                catchError((err) => {
                    const msg = err.error?.message || 'Error al guardar la ruta';
                    this.estado.update((s) => ({ ...s, error: msg, guardando: false }));
                    if (onError) onError(msg);
                    return of(null);
                })
            )
            .subscribe();
    }

    /**
     * Actualiza una ruta existente.
     */
    actualizarRuta(id: number, dto: Partial<CrearRutaDTO>, onSuccess?: (r: Ruta) => void, onError?: (err: string) => void): void {
        this.estado.update((s) => ({ ...s, guardando: true, error: null }));

        this.service
            .actualizar(id, dto)
            .pipe(
                tap((res) => {
                    this.estado.update((s) => ({
                        ...s,
                        rutaActiva: res.ruta.activo ? res.ruta : s.rutaActiva?.id === id ? null : s.rutaActiva,
                        rutas: s.rutas.map((r) => (r.id === id ? res.ruta : r)),
                        guardando: false
                    }));
                    if (onSuccess) onSuccess(res.ruta);
                }),
                catchError((err) => {
                    const msg = err.error?.message || 'Error al actualizar la ruta';
                    this.estado.update((s) => ({ ...s, error: msg, guardando: false }));
                    if (onError) onError(msg);
                    return of(null);
                })
            )
            .subscribe();
    }

    /**
     * Activa una ruta específica.
     */
    activarRuta(id: number, onSuccess?: () => void, onError?: (err: string) => void): void {
        this.service
            .activar(id)
            .pipe(
                tap((res) => {
                    this.estado.update((s) => ({
                        ...s,
                        rutaActiva: res.ruta,
                        rutas: s.rutas.map((r) => ({ ...r, activo: r.id === id }))
                    }));
                    if (onSuccess) onSuccess();
                }),
                catchError((err) => {
                    const msg = err.error?.message || 'Error al activar la ruta';
                    if (onError) onError(msg);
                    return of(null);
                })
            )
            .subscribe();
    }

    /**
     * Elimina una ruta.
     */
    eliminarRuta(id: number, onSuccess?: () => void, onError?: (err: string) => void): void {
        this.service
            .eliminar(id)
            .pipe(
                tap(() => {
                    this.estado.update((s) => ({
                        ...s,
                        rutaActiva: s.rutaActiva?.id === id ? null : s.rutaActiva,
                        rutas: s.rutas.filter((r) => r.id !== id)
                    }));
                    if (onSuccess) onSuccess();
                }),
                catchError((err) => {
                    const msg = err.error?.message || 'Error al eliminar la ruta';
                    if (onError) onError(msg);
                    return of(null);
                })
            )
            .subscribe();
    }

    /**
     * Verifica si un punto (latitud, longitud) está dentro de la ruta activa.
     */
    validarPunto(lat: number, lng: number): { valido: boolean; distancia: number; tolerancia: number; rutaNombre: string } {
        const ruta = this.estado().rutaActiva;
        if (!ruta || !ruta.coordenadas || ruta.coordenadas.length < 2) {
            return {
                valido: true,
                distancia: 0,
                tolerancia: 50,
                rutaNombre: ''
            };
        }

        const res = validarPuntoEnRuta(lat, lng, ruta.coordenadas, ruta.distancia_tolerancia_metros);
        return {
            valido: res.valido,
            distancia: res.distancia,
            tolerancia: ruta.distancia_tolerancia_metros,
            rutaNombre: ruta.nombre
        };
    }
}
