import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import {
    Graderia,
    CrearGraderiaDTO,
    ActualizarGraderiaDTO,
    GraderiaDetalleRespuesta,
    GraderiaVentaRespuesta
} from '../interfaces/graderia.interface';

@Injectable({
    providedIn: 'root'
})
export class GraderiaService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    /**
     * Obtiene el listado de graderías pertenecientes al usuario actual.
     */
    listar(): Observable<Graderia[]> {
        return this.http.get<Graderia[]>(`${this.apiUrl}/mis-graderias`);
    }

    /**
     * Obtiene el detalle de una gradería junto con su vista previa de asientos.
     */
    obtenerDetalle(id: number, previewRows: number = 30, previewCols: number = 30): Observable<GraderiaDetalleRespuesta> {
        return this.http.get<GraderiaDetalleRespuesta>(`${this.apiUrl}/mis-graderias/${id}`, {
            params: {
                preview_rows: previewRows.toString(),
                preview_cols: previewCols.toString()
            }
        });
    }

    /**
     * Crea una nueva gradería y dispara la generación de butacas en backend.
     */
    crear(dto: CrearGraderiaDTO): Observable<Graderia> {
        return this.http.post<Graderia>(`${this.apiUrl}/mis-graderias`, dto);
    }

    /**
     * Actualiza dimensiones y configuración de una gradería existente.
     */
    actualizar(id: number, dto: ActualizarGraderiaDTO): Observable<{ ok: boolean; graderia: Graderia; asientos_count: number }> {
        return this.http.put<{ ok: boolean; graderia: Graderia; asientos_count: number }>(`${this.apiUrl}/mis-graderias/${id}`, dto);
    }

    /**
     * Elimina lógicamente una gradería.
     */
    eliminar(id: number): Observable<{ ok: boolean }> {
        return this.http.delete<{ ok: boolean }>(`${this.apiUrl}/mis-graderias/${id}`);
    }

    /**
     * Repara y genera butacas faltantes sin eliminar las existentes.
     */
    reparar(id: number): Observable<{ ok: boolean; expected: number; count: number; missing: number }> {
        return this.http.post<{ ok: boolean; expected: number; count: number; missing: number }>(
            `${this.apiUrl}/mis-graderias/${id}/repair`,
            {}
        );
    }

    /**
     * Obtiene la matriz completa de asientos para la consola de venta y reservas.
     */
    obtenerVenta(id: number): Observable<GraderiaVentaRespuesta> {
        return this.http.get<GraderiaVentaRespuesta>(`${this.apiUrl}/mis-graderias/${id}/venta`);
    }

    /**
     * Consulta pública sin autenticación por código alfanumérico.
     */
    obtenerPublica(code: string): Observable<GraderiaVentaRespuesta> {
        return this.http.get<GraderiaVentaRespuesta>(`${this.apiUrl}/public/graderias/${code}`);
    }
}
