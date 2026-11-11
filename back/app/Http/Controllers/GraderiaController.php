<?php

namespace App\Http\Controllers;

use App\Models\Graderia;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GraderiaController extends Controller
{
    private function generateUniqueCode(): string
    {
        do {
            $code = Str::upper(Str::random(10));
        } while (Graderia::where('code', $code)->exists());

        return $code;
    }

    public function repair(Request $request, Graderia $graderia)
    {
        if ((int)$graderia->user_id !== (int)$request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // solo completa faltantes (no borra)
        \App\Services\AsientoGenerator::generateFor($graderia, false);

        $expected = ((int)$graderia->filas) * ((int)$graderia->columnas);
        $count = $graderia->asientos()->count();

        return response()->json([
            'ok' => true,
            'expected' => $expected,
            'count' => $count,
            'missing' => max(0, $expected - $count),
        ]);
    }

    public function venta(Request $request, Graderia $graderia)
    {
        if ((int)$graderia->user_id !== (int)$request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $asientos = $graderia->asientos()
            ->orderBy('fila')
            ->orderBy('columna')
            ->get([
                'id','fila','columna','codigo','estado',
                'cliente_nombre','cliente_celular','monto',
                'reservado_at','pagado_at',
                'created_at'
            ]);

        return response()->json([
            'graderia' => $graderia,
            'asientos' => $asientos,
            'total'    => $asientos->count(),

            // ✅ importante para que el frontend construya igual que "Editar"
            'layout'   => [
                'filas'        => (int) $graderia->filas,
                'columnas'     => (int) $graderia->columnas,
                'etiqueta_modo'=> (string) $graderia->etiqueta_modo, // fila | columna
                'start_top'    => (bool) $graderia->start_top,
                'start_left'   => (bool) $graderia->start_left,
            ],
        ]);
    }


    public function index(Request $request)
    {
        $user = $request->user();

        return Graderia::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get();
    }

    // GET /mis-graderias/{graderia}?preview_rows=30&preview_cols=30
    public function show(Request $request, Graderia $graderia)
    {
        // Seguridad básica (si tienes policies, cámbialo por authorize)
        if ((int)$graderia->user_id !== (int)$request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Para no traer 250k asientos, solo preview
        $previewRows = (int) $request->query('preview_rows', 30);
        $previewCols = (int) $request->query('preview_cols', 30);

        $previewRows = max(1, min($previewRows, 60)); // puedes subir si quieres
        $previewCols = max(1, min($previewCols, 60));

        $asientosPreview = $graderia->asientos()
            ->select([
                'id',
                'graderia_id',
                'fila',
                'columna',
                'codigo',
                'estado',
                'descripcion',
                'cliente_nombre',
                'cliente_celular',
                'monto',
                'reservado_at',
                'pagado_at',
            ])
            ->where('fila', '<=', $previewRows)
            ->where('columna', '<=', $previewCols)
            ->orderBy('fila')
            ->orderBy('columna')
            ->get();

        return response()->json([
            'graderia'        => $graderia,
            'asientos_count'  => $graderia->asientos()->count(),
            'asientos_preview'=> $asientosPreview,
            'preview'         => [
                'rows' => $previewRows,
                'cols' => $previewCols,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'nombre' => 'nullable|string|max:120',
            'direccion' => 'nullable|string|max:255',
            'filas' => 'required|integer|min:1|max:500',
            'columnas' => 'required|integer|min:1|max:500',
            'etiqueta_modo' => 'required|in:fila,columna',
            'start_top' => 'required|boolean',
            'start_left' => 'required|boolean',
            'activo' => 'required|boolean',
        ]);

        $g = new Graderia();
        $g->fill($data);
        $g->user_id = $user->id;
        $g->code = $this->generateUniqueCode();
        $g->capacidad_total = ((int)$data['filas']) * ((int)$data['columnas']);
        $g->save();

        \App\Services\AsientoGenerator::generateFor($g);

        return response()->json($g, 201);
    }

    public function update(Request $request, Graderia $graderia)
    {
        if ((int) $graderia->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'nombre' => 'nullable|string|max:120',
            'direccion' => 'nullable|string|max:255',
            'filas' => 'required|integer|min:1|max:500',
            'columnas' => 'required|integer|min:1|max:500',
            'etiqueta_modo' => 'required|in:fila,columna',
            'start_top' => 'required|boolean',
            'start_left' => 'required|boolean',
            'activo' => 'required|boolean',
            'regenerar_asientos' => 'nullable|boolean',
        ]);

        $graderia->fill($data);
        $graderia->capacidad_total = ((int) $data['filas']) * ((int) $data['columnas']);
        $graderia->save();

        if (($data['regenerar_asientos'] ?? false)) {
            // ✅ REGENERAR: borrar TODOS los asientos y crearlos de nuevo en LIBRE
            $graderia->asientos()->forceDelete();

            // true/false aquí depende de tu AsientoGenerator, pero da igual
            // porque ya borraste todo. Puedes dejar true.
            \App\Services\AsientoGenerator::generateFor($graderia, true);
        } else {
            // ✅ REPARA FALTANTES sin duplicar (mantiene estados existentes)
            \App\Services\AsientoGenerator::generateFor($graderia, false);
        }

        return response()->json([
            'ok' => true,
            'graderia' => $graderia,
            'asientos_count' => $graderia->asientos()->count(),
            'expected' => ((int) $graderia->filas) * ((int) $graderia->columnas),
        ]);
    }



    public function destroy(Request $request, Graderia $graderia)
    {
        if ((int)$graderia->user_id !== (int)$request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $graderia->delete();
        return response()->json(['ok' => true]);
    }

    // GET /public/graderias/{code}
    public function publicShowByCode(Request $request, string $code)
    {
        $graderia = Graderia::where('code', $code)
            ->where('activo', true)
            ->with('user')
            ->first();

        if (!$graderia) {
            return response()->json(['message' => 'No encontrado'], 404);
        }

        $asientos = $graderia->asientos()
            ->orderBy('fila')
            ->orderBy('columna')
            ->get([
                'fila',
                'columna',
                'codigo',
                'estado'
            ]);

        return response()->json([
            'graderia' => $graderia,
            'asientos' => $asientos,
            'total'    => $asientos->count(),
            'layout'   => [
                'filas'        => (int) $graderia->filas,
                'columnas'     => (int) $graderia->columnas,
                'etiqueta_modo'=> (string) $graderia->etiqueta_modo,
                'start_top'    => (bool) $graderia->start_top,
                'start_left'   => (bool) $graderia->start_left,
            ],
        ]);
    }
}
