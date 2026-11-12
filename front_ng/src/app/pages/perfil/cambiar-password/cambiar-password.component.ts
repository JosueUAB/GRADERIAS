import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { UsuarioService } from '@/app/core/services/usuario.service';
import { NotificacionService } from '@/app/core/services/notificacion.service';
import { AuthStore } from '@/app/core/store/auth.store';

@Component({
    selector: 'app-cambiar-password',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        PasswordModule
    ],
    templateUrl: './cambiar-password.component.html'
})
export class CambiarPasswordComponent {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private usuarioService = inject(UsuarioService);
    private notificacion = inject(NotificacionService);
    private authStore = inject(AuthStore);

    cargando: boolean = false;

    form: FormGroup = this.fb.group({
        current_password: ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        password_confirmation: ['', [Validators.required]]
    }, { validators: this.validarContraseñasCoinciden });

    validarContraseñasCoinciden(control: AbstractControl): ValidationErrors | null {
        const pass = control.get('password')?.value;
        const confirm = control.get('password_confirmation')?.value;
        if (pass && confirm && pass !== confirm) {
            return { noCoincide: true };
        }
        return null;
    }

    enviarCambioPassword(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.cargando = true;
        const raw = this.form.value;

        this.usuarioService.cambiarMiPassword({
            current_password: raw.current_password,
            password: raw.password,
            password_confirmation: raw.password_confirmation
        }).subscribe({
            next: (res) => {
                this.cargando = false;
                this.notificacion.exito(res.message || 'Contraseña actualizada. Inicia sesión con tus nuevas credenciales.');
                this.authStore.cerrarSesionLocal(true);
            },
            error: (err) => {
                this.cargando = false;
                const msg = err.error?.message || 'Error al cambiar la contraseña actual';
                this.notificacion.error(msg, 'Seguridad');
            }
        });
    }

    volver(): void {
        this.router.navigate(['/']);
    }
}
