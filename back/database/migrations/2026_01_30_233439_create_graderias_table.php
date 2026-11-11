<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('graderias', function (Blueprint $table) {
            $table->id();

            // Identificación
            $table->string('nombre', 120)->nullable(); // ej: "Gradería 12 - Socavón"
            $table->string('codigo', 40)->nullable()->unique(); // opcional: G-001
            $table->string('code', 32)->unique(); // codigo publico para URL

            // Dirección principal y referencias
            $table->string('direccion', 255)->nullable();
            $table->string('ref_izquierda', 255)->nullable();
            $table->string('ref_derecha', 255)->nullable();
            $table->string('ref_frente', 255)->nullable();

            // Layout / dimensiones
            $table->unsignedSmallInteger('filas')->default(0);      // X (rows)
            $table->unsignedSmallInteger('columnas')->default(0);   // Y (cols)
            $table->unsignedInteger('capacidad_total')->default(0); // filas * columnas (guardado)

            /**
             * Config de etiquetado:
             * - 'fila' => A1, A2, A3 ... (A= fila, 1=col)
             * - 'columna' => A1, B1, C1 ... (A= columna, 1= fila)
             */
            $table->enum('etiqueta_modo', ['fila', 'columna'])->default('fila');

            /**
             * Dirección de conteo:
             * - start_top = true: empieza arriba (A1 arriba)
             * - start_top = false: empieza abajo
             * - start_left = true: empieza izquierda
             * - start_left = false: empieza derecha
             */
            $table->boolean('start_top')->default(true);
            $table->boolean('start_left')->default(true);

            // Estado
            $table->boolean('activo')->default(true);
            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['activo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('graderias');
    }
};
