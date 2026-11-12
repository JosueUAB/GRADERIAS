import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MenuItem } from 'primeng/api';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import { Asiento, EstadoAsiento, ActualizarBulkAsientosDTO } from '@/app/core/interfaces/asiento.interface';
import { GraderiaService } from '@/app/core/services/graderia.service';
import { AsientoService } from '@/app/core/services/asiento.service';
import { NotificacionService } from '@/app/core/services/notificacion.service';
import { ReportePdfService } from '@/app/core/services/reporte-pdf.service';
import { AuthStore } from '@/app/core/store/auth.store';
import { GraderiaTicketDialogComponent } from '../graderia-ticket-dialog/graderia-ticket-dialog.component';
import { GraderiaClientesDialogComponent } from '../graderia-clientes-dialog/graderia-clientes-dialog.component';
import { AsientoEdicionDialogComponent } from '../asiento-edicion-dialog/asiento-edicion-dialog.component';
import { DatosClienteTicket } from '@/app/core/services/ticket-pdf.service';

interface CeldaMatriz {
    r: number;
    c: number;
    codigo: string;
    asiento: Asiento | null;
}

interface FilaMatriz {
    r: number;
    etiqueta: string;
    celdas: CeldaMatriz[];
}

@Component({
    selector: 'app-graderia-venta',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        TagModule,
        DialogModule,
        InputTextModule,
        InputNumberModule,
        SelectButtonModule,
        TooltipModule,
        MenuModule,
        IconFieldModule,
        InputIconModule,
        GraderiaTicketDialogComponent,
        GraderiaClientesDialogComponent,
        AsientoEdicionDialogComponent
    ],
    templateUrl: './graderia-venta.component.html'
})
export class GraderiaVentaComponent implements OnInit {
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    private graderiaService = inject(GraderiaService);
    private asientoService = inject(AsientoService);
    private reportePdfService = inject(ReportePdfService);
    private notificacion = inject(NotificacionService);
    authStore = inject(AuthStore);

    graderiaId: number = 0;
    graderia = signal<Graderia | null>(null);
    asientos = signal<Asiento[]>([]);
    cargando = signal<boolean>(false);
    guardando = signal<boolean>(false);

    // Selección
    seleccionadosIds = signal<number[]>([]);
    mostrarMontoReal = signal<boolean>(false);

    // Formulario Reactivo para Asignación Masiva
    formBulk: FormGroup = this.fb.group({
        estado: ['PAGADO' as EstadoAsiento, [Validators.required]],
        clienteNombre: ['', [Validators.required, Validators.minLength(2)]],
        clienteCelular: ['', [Validators.required, Validators.pattern('^[0-9]{7,15}$')]],
        modoPrecio: ['unitario'],
        precioPorAsiento: [100, [Validators.required, Validators.min(0)]],
        montoTotal: [100, [Validators.required, Validators.min(0)]]
    });

    modalBulkVisible: boolean = false;
    readonly preciosRapidos = [50, 70, 80, 100, 120, 150, 200];

    readonly opcionesEstados = [
        { label: 'Pagado', value: 'PAGADO' },
        { label: 'Reservado', value: 'RESERVADO' },
        { label: 'Libre', value: 'LIBRE' },
        { label: 'Bloqueado', value: 'BLOQUEADO' }
    ];

    // Diálogo Modal de Emisión Post-Venta de Tickets y WhatsApp
    modalTicketVisible: boolean = false;
    asientosVentaExitosa: Asiento[] = [];
    clienteVentaExitosa: DatosClienteTicket = { nombre: '', celular: '', montoTotal: 0 };

    // Diálogo de Clientes y WhatsApp
    modalClientesVisible: boolean = false;

    // Diálogo de Modificar Asiento Individual
    modalEditarAsientoVisible: boolean = false;
    asientoParaEditar: Asiento | null = null;

    // Diálogo de Búsqueda de Asiento por Código
    modalBuscarAsientoVisible: boolean = false;
    codigoBusquedaAsiento: string = '';

    // Menú de Reportes
    itemsMenuReportes: MenuItem[] = [];

    conteos = computed(() => {
        const c = { libre: 0, reservado: 0, pagado: 0, bloqueado: 0 };
        for (const a of this.asientos()) {
            if (a.estado === 'LIBRE') c.libre++;
            else if (a.estado === 'RESERVADO') c.reservado++;
            else if (a.estado === 'PAGADO') c.pagado++;
            else if (a.estado === 'BLOQUEADO') c.bloqueado++;
        }
        return c;
    });

