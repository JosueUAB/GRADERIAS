<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'status' => 'online',
        'service' => config('app.name', 'Graderías Carnaval API'),
        'version' => '2.0.0',
        'timestamp' => now()->toIso8601String()
    ]);
});
