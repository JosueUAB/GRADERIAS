<?php

//use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GraderiaController;
use App\Http\Controllers\AsientoController;

Route::post('/login', [App\Http\Controllers\UserController::class, 'login']);
Route::get('/public/graderias/{code}', [GraderiaController::class, 'publicShowByCode']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/me/password', [App\Http\Controllers\UserController::class, 'changeMyPassword']);

    // Admin resetea contraseña de otro usuario
    Route::post('/users/{user}/password-reset', [App\Http\Controllers\UserController::class, 'adminResetPassword']);

    Route::get('/me', [App\Http\Controllers\UserController::class, 'me']);
    Route::post('/logout', [App\Http\Controllers\UserController::class, 'logout']);

    Route::get('/users', [App\Http\Controllers\UserController::class, 'index']);
    Route::post('/users', [App\Http\Controllers\UserController::class, 'store']);
    Route::put('/users/{user}', [App\Http\Controllers\UserController::class, 'update']);
    Route::delete('/users/{user}', [App\Http\Controllers\UserController::class, 'destroy']);

    Route::put('/updatePassword/{user}', [App\Http\Controllers\UserController::class, 'updatePassword']);
    Route::post('/{user}/avatar', [App\Http\Controllers\UserController::class, 'updateAvatar']);

    Route::get('/permissions', [App\Http\Controllers\UserController::class, 'permissions']);
    Route::get('/users/{user}/permissions', [App\Http\Controllers\UserController::class, 'userPermissions']);
    Route::put('/users/{user}/permissions', [App\Http\Controllers\UserController::class, 'updateUserPermissions']);

    // Mis graderías (usuario logueado)
//    Route::get('mis-graderias', [GraderiaController::class, 'index']);
//    Route::post('mis-graderias', [GraderiaController::class, 'store']);
//    Route::get('mis-graderias/{graderia}', [GraderiaController::class, 'show']);
//    Route::put('mis-graderias/{graderia}', [GraderiaController::class, 'update']);
//    Route::delete('mis-graderias/{graderia}', [GraderiaController::class, 'destroy']);

    // Asientos (si quieres verlos por gradería)
    Route::get('mis-graderias', [GraderiaController::class, 'index']);
    Route::get('mis-graderias/{graderia}', [GraderiaController::class, 'show']);
    Route::post('mis-graderias', [GraderiaController::class, 'store']);
    Route::put('mis-graderias/{graderia}', [GraderiaController::class, 'update']);
    Route::delete('mis-graderias/{graderia}', [GraderiaController::class, 'destroy']);

    // ✅ BULK UPDATE asientos
    Route::get('mis-graderias/{graderia}/venta', [GraderiaController::class, 'venta']);
    Route::post('mis-graderias/{graderia}/asientos/bulk', [AsientoController::class, 'bulkUpdate']);

    Route::post('/mis-graderias/{graderia}/repair', [GraderiaController::class, 'repair']);

    Route::patch('mis-graderias/{graderia}/asientos/{asiento}', [AsientoController::class, 'updateOne']);
//    Route::post('/api/whatsapp/boletos', [WhatsAppController::class, 'sendTickets']);


});
