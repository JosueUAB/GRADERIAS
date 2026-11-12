import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '@/app/layout/service/layout.service';
import { AuthStore } from '@/app/core/store/auth.store';
import { UsuarioService } from '@/app/core/services/usuario.service';
import { NotificacionService } from '@/app/core/services/notificacion.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [
        RouterModule,
        CommonModule,
        StyleClassModule,
        ButtonModule,
        TagModule,
        TooltipModule,
        AppConfigurator
    ],
    templateUrl: './app.topbar.html'
})
export class AppTopbar {
    layoutService = inject(LayoutService);
    authStore = inject(AuthStore);
    notificacion = inject(NotificacionService);
    private usuarioService = inject(UsuarioService);

    obtenerAvatar(avatar?: string | null): string {
        return this.usuarioService.obtenerUrlAvatar(avatar) || 'assets/layout/images/avatar.png';
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            darkTheme: !state.darkTheme
        }));
    }

    confirmarCerrarSesion() {
        this.notificacion.confirmar({
            titulo: 'Cerrar Sesión',
            mensaje: '¿Estás seguro de que deseas salir del sistema?',
            icono: 'pi pi-power-off text-red-500',
            textoAceptar: 'Salir',
            textoCancelar: 'Permanecer',
            alAceptar: () => {
                this.authStore.cerrarSesion();
                this.notificacion.info('Sesión finalizada exitosamente');
            }
        });
    }
}
