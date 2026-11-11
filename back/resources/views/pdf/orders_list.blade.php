<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, Arial, sans-serif; font-size: 10px; }
        .title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
        table { width:100%; border-collapse: collapse; }
        td, th { border:1px solid #ddd; padding:5px; }
        th { background:#f2f2f2; text-align:left; }
    </style>
</head>
<body>
<div class="title">Listado de Órdenes</div>

<table>
    <thead>
    <tr>
        <th style="width:50px">ID</th>
        <th>Estado</th>
        <th>Email</th>
        <th>Total</th>
        <th>Moneda</th>
        <th>Creado</th>
        <th>Pagado</th>
        <th>Session</th>
    </tr>
    </thead>
    <tbody>
    @foreach($orders as $o)
        <tr>
            <td>{{ $o->id }}</td>
            <td>{{ $o->status }}</td>
            <td>{{ $o->email }}</td>
            <td>{{ $o->amount_total }}</td>
            <td>{{ $o->currency }}</td>
            <td>{{ $o->created_at }}</td>
            <td>{{ $o->paid_at }}</td>
            <td>{{ $o->session_id }}</td>
        </tr>
    @endforeach
    </tbody>
</table>
</body>
</html>