    totalMontoRecaudado = computed(() => {
        return this.asientos().reduce((acc, a) => {
            if (a.estado === 'PAGADO') {
                return acc + (Number(a.monto) || 0);
            }
            return acc;
        }, 0);
    });

    porcentajeLibre = computed(() => {
        const total = this.asientos().length;
        if (!total) return 0;
        return Math.round((this.conteos().libre / total) * 100);
    });

    codigosSeleccionados = computed(() => {
        const ids = new Set(this.seleccionadosIds());
        return this.asientos()
            .filter((a) => ids.has(a.id))
            .map((a) => a.codigo)
            .join(', ');
    });

    matriz = computed<FilaMatriz[]>(() => {
        const g = this.graderia();
        const listaAsientos = this.asientos();
        if (!g) return [];

        const filasCount = Number(g.filas) || 1;
        const colsCount = Number(g.columnas) || 1;
        const modo = g.etiqueta_modo || 'fila';
        const startTop = !!g.start_top;
        const startLeft = !!g.start_left;

        const mapaCodigos = new Map<string, Asiento>();
        for (const a of listaAsientos) {
            mapaCodigos.set(a.codigo, a);
        }

        const ordenFilas = this.generarRango(1, filasCount, startTop);
        const ordenCols = this.generarRango(1, colsCount, startLeft);

        return ordenFilas.map((r) => {
            const etiquetaFila = modo === 'fila' ? this.numALetras(r) : `F${r}`;
            const celdas: CeldaMatriz[] = ordenCols.map((c) => {
                const codigo = modo === 'fila' ? `${this.numALetras(r)}${c}` : `${this.numALetras(c)}${r}`;
                const asiento = mapaCodigos.get(codigo) || null;
                return { r, c, codigo, asiento };
            });

            return { r, etiqueta: etiquetaFila, celdas };
        });
    });

