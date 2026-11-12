import { Component, EventEmitter, inject, input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import { Asiento, EstadoAsiento, ActualizarAsientoDTO } from '@/app/core/interfaces/asiento.interface';
import { AsientoService } from '@/app/core/services/asiento.service';
import { TicketPdfService, DatosClienteTicket } from '@/app/core/services/ticket-pdf.service';
import { NotificacionService } from '@/app/core/services/notificacion.service';

@Component({
    selector: 'app-asiento-edicion-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        SelectButtonModule,
        TagModule,
        TooltipModule
    ],
    templateUrl: './asiento-edicion-dialog.component.html'
})
export class AsientoEdicionDialogComponent implements OnChanges {
    private fb = inject(FormBuilder);
    private asientoService = inject(AsientoService);
    private ticketPdfService = inject(TicketPdfService);
    private notificacion = inject(NotificacionService);

    visible = input<boolean>(false);
    graderia = input<Graderia | null>(null);
    asiento = input<Asiento | null>(null);

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() guardado = new EventEmitter<Asiento>();

    guardando = signal<boolean>(false);

    readonly opcionesEstados = [
        { label: 'Libre', value: 'LIBRE' },
        { label: 'Reservado', value: 'RESERVADO' },
        { label: 'Pagado', value: 'PAGADO' },
        { label: 'Bloqueado', value: 'BLOQUEADO' }
    ];

    // Formulario Reactivo
    formAsiento: FormGroup = this.fb.group({
        estado: ['LIBRE' as EstadoAsiento, [Validators.required]],
        clienteNombre: [''],
        clienteCelular: ['', [Validators.pattern('^[0-9]{7,15}$')]],
        monto: [null as number | null]
    });

    get visibleModel(): boolean {
        return this.visible();
    }
    set visibleModel(v: boolean) {
        this.visibleChange.emit(v);
    }

    get estadoActual(): EstadoAsiento {
        return this.formAsiento.get('estado')?.value || 'LIBRE';
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ((changes['visible'] || changes['asiento']) && this.asiento()) {
            this.cargarDatosAsiento();
        }
    }

    cargarDatosAsiento() {
        const a = this.asiento();
        if (!a) return;

        const est = a.estado || 'LIBRE';
        this.formAsiento.reset({
            estado: est,
            clienteNombre: a.cliente_nombre || '',
            clienteCelular: a.cliente_celular || '',
            monto: a.monto != null ? Number(a.monto) : null
        });

        this.actualizarValidadoresSegunEstado(est);
    }

    onCambioEstado(nuevoEstado: EstadoAsiento) {
        this.actualizarValidadoresSegunEstado(nuevoEstado);
    }

    private actualizarValidadoresSegunEstado(estado: EstadoAsiento) {
        const nomCtrl = this.formAsiento.get('clienteNombre');
        const celCtrl = this.formAsiento.get('clienteCelular');
        const montoCtrl = this.formAsiento.get('monto');

        if (estado === 'PAGADO' || estado === 'RESERVADO') {
            nomCtrl?.setValidators([Validators.required, Validators.minLength(2)]);
            celCtrl?.setValidators([Validators.required, Validators.pattern('^[0-9]{7,15}$')]);
            montoCtrl?.setValidators([Validators.required, Validators.min(0)]);
        } else {
            nomCtrl?.clearValidators();
            celCtrl?.clearValidators();
            montoCtrl?.clearValidators();

            if (estado === 'LIBRE') {
                nomCtrl?.setValue('');
                celCtrl?.setValue('');
                montoCtrl?.setValue(null);
            }
        }

        nomCtrl?.updateValueAndValidity();
        celCtrl?.updateValueAndValidity();
        montoCtrl?.updateValueAndValidity();
    }

    /**
     * Sanitiza el input de celular en tiempo real para evitar cualquier letra o símbolo.
     */
    filtrarSoloDigitosCelular(event: Event) {
        const input = event.target as HTMLInputElement;
        const soloNumeros = input.value.replace(/\D/g, '');
        input.value = soloNumeros;
        this.formAsiento.get('clienteCelular')?.setValue(soloNumeros);
    }

    obtenerSeveridadEstado(est: EstadoAsiento): 'success' | 'warn' | 'info' | 'secondary' {
        switch (est) {
            case 'LIBRE':
                return 'success';
            case 'RESERVADO':
                return 'warn';
            case 'PAGADO':
                return 'info';
            case 'BLOQUEADO':
                return 'secondary';
        }
    }

