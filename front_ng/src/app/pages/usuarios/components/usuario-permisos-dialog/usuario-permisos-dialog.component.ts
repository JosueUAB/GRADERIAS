import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Usuario, Permiso } from '@/app/core/interfaces/usuario.interface';
import { UsuarioService } from '@/app/core/services/usuario.service';

@Component({
    selector: 'app-usuario-permisos-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        ToggleSwitchModule,
        InputTextModule,
        IconFieldModule,
        InputIconModule
    ],
    templateUrl: './usuario-permisos-dialog.component.html'
})
export class UsuarioPermisosDialogComponent implements OnChanges {
    private usuarioService = inject(UsuarioService);

    @Input() visible: boolean = false;
    @Input() usuario: Usuario | null = null;
    @Input() catalogoPermisos: Permiso[] = [];
    @Input() cargando: boolean = false;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() guardar = new EventEmitter<{ userId: number; permissionIds: number[] }>();
    @Output() cancelar = new EventEmitter<void>();

    listaPermisos: Permiso[] = [];
    filtroTexto: string = '';

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible && this.usuario) {
            this.cargarPermisosUsuario();
        }
    }

    cargarPermisosUsuario(): void {
        if (!this.usuario) return;

        // IDs asignados actualmente
        const asignadosIds = (this.usuario.permissions || []).map(p => p.id);

        this.listaPermisos = this.catalogoPermisos.map(p => ({
            ...p,
            checked: asignadosIds.includes(p.id)
        }));
    }

    get totalPermisosSeleccionados(): number {
        return this.listaPermisos.filter(p => p.checked).length;
    }

    get permisosFiltrados(): Permiso[] {
        if (!this.filtroTexto.trim()) {
            return this.listaPermisos;
        }
        const query = this.filtroTexto.trim().toLowerCase();
        return this.listaPermisos.filter(p => p.name.toLowerCase().includes(query));
    }

    marcarTodos(estado: boolean): void {
        this.listaPermisos.forEach(p => (p.checked = estado));
    }

    obtenerIconoPermiso(nombre: string): string {
        const n = nombre.toLowerCase();
        if (n.includes('dash')) return 'pi pi-chart-pie';
        if (n.includes('graderia')) return 'pi pi-th-large';
        if (n.includes('usuario')) return 'pi pi-users';
        if (n.includes('venta') || n.includes('boleto')) return 'pi pi-ticket';
        if (n.includes('reporte')) return 'pi pi-file-pdf';
        return 'pi pi-lock';
    }

    obtenerDescripcionPermiso(nombre: string): string {
        const n = nombre.toLowerCase();
        if (n.includes('dash')) return 'Acceso al panel de estadísticas y resúmenes generales.';
        if (n.includes('graderia')) return 'Creación, diseño matricial y gestión de venta de butacas.';
        if (n.includes('usuario')) return 'Administración de cuentas, roles, permisos y credenciales.';
        return 'Permiso de operación en el sistema.';
    }

    guardarPermisos(): void {
        if (!this.usuario) return;

        const idsSeleccionados = this.listaPermisos.filter(p => p.checked).map(p => p.id);
        this.guardar.emit({
            userId: this.usuario.id,
            permissionIds: idsSeleccionados
        });
    }

    cerrar(): void {
        this.visible = false;
        this.visibleChange.emit(false);
        this.cancelar.emit();
    }
}