    ngOnInit() {
        this.iniciarMenuReportes();

        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            if (id) {
                this.graderiaId = Number(id);
                this.cargarDatos();
            }
        });
    }

    private iniciarMenuReportes() {
        this.itemsMenuReportes = [
            {
                label: 'Reporte por Clientes (PDF)',
                icon: 'pi pi-users',
                command: () => this.imprimirReporteClientes()
            },
            {
                label: 'Reporte por Asientos (PDF)',
                icon: 'pi pi-table',
                command: () => this.imprimirReporteAsientos()
            }
        ];
    }

    cargarDatos() {
        if (!this.graderiaId) return;
        this.cargando.set(true);

        this.graderiaService.obtenerVenta(this.graderiaId).subscribe({
            next: (res) => {
                this.graderia.set(res.graderia);
                this.asientos.set(res.asientos as Asiento[]);
                this.cargando.set(false);
            },
            error: (err) => {
                this.cargando.set(false);
                this.notificacion.error(err?.error?.message || 'Error al cargar los asientos de la gradería');
            }
        });
    }

    toggleSeleccion(celda: CeldaMatriz) {
        if (!celda.asiento) return;

        const id = celda.asiento.id;
        const current = this.seleccionadosIds();

        if (current.includes(id)) {
            this.seleccionadosIds.set(current.filter((item) => item !== id));
        } else {
            this.seleccionadosIds.set([...current, id]);
        }
    }

    estaSeleccionado(celda: CeldaMatriz): boolean {
        return !!celda.asiento && this.seleccionadosIds().includes(celda.asiento.id);
    }

    limpiarSeleccion() {
        this.seleccionadosIds.set([]);
    }

    seleccionarTodosLibres() {
        const libres = this.asientos()
            .filter((a) => a.estado === 'LIBRE')
            .map((a) => a.id);
        this.seleccionadosIds.set(libres);
    }

    toggleSeleccionarFila(fila: FilaMatriz) {
        const idsFila = fila.celdas
            .map((c) => c.asiento?.id)
            .filter((id): id is number => id !== undefined && id !== null);

        const current = this.seleccionadosIds();
        const todosSeleccionados = idsFila.every((id) => current.includes(id));

        if (todosSeleccionados) {
            this.seleccionadosIds.set(current.filter((id) => !idsFila.includes(id)));
        } else {
            const set = new Set([...current, ...idsFila]);
            this.seleccionadosIds.set(Array.from(set));
        }
    }

    abrirModalBulk() {
        const count = this.seleccionadosIds().length;
        if (count === 0) return;

        this.formBulk.reset({
            estado: 'PAGADO',
            clienteNombre: '',
            clienteCelular: '',
            modoPrecio: 'unitario',
            precioPorAsiento: 100,
            montoTotal: 100 * count
        });

        this.modalBulkVisible = true;
    }

    cambiarModoPrecio(modo: 'unitario' | 'total') {
        this.formBulk.get('modoPrecio')?.setValue(modo);
    }

    aplicarPrecioRapido(precio: number) {
        const count = this.seleccionadosIds().length || 1;
        this.formBulk.patchValue({
            precioPorAsiento: precio,
            montoTotal: precio * count
        });
    }

    onCambioPrecioUnitario(nuevoPrecio: number | null) {
        const count = this.seleccionadosIds().length || 1;
        if (nuevoPrecio !== null && nuevoPrecio !== undefined) {
            this.formBulk.get('montoTotal')?.setValue(nuevoPrecio * count);
        } else {
            this.formBulk.get('montoTotal')?.setValue(null);
        }
    }

    onCambioMontoTotal(nuevoTotal: number | null) {
        const count = this.seleccionadosIds().length || 1;
        if (nuevoTotal !== null && nuevoTotal !== undefined) {
            const u = Math.round((nuevoTotal / count) * 100) / 100;
            this.formBulk.get('precioPorAsiento')?.setValue(u);
        } else {
            this.formBulk.get('precioPorAsiento')?.setValue(null);
        }
    }

    /**
     * Sanitiza el input de celular en tiempo real: impide ingresar letras o caracteres especiales.
     */
    filtrarSoloDigitosCelularBulk(event: Event) {
        const input = event.target as HTMLInputElement;
        const soloNumeros = input.value.replace(/\D/g, '');
        input.value = soloNumeros;
        this.formBulk.get('clienteCelular')?.setValue(soloNumeros);
    }

    guardarBulk() {
        const ids = this.seleccionadosIds();
        if (ids.length === 0) return;

        const estadoDestino = this.formBulk.get('estado')?.value as EstadoAsiento;
        const raw = this.formBulk.getRawValue();

        if (estadoDestino === 'PAGADO' || estadoDestino === 'RESERVADO') {
            this.formBulk.markAllAsTouched();

            if (this.formBulk.get('clienteCelular')?.errors?.['pattern']) {
                this.notificacion.advertencia('El número de celular solo puede contener dígitos (entre 7 y 15 números).');
                return;
            }

            if (this.formBulk.invalid) {
                this.notificacion.advertencia('Por favor completa todos los campos requeridos con formato válido.');
                return;
            }
        }

        const datosClienteGuardados: DatosClienteTicket = {
            nombre: raw.clienteNombre?.trim() || '',
            celular: raw.clienteCelular?.trim() || '',
            montoTotal: raw.montoTotal || 0
        };

        const dto: ActualizarBulkAsientosDTO = {
            seat_ids: ids,
            estado: estadoDestino,
            cliente_nombre: (estadoDestino === 'LIBRE' || estadoDestino === 'BLOQUEADO') ? null : (raw.clienteNombre?.trim() || null),
            cliente_celular: (estadoDestino === 'LIBRE' || estadoDestino === 'BLOQUEADO') ? null : (raw.clienteCelular?.trim() || null),
            monto_total: (estadoDestino === 'LIBRE' || estadoDestino === 'BLOQUEADO') ? null : raw.montoTotal
        };

        this.guardando.set(true);
        this.asientoService.actualizarBulk(this.graderiaId, dto).subscribe({
            next: (res) => {
                this.guardando.set(false);
                this.modalBulkVisible = false;
                this.limpiarSeleccion();
                this.notificacion.exito(`Se actualizaron ${res.updated.length} butacas a estado ${estadoDestino}.`);
                this.cargarDatos();

                // Si fue venta o reserva, abrir diálogo para imprimir boletos y enviar por WhatsApp
                if (estadoDestino === 'PAGADO' || estadoDestino === 'RESERVADO') {
                    this.asientosVentaExitosa = res.updated && res.updated.length > 0 ? res.updated : [];
                    this.clienteVentaExitosa = datosClienteGuardados;
                    this.modalTicketVisible = true;
                }
            },
            error: (err) => {
                this.guardando.set(false);
                this.notificacion.error(err?.error?.message || 'Error al actualizar las butacas.');
            }
        });
    }

    // --- ACCIONES ESPECÍFICAS SOLICITADAS POR EL USUARIO ---

    /**
     * Imprime el reporte agrupado por clientes (PDF estructurado).
     */
    imprimirReporteClientes() {
        const g = this.graderia();
        if (!g) return;
        this.reportePdfService.generarPdfPorClientes(g, this.asientos(), this.authStore.nombreUsuario());
        this.notificacion.exito('Reporte por Clientes generado en PDF.');
    }

    /**
     * Imprime el reporte por asientos (formato horizontal con auditoría).
     */
    imprimirReporteAsientos() {
        const g = this.graderia();
        if (!g) return;
        this.reportePdfService.generarPdfPorAsientos(g, this.asientos(), this.authStore.nombreUsuario());
        this.notificacion.exito('Reporte por Asientos generado en PDF.');
    }

    /**
     * Abre el modal para gestionar boletos y envíos por WhatsApp de todos los clientes.
     */
    abrirModalClientes() {
        this.modalClientesVisible = true;
    }

    /**
     * Abre el flujo para modificar un asiento individual (directamente si hay 1 seleccionado, o pide código).
     */
    abrirModalModificarAsiento() {
        if (this.seleccionadosIds().length === 1) {
            this.editarButacaSeleccionada();
            return;
        }

        this.codigoBusquedaAsiento = '';
        this.modalBuscarAsientoVisible = true;
    }

    /**
     * Si hay exactamente 1 asiento seleccionado en la matriz, lo abre para edición directa.
     */
    editarButacaSeleccionada() {
        const id = this.seleccionadosIds()[0];
        const s = this.asientos().find((a) => a.id === id);
        if (s) {
            this.abrirEdicionDirecta(s);
        }
    }

    /**
     * Abre el modal de edición directa para cualquier asiento (llamado por doble clic o búsqueda).
     */
    abrirEdicionDirecta(asiento: Asiento | null) {
        if (!asiento) return;
        this.asientoParaEditar = asiento;
        this.modalEditarAsientoVisible = true;
    }

    /**
     * Busca un asiento por su código y abre su editor.
     */
    buscarYEditarAsiento() {
        const code = (this.codigoBusquedaAsiento || '').trim().toUpperCase();
        if (!code) {
            this.notificacion.advertencia('Ingresa el código del asiento (ej. A1, B3, C5...)');
            return;
        }

        const s = this.asientos().find((a) => (a.codigo || '').toUpperCase() === code);
        if (!s) {
            this.notificacion.error(`No se encontró el asiento con código "${code}".`);
            return;
        }

        this.modalBuscarAsientoVisible = false;
        this.abrirEdicionDirecta(s);
    }

    /**
     * Callback cuando un asiento individual es actualizado o liberado.
     */
    onAsientoIndividualGuardado(asientoActualizado: Asiento) {
        const actualizados = this.asientos().map((a) =>
            a.id === asientoActualizado.id ? asientoActualizado : a
        );
        this.asientos.set(actualizados);
    }

    obtenerClaseButaca(celda: CeldaMatriz): string {
        const seleccionado = this.estaSeleccionado(celda);
        if (seleccionado) {
            return 'bg-primary text-primary-contrast ring-2 ring-primary ring-offset-2 scale-105 shadow-md';
        }

        const st = celda.asiento?.estado || 'LIBRE';
        switch (st) {
            case 'LIBRE':
                return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25';
            case 'RESERVADO':
                return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/50 hover:bg-amber-500/30';
            case 'PAGADO':
                return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/50 hover:bg-blue-500/30';
            case 'BLOQUEADO':
                return 'bg-slate-400/20 text-slate-500 border-slate-400/40 opacity-60';
            default:
                return 'bg-surface-100 dark:bg-surface-800 text-muted-color border-surface-300';
        }
    }

    construirTooltipButaca(celda: CeldaMatriz): string {
        const a = celda.asiento;
        if (!a) return `Asiento ${celda.codigo}`;

        let base = `Asiento ${a.codigo} [${a.estado}]`;
        if (a.cliente_nombre) {
            base += `\nCliente: ${a.cliente_nombre}`;
        }
        if (a.cliente_celular) {
            base += `\nCel: ${a.cliente_celular}`;
        }
        if (a.monto) {
            base += `\nPrecio: Bs. ${Number(a.monto).toFixed(2)}`;
        }
        base += `\n(Doble clic para editar)`;
        return base;
    }

    copiarLinkPublico() {
        const code = this.graderia()?.code;
        if (!code) return;
        const url = `${window.location.origin}/g/${code}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                this.notificacion.exito(`Enlace público copiado: ${url}`);
            });
        }
    }

    abrirLinkPublico() {
        const code = this.graderia()?.code;
        if (!code) return;
        window.open(`/g/${code}`, '_blank');
    }

    private generarRango(inicio: number, fin: number, directo: boolean): number[] {
        const arr: number[] = [];
        for (let i = inicio; i <= fin; i++) arr.push(i);
        return directo ? arr : arr.reverse();
    }

    private numALetras(n: number): string {
        let s = '';
        while (n > 0) {
            n--;
            s = String.fromCharCode(65 + (n % 26)) + s;
            n = Math.floor(n / 26);
        }
        return s;
    }
}
