import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { CredencialesLogin, RespuestaLogin } from '../interfaces/auth.interface';
import { Usuario } from '../interfaces/usuario.interface';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    /**
     * Inicia sesión con credenciales de usuario.
     */
    login(credenciales: CredencialesLogin): Observable<RespuestaLogin> {
        return this.http.post<RespuestaLogin>(`${this.apiUrl}/login`, {
            username: credenciales.username,
            password: credenciales.password
        });
    }

    /**
     * Obtiene los datos del usuario autenticado actual y sus permisos.
     */
    obtenerPerfil(): Observable<Usuario> {
        return this.http.get<Usuario>(`${this.apiUrl}/me`);
    }

    /**
     * Cierra la sesión activa revocando el token Sanctum en el backend.
     */
    logout(): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, {});
    }

    /**
     * Cambia la contraseña del usuario conectado.
     */
    cambiarPassword(current_password: string, password: string, password_confirmation: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/me/password`, {
            current_password,
            password,
            password_confirmation
        });
    }
}
