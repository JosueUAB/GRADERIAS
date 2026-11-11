<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, Arial, sans-serif; font-size: 12px; }
        .title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
        .muted { color:#666; }
        table { width:100%; border-collapse: collapse; margin-top: 10px; }
        td, th { border:1px solid #ddd; padding:6px; }
        th { background:#f2f2f2; text-align:left; }
    </style>
</head>
<body>
<div class="title">Orden #{{ $order->id }}</div>
<div class="muted">Estado: {{ $order->status }} | Moneda: {{ $order->currency }}</div>

<table>
    <tr><th>Session</th><td>{{ $order->session_id }}</td></tr>
    <tr><th>Payment Intent</th><td>{{ $order->payment_intent_id }}</td></tr>
    <tr><th>Email</th><td>{{ $order->email }}</td></tr>
    <tr><th>Total</th><td>{{ $order->amount_total }} {{ strtoupper($order->currency) }}</td></tr>
    <tr><th>Creado</th><td>{{ $order->created_at }}</td></tr>
    <tr><th>Pagado</th><td>{{ $order->paid_at }}</td></tr>
</table>

<h3 style="margin-top:14px">Items</h3>
<table>
    <thead>
    <tr>
        <th>Nombre</th>
        <th style="width:90px">Cantidad</th>
        <th style="width:120px">Unit (centavos)</th>
    </tr>
    </thead>
    <tbody>
    @foreach(($order->items ?? []) as $it)
        <tr>
            <td>{{ $it['name'] ?? '' }}</td>
            <td>{{ $it['qty'] ?? '' }}</td>
            <td>{{ $it['unit_amount'] ?? '' }}</td>
        </tr>
    @endforeach
    </tbody>
</table>
</body>
</html>
