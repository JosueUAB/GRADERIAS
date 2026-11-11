<!doctype html>
<html>
<body style="font-family: Arial, sans-serif;">
<h2>Pago confirmado ✅</h2>
<p>Hola, {{ $order->email }}.</p>

<p>Tu pago fue aprobado. Adjuntamos tu entrada en PDF.</p>

<p><b>Orden:</b> #{{ $order->id }}<br>
    <b>Total:</b> €{{ number_format($order->total / 100, 2) }}</p>

<p>Gracias por tu compra.</p>
</body>
</html>
