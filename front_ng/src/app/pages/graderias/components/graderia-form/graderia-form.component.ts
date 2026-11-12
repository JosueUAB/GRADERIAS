import { Component, EventEmitter, inject, input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Graderia, CrearGraderiaDTO, ActualizarGraderiaDTO } from '@/app/core/interfaces/graderia.interface';
import { GraderiaStore } from '@/app/core/store/graderia.store';
import { NotificacionService } from '@/app/core/services/notificacion.service';
import { GraderiaPreviewMatrizComponent } from '../graderia-preview-matriz/graderia-preview-matriz.component';

@Component({
    selector: 'app-graderia-form',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        ToggleSwitchModule,
        GraderiaPreviewMatrizComponent
    ],
    templateUrl: './graderia-form.component.html'
})
export class GraderiaFormComponent implements OnInit {
    store = inject(GraderiaStore);
    notificacion = inject(NotificacionService);

    visible = input<boolean>(false);
    graderia = input<Graderia | null>(null);

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() guardado = new EventEmitter<Graderia>();

    nombre: string = '';
    direccion: string = '';
    filas: number = 10;
    columnas: number = 20;
    etiquetaModo: 'fila' | 'columna' = 'fila';
    startTop: boolean = true;
    startLeft: boolean = true;
    activo: boolean = true;
    regenerarAsientos: boolean = false;

    readonly opcionesModo = [
        { label: 'Filas con Letras: A1, A2, B1, B2...', value: 'fila' },
        { label: 'Columnas con Letras: A1, B1, C1, D1...', value: 'columna' }
    ];

    get visibleModel(): boolean {
        return this.visible();
    }
    set visibleModel(v: boolean) {
        this.visibleChange.emit(v);
    }

    esEdicion = signal<boolean>(false);

    ngOnInit() {
        this.cargarDatos();
    }

    ngOnChanges() {
        this.cargarDatos();
    }

    cargarDatos() {
        const g = this.graderia();
        if (g) {
            this.esEdicion.set(true);
            this.nombre = g.nombre || '';
            this.direccion = g.direccion || '';
            this.filas = Number(g.filas) || 10;
            this.columnas = Number(g.columnas) || 20;
            this.etiquetaModo = g.etiqueta_modo || 'fila';
            this.startTop = !!g.start_top;
            this.startLeft = !!g.start_left;
            this.activo = !!g.activo;
            this.regenerarAsientos = false;
        } else {
            this.esEdicion.set(false);
            this.nombre = '';
            this.direccion = '';
            this.filas = 10;
            this.columnas = 20;
            this.etiquetaModo = 'fila';
            this.startTop = true;
            this.startLeft = true;
            this.activo = true;
            this.regenerarAsientos = false;
        }
    }

    modificarFilas(delta: number) {
        const nuevo = (this.filas || 1) + delta;
        this.filas = Math.max(1, Math.min(nuevo, 500));
    }

    modificarColumnas(delta: number) {
        const nuevo = (this.columnas || 1) + delta;
        this.columnas = Math.max(1, Math.min(nuevo, 500));
    }

    aplicarPreset(f: number, c: number) {
        this.filas = f;
        this.columnas = c;
    }

    guardar() {
        if (!this.nombre.trim()) {
            this.notificacion.advertencia('Ingresa un nombre para la gradería');
            return;
        }

        if (this.esEdicion() && this.graderia()) {
            const dto: ActualizarGraderiaDTO = {
                nombre: this.nombre.trim(),
                direccion: this.direccion.trim(),
                filas: this.filas,
                columnas: this.columnas,
                etiqueta_modo: this.etiquetaModo,
                start_top: this.startTop,
                start_left: this.startLeft,
                activo: this.activo,
                regenerar_asientos: this.regenerarAsientos
            };

            this.store.actualizar(
                this.graderia()!.id,
                dto,
                (actualizada) => {
                    this.notificacion.exito(`Gradería "${actualizada.nombre}" actualizada con éxito.`);
                    this.guardado.emit(actualizada);
                    this.cerrar();
                },
                (err) => this.notificacion.error(err)
            );
        } else {
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

            this.store.crear(
                dto,
                (nueva) => {
                    this.notificacion.exito(`Gradería "${nueva.nombre}" creada con ${nueva.capacidad_total} asientos.`);
                    this.guardado.emit(nueva);
                    this.cerrar();
                },
                (err) => this.notificacion.error(err)
            );
        }
    }

    cerrar() {
        this.visibleChange.emit(false);
    }
}
