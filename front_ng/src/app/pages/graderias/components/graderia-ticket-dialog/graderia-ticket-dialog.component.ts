import { Component, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import { Asiento } from '@/app/core/interfaces/asiento.interface';
import { TicketPdfService, DatosClienteTicket } from '@/app/core/services/ticket-pdf.service';
import { NotificacionService } from '@/app/core/services/notificacion.service';

@Component({
    selector: 'app-graderia-ticket-dialog',
    standalone: true,
    imports: [CommonModule, DialogModule, ButtonModule],
    templateUrl: './graderia-ticket-dialog.component.html'
})
export class GraderiaTicketDialogComponent {
    private ticketPdfService = inject(TicketPdfService);
    private notificacion = inject(NotificacionService);

    visible = input<boolean>(false);
    graderia = input<Graderia | null>(null);
    asientos = input<Asiento[]>([]);
    cliente = input<DatosClienteTicket | null>(null);

    @Output() visibleChange = new EventEmitter<boolean>();

    generandoPdf = signal<boolean>(false);

    get visibleModel(): boolean {
        return this.visible();
    }
    set visibleModel(v: boolean) {
        this.visibleChange.emit(v);
    }

    async descargarBoletosPdf() {
        const g = this.graderia();
        const a = this.asientos();
        const c = this.cliente();
        if (!g || !a.length || !c) return;

        this.generandoPdf.set(true);
        try {
            await this.ticketPdfService.descargarPdf(g, a, c);
            this.notificacion.exito(`Boletos descargados (${a.length} páginas generadas).`);
        } catch {
            this.notificacion.error('Ocurrió un error al generar los boletos en PDF.');
        } finally {
            this.generandoPdf.set(false);
        }
    }

    async imprimirBoletosPdf() {
        const g = this.graderia();
        const a = this.asientos();
        const c = this.cliente();
        if (!g || !a.length || !c) return;

        this.generandoPdf.set(true);
        try {
            await this.ticketPdfService.imprimirPdf(g, a, c);
        } catch {
            this.notificacion.error('No se pudo abrir el diálogo de impresión.');
        } finally {
            this.generandoPdf.set(false);
        }
    }

    enviarPorWhatsApp() {
        const g = this.graderia();
        const a = this.asientos();
        const c = this.cliente();
        if (!g || !c) return;

        const codigos = a.map((item) => item.codigo).join(', ');
        const total = (c.montoTotal || 0).toFixed(2);
        const urlPublica = `${window.location.origin}/g/${g.code}`;

        const mensaje = 
            `🎟️ *¡Tus Boletos están Confirmados!* 🎟️\n\n` +
            `Hola *${c.nombre}*, confirmamos tu compra de entradas:\n` +
            `🏟️ *Gradería / Sector:* ${g.nombre || 'Gradería'}\n` +
            `🪑 *Butacas Asignadas:* ${codigos} (${a.length} entradas)\n` +
            `💰 *Monto Total:* Bs. ${total}\n` +
            `📅 *Fecha de Emisión:* ${new Date().toLocaleDateString()}\n\n` +
            `🌐 *Puedes consultar el mapa en vivo aquí:*\n${urlPublica}\n\n` +
            `¡Gracias por tu compra! Recuerda presentar tus boletos al ingreso.`;

        const encodedMensaje = encodeURIComponent(mensaje);
        const telSanitizado = (c.celular || '').replace(/\D/g, '');

        let waUrl = `https://api.whatsapp.com/send?text=${encodedMensaje}`;
        if (telSanitizado) {
            waUrl = `https://api.whatsapp.com/send?phone=${telSanitizado}&text=${encodedMensaje}`;
        }

        window.open(waUrl, '_blank');
        this.notificacion.info('Abriendo WhatsApp con los datos del boleto...');
    }

    cerrar() {
        this.visibleChange.emit(false);
    }
}
