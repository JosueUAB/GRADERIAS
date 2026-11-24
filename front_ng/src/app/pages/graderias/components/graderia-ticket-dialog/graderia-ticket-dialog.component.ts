import { Component, computed, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Graderia } from '@/app/core/interfaces/graderia.interface';
import { Asiento } from '@/app/core/interfaces/asiento.interface';
import { TicketPdfService, DatosClienteTicket } from '@/app/core/services/ticket-pdf.service';
import { NotificacionService } from '@/app/core/services/notificacion.service';

@Component({
    selector: 'app-graderia-ticket-dialog',
    standalone: true,
    imports: [CommonModule, DialogModule, ButtonModule, TooltipModule],
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

    readonly tieneCoordenadas = computed(() => {
        const g = this.graderia();
        return g?.latitud != null && g?.longitud != null;
    });

    readonly googleMapsUrl = computed(() => {
        const g = this.graderia();
        if (g?.latitud != null && g?.longitud != null) {
            return `https://www.google.com/maps?q=${g.latitud},${g.longitud}`;
        }
        return null;
    });

    formatearNumeroWhatsApp(celular?: string | null): string {
        if (!celular) return '';
        let clean = celular.replace(/\D/g, '');
        if (clean.startsWith('0')) {
            clean = clean.substring(1);
        }
        // En Bolivia los números móviles son de 8 dígitos (ej: 70123456 o 60123456).
        // Anteponer código de país 591 para que WhatsApp abra el chat directo sin agendar.
        if (clean.length === 8) {
            clean = `591${clean}`;
        }
        return clean;
    }

    abrirGoogleMaps() {
        const url = this.googleMapsUrl();
        if (url) {
            window.open(url, '_blank');
        }
    }

    copiarUbicacion() {
        const url = this.googleMapsUrl();
        if (!url) return;
        navigator.clipboard.writeText(url).then(() => {
            this.notificacion.exito('Enlace de ubicación GPS copiado al portapapeles.');
        });
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

    async compartirBoletosPdf() {
        const g = this.graderia();
        const a = this.asientos();
        const c = this.cliente();
        if (!g || !a.length || !c) return;

        this.generandoPdf.set(true);
        try {
            const doc = await this.ticketPdfService.generarDocumentoPdf(g, a, c);
            const blob = doc.output('blob');
            const file = new File(
                [blob],
                `boletos_${g.code || g.id}_${c.nombre.replace(/\s+/g, '_')}.pdf`,
                { type: 'application/pdf' }
            );

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Boletos Oficiales - ${g.nombre}`,
                    text: `Boletos oficiales confirmados para ${c.nombre} (${a.length} butacas). Sector: ${g.nombre}.`
                });
                this.notificacion.exito('Boletos compartidos con éxito.');
            } else {
                // Descargar archivo y abrir WhatsApp con mensaje completo
                await this.ticketPdfService.descargarPdf(g, a, c);
                this.enviarPorWhatsApp();
                this.notificacion.info('PDF descargado. En WhatsApp puedes adjuntar el boleto directamente al chat del cliente.');
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                this.notificacion.error('No se pudo compartir el archivo de boletos.');
            }
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

        let seccionUbicacion = '';
        if (g.direccion) {
            seccionUbicacion += `📍 *Direccion:* ${g.direccion}\n`;
        }
        if (g.latitud != null && g.longitud != null) {
            seccionUbicacion += `📍 *Ubicacion en Google Maps:*\nhttps://www.google.com/maps?q=${g.latitud},${g.longitud}\n`;
            seccionUbicacion += `🗺️ *Como llegar (Ruta GPS):*\nhttps://www.google.com/maps/dir/?api=1&destination=${g.latitud},${g.longitud}\n`;
        }

        let seccionContacto = '';
        if (g.user?.name || g.user?.telefono_contacto_1) {
            seccionContacto = `👤 *Atencion / Vendedor:* ${g.user?.name || 'Organizacion'}${g.user?.telefono_contacto_1 ? ' (Tel: ' + g.user.telefono_contacto_1 + ')' : ''}\n`;
        }

        const mensaje =
            `🎫 *¡TUS BOLETOS ESTAN CONFIRMADOS!* 🎫\n\n` +
            `Hola *${c.nombre}*, confirmamos tu compra de entradas oficiales:\n\n` +
            `🎪 *Graderia / Sector:* ${g.nombre || 'Graderia'}\n` +
            `🎟️ *Butacas Asignadas:* ${codigos} (${a.length} ${a.length === 1 ? 'entrada' : 'entradas'})\n` +
            `💵 *Total Pagado:* Bs. ${total}\n` +
            `📅 *Fecha de Emision:* ${new Date().toLocaleDateString()}\n\n` +
            (seccionUbicacion ? `${seccionUbicacion}\n` : '') +
            (seccionContacto ? `${seccionContacto}\n` : '') +
            `🔗 *Consulta el mapa en vivo de la graderia:*\n${urlPublica}\n\n` +
            `✅ *Presenta este mensaje o tus boletos oficiales en PDF al ingresar al sector.* ¡Muchas gracias por tu compra!`;

        const encodedMensaje = encodeURIComponent(mensaje);
        const telCompleto = this.formatearNumeroWhatsApp(c.celular);

        let waUrl = `https://api.whatsapp.com/send?text=${encodedMensaje}`;
        if (telCompleto) {
            // El enlace wa.me con código internacional (ej: 59170123456) abre directamente el chat sin pedir agendar el número
            waUrl = `https://wa.me/${telCompleto}?text=${encodedMensaje}`;
        }

        window.open(waUrl, '_blank');
        this.notificacion.info('Abriendo chat directo de WhatsApp...');
    }

    cerrar() {
        this.visibleChange.emit(false);
    }
}
