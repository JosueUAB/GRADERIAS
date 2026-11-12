import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import {
    Usuario,
    Permiso,
    CrearUsuarioDTO,
    ActualizarUsuarioDTO,
    CambiarPasswordDTO,
    AdminResetPasswordDTO
} from '../interfaces/usuario.interface';

@Injectable({
    providedIn: 'root'
})
export class UsuarioService {
    private http = inject(HttpClient);
    private baseUrl = environment.apiUrl;

    /**
     * Obtiene el listado completo de usuarios con sus permisos Spatie asignados
     */
    obtenerUsuarios(): Observable<Usuario[]> {
        return this.http.get<Usuario[]>(`${this.baseUrl}/users`);
    }

    /**
     * Registra un nuevo usuario en el sistema
     */
    crearUsuario(dto: CrearUsuarioDTO): Observable<Usuario> {
        return this.http.post<Usuario>(`${this.baseUrl}/users`, dto);
    }

    /**
     * Actualiza los datos generales de un usuario
     */
    actualizarUsuario(id: number, dto: ActualizarUsuarioDTO): Observable<Usuario> {
        return this.http.put<Usuario>(`${this.baseUrl}/users/${id}`, dto);
    }

    /**
     * Elimina un usuario del sistema
     */
    eliminarUsuario(id: number): Observable<{ message?: string }> {
        return this.http.delete<{ message?: string }>(`${this.baseUrl}/users/${id}`);
    }

    /**
     * Actualización simple de contraseña por ID
     */
    actualizarPassword(id: number, password: string): Observable<Usuario> {
        return this.http.put<Usuario>(`${this.baseUrl}/updatePassword/${id}`, { password });
    }

    /**
     * Reseteo administrativo de contraseña con confirmación (revoca sesiones del usuario)
     */
    adminResetPassword(id: number, dto: AdminResetPasswordDTO): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.baseUrl}/users/${id}/password-reset`, dto);
    }

    /**
     * Sube y procesa la imagen de avatar del usuario (Intervention Image en el backend)
     */
    actualizarAvatar(userId: number, archivo: File): Observable<{ message: string; avatar: string }> {
        const formData = new FormData();
        formData.append('avatar', archivo);
        return this.http.post<{ message: string; avatar: string }>(`${this.baseUrl}/${userId}/avatar`, formData);
    }

    /**
     * Obtiene el catálogo global de permisos Spatie disponibles
     */
    obtenerPermisos(): Observable<Permiso[]> {
        return this.http.get<Permiso[]>(`${this.baseUrl}/permissions`);
    }

    /**
     * Obtiene los IDs de los permisos asignados a un usuario específico
     */
    obtenerPermisosUsuario(userId: number): Observable<number[]> {
        return this.http.get<number[]>(`${this.baseUrl}/users/${userId}/permissions`);
    }

    /**
     * Sincroniza atómicamente los permisos Spatie de un usuario
     */
    sincronizarPermisosUsuario(userId: number, permissions: number[]): Observable<string[]> {
        return this.http.put<string[]>(`${this.baseUrl}/users/${userId}/permissions`, { permissions });
    }

    /**
     * Cambio de contraseña personal del usuario autenticado (cierra sesiones previas)
     */
    cambiarMiPassword(dto: CambiarPasswordDTO): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.baseUrl}/me/password`, dto);
    }

    /**
     * Retorna la URL absoluta para el avatar del usuario o un placeholder si no existe
     */
    obtenerUrlAvatar(avatar?: string | null): string {
        if (!avatar) {
            return '';
        }
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            return avatar;
        }
        const serverBase = this.baseUrl.replace(/\/api\/?$/, '');
        return `${serverBase}/images/${avatar}`;
    }
}
