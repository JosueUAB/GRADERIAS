<?php

namespace App\Http\Controllers;

use App\Models\Asiento;
use App\Models\Graderia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AsientoController extends Controller
{
    // PATCH /mis-graderias/{graderia}/asientos/{asiento}
    public function updateOne(Request $request, Graderia $graderia, Asiento $asiento)
    {
        if ((int)$graderia->user_id !== (int)$request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // seguridad: que el asiento sea de esa graderia
        if ((int)$asiento->graderia_id !== (int)$graderia->id) {
            return response()->json(['message' => 'Asiento no pertenece a la gradería'], 422);
        }

        $data = $request->validate([
            'estado'          => 'required|in:LIBRE,RESERVADO,PAGADO,BLOQUEADO',
            'cliente_nombre'  => 'nullable|string|max:120',
            'cliente_celular' => 'nullable|string|max:40',
            'monto'           => 'nullable|numeric|min:0',
        ]);

        DB::transaction(function () use ($asiento, $data) {

            switch ($data['estado']) {
                case 'LIBRE':
                    $asiento->estado = 'LIBRE';
                    $asiento->cliente_nombre = null;
                    $asiento->cliente_celular = null;
                    $asiento->monto = null;
                    $asiento->reservado_at = null;
                    $asiento->pagado_at = null;
                    break;

                case 'BLOQUEADO':
                    $asiento->estado = 'BLOQUEADO';
                    $asiento->cliente_nombre = null;
                    $asiento->cliente_celular = null;
                    $asiento->monto = null;
                    $asiento->reservado_at = null;
                    $asiento->pagado_at = null;
                    break;

                case 'RESERVADO':
                    // si quieres obligar aquí también, valida:
                    if (empty($data['cliente_nombre']) || empty($data['cliente_celular']) || $data['monto'] === null) {
                        throw new \Exception('Para RESERVADO se requiere cliente, celular y monto.');
                    }

                    $asiento->estado = 'RESERVADO';
                    $asiento->cliente_nombre = $data['cliente_nombre'];
                    $asiento->cliente_celular = $data['cliente_celular'];
                    $asiento->monto = $data['monto'];
                    $asiento->reservado_at = now();
                    $asiento->pagado_at = null;
                    break;

                case 'PAGADO':
                    if (empty($data['cliente_nombre']) || empty($data['cliente_celular']) || $data['monto'] === null) {
                        throw new \Exception('Para PAGADO se requiere cliente, celular y monto.');
                    }

                    $asiento->estado = 'PAGADO';
                    $asiento->cliente_nombre = $data['cliente_nombre'];
                    $asiento->cliente_celular = $data['cliente_celular'];
                    $asiento->monto = $data['monto'];
                    $asiento->reservado_at = $asiento->reservado_at ?: now();
                    $asiento->pagado_at = now();
                    break;
            }

            $asiento->save();
        });

        // refresca desde BD por si quieres
        $asiento->refresh();

        return response()->json([
            'ok' => true,
            'asiento' => $asiento
        ]);
    }

    // POST /mis-graderias/{graderia}/asientos/bulk
    public function bulkUpdate(Request $request, Graderia $graderia)
    {
        if ((int)$graderia->user_id !== (int)$request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'seat_ids'        => 'required|array|min:1',
            'seat_ids.*'      => 'integer',
            'estado'          => 'required|in:LIBRE,RESERVADO,PAGADO,BLOQUEADO',
            'cliente_nombre'  => 'nullable|string|max:120',
            'cliente_celular' => 'nullable|string|max:40',
            'monto_total'     => 'nullable|numeric|min:0',
        ]);

        $seats = Asiento::where('graderia_id', $graderia->id)
            ->whereIn('id', $data['seat_ids'])
            ->orderBy('id')
            ->get();

        $count = $seats->count();

        DB::transaction(function () use ($seats, $data, $count) {

            $montoBase = null;
            $resto = 0;

            if ($data['monto_total'] !== null && $count > 0) {
                $montoBase = floor($data['monto_total'] / $count);
                $resto = $data['monto_total'] - ($montoBase * $count);
            }

            foreach ($seats as $i => $s) {
                $montoFinal = $montoBase;
                if ($resto > 0) {
                    $montoFinal++;
                    $resto--;
                }

                switch ($data['estado']) {
                    case 'LIBRE':
                        $s->estado = 'LIBRE';
                        $s->cliente_nombre = null;
                        $s->cliente_celular = null;
                        $s->monto = null;
                        $s->reservado_at = null;
                        $s->pagado_at = null;
                        break;

                    case 'RESERVADO':
                        $s->estado = 'RESERVADO';
                        $s->cliente_nombre = $data['cliente_nombre'];
                        $s->cliente_celular = $data['cliente_celular'];
                        $s->monto = $montoFinal;
                        $s->reservado_at = now();
                        $s->pagado_at = null;
                        break;

                    case 'PAGADO':
                        $s->estado = 'PAGADO';
                        $s->cliente_nombre = $data['cliente_nombre'];
                        $s->cliente_celular = $data['cliente_celular'];
                        $s->monto = $montoFinal;
                        $s->reservado_at = $s->reservado_at ?: now();
                        $s->pagado_at = now();
                        break;

                    case 'BLOQUEADO':
                        $s->estado = 'BLOQUEADO';
                        $s->cliente_nombre = null;
                        $s->cliente_celular = null;
                        $s->monto = null;
                        $s->reservado_at = null;
                        $s->pagado_at = null;
                        break;
                }

                $s->save();
            }
        });

        return response()->json([
            'ok' => true,
            'updated' => $seats
        ]);
    }

}
