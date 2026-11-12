import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Usuario } from '@/app/core/interfaces/usuario.interface';
import { UsuarioService } from '@/app/core/services/usuario.service';

@Component({
    selector: 'app-usuario-avatar-dialog',
    standalone: true,
    imports: [
        CommonModule,
        DialogModule,
        ButtonModule
    ],
    templateUrl: './usuario-avatar-dialog.component.html'
})
export class UsuarioAvatarDialogComponent implements OnChanges {
    usuarioService = inject(UsuarioService);

    @Input() visible: boolean = false;
    @Input() usuario: Usuario | null = null;
    @Input() cargando: boolean = false;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() subirAvatar = new EventEmitter<{ userId: number; archivo: File }>();
    @Output() cancelar = new EventEmitter<void>();

    archivoSeleccionado: File | null = null;
    imagenPreviaUrl: string | null = null;
    errorMensaje: string | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.archivoSeleccionado = null;
            this.imagenPreviaUrl = null;
            this.errorMensaje = null;
        }
    }

    obtenerIniciales(nombre?: string): string {
        if (!nombre) return 'U';
        const partes = nombre.trim().split(/\s+/);
        if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
        return (partes[0][0] + partes[1][0]).toUpperCase();
    }

    alSeleccionarArchivo(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || !input.files.length) return;

        const file = input.files[0];
        this.errorMensaje = null;

        // Validar tamaño máximo (3MB)
        if (file.size > 3 * 1024 * 1024) {
            this.errorMensaje = 'El archivo supera el tamaño máximo permitido de 3MB';
            return;
        }

        // Validar tipo de imagen
        if (!file.type.startsWith('image/')) {
            this.errorMensaje = 'Por favor selecciona un archivo de imagen válido (JPG, PNG o WebP)';
            return;
        }

        this.archivoSeleccionado = file;

        // Crear URL de previsualización
        const reader = new FileReader();
        reader.onload = () => {
            this.imagenPreviaUrl = reader.result as string;
        };
        reader.readAsDataURL(file);
    }

    guardarAvatar(): void {
        if (!this.archivoSeleccionado || !this.usuario) return;

        this.subirAvatar.emit({
            userId: this.usuario.id,
            archivo: this.archivoSeleccionado
        });
    }

    cerrar(): void {
        this.visible = false;
        this.visibleChange.emit(false);
        this.cancelar.emit();
    }
}
