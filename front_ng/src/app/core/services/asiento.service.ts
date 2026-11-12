import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { Asiento, ActualizarAsientoDTO, ActualizarBulkAsientosDTO } from '../interfaces/asiento.interface';

@Injectable({
    providedIn: 'root'
})
export class AsientoService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    /**
     * Actualiza el estado y datos de un asiento individual.
     */
    actualizarUno(graderiaId: number, asientoId: number, dto: ActualizarAsientoDTO): Observable<{ ok: boolean; asiento: Asiento }> {
        return this.http.patch<{ ok: boolean; asiento: Asiento }>(
            `${this.apiUrl}/mis-graderias/${graderiaId}/asientos/${asientoId}`,
            dto
        );
    }

    /**
     * Actualiza masivamente una selección de asientos (distribuyendo monto total si aplica).
     */
    actualizarBulk(graderiaId: number, dto: ActualizarBulkAsientosDTO): Observable<{ ok: boolean; updated: Asiento[] }> {
        return this.http.post<{ ok: boolean; updated: Asiento[] }>(
            `${this.apiUrl}/mis-graderias/${graderiaId}/asientos/bulk`,
            dto
        );
    }
}
