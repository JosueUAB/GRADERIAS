import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import { GraderiaStore } from '@/app/core/store/graderia.store';
import { GraderiaListaComponent } from './components/graderia-lista/graderia-lista.component';
import { GraderiaFormComponent } from './components/graderia-form/graderia-form.component';
import { GraderiaDetalleComponent } from './components/graderia-detalle/graderia-detalle.component';

@Component({
    selector: 'app-graderias',
    standalone: true,
    imports: [
        CommonModule,
        GraderiaListaComponent,
        GraderiaFormComponent,
        GraderiaDetalleComponent
    ],
    templateUrl: './graderias.component.html'
})
export class GraderiasComponent implements OnInit {
    store = inject(GraderiaStore);

    modalFormVisible = signal<boolean>(false);
    modalDetalleVisible = signal<boolean>(false);
    graderiaSeleccionada = signal<Graderia | null>(null);

    ngOnInit(): void {
        this.store.cargarGraderias();
    }

    abrirCrear(): void {
        this.graderiaSeleccionada.set(null);
        this.modalFormVisible.set(true);
    }

    abrirEditar(graderia: Graderia): void {
        this.graderiaSeleccionada.set(graderia);
        this.modalFormVisible.set(true);
    }

    abrirDetalle(graderia: Graderia): void {
        this.graderiaSeleccionada.set(graderia);
        this.modalDetalleVisible.set(true);
    }

    onFormVisibleChange(visible: boolean): void {
        this.modalFormVisible.set(visible);
    }

    onGuardadoExitoso(graderia?: Graderia): void {
        this.store.cargarGraderias();
        this.modalFormVisible.set(false);
    }
}
