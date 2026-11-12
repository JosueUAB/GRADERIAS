import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap, catchError, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { CredencialesLogin, EstadoAuth } from '../interfaces/auth.interface';
import { Usuario } from '../interfaces/usuario.interface';

const TOKEN_KEY = 'tokenTicket';
const USER_KEY = 'userTicket';

function obtenerTokenInicial(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(TOKEN_KEY);
    }
    return null;
}

function obtenerUsuarioInicial(): Usuario | null {
    if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(USER_KEY);
        if (raw) {
            try {
                return JSON.parse(raw);
            } catch {
                return null;
            }
        }
    }
    return null;
}

@Injectable({
    providedIn: 'root'
})
export class AuthStore {
    private authService = inject(AuthService);
    private router = inject(Router);

    // Estado inicial síncrono desde LocalStorage (disponible desde el primer frame)
    private tokenInicial = obtenerTokenInicial();
    private usuarioInicial = obtenerUsuarioInicial();

    // Estado reactivo principal (Redux Signal State)
    private readonly estado = signal<EstadoAuth>({
        usuario: this.usuarioInicial,
        token: this.tokenInicial,
        permisos: this.extraerPermisos(this.usuarioInicial),
        estaAutenticado: !!this.tokenInicial,
        cargando: false,
        error: null
    });

    constructor() {
        // Validación silenciosa en segundo plano solo si existe un token
        if (this.tokenInicial) {
            this.cargarPerfil();
        }
    }

    // Selectores públicos computados (Readonly Getters)
    readonly estadoActual = this.estado.asReadonly();
    readonly usuario = computed(() => this.estado().usuario);
    readonly token = computed(() => this.estado().token);
    readonly permisos = computed(() => this.estado().permisos);
    readonly estaAutenticado = computed(() => this.estado().estaAutenticado);
    readonly cargando = computed(() => this.estado().cargando);
    readonly error = computed(() => this.estado().error);

    readonly nombreUsuario = computed(() => this.usuario()?.name || this.usuario()?.username || 'Usuario');
    readonly rol = computed(() => this.usuario()?.role || 'Usuario');
    readonly esAdmin = computed(() => (this.rol() || '').toLowerCase() === 'administrador');

    /**
     * Valida si el usuario actual cuenta con un permiso específico.
     */
    tienePermiso(permiso: string): boolean {
        if (this.esAdmin()) return true;
        return this.permisos().includes(permiso);
    }

    // ACCIONES (Redux-style Dispatchers)

    /**
     * Inicia sesión, actualiza el estado y persiste el token.
     */
    iniciarSesion(credenciales: CredencialesLogin, onSuccess?: () => void, onError?: (mensaje: string) => void) {
        this.estado.update((prev) => ({ ...prev, cargando: true, error: null }));

        return this.authService.login(credenciales).pipe(
            tap((respuesta) => {
                const permisos = this.extraerPermisos(respuesta.user);

                // Persistir en LocalStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem(TOKEN_KEY, respuesta.token);
                    localStorage.setItem(USER_KEY, JSON.stringify(respuesta.user));
                }

                // Mutación atómica del estado
                this.tokenInicial = respuesta.token;
                this.usuarioInicial = respuesta.user;

                this.estado.set({
                    usuario: respuesta.user,
                    token: respuesta.token,
                    permisos,
                    estaAutenticado: true,
                    cargando: false,
                    error: null
                });

                if (onSuccess) onSuccess();
                this.router.navigate(['/']);
            }),
            catchError((err) => {
                const mensaje = err?.error?.message || 'Credenciales inválidas o error de conexión';
                this.estado.update((prev) => ({
                    ...prev,
                    cargando: false,
                    error: mensaje
                }));

                if (onError) onError(mensaje);
                return of(null);
            })
        ).subscribe();
    }

    /**
     * Recarga silenciosamente los datos del perfil activo desde el backend sin interrumpir la sesión.
     */
    cargarPerfil() {
        if (!this.tokenInicial) return;

        this.authService.obtenerPerfil().pipe(
            tap((usuario) => {
                const permisos = this.extraerPermisos(usuario);
                if (typeof window !== 'undefined') {
                    localStorage.setItem(USER_KEY, JSON.stringify(usuario));
                }
                this.estado.update((prev) => ({
                    ...prev,
                    usuario,
                    permisos,
                    estaAutenticado: true
                }));
            }),
            catchError((err: HttpErrorResponse) => {
                // SOLO cerrar sesión si el backend responde con un 401 Unauthenticated explícito.
                // Errores de red temporales (status 0), timeouts o caídas momentáneas del servidor NUNCA deben cerrar la sesión.
                if (err && err.status === 401) {
                    this.cerrarSesionLocal();
                }
                return of(null);
            })
        ).subscribe();
    }

    /**
     * Cierra la sesión en el backend y limpia el estado local.
     */
    cerrarSesion() {
        this.estado.update((prev) => ({ ...prev, cargando: true }));
        this.authService.logout().pipe(
            tap(() => this.cerrarSesionLocal()),
            catchError(() => {
                this.cerrarSesionLocal();
                return of(null);
            })
        ).subscribe();
    }

    /**
     * Limpieza inmediata del estado y almacenamiento local.
     */
    cerrarSesionLocal(redirigir: boolean = true) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }

        this.tokenInicial = null;
        this.usuarioInicial = null;

        this.estado.set({
            usuario: null,
            token: null,
            permisos: [],
            estaAutenticado: false,
            cargando: false,
            error: null
        });

        const currentPath = typeof window !== 'undefined' ? window.location.pathname : this.router.url;
        if (redirigir && !currentPath.startsWith('/g/')) {
            this.router.navigate(['/auth/login']);
        }
    }

    limpiarError() {
        this.estado.update((prev) => ({ ...prev, error: null }));
    }

    private extraerPermisos(usuario: Usuario | null): string[] {
        if (!usuario || !usuario.permissions) return [];
        return usuario.permissions.map((p) => p.name);
    }
}
