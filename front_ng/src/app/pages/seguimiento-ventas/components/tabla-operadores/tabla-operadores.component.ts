import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { SeguimientoVentasStore } from '@/app/core/store/seguimiento-ventas.store';
import { AuthStore } from '@/app/core/store/auth.store';
import { UsuarioService } from '@/app/core/services/usuario.service';
import { UsuarioVentaStat } from '@/app/core/interfaces/seguimiento-ventas.interface';

@Component({
    selector: 'app-tabla-operadores',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        ButtonModule,
        TagModule,
        TooltipModule,
        ProgressBarModule
    ],
    templateUrl: './tabla-operadores.component.html'
})
export class TablaOperadoresComponent {
    store = inject(SeguimientoVentasStore);
    authStore = inject(AuthStore);
    private usuarioService = inject(UsuarioService);

    obtenerAvatar(avatar?: string | null): string {
        return this.usuarioService.obtenerUrlAvatar(avatar) || 'assets/layout/images/avatar.png';
    }

    verDetalle(usuario: UsuarioVentaStat): void {
        this.store.abrirDetalleOperador(usuario.id);
    }

    formatMoney(val: number | null | undefined): string {
        return Number(val || 0).toFixed(2);
    }
}
