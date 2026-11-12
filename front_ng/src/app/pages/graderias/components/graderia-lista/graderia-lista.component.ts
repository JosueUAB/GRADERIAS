import { Component, EventEmitter, inject, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import { GraderiaStore } from '@/app/core/store/graderia.store';
import { NotificacionService } from '@/app/core/services/notificacion.service';

@Component({
    selector: 'app-graderia-lista',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        TableModule,
        ButtonModule,
        TagModule,
        IconFieldModule,
        InputIconModule,
        InputTextModule,
        TooltipModule,
        BadgeModule
    ],
    templateUrl: './graderia-lista.component.html'
})
export class GraderiaListaComponent {
    store = inject(GraderiaStore);
    notificacion = inject(NotificacionService);

    @Output() crear = new EventEmitter<void>();
    @Output() editar = new EventEmitter<Graderia>();
    @Output() verDetalle = new EventEmitter<Graderia>();

    copiarLink(code: string) {
        const url = `${window.location.origin}/g/${code}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                this.notificacion.exito(`Enlace público copiado: /g/${code}`);
            });
        }
    }

    confirmarEliminar(graderia: Graderia) {
        this.notificacion.confirmar({
            titulo: 'Eliminar Gradería',
            mensaje: `¿Estás seguro de eliminar la gradería "${graderia.nombre}"? Sus asientos dejarán de estar visibles.`,
            icono: 'pi pi-trash text-red-500',
            textoAceptar: 'Sí, Eliminar',
            textoCancelar: 'Cancelar',
            alAceptar: () => {
                this.store.eliminar(
                    graderia.id,
                    () => this.notificacion.exito(`Gradería "${graderia.nombre}" eliminada correctamente.`),
                    (err) => this.notificacion.error(err)
                );
            }
        });
    }
}
