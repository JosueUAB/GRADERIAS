<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'telefono_contacto_1')) {
                $table->string('telefono_contacto_1', 30)->nullable()->after('clave');
            }
            if (!Schema::hasColumn('users', 'telefono_contacto_2')) {
                $table->string('telefono_contacto_2', 30)->nullable()->after('telefono_contacto_1');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['telefono_contacto_1', 'telefono_contacto_2']);
        });
    }
};
