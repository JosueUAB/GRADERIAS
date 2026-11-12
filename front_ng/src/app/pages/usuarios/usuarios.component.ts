import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService } from 'primeng/api';
import { UsuarioStore } from '@/app/core/store/usuario.store';
import { AuthStore } from '@/app/core/store/auth.store';
import { Usuario, CrearUsuarioDTO, ActualizarUsuarioDTO, AdminResetPasswordDTO } from '@/app/core/interfaces/usuario.interface';
import { UsuarioListaComponent } from './components/usuario-lista/usuario-lista.component';
import { UsuarioFormComponent } from './components/usuario-form/usuario-form.component';
import { UsuarioPasswordDialogComponent } from './components/usuario-password-dialog/usuario-password-dialog.component';
import { UsuarioAvatarDialogComponent } from './components/usuario-avatar-dialog/usuario-avatar-dialog.component';
import { UsuarioPermisosDialogComponent } from './components/usuario-permisos-dialog/usuario-permisos-dialog.component';

@Component({
    selector: 'app-usuarios',
    standalone: true,
    imports: [
        CommonModule,
        UsuarioListaComponent,
        UsuarioFormComponent,
        UsuarioPasswordDialogComponent,
        UsuarioAvatarDialogComponent,
        UsuarioPermisosDialogComponent
    ],
    templateUrl: './usuarios.component.html'
})
export class UsuariosComponent implements OnInit {
    usuarioStore = inject(UsuarioStore);
    authStore = inject(AuthStore);
    private confirmationService = inject(ConfirmationService);

    // Estados de diálogos modales
    modalFormVisible: boolean = false;
    modalPasswordVisible: boolean = false;
    modalAvatarVisible: boolean = false;
    modalPermisosVisible: boolean = false;

    usuarioSeleccionado: Usuario | null = null;

    ngOnInit(): void {
        this.usuarioStore.cargarUsuarios();
        this.usuarioStore.cargarPermisos();
    }

    onFiltrar(query: string): void {
        this.usuarioStore.filtro.set(query);
    }

    onRefrescar(): void {
        this.usuarioStore.cargarUsuarios();
        this.usuarioStore.cargarPermisos();
    }

    abrirCreacion(): void {
        this.usuarioSeleccionado = null;
        this.modalFormVisible = true;
    }

    abrirEdicion(usuario: Usuario): void {
        this.usuarioSeleccionado = { ...usuario };
        this.modalFormVisible = true;
    }

    abrirResetPassword(usuario: Usuario): void {
        this.usuarioSeleccionado = { ...usuario };
        this.modalPasswordVisible = true;
    }

    abrirAvatar(usuario: Usuario): void {
        this.usuarioSeleccionado = { ...usuario };
        this.modalAvatarVisible = true;
    }

    abrirPermisos(usuario: Usuario): void {
        this.usuarioSeleccionado = { ...usuario };
        this.modalPermisosVisible = true;
    }

    onGuardarUsuario(payload: { esEdicion: boolean; id?: number; datos: CrearUsuarioDTO | ActualizarUsuarioDTO }): void {
        if (payload.esEdicion && payload.id) {
            this.usuarioStore.actualizarUsuario(payload.id, payload.datos as ActualizarUsuarioDTO, () => {
                this.modalFormVisible = false;
            });
        } else {
            this.usuarioStore.crearUsuario(payload.datos as CrearUsuarioDTO, () => {
                this.modalFormVisible = false;
            });
        }
    }

    onConfirmarResetPassword(payload: { userId: number; dto: AdminResetPasswordDTO }): void {
        this.usuarioStore.adminResetPassword(payload.userId, payload.dto, () => {
            this.modalPasswordVisible = false;
        });
    }

    onSubirAvatar(payload: { userId: number; archivo: File }): void {
        this.usuarioStore.actualizarAvatar(payload.userId, payload.archivo, () => {
            this.modalAvatarVisible = false;
        });
    }

    onGuardarPermisos(payload: { userId: number; permissionIds: number[] }): void {
        this.usuarioStore.sincronizarPermisos(payload.userId, payload.permissionIds, () => {
            this.modalPermisosVisible = false;
        });
    }

    confirmarEliminar(usuario: Usuario): void {
        this.confirmationService.confirm({
            message: `¿Estás seguro de que deseas eliminar permanentemente al usuario "${usuario.name}" (@${usuario.username})? Esta acción no se puede deshacer.`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle text-red-500',
            acceptLabel: 'Sí, Eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger p-button-rounded',
            rejectButtonStyleClass: 'p-button-secondary p-button-rounded p-button-text',
            accept: () => {
                this.usuarioStore.eliminarUsuario(usuario.id);
            }
        });
    }
}
