import QRCode from 'qrcode'
import { useCounterStore } from 'stores/example-store'
import { Printd } from 'printd'
import conversor from 'conversor-numero-a-letras-es-ar'
import { Unidades } from 'numero-a-letras';

import moment from 'moment'
// const puppeteer = require('puppeteer')
// import puppeteer from 'puppeteer'

export class Imprimir {
  static numeroALetras(num) {
    num = parseInt(num);
    if (isNaN(num) || num < 0 || num > 1000000) return 'Número fuera de rango';

    const unidades = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const especiales = {
      10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce',
      15: 'quince', 16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve'
    };
    const centenas = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    function convertirCentenas(n) {
      if (n < 10) return unidades[n];
      if (n >= 10 && n < 20) return especiales[n];
      if (n < 100) {
        const unidad = n % 10;
        return `${decenas[Math.floor(n / 10)]}${unidad > 0 ? ' y ' + unidades[unidad] : ''}`;
      }
      if (n === 100) return 'cien';
      const dec = n % 100;
      return `${centenas[Math.floor(n / 100)]}${dec > 0 ? ' ' + convertirCentenas(dec) : ''}`;
    }

    if (num === 1000000) return 'un millón';

    let miles = Math.floor(num / 1000);
    let resto = num % 1000;
    let milesTexto = miles > 0 ? (miles === 1 ? 'mil' : `${convertirCentenas(miles)} mil`) : '';
    let restoTexto = resto > 0 ? convertirCentenas(resto) : '';

    return (milesTexto + ' ' + restoTexto).trim();
  }
  static imprimirCaja (caja) {

  }
  static async factura(venta) {
    return new Promise(async (resolve, reject) => {
      try {
        // ===== helpers =====
        const ClaseConversor = conversor.conversorNumerosALetras;
        const miConversor = new ClaseConversor();
        const env = useCounterStore().env;

        const F2 = (n) => Number(n || 0).toFixed(2);
        const S  = (v) => (v ?? '').toString();

        const total          = Number(venta.total ?? venta.montoTotal ?? 0);
        const numeroFactura  = venta.numeroFactura ?? venta.numero_factura ?? venta.id ?? '—';
        const fechaEmision   = venta.fechaEmision ?? (venta.fecha && venta.hora ? `${venta.fecha} ${venta.hora}` : '—');
        const clienteNombre  = venta.nombre ?? venta?.cliente?.nombre ?? 'SN';
        const clienteComplemento = venta.complemento ?? venta?.cliente?.complemento ?? '';
        const clienteDoc     = venta.ci ?? venta?.cliente?.ci ?? '0';
        const codigoCliente  = venta.cliente_id ?? venta?.cliente?.id ?? '—';
        const puntoVenta     = env?.puntoVenta ?? 0;
        const cufVenta            = venta.cuf ?? null;
        const cuf = cufVenta ? cufVenta.match(/.{1,20}/g).join('<br>') : null;

        const titulo = cufVenta ? 'FACTURA<br>CON DERECHO A CRÉDITO FISCAL' : 'NOTA DE VENTA';

        const leyenda = venta.leyenda ?? 'Ley N° 453: Puedes acceder a la reclamación cuando tus derechos han sido vulnerados.';
        const detalles = Array.isArray(venta.venta_detalles) ? venta.venta_detalles
          : Array.isArray(venta.details) ? venta.details : [];

        const enteros = Math.floor(total);
        const centavos = Math.round((total - enteros) * 100)
          .toString().padStart(2, '0');
        const SON = `Son ${miConversor.convertToText(enteros)} ${centavos}/100 Bolivianos`;

        // QR
        let qrUrl = null;
        if (cuf) {
          qrUrl = await QRCode.toDataURL(
            `${env.url2}consulta/QR?nit=${env.nit}&cuf=${cuf}&numero=${numeroFactura}&t=2`,
            { errorCorrectionLevel:'M', type:'png', width:110, margin:0, color:{dark:'#000', light:'#FFF'} }
          );
        }

        // ===== HTML + CSS =====
        let html = `${this.head()}
<style>
/* Ticket 80mm ~ 300px */
.ticket { width:300px; margin:0 auto; }
.mono { font-family: "Courier New", Courier, monospace; }
.fs9 { font-size:9px; } .fs10{font-size:10px;} .fs11{font-size:11px;} .fs12{font-size:12px;}
.center{ text-align:center; } .right{ text-align:right; } .left{ text-align:left; }
hr{ border:0; border-top:1px dashed #000; margin:6px 0; }
.title{ font-weight:700; text-transform:uppercase; line-height:1.15; }
.small { font-size:8px; line-height:1.25; }

.tbl{ width:100%; border-collapse:collapse; }
.tbl td{ padding:2px 0; vertical-align:top; }

.lbl{ width:135px; font-weight:700; text-transform:uppercase; }
.val{ width:auto; }

.det-header{ font-weight:700; text-transform:uppercase; margin:4px 0; }
.item-desc{ font-weight:700; }
.item-meta{ color:#111; }

.tot td{ padding:1px 0; }
.tot .l{ width:70%; }
.tot .r{ width:30%; text-align:right; }

.qr{ display:flex; justify-content:center; margin-top:6px; }
@page { margin: 6mm; }
</style>

<div class="ticket mono fs10">
  <div class="title fs12 center">${titulo}</div>

  <div class="center small">
    ${S(env.razon)}<br>
    Casa Matriz<br>
    No. Punto de Venta ${puntoVenta}<br>
    ${S(env.direccion)}<br>
    Tel. ${S(env.telefono)}<br>
    Oruro
  </div>

  <hr>

  <table class="tbl fs10">
    <tr><td class="lbl">NIT</td><td class="val">${S(env.nit)}</td></tr>
    <tr><td class="lbl">FACTURA N°</td><td class="val">${numeroFactura}</td></tr>
    <tr><td class="lbl">CÓD. AUTORIZACIÓN</td><td class="val">${cuf ?? '—'}</td></tr>
  </table>

  <hr>

  <table class="tbl fs10">
    <tr><td class="lbl">NOMBRE/RAZÓN SOCIAL</td><td class="val">${S(clienteNombre)}</td></tr>
    <tr><td class="lbl">NIT/CI/CEX</td><td class="val">${S(clienteDoc)}${S(clienteComplemento? '-' + clienteComplemento : '')}</td></tr>
    <tr><td class="lbl">NRO. CLIENTE</td><td class="val">${S(codigoCliente)}</td></tr>
    <tr><td class="lbl">FECHA DE EMISIÓN</td><td class="val">${S(fechaEmision)}</td></tr>
  </table>

  <hr>
  <div class="det-header center">DETALLE</div>`;

        // ===== DETALLES (tabla fija para que no se desplace) =====
        detalles.forEach(d => {
          const prodId   = d.producto_id ?? d.product_id ?? d?.producto?.id ?? '—';
          const desc     = S(d.nombre ?? d.descripcion ?? d?.producto?.nombre ?? '');
          const unidad   = S(d.unidad ?? d?.producto?.unidad ?? '');
          const qty      = Number(d.cantidad ?? d.qty ?? 0);
          const precioU  = Number(d.precio ?? d.precioUnitario ?? 0);
          const descMonto= Number(d.descuento ?? d.montoDescuento ?? 0);
          const sub      = d.subTotal ?? (qty * precioU - descMonto);

          html += `
      <table class="tbl fs10">
        <tr>
          <td class="left item-desc" colspan="3">${prodId} - ${desc}</td>
          <td class="right item-desc">${F2(sub)}</td>
        </tr>
        <tr><td class="left item-meta" colspan="4">Unidad de Medida: ${unidad || 'Unidad (Servicios)'}</td></tr>
        <tr>
          <td class="right" style="width:22%;">${F2(qty)}</td>
          <td class="center" style="width:6%;">x</td>
          <td class="right" style="width:32%;">${F2(precioU)} - ${F2(descMonto)}</td>
          <td class="right" style="width:40%;"></td>
        </tr>
      </table>`;
        });

        // ===== TOTALES =====
        html += `
  <hr>
  <table class="tbl tot fs10">
    <tr><td class="l left strong">TOTAL Bs</td><td class="r strong">${F2(total)}</td></tr>
    <tr><td class="l left">(-) DESCUENTO Bs</td><td class="r">0.00</td></tr>
    <tr><td class="l left strong">SUBTOTAL A PAGAR Bs</td><td class="r strong">${F2(total)}</td></tr>
    <tr><td class="l left">(-) AJUSTES NO SUJETOS A IVA Bs</td><td class="r">0.00</td></tr>
    <tr><td class="l left strong">MONTO TOTAL A PAGAR Bs</td><td class="r strong">${F2(total)}</td></tr>
    <tr><td class="l left">(-) TASAS Bs</td><td class="r">0.00</td></tr>
    <tr><td class="l left">(-) OTROS PAGOS NO SUJETO IVA Bs</td><td class="r">0.00</td></tr>
    <tr><td class="l left">(+) AJUSTES NO SUJETOS A IVA Bs</td><td class="r">0.00</td></tr>
    <tr><td class="l left strong">IMPORTE BASE CRÉDITO FISCAL</td><td class="r strong">${F2(total)}</td></tr>
  </table>

  <div class="fs10" style="margin-top:6px;">${SON}</div>

  <hr>
  <div class="center small">
    ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS,<br>
    EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY
  </div>
  <div class="center small" style="margin-top:4px;">${S(leyenda)}</div>
  <div class="center small" style="margin-top:4px;">“Este documento es la Representación Gráfica de un<br>Documento Fiscal Digital emitido en una modalidad de facturación en línea”</div>
  ${qrUrl ? `<div class="qr"><img src="${qrUrl}" alt="QR"></div>` : ``}
</div>`;

        // imprimir
        const el = document.getElementById('myElement');
        if (el) el.innerHTML = html;
        const d = new Printd();
        d.print(el);
        resolve(qrUrl);
      } catch (e) {
        reject(e);
      }
    });
  }

