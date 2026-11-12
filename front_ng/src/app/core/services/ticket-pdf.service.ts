import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import * as QRCode from 'qrcode';
import { Graderia } from '../interfaces/graderia.interface';
import { Asiento } from '../interfaces/asiento.interface';

export interface DatosClienteTicket {
    nombre: string;
    celular?: string;
    montoTotal?: number;
}

@Injectable({
    providedIn: 'root'
})
export class TicketPdfService {
    /**
     * Genera un documento PDF con 1 página por butaca (ej. 5 butacas = 5 hojas de boletos).
     */
    async generarDocumentoPdf(graderia: Graderia, asientos: Asiento[], cliente: DatosClienteTicket): Promise<jsPDF> {
        // Formato A6 (105mm x 148mm) vertical, ideal para boletería / tickets de mano
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [105, 148]
        });

        const pageWidth = 105;
        const pageHeight = 148;
        const totalAsientos = asientos.length;

        for (let i = 0; i < totalAsientos; i++) {
            if (i > 0) {
                doc.addPage([105, 148], 'portrait');
            }

            const asiento = asientos[i];
            const precioIndividual = Number(asiento.monto) || (cliente.montoTotal ? cliente.montoTotal / totalAsientos : 0);

            // Generar QR en base64 para este boleto específico
            const qrTexto = `BOLETO: ${asiento.codigo} | GRADERIA: ${graderia.nombre} | CLIENTE: ${cliente.nombre} | PRECIO: Bs. ${precioIndividual.toFixed(2)} | REF: ${graderia.code}-${asiento.id}`;
            const qrDataUrl = await QRCode.toDataURL(qrTexto, {
                width: 140,
                margin: 1,
                color: { dark: '#111827', light: '#FFFFFF' }
            });

            // 1. Fondo y Borde decorativo del boleto
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');

            // Marco decorativo exterior
            doc.setDrawColor(203, 213, 225); // Slate 300
            doc.setLineWidth(0.8);
            doc.roundedRect(5, 5, pageWidth - 10, pageHeight - 10, 4, 4, 'S');

            // 2. Encabezado / Banner Superior
            doc.setFillColor(15, 23, 42); // Slate 900
            doc.roundedRect(6, 6, pageWidth - 12, 22, 3, 3, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('RESERVA TICKETS · BOLETO OFICIAL', pageWidth / 2, 13, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(203, 213, 225);
            const nombreGraderia = (graderia.nombre || 'Gradería').toUpperCase();
            doc.text(nombreGraderia, pageWidth / 2, 21, { align: 'center' });

            // 3. Bloque Principal: CÓDIGO DE BUTACA DESTACADO
            doc.setFillColor(241, 245, 249); // Slate 100
            doc.roundedRect(12, 33, pageWidth - 24, 28, 4, 4, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(12, 33, pageWidth - 24, 28, 4, 4, 'S');

            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text('BUTACA ASIGNADA', pageWidth / 2, 39, { align: 'center' });

            doc.setTextColor(15, 23, 42);
            doc.setFontSize(26);
            doc.text(asiento.codigo, pageWidth / 2, 53, { align: 'center' });

            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text(`Fila ${asiento.fila}  ·  Columna ${asiento.columna}`, pageWidth / 2, 58, { align: 'center' });

            // 4. Datos del Comprador y Evento
            let y = 69;
            doc.setFontSize(8);

            // Cliente
            doc.setTextColor(100, 116, 139);
            doc.text('Titular / Cliente:', 12, y);
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text(cliente.nombre || 'Público General', 42, y);

            // Celular
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('Contacto / Cel:', 12, y);
            doc.setTextColor(15, 23, 42);
            doc.text(cliente.celular || 'S/N', 42, y);

            // Precio
            y += 6;
            doc.setTextColor(100, 116, 139);
            doc.text('Precio Pagado:', 12, y);
            doc.setTextColor(16, 185, 129); // Emerald 600
            doc.setFont('helvetica', 'bold');
            doc.text(`Bs. ${precioIndividual.toFixed(2)}`, 42, y);

            // Ubicación / Dirección
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('Ubicación:', 12, y);
            doc.setTextColor(15, 23, 42);
            const direccionCorta = (graderia.direccion || 'Sector Oficial').substring(0, 28);
            doc.text(direccionCorta, 42, y);

            // 5. Línea punteada de desprendimiento / control
            y += 7;
            doc.setDrawColor(148, 163, 184);
            doc.setLineDashPattern([1.5, 1.5], 0);
            doc.line(8, y, pageWidth - 8, y);
            doc.setLineDashPattern([], 0);

            // 6. Código QR de Validación
            y += 3;
            const qrSize = 32;
            const qrX = (pageWidth - qrSize) / 2;
            doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);

            // 7. Pie de Boleto con Número de Hoja
            y += qrSize + 4;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`Válido para 1 persona · Boleto ${i + 1} de ${totalAsientos}`, pageWidth / 2, y, { align: 'center' });
            doc.text(`Emitido: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, y + 3.5, { align: 'center' });
        }

        return doc;
    }

    /**
     * Descarga automáticamente el archivo PDF al equipo del usuario.
     */
    async descargarPdf(graderia: Graderia, asientos: Asiento[], cliente: DatosClienteTicket): Promise<void> {
        const doc = await this.generarDocumentoPdf(graderia, asientos, cliente);
        const filename = `boletos_${graderia.id}_${cliente.nombre.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        doc.save(filename);
    }

    /**
     * Abre el cuadro de diálogo de impresión nativo del navegador con el PDF generado.
     */
    async imprimirPdf(graderia: Graderia, asientos: Asiento[], cliente: DatosClienteTicket): Promise<void> {
        const doc = await this.generarDocumentoPdf(graderia, asientos, cliente);
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
    }
}
