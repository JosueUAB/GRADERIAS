import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { Ruta, CrearRutaDTO, ValidarPuntoRespuesta } from '../interfaces/ruta.interface';

@Injectable({
    providedIn: 'root'
})
export class RutaService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    /**
     * Obtiene la ruta oficial actualmente activa.
     */
    obtenerActiva(): Observable<{ ruta: Ruta | null; existe: boolean }> {
        return this.http.get<{ ruta: Ruta | null; existe: boolean }>(`${this.apiUrl}/rutas/activa`);
    }

    /**
     * Obtiene la ruta oficial actualmente activa de forma pública (sin autenticación).
     */
    obtenerActivaPublica(): Observable<{ ruta: Ruta | null; existe: boolean }> {
        return this.http.get<{ ruta: Ruta | null; existe: boolean }>(`${this.apiUrl}/public/rutas/activa`);
    }

    /**
     * Lista todas las rutas (Solo Administrador).
     */
    listar(): Observable<Ruta[]> {
        return this.http.get<Ruta[]>(`${this.apiUrl}/rutas`);
    }

    /**
     * Registra una nueva ruta trazada (Solo Administrador).
     */
    guardar(dto: CrearRutaDTO): Observable<{ ok: boolean; message: string; ruta: Ruta }> {
        return this.http.post<{ ok: boolean; message: string; ruta: Ruta }>(`${this.apiUrl}/rutas`, dto);
    }

    /**
     * Actualiza una ruta existente (Solo Administrador).
     */
    actualizar(id: number, dto: Partial<CrearRutaDTO>): Observable<{ ok: boolean; message: string; ruta: Ruta }> {
        return this.http.put<{ ok: boolean; message: string; ruta: Ruta }>(`${this.apiUrl}/rutas/${id}`, dto);
    }

    /**
     * Activa una ruta específica como la oficial.
     */
    activar(id: number): Observable<{ ok: boolean; message: string; ruta: Ruta }> {
        return this.http.post<{ ok: boolean; message: string; ruta: Ruta }>(`${this.apiUrl}/rutas/${id}/activar`, {});
    }

    /**
     * Elimina una ruta (Solo Administrador).
     */
    eliminar(id: number): Observable<{ ok: boolean; message: string }> {
        return this.http.delete<{ ok: boolean; message: string }>(`${this.apiUrl}/rutas/${id}`);
    }

    /**
     * Valida si un punto geográfico está dentro del rango de la ruta activa.
     */
    validarPunto(latitud: number, longitud: number): Observable<ValidarPuntoRespuesta> {
        return this.http.post<ValidarPuntoRespuesta>(`${this.apiUrl}/rutas/validar-punto`, { latitud, longitud });
    }
}