    guardarCambios() {
        const a = this.asiento();
        const g = this.graderia();
        if (!a || !g) return;

        const estado = this.formAsiento.get('estado')?.value as EstadoAsiento;
        this.actualizarValidadoresSegunEstado(estado);

        if (estado === 'PAGADO' || estado === 'RESERVADO') {
            this.formAsiento.markAllAsTouched();

            if (this.formAsiento.invalid) {
                if (this.formAsiento.get('clienteCelular')?.errors?.['pattern']) {
                    this.notificacion.advertencia('El celular solo permite números (entre 7 y 15 dígitos).');
                } else if (this.formAsiento.get('clienteCelular')?.errors?.['required']) {
                    this.notificacion.advertencia('Ingresa el número de celular del cliente.');
                } else if (this.formAsiento.get('clienteNombre')?.invalid) {
                    this.notificacion.advertencia('Ingresa el nombre completo del cliente.');
                } else {
                    this.notificacion.advertencia('Completa el monto del boleto.');
                }
                return;
            }
        }

        const rawVal = this.formAsiento.getRawValue();
        const dto: ActualizarAsientoDTO = {
            estado,
            cliente_nombre: estado === 'LIBRE' ? null : (rawVal.clienteNombre?.trim() || null),
            cliente_celular: estado === 'LIBRE' ? null : (rawVal.clienteCelular?.trim() || null),
            monto: estado === 'LIBRE' ? null : (rawVal.monto != null ? Number(rawVal.monto) : null)
        };

        this.guardando.set(true);
        this.asientoService.actualizarUno(g.id, a.id, dto).subscribe({
            next: (res) => {
                this.guardando.set(false);
                this.notificacion.exito(`Butaca ${a.codigo} actualizada con éxito.`);
                this.guardado.emit(res.asiento);
                this.cerrar();
            },
            error: (err) => {
                this.guardando.set(false);
                this.notificacion.error(err?.error?.message || 'Error al actualizar la butaca.');
            }
        });
    }

    confirmarLiberar() {
        const a = this.asiento();
        const g = this.graderia();
        if (!a || !g) return;

        this.notificacion.confirmar({
            titulo: 'Liberar Butaca',
            mensaje: `¿Estás seguro de liberar la butaca ${a.codigo}? Se restablecerá como DISPONIBLE y se borrarán sus datos de venta.`,
            icono: 'pi pi-exclamation-triangle text-amber-500',
            textoAceptar: 'Sí, Liberar',
            textoCancelar: 'Cancelar',
            alAceptar: () => {
                const dto: ActualizarAsientoDTO = {
                    estado: 'LIBRE',
                    cliente_nombre: null,
                    cliente_celular: null,
                    monto: null
                };

                this.guardando.set(true);
                this.asientoService.actualizarUno(g.id, a.id, dto).subscribe({
                    next: (res) => {
                        this.guardando.set(false);
                        this.notificacion.exito(`Butaca ${a.codigo} liberada.`);
                        this.guardado.emit(res.asiento);
                        this.cerrar();
                    },
                    error: (err) => {
                        this.guardando.set(false);
                        this.notificacion.error(err?.error?.message || 'Error al liberar la butaca.');
                    }
                });
            }
        });
    }

    async imprimirBoletoIndividual() {
        const a = this.asiento();
        const g = this.graderia();
        if (!a || !g) return;

        const raw = this.formAsiento.getRawValue();
        const datosCliente: DatosClienteTicket = {
            nombre: raw.clienteNombre || a.cliente_nombre || 'Cliente',
            celular: raw.clienteCelular || a.cliente_celular || '',
            montoTotal: Number(raw.monto || a.monto || 0)
        };
        await this.ticketPdfService.imprimirPdf(g, [a], datosCliente);
    }

    async descargarBoletoIndividualPdf() {
        const a = this.asiento();
        const g = this.graderia();
        if (!a || !g) return;

        const raw = this.formAsiento.getRawValue();
        const datosCliente: DatosClienteTicket = {
            nombre: raw.clienteNombre || a.cliente_nombre || 'Cliente',
            celular: raw.clienteCelular || a.cliente_celular || '',
            montoTotal: Number(raw.monto || a.monto || 0)
        };
        try {
            await this.ticketPdfService.descargarPdf(g, [a], datosCliente);
            this.notificacion.exito(`Boleto ${a.codigo} generado y descargado en PDF.`);
        } catch {
            this.notificacion.error('Error al generar el archivo PDF del boleto.');
        }
    }

    enviarWhatsAppIndividual() {
        const a = this.asiento();
        const g = this.graderia();
        if (!a || !g) return;

        const raw = this.formAsiento.getRawValue();
        const nom = raw.clienteNombre || a.cliente_nombre || 'Cliente';
        const cel = raw.clienteCelular || a.cliente_celular || '';
        const monto = Number(raw.monto || a.monto || 0).toFixed(2);
        const urlPublica = `${window.location.origin}/g/${g.code}`;

        const mensaje =
            `🎟️ *¡Tu Boleto está Confirmado!* 🎟️\n\n` +
            `Hola *${nom}*, te compartimos tu entrada:\n` +
            `🏟️ *Gradería:* ${g.nombre || 'Gradería'}\n` +
            `🪑 *Butaca:* ${a.codigo}\n` +
            `💰 *Monto:* Bs. ${monto}\n\n` +
            `🌐 *Mapa en vivo:* ${urlPublica}\n\n` +
            `¡Gracias por tu compra!`;

        const encodedMensaje = encodeURIComponent(mensaje);
        const telSanitizado = (cel || '').replace(/\D/g, '');

        let waUrl = `https://api.whatsapp.com/send?text=${encodedMensaje}`;
        if (telSanitizado) {
            waUrl = `https://api.whatsapp.com/send?phone=${telSanitizado}&text=${encodedMensaje}`;
        }
        window.open(waUrl, '_blank');
    }

    cerrar() {
        this.visibleChange.emit(false);
    }
}
