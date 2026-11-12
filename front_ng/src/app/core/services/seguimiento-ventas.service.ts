import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import {
    SeguimientoVentasResponse,
    DetalleUsuarioVentasResponse,
    FiltrosSeguimiento
} from '../interfaces/seguimiento-ventas.interface';

@Injectable({
    providedIn: 'root'
})
export class SeguimientoVentasService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    /**
     * Obtiene el resumen global, el listado de ventas por operador y la auditoría de asientos.
     */
    obtenerSeguimiento(filtros?: FiltrosSeguimiento): Observable<SeguimientoVentasResponse> {
        let params = new HttpParams();

        if (filtros) {
            if (filtros.user_id) {
                params = params.set('user_id', filtros.user_id.toString());
            }
            if (filtros.graderia_id) {
                params = params.set('graderia_id', filtros.graderia_id.toString());
            }
            if (filtros.estado) {
                params = params.set('estado', filtros.estado);
            }
            if (filtros.fecha_desde) {
                params = params.set('fecha_desde', filtros.fecha_desde);
            }
            if (filtros.fecha_hasta) {
                params = params.set('fecha_hasta', filtros.fecha_hasta);
            }
            if (filtros.search && filtros.search.trim() !== '') {
                params = params.set('search', filtros.search.trim());
            }
        }

        return this.http.get<SeguimientoVentasResponse>(`${this.apiUrl}/ventas/seguimiento`, { params });
    }

    /**
     * Obtiene el detalle desglosado de ventas, graderías y asientos de un usuario específico.
     */
    obtenerDetalleUsuario(userId: number): Observable<DetalleUsuarioVentasResponse> {
        return this.http.get<DetalleUsuarioVentasResponse>(`${this.apiUrl}/ventas/usuario/${userId}`);
    }
}
