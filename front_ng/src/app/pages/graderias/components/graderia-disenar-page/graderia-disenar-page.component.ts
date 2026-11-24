import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Graderia, CrearGraderiaDTO } from '@/app/core/interfaces/graderia.interface';
import { GraderiaStore } from '@/app/core/store/graderia.store';
import { RutaStore } from '@/app/core/store/ruta.store';
import { NotificacionService } from '@/app/core/services/notificacion.service';
import { GraderiaPreviewMatrizComponent } from '../graderia-preview-matriz/graderia-preview-matriz.component';
import { MapaCoordenadasDialogComponent } from '../mapa-coordenadas-dialog/mapa-coordenadas-dialog.component';

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
        GraderiaPreviewMatrizComponent,
        MapaCoordenadasDialogComponent
    ],
    templateUrl: './graderia-disenar-page.component.html'
})
export class GraderiaDisenarPageComponent implements OnInit {
    store = inject(GraderiaStore);
    rutaStore = inject(RutaStore);
    private notificacion = inject(NotificacionService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    nombre: string = '';
    direccion: string = '';
    latitud: number | null = null;
    longitud: number | null = null;
    mostrarMapaPicker: boolean = false;
    filas: number = 10;
    columnas: number = 20;
    etiquetaModo: 'fila' | 'columna' = 'fila';
    startTop: boolean = true;
    startLeft: boolean = true;
    activo: boolean = true;

    ngOnInit(): void {
        this.rutaStore.cargarRutaActiva();

        const qLat = this.route.snapshot.queryParamMap.get('lat');
        const qLng = this.route.snapshot.queryParamMap.get('lng');
        if (qLat && qLng) {
            const parsedLat = Number(qLat);
            const parsedLng = Number(qLng);
            if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                this.latitud = parsedLat;
                this.longitud = parsedLng;
            }
        }
    }

    readonly opcionesModo = [
        { label: 'Filas con Letras: A1, A2, B1, B2...', value: 'fila' },
        { label: 'Columnas con Letras: A1, B1, C1, D1...', value: 'columna' }
    ];

    onCoordenadasConfirmadas(coords: { latitud: number; longitud: number }): void {
        this.latitud = coords.latitud;
        this.longitud = coords.longitud;
    }

    limpiarCoordenadas(): void {
        this.latitud = null;
        this.longitud = null;
    }

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

        if (this.latitud != null && this.longitud != null && this.rutaStore.tieneRutaActiva()) {
            const validacion = this.rutaStore.validarPunto(this.latitud, this.longitud);
            if (!validacion.valido) {
                this.notificacion.advertencia(
                    `Ubicación fuera de rango: la posición está a ${validacion.distancia}m de la ruta oficial (límite permitido: ${validacion.tolerancia}m). Ajusta el punto dentro del área de la ruta.`
                );
                return;
            }
        }

        const dto: CrearGraderiaDTO = {
            nombre: this.nombre.trim(),
            direccion: this.direccion.trim(),
            latitud: this.latitud,
            longitud: this.longitud,
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
