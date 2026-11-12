import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Graderia } from '../interfaces/graderia.interface';
import { Asiento } from '../interfaces/asiento.interface';
import {
    ResumenGlobalVentas,
    UsuarioVentaStat,
    DetalleUsuarioVentasResponse
} from '../interfaces/seguimiento-ventas.interface';

export interface ClienteAgrupado {
    nombre: string;
    celular: string;
    total: number;
    items: Asiento[];
}

@Injectable({
    providedIn: 'root'
})
export class ReportePdfService {

    /**
     * Genera el Reporte Agrupado por Clientes en PDF.
     */
    generarPdfPorClientes(graderia: Graderia, asientos: Asiento[], usuario: string, descargar: boolean = true): jsPDF {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
        const now = this.fmtDateTime(new Date());
        const title = `Reporte por Clientes - ${this.safe(graderia.nombre)}`;

        // Encabezado
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 40, 40);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`Dirección: ${this.safe(graderia.direccion) || 'No registrada'}`, 40, 58);
        doc.text(`Generado: ${now}`, 40, 72);
        doc.text(`Usuario: ${this.safe(usuario) || 'Administrador'}`, 40, 86);
        doc.setTextColor(0, 0, 0);

        // Filtrar asientos con cliente asignado
        const conCliente = asientos.filter(
            (s) => (s.cliente_nombre && s.cliente_nombre.trim() !== '') || (s.cliente_celular && s.cliente_celular.trim() !== '')
        );

        // Agrupar por "nombre|celular"
        const mapa: Record<string, ClienteAgrupado> = {};
        for (const s of conCliente) {
            const nom = (s.cliente_nombre || '').trim();
            const cel = (s.cliente_celular || '').trim();
            const key = `${nom.toUpperCase()}|${cel}`;

            if (!mapa[key]) {
                mapa[key] = { nombre: nom || 'Sin Nombre', celular: cel || 'S/N', total: 0, items: [] };
            }
            mapa[key].items.push(s);
            const monto = Number(s.monto) || 0;
            mapa[key].total += monto;
        }

        // Ordenar alfabéticamente por cliente
        const grupos = Object.values(mapa).sort((a, b) => {
            const cmp = a.nombre.localeCompare(b.nombre);
            return cmp !== 0 ? cmp : a.celular.localeCompare(b.celular);
        });

        let cursorY = 110;

        if (grupos.length === 0) {
            doc.setFontSize(11);
            doc.text('No hay asientos con cliente registrado para este sector.', 40, cursorY);
        } else {
            for (const g of grupos) {
                // Verificar si cabe el grupo en la página actual
                if (cursorY > 690) {
                    doc.addPage();
                    cursorY = 45;
                }

                const itemsOrdenados = this.sortSeatsByCodigo(g.items);

                // Barra de título del cliente
                doc.setFillColor(243, 244, 246);
                doc.roundedRect(40, cursorY - 14, 532, 22, 4, 4, 'F');

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(17, 24, 39);
                doc.text(`Cliente: ${this.safe(g.nombre)}   —   Cel: ${this.safe(g.celular)}   —   Total: ${this.money(g.total)} Bs (${g.items.length} butacas)`, 48, cursorY);
                doc.setTextColor(0, 0, 0);

                const head = [['Asiento', 'Estado', 'Monto (Bs)', 'Reservado', 'Pagado', 'Creado']];
                const body = itemsOrdenados.map((it) => [
                    this.safe(it.codigo),
                    this.statusLabel(it.estado),
                    it.monto != null ? this.money(Number(it.monto)) : '0.00',
                    this.fmtDateTime(it.reservado_at),
                    this.fmtDateTime(it.pagado_at),
                    this.fmtDateTime(it.created_at)
                ]);

                autoTable(doc, {
                    head,
                    body,
                    startY: cursorY + 12,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 3.5, overflow: 'linebreak' },
                    headStyles: { fillColor: [45, 55, 72], textColor: 255, fontStyle: 'bold', halign: 'center' },
                    columnStyles: {
                        0: { halign: 'center', fontStyle: 'bold', cellWidth: 50 },
                        1: { halign: 'center', cellWidth: 70 },
                        2: { halign: 'right', cellWidth: 70 },
                        3: { halign: 'center', cellWidth: 100 },
                        4: { halign: 'center', cellWidth: 100 },
                        5: { halign: 'center', cellWidth: 100 }
                    },
                    margin: { left: 40, right: 40 },
                    didDrawPage: (data) => {
                        const pageCount = doc.getNumberOfPages();
                        doc.setFontSize(8);
                        doc.setTextColor(120, 120, 120);
                        doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.getWidth() - 95, doc.internal.pageSize.getHeight() - 15);
                    }
                });

                const finalY = (doc as any).lastAutoTable?.finalY || (cursorY + 50);
                cursorY = finalY + 22;
            }
        }

        if (descargar) {
            const filename = `reporte_clientes_${graderia.id}_${Date.now()}.pdf`;
            doc.save(filename);
        }

        return doc;
    }

    /**
     * Imprime directamente el Reporte por Clientes.
     */
    imprimirPdfPorClientes(graderia: Graderia, asientos: Asiento[], usuario: string): void {
        const doc = this.generarPdfPorClientes(graderia, asientos, usuario, false);
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            iframe.contentWindow?.print();
        };
    }

    /**
     * Genera el Reporte por Asientos (formato horizontal con todas las butacas).
     */
    generarPdfPorAsientos(graderia: Graderia, asientos: Asiento[], usuario: string, descargar: boolean = true): jsPDF {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
        const now = this.fmtDateTime(new Date());
        const title = `Reporte por Asientos - ${this.safe(graderia.nombre)}`;

        // Encabezado
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 40, 36);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`Dirección: ${this.safe(graderia.direccion) || 'No registrada'}`, 40, 52);
        doc.text(`Generado: ${now}  |  Usuario: ${this.safe(usuario) || 'Administrador'}  |  Total Aforo: ${asientos.length} butacas`, 40, 66);
        doc.setTextColor(0, 0, 0);

        const ordenados = this.sortSeatsByCodigo(asientos);

        const head = [
            ['Asiento', 'Estado', 'Cliente', 'Celular', 'Monto (Bs)', 'Reservado', 'Pagado', 'Creado']
        ];

        const body = ordenados.map((s) => [
            this.safe(s.codigo),
            this.statusLabel(s.estado),
            this.safe(s.cliente_nombre) || '—',
            this.safe(s.cliente_celular) || '—',
            s.monto != null ? this.money(Number(s.monto)) : '',
            this.fmtDateTime(s.reservado_at),
            this.fmtDateTime(s.pagado_at),
            this.fmtDateTime(s.created_at)
        ]);

        autoTable(doc, {
            head,
            body,
            startY: 85,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
            headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { halign: 'center', fontStyle: 'bold', cellWidth: 50 },
                1: { halign: 'center', cellWidth: 70 },
                2: { cellWidth: 150 },
                3: { halign: 'center', cellWidth: 75 },
                4: { halign: 'right', cellWidth: 65 },
                5: { halign: 'center', cellWidth: 95 },
                6: { halign: 'center', cellWidth: 95 },
                7: { halign: 'center', cellWidth: 95 }
            },
            margin: { left: 40, right: 40 },
            didDrawPage: (data) => {
                const pageCount = doc.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(120, 120, 120);
                doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.getWidth() - 95, doc.internal.pageSize.getHeight() - 15);
            }
        });

        if (descargar) {
            const filename = `reporte_asientos_${graderia.id}_${Date.now()}.pdf`;
            doc.save(filename);
        }

        return doc;
    }

    /**
     * Imprime directamente el Reporte por Asientos.
     */
    imprimirPdfPorAsientos(graderia: Graderia, asientos: Asiento[], usuario: string): void {
        const doc = this.generarPdfPorAsientos(graderia, asientos, usuario, false);
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            iframe.contentWindow?.print();
        };
    }

    /**
     * Genera el Reporte Ejecutivo Consolidado de Ventas por Operador.
     */
    generarPdfSeguimientoOperadores(
        resumen: ResumenGlobalVentas,
        usuarios: UsuarioVentaStat[],
        adminName: string,
        descargar: boolean = true
    ): jsPDF {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
        const now = this.fmtDateTime(new Date());

        // Encabezado
        doc.setFillColor(150, 0, 35); // #960023
        doc.rect(40, 30, 532, 4, 'F');

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text('AUDITORÍA CONSOLIDADA DE VENTAS POR OPERADOR', 40, 55);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Sistema de Gestión de Graderías y Butacas  |  Generado: ${now}`, 40, 70);
        doc.text(`Supervisor / Auditor: ${this.safe(adminName) || 'Administrador General'}`, 40, 83);

        // Tarjetas Resumen
        const startY = 100;
        const boxW = 125;
        const boxH = 48;
        const boxes = [
            { label: 'TOTAL RECAUDADO', val: `Bs. ${this.money(resumen.total_recaudado)}`, col: [236, 253, 245], textCol: [5, 150, 105] },
            { label: 'BUTACAS VENDIDAS', val: `${resumen.total_pagados} / ${resumen.capacidad_total}`, col: [239, 246, 255], textCol: [37, 99, 235] },
            { label: 'OCUPACIÓN GLOBAL', val: `${resumen.porcentaje_ocupacion}%`, col: [254, 243, 199], textCol: [217, 119, 6] },
            { label: 'RESERVAS PENDIENTES', val: `Bs. ${this.money(resumen.total_reservado_monto)} (${resumen.total_reservados})`, col: [243, 244, 246], textCol: [75, 85, 99] }
        ];

        boxes.forEach((b, idx) => {
            const bx = 40 + idx * (boxW + 10);
            doc.setFillColor(b.col[0], b.col[1], b.col[2]);
            doc.roundedRect(bx, startY, boxW, boxH, 4, 4, 'F');

            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text(b.label, bx + 8, startY + 16);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(b.textCol[0], b.textCol[1], b.textCol[2]);
            doc.text(b.val, bx + 8, startY + 36);
        });

        // Tabla de operadores
        const head = [['#', 'Operador / Cajero', 'Rol', 'Graderías', 'Vendidas', 'Reservas', 'Ocupación', 'Total Recaudado']];
        const body = usuarios.map((u, i) => [
            String(i + 1),
            `${this.safe(u.name)} (${this.safe(u.username)})`,
            this.safe(u.role),
            u.graderias.map(g => g.nombre).join(', ') || 'Sin graderías',
            `${u.total_pagados} / ${u.total_asientos}`,
            String(u.total_reservados),
            `${u.porcentaje_ocupacion}%`,
            `Bs. ${this.money(u.total_recaudado)}`
        ]);

        const totalRecaudadoSuma = usuarios.reduce((acc, u) => acc + (u.total_recaudado || 0), 0);
        const totalPagadosSuma = usuarios.reduce((acc, u) => acc + (u.total_pagados || 0), 0);
        const foot = [['', 'TOTAL GENERAL', '', `${resumen.total_graderias} graderías`, `${totalPagadosSuma} butacas`, `${resumen.total_reservados}`, `${resumen.porcentaje_ocupacion}%`, `Bs. ${this.money(totalRecaudadoSuma)}`]];

        autoTable(doc, {
            head,
            body,
            foot,
            startY: 165,
            theme: 'striped',
            styles: {
                fontSize: 8.5,
                cellPadding: 5,
                textColor: [30, 41, 59]
            },
            headStyles: {
                fillColor: [150, 0, 35],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 25 },
                1: { cellWidth: 120 },
                2: { cellWidth: 65 },
                3: { cellWidth: 125 },
                4: { halign: 'center', cellWidth: 55 },
                5: { halign: 'center', cellWidth: 45 },
                6: { halign: 'center', cellWidth: 45 },
                7: { halign: 'right', cellWidth: 52 }
            },
            margin: { left: 40, right: 40 },
            didDrawPage: (data) => {
                const pageCount = doc.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(140, 140, 140);
                doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.getWidth() - 95, doc.internal.pageSize.getHeight() - 15);
            }
        });

        // Firmas al pie
        let finalY = (doc as any).lastAutoTable?.finalY || 400;
        if (finalY > 640) {
            doc.addPage();
            finalY = 80;
        }

        const signY = finalY + 60;
        doc.setDrawColor(180, 180, 180);
        doc.line(70, signY, 230, signY);
        doc.line(350, signY, 510, signY);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Firma Administrador General', 95, signY + 14);
        doc.text('Auditoría / Visto Bueno', 385, signY + 14);

        if (descargar) {
            const filename = `auditoria_ventas_operadores_${Date.now()}.pdf`;
            doc.save(filename);
        }

        return doc;
    }

    /**
     * Genera la Liquidación Individual / Cierre de Caja de un Operador.
     */
    generarPdfLiquidacionUsuario(
        detalle: DetalleUsuarioVentasResponse,
        adminName: string,
        descargar: boolean = true
    ): jsPDF {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
        const now = this.fmtDateTime(new Date());
        const u = detalle.usuario;
        const res = detalle.resumen;

        // Encabezado
        doc.setFillColor(150, 0, 35);
        doc.rect(40, 30, 532, 4, 'F');

        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text('LIQUIDACIÓN INDIVIDUAL Y CIERRE DE VENTAS', 40, 55);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Emisión: ${now}  |  Supervisor: ${this.safe(adminName) || 'Administrador General'}`, 40, 70);

        // Ficha del Operador
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(40, 85, 532, 55, 4, 4, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`Operador: ${this.safe(u.name)} (${this.safe(u.username)})`, 52, 103);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`Rol: ${this.safe(u.role)}   |   Contacto: ${this.safe(u.telefono_contacto_1) || 'No especificado'}`, 52, 118);
        const nombresGraderias = detalle.graderias.map(g => g.nombre).join(', ') || 'Ninguna';
        doc.text(`Graderías Asignadas: ${nombresGraderias}`, 52, 132);

        // Cajas de resumen
        const startY = 150;
        const boxW = 125;
        const boxH = 42;
        const boxes = [
            { label: 'TOTAL RECAUDADO', val: `Bs. ${this.money(res.total_recaudado)}`, col: [236, 253, 245], textCol: [5, 150, 105] },
            { label: 'BUTACAS PAGADAS', val: `${res.total_pagados} butacas`, col: [239, 246, 255], textCol: [37, 99, 235] },
            { label: 'RESERVAS ACTIVAS', val: `${res.total_reservados} (Bs. ${this.money(res.total_reservado_monto)})`, col: [254, 243, 199], textCol: [217, 119, 6] },
            { label: 'DISPONIBILIDAD', val: `${res.total_libres} libres`, col: [243, 244, 246], textCol: [75, 85, 99] }
        ];

        boxes.forEach((b, idx) => {
            const bx = 40 + idx * (boxW + 10);
            doc.setFillColor(b.col[0], b.col[1], b.col[2]);
            doc.roundedRect(bx, startY, boxW, boxH, 4, 4, 'F');

            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text(b.label, bx + 8, startY + 14);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(b.textCol[0], b.textCol[1], b.textCol[2]);
            doc.text(b.val, bx + 8, startY + 31);
        });

        // Tabla de asientos del operador
        const head = [['#', 'Gradería', 'Asiento', 'Cliente', 'Celular', 'Estado', 'Monto (Bs)', 'Fecha / Hora']];
        const body = detalle.asientos_activos.map((s, idx) => [
            String(idx + 1),
            this.safe(s.graderia_nombre),
            this.safe(s.codigo),
            this.safe(s.cliente_nombre) || 'Sin nombre',
            this.safe(s.cliente_celular) || 'S/N',
            this.statusLabel(s.estado),
            this.money(s.monto),
            this.fmtDateTime(s.pagado_at || s.reservado_at)
        ]);

        const foot = [['', 'TOTAL LIQUIDADO', '', '', '', `${detalle.asientos_activos.length} butacas`, `Bs. ${this.money(res.total_recaudado)}`, '']];

        autoTable(doc, {
            head,
            body,
            foot,
            startY: 205,
            theme: 'striped',
            styles: {
                fontSize: 8,
                cellPadding: 4,
                textColor: [30, 41, 59]
            },
            headStyles: {
                fillColor: [150, 0, 35],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 25 },
                1: { cellWidth: 110 },
                2: { halign: 'center', cellWidth: 45 },
                3: { cellWidth: 120 },
                4: { halign: 'center', cellWidth: 60 },
                5: { halign: 'center', cellWidth: 50 },
                6: { halign: 'right', cellWidth: 55 },
                7: { halign: 'center', cellWidth: 67 }
            },
            margin: { left: 40, right: 40 },
            didDrawPage: (data) => {
                const pageCount = doc.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(140, 140, 140);
                doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.getWidth() - 95, doc.internal.pageSize.getHeight() - 15);
            }
        });

        // Firmas al pie
        let finalY = (doc as any).lastAutoTable?.finalY || 450;
        if (finalY > 640) {
            doc.addPage();
            finalY = 80;
        }

        const signY = finalY + 60;
        doc.setDrawColor(180, 180, 180);
        doc.line(70, signY, 230, signY);
        doc.line(350, signY, 510, signY);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`Firma Operador: ${this.safe(u.name)}`, 75, signY + 14);
        doc.text('Recibido Conforme (Administración)', 360, signY + 14);

        if (descargar) {
            const filename = `cierre_ventas_${u.username}_${Date.now()}.pdf`;
            doc.save(filename);
        }

        return doc;
    }

    // --- Helpers de ordenamiento y formato ---

    private seatSortKey(codigo: string): { letters: string; num: number } {
        const m = String(codigo || '').toUpperCase().match(/^([A-Z]+)(\d+)$/);
        if (!m) return { letters: codigo, num: 0 };
        return { letters: m[1], num: Number(m[2]) };
    }

    sortSeatsByCodigo(asientos: Asiento[]): Asiento[] {
        return [...asientos].sort((a, b) => {
            const ka = this.seatSortKey(a.codigo);
            const kb = this.seatSortKey(b.codigo);
            if (ka.letters < kb.letters) return -1;
            if (ka.letters > kb.letters) return 1;
            return ka.num - kb.num;
        });
    }

    private money(n: number): string {
        return Number(n || 0).toFixed(2);
    }

    private pad2(n: number): string {
        return String(n).padStart(2, '0');
    }

    private fmtDateTime(v: string | Date | null | undefined): string {
        if (!v) return '';
        const d = new Date(v);
        if (isNaN(d.getTime())) return String(v);
        return `${this.pad2(d.getDate())}/${this.pad2(d.getMonth() + 1)}/${d.getFullYear()} ${this.pad2(d.getHours())}:${this.pad2(d.getMinutes())}`;
    }

    private safe(v: any): string {
        return v === null || v === undefined ? '' : String(v);
    }

    private statusLabel(estado: string | undefined): string {
        const st = (estado || 'LIBRE').toUpperCase();
        switch (st) {
            case 'PAGADO':
                return 'Pagado';
            case 'RESERVADO':
                return 'Reservado';
            case 'BLOQUEADO':
                return 'Bloqueado';
            case 'LIBRE':
            default:
                return 'Libre';
        }
    }
}
