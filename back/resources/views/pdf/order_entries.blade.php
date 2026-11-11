<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, Arial, sans-serif; font-size: 11px; color: #111827; }
        body { background: #f3f4f6; }
        .page { padding: 10px; }
        .ticket { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; margin-bottom: 12px; page-break-inside: avoid; }
        .header { display: table; width: 100%; }
        .logo { width: 120px; height: auto; }
        .header-left { display: table-cell; vertical-align: middle; }
        .header-right { display: table-cell; vertical-align: middle; text-align: right; }
        .title { font-size: 16px; font-weight: 700; margin: 0; }
        .subtitle { color: #6b7280; font-size: 10px; }
        .badge { display: inline-block; background: #16a34a; color: #ffffff; padding: 3px 8px; border-radius: 999px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; }
        .grid { display: table; width: 100%; margin-top: 10px; }
        .col { display: table-cell; width: 50%; vertical-align: top; }
        .label { color: #6b7280; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; }
        .value { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
        .box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; }
        .divider { height: 1px; background: #e5e7eb; margin: 10px 0; }
        .qr { text-align: center; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px; }
        .qr-img { width: 120px; height: 120px; margin: 4px auto 6px; display: block; }
        .qr-code { font-size: 12px; font-weight: 700; letter-spacing: 0.6px; }
        .footer { color: #6b7280; font-size: 9px; margin-top: 8px; }
    </style>
</head>
<body>
@php
    $items = $order->items ?? [];
    $metadata = $order->metadata ?? ($order->meta ?? []);
    $currency = strtoupper($order->currency ?? 'eur');
    $total = $order->amount_total ?? ($order->total ?? 0);
    $entryIndex = 0;
@endphp

<div class="page">
    @forelse($items as $it)
        @php $qty = max(1, (int)($it['qty'] ?? 1)); @endphp
        @for($i = 1; $i <= $qty; $i++)
            @php $entryIndex++; @endphp
            <div class="ticket">
                <div class="header">
                    <div class="header-left">
                        @if(!empty($logo_data_uri))
                            <img src="{{ $logo_data_uri }}" class="logo" alt="Logo">
                        @endif
                        <div class="title">{{ data_get($metadata, 'title', 'Entrada') }}</div>
                        <div class="subtitle">Orden #{{ $order->id }} &middot; Ticket {{ $entryIndex }}</div>
                    </div>
                    <div class="header-right">
                        <span class="badge" style="{{ $order->status === 'PENDING' ? 'background: #f59e0b;' : '' }}">
                            {{$order->status === 'PENDING' ? 'Pendiente' : 'Pagado'}}
                        </span>
                    </div>
                </div>

                <div class="grid">
                    <div class="col">
                        <div class="label">Fecha</div>
                        <div class="value">{{ data_get($metadata, 'date', '-') }}</div>
                        <div class="label">Hora</div>
                        <div class="value">{{ data_get($metadata, 'time', '-') }}</div>
                        <div class="label">Tipo</div>
                        <div class="value">{{ $it['name'] ?? 'Entrada' }}</div>
                    </div>
                    <div class="col" style="text-align:right;">
                        <div class="label">Total Orden</div>
                        <div class="value">{{ number_format($total, 2) }} {{ $currency }}</div>
                        <div class="label">Email</div>
                        <div class="value">{{ $order->email }}</div>
                        <div class="label">Localizador</div>
                        <div class="value">{{ $order->localizador ?? '-' }}</div>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="box">
                    <div class="label">Identificadores</div>
                    <div class="value">Session: {{ $order->session_id }}</div>
                    @if(!empty($order->payment_intent_id))
                        <div class="muted">PI: {{ $order->payment_intent_id }}</div>
                    @endif
                </div>

                <div class="qr" style="margin-top:10px;">
                    @if(!empty($it['qr_src']) || !empty($order->qr))
                        <img src="{{ $it['qr_src'] ?? $order->qr }}" class="qr-img" alt="QR">
                    @endif
                    <div class="label">Codigo de acceso</div>
                    <div class="qr-code">{{ $order->localizador ?? $order->session_id }}</div>
                </div>

                <div class="footer">
                    Presenta este PDF en la entrada. Valido solo para la fecha/hora indicada.
                </div>
            </div>
        @endfor
    @empty
        <div class="ticket">
            <div class="title">Orden #{{ $order->id }}</div>
            <div class="subtitle">No hay entradas para esta orden.</div>
        </div>
    @endforelse
</div>
</body>
</html>
