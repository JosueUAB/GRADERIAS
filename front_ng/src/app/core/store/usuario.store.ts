import { Injectable, computed, inject, signal } from '@angular/core';
import { UsuarioService } from '../services/usuario.service';
import {
    Usuario,
    Permiso,
    CrearUsuarioDTO,
    ActualizarUsuarioDTO,
    AdminResetPasswordDTO
} from '../interfaces/usuario.interface';
import { NotificacionService } from '../services/notificacion.service';

@Injectable({
    providedIn: 'root'
})
export class UsuarioStore {
    private usuarioService = inject(UsuarioService);
    private notificacion = inject(NotificacionService);

    // Estado reactivo
    readonly usuarios = signal<Usuario[]>([]);
    readonly cargando = signal<boolean>(false);
    readonly filtro = signal<string>('');
    readonly usuarioSeleccionado = signal<Usuario | null>(null);
    readonly catalogoPermisos = signal<Permiso[]>([]);

    // Computados
    readonly totalUsuarios = computed(() => this.usuarios().length);

    readonly totalAdmins = computed(() =>
        this.usuarios().filter(u => (u.role || '').toLowerCase().includes('admin')).length
    );

    readonly totalOperadores = computed(() =>
        this.usuarios().filter(u => !(u.role || '').toLowerCase().includes('admin')).length
    );

    readonly usuariosFiltrados = computed(() => {
        const query = this.filtro().trim().toLowerCase();
        if (!query) return this.usuarios();

        return this.usuarios().filter(u =>
            (u.name && u.name.toLowerCase().includes(query)) ||
            (u.username && u.username.toLowerCase().includes(query)) ||
            (u.role && u.role.toLowerCase().includes(query)) ||
            (u.telefono_contacto_1 && u.telefono_contacto_1.includes(query)) ||
            (u.telefono_contacto_2 && u.telefono_contacto_2.includes(query))
        );
    });

    /**
     * Carga todos los usuarios desde el backend
     */
    cargarUsuarios(callback?: () => void): void {
        this.cargando.set(true);
        this.usuarioService.obtenerUsuarios().subscribe({
            next: (data) => {
                this.usuarios.set(data);
                this.cargando.set(false);
                if (callback) callback();
            },
            error: (err) => {
                this.cargando.set(false);
                const msg = err.error?.message || 'Error al obtener los usuarios del sistema';
                this.notificacion.error(msg, 'Error de Usuarios');
            }
        });
    }

    /**
     * Carga el catálogo global de permisos Spatie
     */
    cargarPermisos(callback?: (permisos: Permiso[]) => void): void {
        this.usuarioService.obtenerPermisos().subscribe({
            next: (permisos) => {
                this.catalogoPermisos.set(permisos);
                if (callback) callback(permisos);
            },
            error: (err) => {
                const msg = err.error?.message || 'Error al cargar catálogo de permisos';
                this.notificacion.error(msg, 'Catálogo de Permisos');
            }
        });
    }

    /**
     * Crea un nuevo usuario
     */
    crearUsuario(dto: CrearUsuarioDTO, onExito?: () => void, onError?: (err: any) => void): void {
        this.cargando.set(true);
        this.usuarioService.crearUsuario(dto).subscribe({
            next: (nuevo) => {
                this.cargando.set(false);
                this.notificacion.exito(`Usuario "${nuevo.username}" registrado correctamente`);
                this.cargarUsuarios();
                if (onExito) onExito();
            },
            error: (err) => {
                this.cargando.set(false);
                const msg = err.error?.message || 'No fue posible registrar al usuario';
                this.notificacion.error(msg, 'Error al Crear');
                if (onError) onError(err);
            }
        });
    }

    /**
     * Actualiza información de un usuario
     */
    actualizarUsuario(id: number, dto: ActualizarUsuarioDTO, onExito?: () => void, onError?: (err: any) => void): void {
        this.cargando.set(true);
        this.usuarioService.actualizarUsuario(id, dto).subscribe({
            next: () => {
                this.cargando.set(false);
                this.notificacion.exito('Usuario actualizado correctamente');
                this.cargarUsuarios();
                if (onExito) onExito();
            },
            error: (err) => {
                this.cargando.set(false);
                const msg = err.error?.message || 'No fue posible actualizar al usuario';
                this.notificacion.error(msg, 'Error al Actualizar');
                if (onError) onError(err);
            }
        });
    }

    /**
     * Elimina un usuario por su ID
     */
    eliminarUsuario(id: number, onExito?: () => void): void {
        this.cargando.set(true);
        this.usuarioService.eliminarUsuario(id).subscribe({
            next: () => {
                this.cargando.set(false);
                this.notificacion.exito('Usuario eliminado del sistema');
                this.cargarUsuarios();
                if (onExito) onExito();
            },
            error: (err) => {
                this.cargando.set(false);
                const msg = err.error?.message || 'No fue posible eliminar al usuario';
                this.notificacion.error(msg, 'Error al Eliminar');
            }
        });
    }

    /**
     * Reseteo de contraseña de usuario administrado
     */
    adminResetPassword(id: number, dto: AdminResetPasswordDTO, onExito?: () => void): void {
        this.cargando.set(true);
        this.usuarioService.adminResetPassword(id, dto).subscribe({
            next: (res) => {
                this.cargando.set(false);
                this.notificacion.exito(res.message || 'Contraseña reseteada exitosamente');
                if (onExito) onExito();
            },
            error: (err) => {
                this.cargando.set(false);
                const msg = err.error?.message || 'No fue posible resetear la contraseña';
                this.notificacion.error(msg, 'Error al Resetear');
            }
        });
    }

    /**
     * Sube un nuevo avatar para el usuario
     */
    actualizarAvatar(id: number, file: File, onExito?: () => void): void {
        this.cargando.set(true);
        this.usuarioService.actualizarAvatar(id, file).subscribe({
            next: (res) => {
                this.cargando.set(false);
                this.notificacion.exito(res.message || 'Avatar actualizado exitosamente');
                this.cargarUsuarios();
                if (onExito) onExito();
            },
            error: (err) => {
                this.cargando.set(false);
                const msg = err.error?.message || 'Error al subir la imagen del avatar';
                this.notificacion.error(msg, 'Error de Imagen');
            }
        });
    }

    /**
     * Actualiza los permisos Spatie del usuario
     */
    sincronizarPermisos(id: number, permissions: number[], onExito?: () => void): void {
        this.cargando.set(true);
        this.usuarioService.sincronizarPermisosUsuario(id, permissions).subscribe({
            next: () => {
                this.cargando.set(false);
                this.notificacion.exito('Permisos de acceso actualizados');
                this.cargarUsuarios();
                if (onExito) onExito();
            },
            error: (err) => {
                this.cargando.set(false);
                const msg = err.error?.message || 'Error al actualizar permisos';
                this.notificacion.error(msg, 'Error de Permisos');
            }
        });
    }
}
