<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('asientos', function (Blueprint $table) {
            $table->id();

            $table->foreignId('graderia_id')
                ->constrained('graderias')
                ->cascadeOnDelete();

            // Posición lógica
            $table->unsignedSmallInteger('fila')->nullable();     // 1..N
            $table->unsignedSmallInteger('columna')->nullable();  // 1..N

            // Etiqueta visible: "A1", "B3", etc
            $table->string('codigo', 10); // A1
            $table->string('descripcion', 120)->nullable(); // opcional

            // Estado del asiento
            $table->enum('estado', ['LIBRE', 'RESERVADO', 'PAGADO', 'BLOQUEADO'])->default('LIBRE');

            // Datos cliente (simple, como pediste)
            $table->string('cliente_nombre', 180)->nullable();
            $table->string('cliente_celular', 30)->nullable();
            $table->decimal('monto', 10, 2)->nullable();

            // Si quieres rastrear fecha/hora de reserva/pago
            $table->timestamp('reservado_at')->nullable();
            $table->timestamp('pagado_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Evita duplicar A1 dentro de la misma gradería
            $table->unique(['graderia_id', 'codigo']);

            $table->index(['graderia_id', 'estado']);
            $table->index(['cliente_celular']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asientos');
    }
};
