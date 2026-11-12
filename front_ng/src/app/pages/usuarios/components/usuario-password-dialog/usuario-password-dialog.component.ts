import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { InputTextModule } from 'primeng/inputtext';
import { Usuario, AdminResetPasswordDTO } from '@/app/core/interfaces/usuario.interface';

@Component({
    selector: 'app-usuario-password-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        DialogModule,
        ButtonModule,
        PasswordModule,
        InputTextModule
    ],
    templateUrl: './usuario-password-dialog.component.html'
})
export class UsuarioPasswordDialogComponent implements OnChanges {
    private fb = inject(FormBuilder);

    @Input() visible: boolean = false;
    @Input() usuario: Usuario | null = null;
    @Input() cargando: boolean = false;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() confirmar = new EventEmitter<{ userId: number; dto: AdminResetPasswordDTO }>();
    @Output() cancelar = new EventEmitter<void>();

    form: FormGroup = this.fb.group({
        password: ['', [Validators.required, Validators.minLength(6)]],
        password_confirmation: ['', [Validators.required]],
        reason: ['']
    }, { validators: this.validarContraseñasCoinciden });

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.form.reset({
                password: '',
                password_confirmation: '',
                reason: ''
            });
        }
    }

    validarContraseñasCoinciden(control: AbstractControl): ValidationErrors | null {
        const pass = control.get('password')?.value;
        const confirm = control.get('password_confirmation')?.value;
        if (pass && confirm && pass !== confirm) {
            return { noCoincide: true };
        }
        return null;
    }

    enviarFormulario(): void {
        if (this.form.invalid || !this.usuario) {
            this.form.markAllAsTouched();
            return;
        }

        const dto: AdminResetPasswordDTO = {
            password: this.form.value.password,
            password_confirmation: this.form.value.password_confirmation,
            reason: this.form.value.reason?.trim() || undefined
        };

        this.confirmar.emit({
            userId: this.usuario.id,
            dto
        });
    }

    cerrar(): void {
        this.visible = false;
        this.visibleChange.emit(false);
        this.cancelar.emit();
    }
}