  static nota (factura, imprimir = true) {
    console.log('factura', factura)
    return new Promise((resolve, reject) => {
      const a = this.numeroALetras(123)
      const opts = {
        errorCorrectionLevel: 'M',
        type: 'png',
        quality: 0.95,
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFF'
        }
      }
      const env = useCounterStore().env
      QRCode.toDataURL(`Fecha: ${factura.fecha_emision} Monto: ${parseFloat(factura.total).toFixed(2)}`, opts).then(url => {
        let producto = ''
        let cantidad = ''
        if (factura.producto) {
          // eslint-disable-next-line no-template-curly-in-string
          producto = '<tr><td class=\'titder\'>PRODUCTO:</td><td class=\'contenido\'>' + factura.producto + '</td></tr>'
        }
        if (factura.cantidad) {
          // eslint-disable-next-line no-template-curly-in-string
          cantidad = '<tr><td class=\'titder\'>CANTIDAD:</td><td class=\'contenido\'>' + factura.cantidad + '</td></tr>'
        }

        let cadena = `${this.head()}
  <!--div style='padding-left: 0.5cm;padding-right: 0.5cm'>
  <img src="logo.png" alt="logo" style="width: 100px; height: 50px; display: block; margin-left: auto; margin-right: auto;">
      <div class='titulo'>${factura.tipo_venta === 'EGRESO' ? 'NOTA DE EGRESO' : 'NOTA DE VENTA'}</div>
      <div class='titulo2'>${factura.tipo_comprobante} <br>
      Casa Matriz<br>
      No. Punto de Venta 0<br>
${'Calle Beni Nro. 60, entre 6 de Octubre y Potosí.'}<br>
Tel. ${'25247993 - 76148555'}<br>
Oruro</div!-->
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
   .mono {
    font-family: Monospace,serif !important;
    font-size: 18px !important;
  }
</style>
<title></title>
</head>
<body>
<div class="mono">
<hr>
<table>
<tr><td class='titder'>ID:</td><td class='titder'>${factura.id }</td></tr>
<tr><td class='titder'>NOMBRE/RAZÓN SOCIAL:</td><td class='titder'>${factura.nombre }</td></tr>
<tr><!-- td class='titder'>NIT/CI/CEX:</td><td class='contenido'>${factura.client ? factura.client.nit : ''}</td --></tr>
<tr><td class='titder'>FECHA DE EMISIÓN:</td><td class='contenido'>${factura.fecha}</td></tr>
${producto}
${cantidad}
</table><hr><div class='titulo'>DETALLE</div>`
        factura.venta_detalles.forEach(r => {
          console.log('r', r)
          cadena += `<div style='font-size: 12px'><b> ${r.producto?.nombre} </b></div>`
          if (r.visible === 1) {
            cadena += `<div>
                    <span style='font-size: 18px;font-weight: bold'>
                        ${r.cantidad}
                    </span>
                    <span>
                    ${parseFloat(r.precio).toFixed(2)}
                    </span>

                    <span style='float:right'>
                        ${parseFloat(r.precio * r.cantidad).toFixed(2)}
                    </span>
                    </div>`
          } else {
            cadena += `<div>
                    <span style='font-size: 18px;font-weight: bold'>
                        ${r.cantidad}
                    </span>
                    <span>

                    </span>

                    <span style='float:right'>

                    </span>`
          }
        })
        cadena += `<hr>
<div>${factura.comentario === '' || factura.comentario === null  || factura.comentario === undefined ? '' : 'Comentario: ' + factura.comentario}</div>
      <table style='font-size: 8px;'>
      <tr><td class='titder' style='width: 60%'>SUBTOTAL Bs</td><td class='titder'>${parseFloat(factura.total).toFixed(2)}</td></tr>
<!--      <tr><td class='titder' style='width: 60%'>Descuento Bs</td><td class='titder'>${parseFloat(factura.descuento).toFixed(2)}</td></tr>-->
<!--      <tr><td class='titder' style='width: 60%'>TOTAL Bs</td><td class='titder'>${parseFloat(factura.total - factura.descuento).toFixed(2)}</td></tr>-->
      </table>
      <br>
      <div>Son ${a} ${((parseFloat(factura.total) - Math.floor(parseFloat(factura.total))) * 100).toFixed(2)} /100 Bolivianos</div><hr>
        <!--div style='display: flex;justify-content: center;'>
          <img  src="${url}" style="width: 75px; height: 75px; display: block; margin-left: auto; margin-right: auto;">
        </div--!>
      </div>
      </div>
</body>
</html>`
        // console.log('cadena', cadena)
        document.getElementById('myElement').innerHTML = cadena
        if (imprimir) {
          const d = new Printd()
          d.print(document.getElementById('myElement'))
        }
        resolve(url)
      }).catch(err => {
        reject(err)
      })
    })
  }

  static cotizacion (detalle, cliente, total, descuento, imprimir = true) {
    // console.log('detalle', detalle)
    // console.log('cliente', cliente)
    // console.log('total', total)
    // console.log('descuento', descuento)
    if (descuento === null || descuento === undefined || descuento === '') {
      descuento = 0
    }
    return new Promise((resolve, reject) => {
      const ClaseConversor = conversor.conversorNumerosALetras
      const miConversor = new ClaseConversor()
      const a = miConversor.convertToText(parseInt(total))
      const hoy = moment().format('YYYY-MM-DD')
      const opts = {
        errorCorrectionLevel: 'M',
        type: 'png',
        quality: 0.95,
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFF'
        }
      }
      const env = useCounterStore().env
      QRCode.toDataURL(`Fecha: ${hoy} Monto: ${parseFloat(total).toFixed(2)}`, opts).then(url => {
        let cadena = `${this.head()}
  <div style='padding-left: 0.5cm;padding-right: 0.5cm'>
  <img src="logo.png" alt="logo" style="width: 100px; height: 50px; display: block; margin-left: auto; margin-right: auto;">
      <div class='titulo'>${'COTIZACION'}</div>
      <div class='titulo2'>${env.razon} <br>
      Casa Matriz<br>
      No. Punto de Venta 0<br>
${env.direccion}<br>
Tel. ${env.telefono}<br>
Oruro</div>
<hr>
<table>
<tr><td class='titder'>NOMBRE/RAZÓN SOCIAL:</td><td class='contenido'>${cliente.nombre}</td>
<tr><td class='titder'>FECHA DE EMISIÓN:</td><td class='contenido'>${hoy}</td></tr>
</table><hr><div class='titulo'>DETALLE</div>`
        detalle.forEach(r => {
          cadena += `<div style='font-size: 12px'><b> ${r.nombre} </b></div>`
          cadena += `<div><span style='font-size: 18px;font-weight: bold'>${r.cantidadVenta}</span> ${parseFloat(r.precioVenta).toFixed(2)} 0.00
                    <span style='float:right'>${parseFloat(r.precioVenta * r.cantidadVenta).toFixed(2)}</span></div>`
        })
        cadena += `<hr>
<div>${cliente.comentario === '' || cliente.comentario === null || cliente.comentario === undefined ? '' : 'Comentario: ' + cliente.comentario}</div>
      <table style='font-size: 8px;'>
      <tr><td class='titder' style='width: 60%'>SUBTOTAL Bs</td><td class='conte2'>${parseFloat(total).toFixed(2)}</td></tr>
      <tr><td class='titder' style='width: 60%'>Descuento Bs</td><td class='conte2'>${parseFloat(descuento).toFixed(2)}</td></tr>
      <tr><td class='titder' style='width: 60%'>TOTAL Bs</td><td class='conte2'>${parseFloat(total - descuento).toFixed(2)}</td></tr>
      </table>
      <br>
      <div>Son ${a} ${((parseFloat(total) - Math.floor(parseFloat(total))) * 100).toFixed(2)} /100 Bolivianos</div><hr>
      <div style='display: flex;justify-content: center;'>
        <img  src="${url}" style="width: 75px; height: 75px; display: block; margin-left: auto; margin-right: auto;">
      </div></div>
      </div>
</body>
</html>`
        document.getElementById('myElement').innerHTML = cadena
        if (imprimir) {
          const d = new Printd()
          d.print(document.getElementById('myElement'))
        }
        resolve(url)
      }).catch(err => {
        reject(err)
      })
    })
  }

  static notaCompra (factura) {
    console.log('factura', factura)
    return new Promise((resolve, reject) => {
      const ClaseConversor = conversor.conversorNumerosALetras
      const miConversor = new ClaseConversor()
      const a = miConversor.convertToText(parseInt(factura.total))
      const opts = {
        errorCorrectionLevel: 'M',
        type: 'png',
        quality: 0.95,
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFF'
        }
      }
      const env = useCounterStore().env
      QRCode.toDataURL(`Fecha: ${factura.fecha_emision} Monto: ${parseFloat(factura.total).toFixed(2)}`, opts).then(async url => {
        let cadena = `${this.head()}
  <div style='padding-left: 0.5cm;padding-right: 0.5cm'>
  <img src="logo.png" alt="logo" style="width: 100px; height: 50px; display: block; margin-left: auto; margin-right: auto;">
      <div class='titulo'>${factura.tipo_venta === 'EGRESO' ? 'NOTA DE EGRESO' : 'NOTA DE COMPRA'}</div>
      <div class='titulo2'>${env.razon} <br>
      Casa Matriz<br>
      No. Punto de Venta 0<br>
${env.direccion}<br>
Tel. ${env.telefono}<br>
Oruro</div>
<hr>
<table>
<tr><td class='titder'>NOMBRE/RAZÓN SOCIAL:</td><td class='contenido'>${factura.client ? factura.client.nombre : ''}</td>
</tr><tr><td class='titder'>NIT/CI/CEX:</td><td class='contenido'>${factura.client ? factura.client.nit : ''}</td></tr>
<!--<tr><td class='titder'>FECHA DE EMISIÓN:</td><td class='contenido'>${factura.fecha_emision}</td></tr>-->
</table><hr><div class='titulo'>DETALLE</div>`
        factura.buy_details.forEach(r => {
          cadena += `<div style='font-size: 12px'><b>${r.nombre} </b></div>`
          cadena += `<div><span style='font-size: 14px;font-weight: bold'>${r.cantidad}</span> ${parseFloat(r.precio).toFixed(2)} 0.00
                    <span style='float:right'>${parseFloat(r.subtotal).toFixed(2)}</span></div>`
        })
        cadena += `<hr>
      <table style='font-size: 8px;'>
      <tr><td class='titder' style='width: 60%'>SUBTOTAL Bs</td><td class='conte2'>${parseFloat(factura.total).toFixed(2)}</td></tr>
      <tr><td class='titder' style='width: 60%'>Descuento Bs</td><td class='conte2'>${parseFloat(factura.descuento).toFixed(2)}</td></tr>
      <tr><td class='titder' style='width: 60%'>TOTAL Bs</td><td class='conte2'>${parseFloat(factura.total - factura.descuento).toFixed(2)}</td></tr>
      </table>
      <br>
      <div>Son ${a} ${((parseFloat(factura.total) - Math.floor(parseFloat(factura.total))) * 100).toFixed(2)} /100 Bolivianos</div><hr>
      <div style='display: flex;justify-content: center;'>
        <img  src="${url}" style="width: 75px; height: 75px; display: block; margin-left: auto; margin-right: auto;">
      </div></div>
      </div>
</body>
</html>`
        document.getElementById('myElement').innerHTML = cadena
        const d = new Printd()
        d.print(document.getElementById('myElement'))
        resolve(url)
      }).catch(err => {
        reject(err)
      })
    })
  }

  static reportTotal (sales, title) {
    const montoIngreso = sales.filter(r => r.tipoVenta === 'Ingreso').reduce((a, b) => a + b.montoTotal, 0)
    const montoEgreso = sales.filter(r => r.tipoVenta === 'Egreso').reduce((a, b) => a + b.montoTotal, 0)
    const montoTotal = montoIngreso - montoEgreso
    console.log('montoTotal', montoTotal)
    return new Promise((resolve, reject) => {
      const ClaseConversor = conversor.conversorNumerosALetras
      const miConversor = new ClaseConversor()
      const montoAbsoluto = Math.abs(montoTotal)
      const a = miConversor.convertToText(parseInt(montoAbsoluto))
      const opts = {
        errorCorrectionLevel: 'M',
        type: 'png',
        quality: 0.95,
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFF'
        }
      }
      const env = useCounterStore().env
      QRCode.toDataURL(` Monto: ${parseFloat(montoTotal).toFixed(2)}`, opts).then(url => {
        let cadena = `${this.head()}
  <div style='padding-left: 0.5cm;padding-right: 0.5cm'>
  <img src="logo.png" alt="logo" style="width: 100px; height: 100px; display: block; margin-left: auto; margin-right: auto;">
      <div class='titulo'>title</div>
      <div class='titulo2'>${env.razon} <br>
      Casa Matriz<br>
      No. Punto de Venta 0<br>
${env.direccion}<br>
Tel. ${env.telefono}<br>
Oruro</div>
<hr>
<table>
</table><hr><div class='titulo'>DETALLE</div>`
        sales.forEach(r => {
          cadena += `<div style='font-size: 12px'><b> ${r.user.name} </b></div>`
          cadena += `<div> ${parseFloat(r.montoTotal).toFixed(2)} ${r.tipoVenta}
          <span style='float:right'> ${r.tipoVenta === 'Egreso' ? '-' : ''} ${parseFloat(r.montoTotal).toFixed(2)}</span></div>`
        })
        cadena += `<hr>
      <table style='font-size: 8px;'>
      <tr><td class='titder' style='width: 60%'>SUBTOTAL Bs</td><td class='conte2'>${parseFloat(montoTotal).toFixed(2)}</td></tr>
      </table>
      <br>
      <div>Son ${a} ${((parseFloat(montoTotal) - Math.floor(parseFloat(montoTotal))) * 100).toFixed(2)} /100 Bolivianos</div><hr>
      <div style='display: flex;justify-content: center;'>
        <img  src="${url}" style="width: 75px; height: 75px; display: block; margin-left: auto; margin-right: auto;">
      </div></div>
      </div>
</body>
</html>`
        document.getElementById('myElement').innerHTML = cadena
        const d = new Printd()
        d.print(document.getElementById('myElement'))
        resolve(url)
      }).catch(err => {
        reject(err)
      })
    })
  }

  static reciboCompra (buy) {
    // console.log('reciboCompra', buy)
    return new Promise((resolve, reject) => {
      const ClaseConversor = conversor.conversorNumerosALetras
      const miConversor = new ClaseConversor()
      const a = miConversor.convertToText(parseInt(buy.total))
      const opts = {
        errorCorrectionLevel: 'M',
        type: 'png',
        quality: 0.95,
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFF'
        }
      }
      const env = useCounterStore().env
      console.log('env', env)
      QRCode.toDataURL(`Fecha: ${buy.date} Monto: ${parseFloat(buy.total).toFixed(2)}`, opts).then(url => {
        let cadena = `${this.head()}
    <div style='padding-left: 0.5cm;padding-right: 0.5cm'>
    <img src="logo.png" alt="logo" style="width: 100px; height: 100px; display: block; margin-left: auto; margin-right: auto;">
      <div class='titulo'>RECIBO DE COMPRA</div>
      <div class='titulo2'>${env.razon} <br>
      Casa Matriz<br>
      No. Punto de Venta 0<br>
    ${env.direccion}<br>
    Tel. ${env.telefono}<br>
    Oruro</div>
    <hr>
    <table>
    </table><hr><div class='titulo'>DETALLE</div>`
        buy.compra_detalles.forEach(r => {
          cadena += `<div style='font-size: 12px'><b>${r.nombre} </b></div>`
          cadena += `<div>${r.cantidad} ${parseFloat(r.precio).toFixed(2)} 0.00
          <span style='float:right'>${parseFloat(r.total).toFixed(2)}</span></div>`
        })
        cadena += `<hr>
      <table style='font-size: 8px;'>
      <tr><td class='titder' style='width: 60%'>SUBTOTAL Bs</td><td class='conte2'>${parseFloat(buy.total).toFixed(2)}</td></tr>
      </table>
      <br>
      <div>Son ${a} ${((parseFloat(buy.total) - Math.floor(parseFloat(buy.total))) * 100).toFixed(2)} /100 Bolivianos</div><hr>
      <div style='display: flex;justify-content: center;'>
        <img  src="${url}" style="width: 75px; height: 75px; display: block; margin-left: auto; margin-right: auto;">
      </div></div>
      </div>
    </body>
    </html>`
        document.getElementById('myElement').innerHTML = cadena
        const d = new Printd()
        d.print(document.getElementById('myElement'))
        resolve(url)
      }).catch(err => {
        reject(err)
      })
    })
  }
  static reciboPedido (buy) {
    console.log('reciboPedido', buy)
    return new Promise((resolve, reject) => {
      const ClaseConversor = conversor.conversorNumerosALetras
      const miConversor = new ClaseConversor()
      const a = miConversor.convertToText(parseInt(buy.total))
      const opts = {
        errorCorrectionLevel: 'M',
        type: 'png',
        quality: 0.95,
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFF'
        }
      }
      const env = useCounterStore().env
      QRCode.toDataURL(`Fecha: ${buy.date} Monto: ${parseFloat(buy.total).toFixed(2)}`, opts).then(url => {
        let cadena = `${this.head()}
    <div style='padding-left: 0.5cm;padding-right: 0.5cm'>
    <img src="logo.png" alt="logo" style="width: 100px; height: 100px; display: block; margin-left: auto; margin-right: auto;">
      <div class='titulo'>RECIBO DE PEDIDO</div>
      <div class='titulo2'>${env.razon} <br>
      Casa Matriz<br>
      No. Punto de Venta 0<br>
    ${env.direccion}<br>
    Tel. ${env.telefono}<br>
    Oruro</div>
    <hr>
    <div style='display: flex;justify-content: space-between;'>
        <div class='titulo'>FECHA HORA</div>
        <div class='titulo2'>${buy.fecha} ${buy.hora}</div>
    </div>
    <div style='display: flex;justify-content: space-between;'>
        <div class='titulo'>ID</div>
        <div class='titulo2'>${buy.id}</div>
    </div>
    <hr>
    <div class='titulo'>DETALLE</div>`
        buy.detalles.forEach(r => {
          cadena += `<div style='font-size: 12px'><b>${r.producto?.nombre} </b></div>`
          cadena += `<div>${r.cantidad} ${parseFloat(r.cantidad).toFixed(2)} 0.00
          <span style='float:right'>${parseFloat(r.cantidad).toFixed(2)}</span></div>`
        })
        cadena += `<hr>
      <table style='font-size: 8px;'>
      <tr><td class='titder' style='width: 60%'>SUBTOTAL Bs</td><td class='conte2'>${parseFloat(buy.total).toFixed(2)}</td></tr>
      </table>
      <br>
      <div>Son ${a} ${((parseFloat(buy.total) - Math.floor(parseFloat(buy.total))) * 100).toFixed(2)} /100 Bolivianos</div><hr>
      <div style='display: flex;justify-content: center;'>
        <img  src="${url}" style="width: 75px; height: 75px; display: block; margin-left: auto; margin-right: auto;">
      </div></div>
      </div>
    </body>
    </html>`
        document.getElementById('myElement').innerHTML = cadena
        const d = new Printd()
        d.print(document.getElementById('myElement'))
        resolve(url)
      }).catch(err => {
        reject(err)
      })
    })
  }

  static reciboTranferencia (producto, de, ha, cantidad) {
    console.log('producto', producto, 'de', de, 'ha', ha, 'cantidad', cantidad)
    return new Promise((resolve, reject) => {
      const ClaseConversor = conversor.conversorNumerosALetras
      const miConversor = new ClaseConversor()
      const a = miConversor.convertToText(parseInt(cantidad))
      const opts = {
        errorCorrectionLevel: 'M',
        type: 'png',
        quality: 0.95,
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFF'
        }
      }
      const env = useCounterStore().env
      QRCode.toDataURL(`de: ${de} A: ${ha}`, opts).then(url => {
        let cadena = `${this.head()}
    <div style='padding-left: 0.5cm;padding-right: 0.5cm'>
    <img src="logo.png" alt="logo" style="width: 100px; height: 100px; display: block; margin-left: auto; margin-right: auto;">
      <div class='titulo'>RECIBO DE TRANSFERENCIA</div>
      <div class='titulo2'>${env.razon} <br>
      Casa Matriz<br>
      No. Punto de Venta 0<br>
    ${env.direccion}<br>
    Tel. ${env.telefono}<br>
    Oruro</div>
    <hr>
    <table>
    </table><hr><div class='titulo'>DETALLE</div>`
        cadena += `<div style='font-size: 12px'><b>Producto: ${producto} de Sucursal${de} a ${ha} </b></div>`
        cadena += `<hr>
      <table style='font-size: 8px;'>
      <tr><td class='titder' style='width: 60%'>CANTIDAD </td><td class='conte2'>${cantidad + ''}</td></tr>
      </table>
      <br>
      <div>Son ${a + ''} ${cantidad + ''} unidades</div><hr>
      <div style='display: flex;justify-content: center;'>
        <img  src="${url}" style="width: 75px; height: 75px; display: block; margin-left: auto; margin-right: auto;">
      </div></div>
      </div>
    </body>
    </html>`
        document.getElementById('myElement').innerHTML = cadena
        const d = new Printd()
        d.print(document.getElementById('myElement'))
        resolve(url)
      }).catch(err => {
        reject(err)
      })
    })
  }

  static head () {
    return `<html>
<style>
      .titulo{
      font-size: 12px;
      text-align: center;
      font-weight: bold;
      }
      .titulo2{
      font-size: 10px;
      text-align: center;
      }
            .titulo3{
      font-size: 10px;
      text-align: center;
      width:70%;
      }
            .contenido{
      font-size: 10px;
      text-align: left;
      }
      .conte2{
      font-size: 10px;
      text-align: right;
      }
      .titder{
      font-size: 12px;
      text-align: right;
      font-weight: bold;
      }
      hr{
  border-top: 1px dashed   ;
}
  table{
    width:100%
  }
  h1 {
    color: black;
    font-family: sans-serif;
  }
  </style>
<body>
<div style="width: 300px;">`
  }
  static async printFactura(factura) {
    const ClaseConversor = conversor.conversorNumerosALetras;
    const miConversor = new ClaseConversor();
    const literal = miConversor.convertToText(parseInt(factura.total));
    const env = useCounterStore().env;
    const qr = await QRCode.toDataURL(`${env.url2}consulta/QR?nit=${env.nit}&cuf=${factura.cuf}&numero=${factura.id}&t=2`, {
      errorCorrectionLevel: 'M',
      type: 'png',
      quality: 0.95,
      width: 100,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFF'
      }
    });
    const online = factura.online ? 'en' : 'fuera de';

    let html = `<style>
    .titulo { font-size: 12px; text-align: center; font-weight: bold; }
    .titulo2 { font-size: 10px; text-align: center; }
    .contenido { font-size: 10px; text-align: left; }
    .conte2 { font-size: 10px; text-align: right; }
    .titder { font-size: 12px; text-align: right; font-weight: bold; }
    hr { border-top: 1px dashed; }
  </style>
  <div style='padding: 0.5cm'>
    <div class='titulo'>FACTURA CON DERECHO A CREDITO FISCAL</div>
    <div class='titulo2'>
      ${env.razon}<br>Casa Matriz<br>No. Punto de Venta 0<br>
      ${env.direccion}<br>Tel. ${env.telefono}<br>Oruro
    </div>
    <hr>
    <div class='titulo'>NIT</div><div class='titulo2'>${env.nit}</div>
    <div class='titulo'>FACTURA N°</div><div class='titulo2'>${factura.id}</div>
    <div class='titulo'>CÓD. AUTORIZACIÓN</div><div class='titulo2'>${factura.cuf}</div>
    <hr>
    <table>
      <tr><td class='titder'>NOMBRE/RAZÓN SOCIAL:</td><td class='contenido'>${factura.nombre}</td></tr>
      <tr><td class='titder'>NIT/CI/CEX:</td><td class='contenido'>${factura.ci}${factura.cliente?.complemento? '-' + factura.cliente?.complemento : ''}</td></tr>
      <tr><td class='titder'>COD. CLIENTE:</td><td class='contenido'>${factura.cliente.id}</td></tr>
      <tr><td class='titder'>FECHA DE EMISIÓN:</td><td class='contenido'>${factura.fecha}</td></tr>
    </table>
    <hr>
    <div class='titulo'>DETALLE</div>`;

    factura.venta_detalles.forEach(r => {
      html += `<div style='font-size: 12px'><b>${r.id} - ${r.nombre}</b></div>
             <div>${r.cantidad} ${parseFloat(r.precio).toFixed(2)} 0.00
             <span style='float:right'>${parseFloat(r.cantidad*r.precio).toFixed(2)}</span></div>`;
    });

    html += `<hr>
    <table style='font-size: 8px;'>
      <tr><td class='titder'>SUBTOTAL Bs</td><td class='conte2'>${parseFloat(factura.total).toFixed(2)}</td></tr>
      <tr><td class='titder'>DESCUENTO Bs</td><td class='conte2'>0.00</td></tr>
      <tr><td class='titder'>TOTAL Bs</td><td class='conte2'>${parseFloat(factura.total).toFixed(2)}</td></tr>
      <tr><td class='titder'>MONTO GIFT CARD Bs</td><td class='conte2'>0.00</td></tr>
      <tr><td class='titder'>MONTO A PAGAR Bs</td><td class='conte2'>${parseFloat(factura.total).toFixed(2)}</td></tr>
      <tr><td class='titder'>IMPORTE BASE CRÉDITO FISCAL Bs</td><td class='conte2'>${parseFloat(factura.total).toFixed(2)}</td></tr>
    </table><br>
    <div>Son ${literal} ${((parseFloat(factura.total) - Math.floor(factura.total)) * 100).toFixed(0)}/100 Bolivianos</div>
    <hr>
    <div class='titulo2' style='font-size: 9px'>ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS,<br>
    EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY<br><br>
    ${factura.leyenda}<br><br>
    “Este documento es la Representación Gráfica de un Documento Fiscal Digital emitido en una modalidad de facturación ${online} línea”</div>
    <div style='display: flex; justify-content: center;'>
      <img src="${qr}" />
    </div>
  </div>`;

    // document.getElementById('myelement').innerHTML = html;
    const el = document.getElementById('myElement');
    if (el) el.innerHTML = html;
    const d = new Printd();
    d.print(el);
  }
  static async reciboVentaSimple(venta, imprimir = true) {
    try {
      const env = useCounterStore().env || {};
      const ClaseConversor = conversor.conversorNumerosALetras;
      const miConversor = new ClaseConversor();

      const F2 = (n) => Number(n || 0).toFixed(2);
      const S  = (v, d='') => (v ?? d).toString();

      const total = Number(venta.total ?? 0);
      const enteros  = Math.floor(total);
      const centavos = Math.round((total - enteros) * 100).toString().padStart(2, '0');
      const literalNum = miConversor.convertToText(enteros);
      const literal = `Son ${literalNum} ${centavos}/100 Bolivianos`;

      const detalles = Array.isArray(venta.venta_detalles) ? venta.venta_detalles : [];

      // ---------- HTML estilo "reciboCompra" ----------
      let cadena = `${this.head()}
  <div style='padding-left: 0.5cm;padding-right: 0.5cm'>
    <img src="logo.png" alt="logo" style="width: 100px; height: 100px; display: block; margin-left: auto; margin-right: auto;">

    <div class='titulo'>RECIBO DE VENTA</div>
    <div class='titulo2'>
      ${S(env.razon)} <br>
      Casa Matriz<br>
      No. Punto de Venta ${S(env.puntoVenta ?? 0)}<br>
      ${S(env.direccion)}<br>
      Tel. ${S(env.telefono)}<br>
      Oruro
    </div>

    <hr>

    <div style="display:flex; justify-content: space-between;">
      <div class="titder" style="width:45%;">FECHA HORA</div>
      <div class="conte2" style="width:55%;">${S(venta.fecha)} ${S(venta.hora)}</div>
    </div>

    <div style="display:flex; justify-content: space-between;">
      <div class="titder" style="width:45%;">ID</div>
      <div class="conte2" style="width:55%;">${S(venta.id)}</div>
    </div>

    <div style="display:flex; justify-content: space-between;">
      <div class="titder" style="width:45%;">USUARIO</div>
      <div class="conte2" style="width:55%;">${S(venta.user?.name)}</div>
    </div>

    <div style="display:flex; justify-content: space-between;">
      <div class="titder" style="width:45%;">PAGO</div>
      <div class="conte2" style="width:55%;">${S(venta.tipo_pago ?? venta.tipoPago ?? venta.metodo_pago ?? '')}</div>
    </div>

    ${venta.tipo_venta ? `
    <div style="display:flex; justify-content: space-between;">
      <div class="titder" style="width:45%;">TIPO</div>
      <div class="conte2" style="width:55%;">${S(venta.tipo_venta)}</div>
    </div>` : ''}

    <hr>
    <div class='titulo'>DETALLE</div>
`;

      // Detalle estilo compra
      detalles.forEach((r) => {
        const nombre = S(r.producto?.nombre ?? r.nombre ?? r.descripcion ?? '');
        const qty    = Number(r.cantidad ?? 0);
        const precio = Number(r.precio ?? 0);
        const sub    = Number(r.subTotal ?? (qty * precio));
        const idProd = S(r.producto_id ?? r.product_id ?? r.producto?.id ?? '');

        // Línea 1: nombre (y opcional id)
        cadena += `<div style='font-size: 12px'><b>${idProd ? (idProd + ' - ') : ''}${nombre}</b></div>`;

        // Línea 2: qty precio ... subtotal derecha (igual a compra)
        cadena += `
      <div>
        <span style='font-size: 14px;font-weight: bold'>${F2(qty)}</span>
        <span>${F2(precio)} 0.00</span>
        <span style='float:right'>${F2(sub)}</span>
      </div>`;
      });

      // Totales (como compra)
      cadena += `
    <hr>
    <table style='font-size: 8px;'>
      <tr>
        <td class='titder' style='width: 60%'>SUBTOTAL Bs</td>
        <td class='conte2'>${F2(total)}</td>
      </tr>
    </table>

    <br>
    <div>${literal}</div>
    <hr>

    <div class='titulo2' style="font-size: 9px">
      ¡Gracias por su compra!
    </div>

  </div>
</div>
</body>
</html>`;

      const mount = document.getElementById('myElement');
      if (mount) mount.innerHTML = cadena;

      if (imprimir) {
        const d = new Printd();
        d.print(document.getElementById('myElement'));
      }

      return true;
    } catch (e) {
      console.error('reciboVentaSimple error:', e);
      throw e;
    }
  }

}
