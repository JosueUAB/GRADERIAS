import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Graderia, CrearGraderiaDTO } from '@/app/core/interfaces/graderia.interface';
import { GraderiaStore } from '@/app/core/store/graderia.store';
import { NotificacionService } from '@/app/core/services/notificacion.service';
import { GraderiaPreviewMatrizComponent } from '../graderia-preview-matriz/graderia-preview-matriz.component';

@Component({
    selector: 'app-graderia-disenar-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        ToggleSwitchModule,
        TagModule,
        TooltipModule,
        GraderiaPreviewMatrizComponent
    ],
    templateUrl: './graderia-disenar-page.component.html'
})
export class GraderiaDisenarPageComponent {
    store = inject(GraderiaStore);
    private notificacion = inject(NotificacionService);
    private router = inject(Router);

    nombre: string = '';
    direccion: string = '';
    filas: number = 10;
    columnas: number = 20;
    etiquetaModo: 'fila' | 'columna' = 'fila';
    startTop: boolean = true;
    startLeft: boolean = true;
    activo: boolean = true;

    readonly opcionesModo = [
        { label: 'Filas con Letras: A1, A2, B1, B2...', value: 'fila' },
        { label: 'Columnas con Letras: A1, B1, C1, D1...', value: 'columna' }
    ];

    modificarFilas(delta: number): void {
        const nuevo = (this.filas || 1) + delta;
        this.filas = Math.max(1, Math.min(nuevo, 500));
    }

    modificarColumnas(delta: number): void {
        const nuevo = (this.columnas || 1) + delta;
        this.columnas = Math.max(1, Math.min(nuevo, 500));
    }

    aplicarPreset(f: number, c: number): void {
        this.filas = f;
        this.columnas = c;
    }

    guardar(): void {
        if (!this.nombre.trim()) {
            this.notificacion.advertencia('Ingresa un nombre para la gradería');
            return;
        }

        const dto: CrearGraderiaDTO = {
            nombre: this.nombre.trim(),
            direccion: this.direccion.trim(),
            filas: this.filas,
            columnas: this.columnas,
            etiqueta_modo: this.etiquetaModo,
            start_top: this.startTop,
            start_left: this.startLeft,
            activo: this.activo
        };

        this.store.crear(dto, (creada: Graderia) => {
            const total = creada.capacidad_total || (this.filas * this.columnas);
            this.notificacion.exito(`Gradería "${creada.nombre}" generada con éxito (${total} butacas)`);
            this.router.navigate(['/graderias']);
        });
    }

    volver(): void {
        this.router.navigate(['/graderias']);
    }
}
