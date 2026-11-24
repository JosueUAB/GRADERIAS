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
     * Genera un documento PDF con 1 página por butaca en formato A6 (105mm x 148mm)
     * con diseño profesional tipo entrada de festival, coordenadas GPS, enlace interactivo a Google Maps y QR de acceso.
     */
    async generarDocumentoPdf(graderia: Graderia, asientos: Asiento[], cliente: DatosClienteTicket): Promise<jsPDF> {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [105, 148]
        });

        const pageWidth = 105;
        const pageHeight = 148;
        const totalAsientos = asientos.length;

        const tieneCoords = graderia.latitud != null && graderia.longitud != null;
        const googleMapsUrl = tieneCoords
            ? `https://www.google.com/maps?q=${graderia.latitud},${graderia.longitud}`
            : `${typeof window !== 'undefined' ? window.location.origin : ''}/g/${graderia.code}`;

        for (let i = 0; i < totalAsientos; i++) {
            if (i > 0) {
                doc.addPage([105, 148], 'portrait');
            }

            const asiento = asientos[i];
            const precioIndividual = Number(asiento.monto) || (cliente.montoTotal ? cliente.montoTotal / totalAsientos : 0);

            // Generar código QR en alta definición apuntando a Google Maps o verificación
            const qrDataUrl = await QRCode.toDataURL(googleMapsUrl, {
                width: 180,
                margin: 1,
                color: { dark: '#0f172a', light: '#FFFFFF' }
            });

            // -------------------------------------------------------------
            // 1. FONDO Y MARCO EXTERIOR DEL BOLETO
            // -------------------------------------------------------------
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');

            // Borde exterior decorativo con esquinas redondeadas
            doc.setDrawColor(203, 213, 225); // Slate 300
            doc.setLineWidth(0.6);
            doc.roundedRect(4.5, 4.5, pageWidth - 9, pageHeight - 9, 3.5, 3.5, 'S');

            // -------------------------------------------------------------
            // 2. ENCABEZADO / BANNER OFICIAL DEL EVENTO
            // -------------------------------------------------------------
            doc.setFillColor(15, 23, 42); // Slate 900
            doc.roundedRect(5.5, 5.5, pageWidth - 11, 23, 2.5, 2.5, 'F');

            // Cinta de color primario (Rojo Carmesí Oruro)
            doc.setFillColor(150, 0, 35); // #960023
            doc.roundedRect(8, 7.5, 52, 4.5, 1, 1, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.text('CARNAVAL DE ORURO · ENTRADA OFICIAL', 10, 10.7);

            // Código de serie superior derecho
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(226, 232, 240);
            doc.text(`TKT #${graderia.code}-${asiento.codigo}`, pageWidth - 8, 10.7, { align: 'right' });

            // Nombre de la Gradería / Sector
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(255, 255, 255);
            const nombreGraderia = (graderia.nombre || 'Gradería Oficial').toUpperCase();
            doc.text(nombreGraderia, 8, 18);

            // Subtítulo con dirección corta
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(148, 163, 184); // Slate 400
            const direccionCorta = (graderia.direccion || 'Recorrido Oficial del Carnaval de Oruro').substring(0, 48);
            doc.text(direccionCorta, 8, 24);

            // -------------------------------------------------------------
            // 3. TARJETA DESTACADA DE LA BUTACA NUMERADA
            // -------------------------------------------------------------
            doc.setFillColor(248, 250, 252); // Slate 50
            doc.roundedRect(8, 31, pageWidth - 16, 24, 3, 3, 'F');
            doc.setDrawColor(226, 232, 240); // Slate 200
            doc.setLineWidth(0.5);
            doc.roundedRect(8, 31, pageWidth - 16, 24, 3, 3, 'S');

            // Etiqueta superior
            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.text('BUTACA ASIGNADA Y CONFIRMADA', pageWidth / 2, 36, { align: 'center' });

            // Código grande del asiento
            doc.setTextColor(15, 23, 42); // Slate 900
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text(asiento.codigo, pageWidth / 2, 47, { align: 'center' });

            // Fila y Columna
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(71, 85, 105);
            doc.text(`Fila ${asiento.fila}   ·   Columna ${asiento.columna}`, pageWidth / 2, 52, { align: 'center' });

            // -------------------------------------------------------------
            // 4. GRILLA DE DETALLES (COMPRADOR, PRECIO Y UBICACIÓN GPS)
            // -------------------------------------------------------------
            let y = 60;
            const col1X = 9;
            const col2X = 52;

            // Fila 1: Titular y Ubicación
            doc.setFontSize(6.8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text('TITULAR / CLIENTE:', col1X, y);
            doc.text('SECTOR / LUGAR:', col2X, y);

            y += 4;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.8);
            doc.setTextColor(15, 23, 42);
            const nombreCliente = (cliente.nombre || 'Público General').substring(0, 22);
            doc.text(nombreCliente, col1X, y);
            doc.setFont('helvetica', 'normal');
            doc.text((graderia.direccion || 'Ruta del Carnaval').substring(0, 24), col2X, y);

            // Fila 2: Celular y Coordenadas GPS
            y += 5.5;
            doc.setFontSize(6.8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text('TELÉFONO / CEL:', col1X, y);
            doc.text('COORDENADAS GPS:', col2X, y);

            y += 4;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text(cliente.celular || 'S/N', col1X, y);

            if (tieneCoords) {
                const gpsTexto = `${graderia.latitud!.toFixed(4)}, ${graderia.longitud!.toFixed(4)}`;
                doc.setFont('courier', 'bold');
                doc.setFontSize(7);
                doc.text(gpsTexto, col2X, y);
            } else {
                doc.text('Ver recorrido oficial', col2X, y);
            }

            // Fila 3: Precio y Enlace a Google Maps
            y += 5.5;
            doc.setFontSize(6.8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text('PRECIO PAGADO:', col1X, y);
            doc.text('CÓMO LLEGAR (GPS):', col2X, y);

            y += 4;
            // Precio en verde esmeralda destacado
            doc.setTextColor(5, 150, 105); // Emerald 600
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text(`Bs. ${precioIndividual.toFixed(2)}`, col1X, y);

            // Enlace interactivo clickable en el PDF a Google Maps
            if (tieneCoords) {
                const linkLabel = 'Abrir en Google Maps ->';
                doc.setTextColor(150, 0, 35); // Rojo Carmesí Oruro
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.text(linkLabel, col2X, y);

                const linkWidth = doc.getTextWidth(linkLabel);
                doc.link(col2X, y - 3, linkWidth, 4, { url: googleMapsUrl });
                doc.setDrawColor(150, 0, 35);
                doc.setLineWidth(0.3);
                doc.line(col2X, y + 0.8, col2X + linkWidth, y + 0.8);
            } else {
                doc.setTextColor(71, 85, 105);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.text('Ingreso por bocacalles', col2X, y);
            }

            // -------------------------------------------------------------
            // 5. LÍNEA PUNTEADA DE DESPRENDIMIENTO Y MUESCAS DE BOLETO FÍSICO
            // -------------------------------------------------------------
            const perforacionY = 92;

            // Muescas semicirculares de ticket en ambos extremos
            doc.setFillColor(255, 255, 255);
            doc.circle(4.5, perforacionY, 2.5, 'F');
            doc.circle(pageWidth - 4.5, perforacionY, 2.5, 'F');
            doc.setDrawColor(203, 213, 225);
            doc.circle(4.5, perforacionY, 2.5, 'S');
            doc.circle(pageWidth - 4.5, perforacionY, 2.5, 'S');

            // Línea punteada
            doc.setDrawColor(148, 163, 184); // Slate 400
            doc.setLineWidth(0.4);
            doc.setLineDashPattern([2, 1.5], 0);
            doc.line(7.5, perforacionY, pageWidth - 7.5, perforacionY);
            doc.setLineDashPattern([], 0);

            // -------------------------------------------------------------
            // 6. TALÓN INFERIOR: CÓDIGO QR Y CONTROL DE ACCESO
            // -------------------------------------------------------------
            const talonY = 96;
            const qrSize = 34;
            const qrX = 8;

            // Marco para el código QR
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(qrX, talonY, qrSize, qrSize, 2, 2, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(qrX, talonY, qrSize, qrSize, 2, 2, 'S');

            // Imagen QR
            doc.addImage(qrDataUrl, 'PNG', qrX + 1.5, talonY + 1.5, qrSize - 3, qrSize - 3);

            // Bloque de Seguridad y Guía a la derecha del QR
            const infoX = 46;
            let textY = talonY + 4;

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text('VALIDACIÓN & NAVEGACIÓN', infoX, textY);

            textY += 4;
            doc.setFont('courier', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`REF: ${graderia.code}-${asiento.codigo}-${asiento.id}`, infoX, textY);

            textY += 4.5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.2);
            doc.setTextColor(71, 85, 105);
            const explicacionQR = tieneCoords
                ? 'Escanee el QR con su cámara para abrir la ruta en Google Maps y llegar directo a su gradería.'
                : 'Escanee este código en el punto de control para validar el acceso.';
            const splitLines = doc.splitTextToSize(explicacionQR, pageWidth - infoX - 8);
            doc.text(splitLines, infoX, textY);

            // Operador / Vendedor si está asignado
            textY += 9;
            if (graderia.user?.name || graderia.user?.telefono_contacto_1) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.2);
                doc.setTextColor(15, 23, 42);
                const tel = graderia.user.telefono_contacto_1 ? ` · Tel: ${graderia.user.telefono_contacto_1}` : '';
                doc.text(`Operador: ${graderia.user.name}${tel}`, infoX, textY);
            }

            textY += 4;
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(5.8);
            doc.setTextColor(148, 163, 184);
            doc.text('Entrada personal e intransferible. Prohibida su reventa.', infoX, textY);

            // -------------------------------------------------------------
            // 7. PIE DE PÁGINA FINAL CON FECHA Y NUMERACIÓN
            // -------------------------------------------------------------
            const pieY = 141;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.2);
            doc.setTextColor(148, 163, 184);
            doc.text(
                `Boleto ${i + 1} de ${totalAsientos}  ·  Emitido: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
                pageWidth / 2,
                pieY,
                { align: 'center' }
            );
        }

        return doc;
    }

    /**
     * Descarga automáticamente el archivo PDF con los boletos formateados.
     */
    async descargarPdf(graderia: Graderia, asientos: Asiento[], cliente: DatosClienteTicket): Promise<void> {
        const doc = await this.generarDocumentoPdf(graderia, asientos, cliente);
        const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `boletos_${sanitize(graderia.nombre || 'graderia')}_${sanitize(cliente.nombre)}_${Date.now()}.pdf`;
        doc.save(filename);
    }

    /**
     * Abre el cuadro de diálogo de impresión nativo del navegador con el PDF generado.
     */
    async imprimirPdf(graderia: Graderia, asientos: Asiento[], cliente: DatosClienteTicket): Promise<void> {
        const doc = await this.generarDocumentoPdf(graderia, asientos, cliente);
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        const win = window.open(blobUrl, '_blank');
        if (win) {
            win.focus();
        }
    }
}
