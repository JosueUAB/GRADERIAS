<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2937; background: #f5f6f8; }
        .card { border: 1px solid #e2e5ea; padding: 18px; border-radius: 12px; background: #ffffff; }
        .header { background: #111827; color: #ffffff; padding: 12px 16px; border-radius: 10px; }
        .title { font-size: 18px; font-weight: 700; margin: 0 0 4px 0; }
        .subtitle { font-size: 11px; color: #cbd5e1; }
        .badge { display: inline-block; background: #16a34a; color: #ffffff; padding: 3px 8px; border-radius: 999px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
        .section { margin-top: 14px; }
        .table { width: 100%; border-collapse: collapse; }
        .table td { vertical-align: top; padding: 4px 0; }
        .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
        .value { font-size: 12px; font-weight: 600; }
        .muted { color: #6b7280; font-size: 11px; }
        .totals { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
        .divider { height: 1px; background: #e5e7eb; margin: 12px 0; }
        .qr { margin-top: 12px; text-align: center; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 8px; }
        .footer { margin-top: 12px; font-size: 10px; color: #6b7280; }
    </style>
</head>
<body>
<div class="card">
    <div class="header">
        <div class="title">Entrada Oficial</div>
        <div class="subtitle">Orden #{{ $order->id }} &middot; <span class="badge">Pago confirmado</span></div>
    </div>

    <div class="section">
        <table class="table">
            <tr>
                <td>
                    <div class="label">Email</div>
                    <div class="value">{{ $order->email }}</div>
                </td>
                <td style="text-align: right;">
                    <div class="label">Total</div>
                    <div class="value">&euro;{{ number_format($order->total / 100, 2) }}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="label">Fecha</div>
                    <div class="value">{{ data_get($order->meta, 'date', '-') }}</div>
                </td>
                <td style="text-align: right;">
                    <div class="label">Adultos</div>
                    <div class="value">{{ data_get($order->meta, 'adults', 0) }}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="label">Hora</div>
                    <div class="value">{{ data_get($order->meta, 'time', '-') }}</div>
                </td>
                <td style="text-align: right;">
                    <div class="label">Ni&ntilde;os</div>
                    <div class="value">{{ data_get($order->meta, 'kids', 0) }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="divider"></div>

    <div class="section">
        <div class="label">Identificadores</div>
        <div class="totals">
            <table class="table">
                <tr>
                    <td>
                        <div class="muted">Session</div>
                        <div class="value">{{ $order->session_id }}</div>
                    </td>
                    <td style="text-align: right;">
                        <div class="muted">Localizador</div>
                        <div class="value">{{ $order->localizador ?? '-' }}</div>
                    </td>
                </tr>
            </table>
        </div>
    </div>

    <div class="qr">
        {{-- Opcional: QR con la session_id o un c&oacute;digo --}}
        <div class="muted">C&oacute;digo: {{ $order->session_id }}</div>
    </div>

    <div class="footer">
        Presenta este PDF en la entrada. V&aacute;lido solo para la fecha/hora indicada.
    </div>
</div>
</body>
</html>
