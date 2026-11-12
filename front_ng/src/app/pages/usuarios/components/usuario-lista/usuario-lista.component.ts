import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Usuario, Permiso } from '@/app/core/interfaces/usuario.interface';
import { UsuarioService } from '@/app/core/services/usuario.service';

@Component({
    selector: 'app-usuario-lista',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        TagModule,
        TooltipModule,
        IconFieldModule,
        InputIconModule,
        InputTextModule
    ],
    templateUrl: './usuario-lista.component.html'
})
export class UsuarioListaComponent {
    usuarioService = inject(UsuarioService);

    @Input() usuarios: Usuario[] = [];
    @Input() cargando: boolean = false;
    @Input() usuarioActualId: number = 0;

    @Output() crearNuevo = new EventEmitter<void>();
    @Output() editarUsuario = new EventEmitter<Usuario>();
    @Output() cambiarPassword = new EventEmitter<Usuario>();
    @Output() cambiarAvatar = new EventEmitter<Usuario>();
    @Output() gestionarPermisos = new EventEmitter<Usuario>();
    @Output() eliminarUsuario = new EventEmitter<Usuario>();
    @Output() filtrar = new EventEmitter<string>();
    @Output() refrescar = new EventEmitter<void>();

    filtroTexto: string = '';

    onFiltroChange(valor: string): void {
        this.filtrar.emit(valor);
    }

    onRefrescar(): void {
        this.refrescar.emit();
    }

    obtenerIniciales(nombre?: string): string {
        if (!nombre) return 'U';
        const partes = nombre.trim().split(/\s+/);
        if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
        return (partes[0][0] + partes[1][0]).toUpperCase();
    }

    obtenerSeveridadRol(rol?: string): 'danger' | 'info' | 'success' | 'warn' | 'secondary' {
        if (!rol) return 'secondary';
        const r = rol.toLowerCase();
        if (r.includes('admin')) return 'danger';
        if (r.includes('soporte')) return 'info';
        if (r.includes('operador')) return 'success';
        if (r.includes('cliente')) return 'warn';
        return 'secondary';
    }

    obtenerListaPermisosTooltip(permisos?: Permiso[]): string {
        if (!permisos || !permisos.length) return '';
        return permisos.map(p => `• ${p.name}`).join('\n');
    }
}
