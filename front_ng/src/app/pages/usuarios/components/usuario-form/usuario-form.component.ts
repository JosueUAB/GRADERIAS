import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { Usuario, CrearUsuarioDTO, ActualizarUsuarioDTO } from '@/app/core/interfaces/usuario.interface';

@Component({
    selector: 'app-usuario-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        PasswordModule,
        SelectModule
    ],
    templateUrl: './usuario-form.component.html'
})
export class UsuarioFormComponent implements OnChanges {
    private fb = inject(FormBuilder);

    @Input() visible: boolean = false;
    @Input() usuario: Usuario | null = null;
    @Input() cargando: boolean = false;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() guardar = new EventEmitter<{ esEdicion: boolean; id?: number; datos: CrearUsuarioDTO | ActualizarUsuarioDTO }>();
    @Output() cancelar = new EventEmitter<void>();

    modoEdicion: boolean = false;

    opcionesRoles = [
        { label: 'Administrador (Acceso Total)', value: 'Administrador' },
        { label: 'Soporte Técnico', value: 'Soporte' },
        { label: 'Operador de Boletería', value: 'Operador' },
        { label: 'Cliente Consulta', value: 'Cliente' }
    ];

    form: FormGroup = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(3)]],
        username: ['', [Validators.required, Validators.minLength(3), Validators.pattern('^[a-zA-Z0-9._-]+$')]],
        password: [''],
        role: ['Operador', [Validators.required]],
        telefono_contacto_1: ['', [Validators.pattern('^[0-9]{7,15}$')]],
        telefono_contacto_2: ['', [Validators.pattern('^[0-9]{7,15}$')]]
    });

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.inicializarFormulario();
        }
    }

    inicializarFormulario(): void {
        if (this.usuario && this.usuario.id) {
            this.modoEdicion = true;
            this.form.patchValue({
                name: this.usuario.name || '',
                username: this.usuario.username || '',
                password: '',
                role: this.usuario.role || 'Operador',
                telefono_contacto_1: this.usuario.telefono_contacto_1 || '',
                telefono_contacto_2: this.usuario.telefono_contacto_2 || ''
            });
            this.form.get('password')?.clearValidators();
            this.form.get('password')?.updateValueAndValidity();
        } else {
            this.modoEdicion = false;
            this.form.reset({
                name: '',
                username: '',
                password: '',
                role: 'Operador',
                telefono_contacto_1: '',
                telefono_contacto_2: ''
            });
            this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
            this.form.get('password')?.updateValueAndValidity();
        }
    }

    /**
     * Sanitiza en tiempo real cualquier entrada en teléfonos para que nunca contenga caracteres no numéricos
     */
    filtrarSoloDigitos(campo: 'telefono_contacto_1' | 'telefono_contacto_2', event: Event): void {
        const input = event.target as HTMLInputElement;
        const soloDigitos = input.value.replace(/\D/g, '');
        if (input.value !== soloDigitos) {
            input.value = soloDigitos;
            this.form.get(campo)?.setValue(soloDigitos, { emitEvent: false });
        }
    }

    enviarFormulario(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.value;
        if (this.modoEdicion) {
            const dto: ActualizarUsuarioDTO = {
                name: raw.name?.trim(),
                username: raw.username?.trim(),
                role: raw.role,
                telefono_contacto_1: raw.telefono_contacto_1 ? raw.telefono_contacto_1.trim() : null,
                telefono_contacto_2: raw.telefono_contacto_2 ? raw.telefono_contacto_2.trim() : null
            };
            this.guardar.emit({ esEdicion: true, id: this.usuario!.id, datos: dto });
        } else {
            const dto: CrearUsuarioDTO = {
                name: raw.name?.trim(),
                username: raw.username?.trim(),
                password: raw.password?.trim(),
                role: raw.role,
                telefono_contacto_1: raw.telefono_contacto_1 ? raw.telefono_contacto_1.trim() : null,
                telefono_contacto_2: raw.telefono_contacto_2 ? raw.telefono_contacto_2.trim() : null
            };
            this.guardar.emit({ esEdicion: false, datos: dto });
        }
    }

    cerrar(): void {
        this.visible = false;
        this.visibleChange.emit(false);
        this.cancelar.emit();
    }
}
