import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { AppFloatingConfigurator } from '../../layout/component/app.floatingconfigurator';
import { LayoutService } from '../../layout/service/layout.service';
import { AuthStore } from '../../core/store/auth.store';
import { NotificacionService } from '../../core/services/notificacion.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ButtonModule,
        CheckboxModule,
        InputTextModule,
        PasswordModule,
        RippleModule,
        CardModule,
        DialogModule,
        MessageModule,
        TooltipModule,
        AppFloatingConfigurator
    ],
    templateUrl: './login.html'
})
export class Login {
    layoutService = inject(LayoutService);
    authStore = inject(AuthStore);
    notificacion = inject(NotificacionService);

    username: string = '';
    password: string = '';
    rememberMe: boolean = false;

    mostrarDialogoRecuperar = signal<boolean>(false);

    get mostrarDialogoRecuperarVisibilidad(): boolean {
        return this.mostrarDialogoRecuperar();
    }
    set mostrarDialogoRecuperarVisibilidad(valor: boolean) {
        this.mostrarDialogoRecuperar.set(valor);
    }

    readonly anioActual = new Date().getFullYear();

    enviarLogin() {
        if (!this.username || !this.password) {
            this.notificacion.advertencia('Por favor completa tu usuario y contraseña');
            return;
        }

        this.authStore.iniciarSesion(
            {
                username: this.username.trim(),
                password: this.password.trim(),
                rememberMe: this.rememberMe
            },
            () => {
                this.notificacion.exito(`¡Bienvenido, ${this.authStore.nombreUsuario()}!`);
            },
            (errorMsg) => {
                this.notificacion.error(errorMsg, 'Error de autenticación');
            }
        );
    }

    toggleTema() {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            darkTheme: !state.darkTheme
        }));
    }
}
