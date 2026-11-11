<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tus entradas</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 0;">
    <tr>
        <td align="center">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <tr>
                    <td style="background:#111827;color:#ffffff;padding:16px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td>
                                    @if(!empty($logo_data_uri))
                                        <img src="{{ $logo_data_uri }}" alt="Logo" style="height:40px;display:block;margin-bottom:6px;">
                                    @elseif(!empty($logo_url))
                                        <img src="{{ $logo_url }}" alt="Logo" style="height:40px;display:block;margin-bottom:6px;">
                                    @endif
                                    <div style="font-family:Arial, sans-serif;font-size:18px;font-weight:700;">Tus entradas</div>
                                    <div style="font-family:Arial, sans-serif;font-size:12px;color:#cbd5e1;">Orden #{{ $order->id }} &middot; Pago confirmado</div>
                                </td>
                                <td align="right" style="font-family:Arial, sans-serif;">
                                    <span style="background:#16a34a;color:#ffffff;padding:4px 10px;border-radius:999px;font-size:10px;letter-spacing:.4px;text-transform:uppercase;">Confirmado</span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <tr>
                    <td style="padding:18px 20px;font-family:Arial, sans-serif;color:#111827;">
                        <p style="margin:0 0 10px 0;">Hola {{ $order->email }},</p>
                        <p style="margin:0 0 14px 0;color:#4b5563;">Adjuntamos tu PDF con las entradas. Pres&eacute;ntalo en la entrada el d&iacute;a del evento.</p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px;">
                            <tr>
                                <td style="font-size:11px;color:#6b7280;">Localizador</td>
                                <td align="right" style="font-size:12px;font-weight:700;">{{ $order->localizador ?? '-' }}</td>
                            </tr>
                            <tr>
                                <td style="font-size:11px;color:#6b7280;">Total</td>
                                <td align="right" style="font-size:12px;font-weight:700;">
                                    @php
                                        $currency = strtoupper($order->currency ?? 'eur');
                                        $total = $order->amount_total ?? ($order->total ?? 0);
                                    @endphp
                                    {{ number_format($total , 2) }} {{ $currency }}
                                </td>
                            </tr>
                            <tr>
                                <td style="font-size:11px;color:#6b7280;">Fecha</td>
                                <td align="right" style="font-size:12px;font-weight:700;">{{ data_get($order->metadata ?? $order->meta ?? [], 'date', '-') }}</td>
                            </tr>
                            <tr>
                                <td style="font-size:11px;color:#6b7280;">Hora</td>
                                <td align="right" style="font-size:12px;font-weight:700;">{{ data_get($order->metadata ?? $order->meta ?? [], 'time', '-') }}</td>
                            </tr>
                        </table>

                        <div style="margin-top:14px;padding:12px;border:1px dashed #cbd5e1;border-radius:8px;text-align:center;">
                            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;">C&oacute;digo de acceso</div>
                            <div style="font-size:14px;font-weight:700;letter-spacing:.6px;">{{ $order->localizador ?? $order->session_id }}</div>
                        </div>
                    </td>
                </tr>

                <tr>
                    <td style="padding:12px 20px;font-family:Arial, sans-serif;font-size:11px;color:#6b7280;border-top:1px solid #e5e7eb;">
                        Si tienes alguna duda, responde a este correo. Gracias por tu compra.
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
