import { Component, computed, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import { Asiento } from '@/app/core/interfaces/asiento.interface';
import { TicketPdfService, DatosClienteTicket } from '@/app/core/services/ticket-pdf.service';
import { NotificacionService } from '@/app/core/services/notificacion.service';

export interface ClienteGrupoResumen {
    key: string;
    nombre: string;
    celular: string;
    asientos: Asiento[];
    cantidad: number;
    montoTotal: number;
    estado: string;
}

@Component({
    selector: 'app-graderia-clientes-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        IconFieldModule,
        InputIconModule,
        TagModule,
        TooltipModule
    ],
    templateUrl: './graderia-clientes-dialog.component.html'
})
export class GraderiaClientesDialogComponent {
    private ticketPdfService = inject(TicketPdfService);
    private notificacion = inject(NotificacionService);

    visible = input<boolean>(false);
    graderia = input<Graderia | null>(null);
    asientos = input<Asiento[]>([]);

    @Output() visibleChange = new EventEmitter<boolean>();

    filtroTexto = signal<string>('');
    clienteSeleccionado = signal<ClienteGrupoResumen | null>(null);
    generandoPdf = signal<boolean>(false);

    get visibleModel(): boolean {
        return this.visible();
    }
    set visibleModel(v: boolean) {
        this.visibleChange.emit(v);
    }

    get clienteSeleccionadoModel(): ClienteGrupoResumen | null {
        return this.clienteSeleccionado();
    }
    set clienteSeleccionadoModel(c: ClienteGrupoResumen | null) {
        this.clienteSeleccionado.set(c);
    }

    listaClientes = computed<ClienteGrupoResumen[]>(() => {
        const todos = this.asientos();
        const mapa: Record<string, ClienteGrupoResumen> = {};

        for (const a of todos) {
            const nom = (a.cliente_nombre || '').trim();
            const cel = (a.cliente_celular || '').trim();

            if (!nom && !cel) continue;

            const key = `${nom.toUpperCase()}|${cel}`;
            if (!mapa[key]) {
                mapa[key] = {
                    key,
                    nombre: nom || 'Sin Nombre',
                    celular: cel,
                    asientos: [],
                    cantidad: 0,
                    montoTotal: 0,
                    estado: a.estado || 'PAGADO'
                };
            }

            mapa[key].asientos.push(a);
            mapa[key].cantidad++;
            mapa[key].montoTotal += Number(a.monto) || 0;
            if (a.estado === 'PAGADO') {
                mapa[key].estado = 'PAGADO';
            }
        }

        return Object.values(mapa).sort((a, b) => a.nombre.localeCompare(b.nombre));
    });

    clientesFiltrados = computed(() => {
        const query = this.filtroTexto().trim().toLowerCase();
        const lista = this.listaClientes();
        if (!query) return lista;

        return lista.filter(
            (c) =>
                c.nombre.toLowerCase().includes(query) ||
                c.celular.toLowerCase().includes(query) ||
                c.asientos.some((a) => a.codigo.toLowerCase().includes(query))
        );
    });

    async descargarBoletosCliente() {
        const c = this.clienteSeleccionado();
        const g = this.graderia();
        if (!c || !g) return;

        this.generandoPdf.set(true);
        try {
            const datosCliente: DatosClienteTicket = {
                nombre: c.nombre,
                celular: c.celular,
                montoTotal: c.montoTotal
            };
            await this.ticketPdfService.descargarPdf(g, c.asientos, datosCliente);
            this.notificacion.exito(`Boletos descargados (${c.asientos.length} hojas generadas).`);
        } catch {
            this.notificacion.error('Error al generar los boletos en PDF.');
        } finally {
            this.generandoPdf.set(false);
        }
    }

    async imprimirBoletosCliente() {
        const c = this.clienteSeleccionado();
        const g = this.graderia();
        if (!c || !g) return;

        this.generandoPdf.set(true);
        try {
            const datosCliente: DatosClienteTicket = {
                nombre: c.nombre,
                celular: c.celular,
                montoTotal: c.montoTotal
            };
            await this.ticketPdfService.imprimirPdf(g, c.asientos, datosCliente);
        } catch {
            this.notificacion.error('No se pudo abrir el cuadro de diálogo de impresión.');
        } finally {
            this.generandoPdf.set(false);
        }
    }

    enviarWhatsAppCliente() {
        const c = this.clienteSeleccionado();
        const g = this.graderia();
        if (!c || !g) return;

        const codigos = c.asientos.map((a) => a.codigo).join(', ');
        const total = (c.montoTotal || 0).toFixed(2);
        const urlPublica = `${window.location.origin}/g/${g.code}`;

        const mensaje =
            `🎟️ *¡Tus Boletos están Confirmados!* 🎟️\n\n` +
            `Hola *${c.nombre}*, te compartimos el detalle de tus entradas:\n` +
            `🏟️ *Gradería / Sector:* ${g.nombre || 'Gradería'}\n` +
            `🪑 *Butacas:* ${codigos} (${c.asientos.length} entradas)\n` +
            `💰 *Monto Total:* Bs. ${total}\n` +
            `📅 *Fecha:* ${new Date().toLocaleDateString()}\n\n` +
            `🌐 *Puedes consultar el mapa en vivo aquí:*\n${urlPublica}\n\n` +
            `¡Gracias por tu compra!`;

        const encodedMensaje = encodeURIComponent(mensaje);
        const telSanitizado = (c.celular || '').replace(/\D/g, '');

        let waUrl = `https://api.whatsapp.com/send?text=${encodedMensaje}`;
        if (telSanitizado) {
            waUrl = `https://api.whatsapp.com/send?phone=${telSanitizado}&text=${encodedMensaje}`;
        }

        window.open(waUrl, '_blank');
        this.notificacion.info('Abriendo WhatsApp...');
    }

    seleccionarYEnviar(c: ClienteGrupoResumen) {
        this.clienteSeleccionado.set(c);
        this.enviarWhatsAppCliente();
    }

    seleccionarEImprimir(c: ClienteGrupoResumen) {
        this.clienteSeleccionado.set(c);
        this.imprimirBoletosCliente();
    }

    seleccionarYDescargarPdf(c: ClienteGrupoResumen) {
        this.clienteSeleccionado.set(c);
        this.descargarBoletosCliente();
    }

    cerrar() {
        this.visibleChange.emit(false);
    }
}
