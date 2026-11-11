<?php

namespace App\Services;

use App\Models\Asiento;
use App\Models\Graderia;
use Illuminate\Support\Facades\DB;

class AsientoGenerator
{
    public static function generateFor(Graderia $g, bool $recreate = false): void
    {
        $filas = (int) $g->filas;
        $cols  = (int) $g->columnas;

        if ($filas <= 0 || $cols <= 0) return;

        DB::transaction(function () use ($g, $filas, $cols, $recreate) {

            if ($recreate) {
                Asiento::withTrashed()
                    ->where('graderia_id', $g->id)
                    ->restore();

            }

            $batch = [];
            $batchSize = 1000;

            for ($r = 1; $r <= $filas; $r++) {
                for ($c = 1; $c <= $cols; $c++) {

                    $codigo = self::makeCode($g->etiqueta_modo, $r, $c);

                    $batch[] = [
                        'graderia_id' => $g->id,
                        'fila'        => $r,
                        'columna'     => $c,
                        'codigo'      => $codigo,
                        'estado'      => 'LIBRE',
                        'deleted_at'  => null,
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ];


                    if (count($batch) >= $batchSize) {
                        self::safeUpsert($batch);
                        $batch = [];
                    }
                }
            }

            if (count($batch)) {
                self::safeUpsert($batch);
            }

            // recalcula capacidad / sanity
            $g->capacidad_total = $filas * $cols;
            $g->save();
        });
    }

    /**
     * Upsert que evita duplicados por (graderia_id,codigo).
     * IMPORTANTE: no pisa datos de cliente ni estado si ya existía.
     */
    private static function safeUpsert(array $rows): void
    {
        Asiento::upsert(
            $rows,
            ['graderia_id', 'codigo'],
            ['fila', 'columna', 'deleted_at', 'updated_at']
        );
    }


    private static function makeCode(string $modo, int $r, int $c): string
    {
        $modo = strtolower((string) $modo);
        if ($modo === 'fila') {
            return self::numToLetters($r) . $c;
        }
        return self::numToLetters($c) . $r;
    }

    private static function numToLetters(int $n): string
    {
        $s = '';
        while ($n > 0) {
            $n--;
            $s = chr(65 + ($n % 26)) . $s;
            $n = intdiv($n, 26);
        }
        return $s;
    }
}
