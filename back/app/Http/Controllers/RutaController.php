<?php

namespace App\Http\Controllers;

use App\Models\Ruta;
use App\Services\GeoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RutaController extends Controller
{
    /**
     * Obtiene la ruta oficial activa actualmente.
     */
    public function activa()
    {
        $ruta = Ruta::where('activo', true)
            ->with('user:id,name,username')
            ->latest()
            ->first();

        return response()->json([
            'ruta' => $ruta,
            'existe' => $ruta !== null,
        ]);
    }

    /**
     * Lista todas las rutas registradas (Solo Administrador).
     */
    public function index(Request $request)
    {
        if (!$request->user()->esAdmin()) {
            return response()->json(['message' => 'No autorizado. Solo administradores pueden gestionar rutas.'], 403);
        }

        $rutas = Ruta::with('user:id,name,username')
            ->orderByDesc('activo')
            ->orderByDesc('id')
            ->get();

        return response()->json($rutas);
    }

    /**
     * Guarda una nueva ruta trazada (Solo Administrador).
     */
    public function store(Request $request)
    {
        if (!$request->user()->esAdmin()) {
            return response()->json(['message' => 'No autorizado. Solo administradores pueden crear rutas.'], 403);
        }

        $data = $request->validate([
            'nombre' => 'required|string|max:150',
            'descripcion' => 'nullable|string|max:500',
            'coordenadas' => 'required|array|min:2',
            'coordenadas.*' => 'required',
            'distancia_tolerancia_metros' => 'required|integer|min:5|max:1000',
            'color' => 'nullable|string|max:30',
            'activo' => 'boolean',
        ]);

        $esActivo = $data['activo'] ?? true;

        DB::beginTransaction();
        try {
            if ($esActivo) {
                // Desactivar rutas previas si esta será la activa
                Ruta::where('activo', true)->update(['activo' => false]);
            }

            $ruta = new Ruta();
            $ruta->nombre = $data['nombre'];
            $ruta->descripcion = $data['descripcion'] ?? null;
            $ruta->coordenadas = $data['coordenadas'];
            $ruta->distancia_tolerancia_metros = $data['distancia_tolerancia_metros'];
            $ruta->color = $data['color'] ?? '#e11d48';
            $ruta->activo = $esActivo;
            $ruta->user_id = $request->user()->id;
            $ruta->save();

            DB::commit();

            return response()->json([
                'ok' => true,
                'message' => 'Ruta oficial guardada exitosamente.',
                'ruta' => $ruta->load('user:id,name,username'),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al guardar la ruta: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Actualiza una ruta existente (Solo Administrador).
     */
    public function update(Request $request, Ruta $ruta)
    {
        if (!$request->user()->esAdmin()) {
            return response()->json(['message' => 'No autorizado. Solo administradores pueden modificar rutas.'], 403);
        }

        $data = $request->validate([
            'nombre' => 'required|string|max:150',
            'descripcion' => 'nullable|string|max:500',
            'coordenadas' => 'required|array|min:2',
            'coordenadas.*' => 'required',
            'distancia_tolerancia_metros' => 'required|integer|min:5|max:1000',
            'color' => 'nullable|string|max:30',
            'activo' => 'boolean',
        ]);

        $esActivo = $data['activo'] ?? $ruta->activo;

        DB::beginTransaction();
        try {
            if ($esActivo && !$ruta->activo) {
                Ruta::where('id', '!=', $ruta->id)->where('activo', true)->update(['activo' => false]);
            }

            $ruta->update([
                'nombre' => $data['nombre'],
                'descripcion' => $data['descripcion'] ?? null,
                'coordenadas' => $data['coordenadas'],
                'distancia_tolerancia_metros' => $data['distancia_tolerancia_metros'],
                'color' => $data['color'] ?? $ruta->color,
                'activo' => $esActivo,
            ]);

            DB::commit();

            return response()->json([
                'ok' => true,
                'message' => 'Ruta oficial actualizada exitosamente.',
                'ruta' => $ruta->fresh()->load('user:id,name,username'),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al actualizar la ruta: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Activa una ruta y desactiva las demás (Solo Administrador).
     */
    public function activar(Request $request, Ruta $ruta)
    {
        if (!$request->user()->esAdmin()) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        DB::transaction(function () use ($ruta) {
            Ruta::where('activo', true)->update(['activo' => false]);
            $ruta->update(['activo' => true]);
        });

        return response()->json([
            'ok' => true,
            'message' => "La ruta '{$ruta->nombre}' fue activada como oficial.",
            'ruta' => $ruta->fresh()->load('user:id,name,username'),
        ]);
    }

    /**
     * Elimina una ruta (Solo Administrador).
     */
    public function destroy(Request $request, Ruta $ruta)
    {
        if (!$request->user()->esAdmin()) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $ruta->delete();

        return response()->json([
            'ok' => true,
            'message' => 'Ruta eliminada.',
        ]);
    }

    /**
     * Valida si un punto geográfico está dentro del rango de la ruta activa.
     */
    public function validarPunto(Request $request)
    {
        $data = $request->validate([
            'latitud' => 'required|numeric|between:-90,90',
            'longitud' => 'required|numeric|between:-180,180',
        ]);

        $ruta = Ruta::where('activo', true)->latest()->first();

        if (!$ruta || empty($ruta->coordenadas)) {
            return response()->json([
                'existe_ruta' => false,
                'valido' => true,
                'mensaje' => 'No hay una ruta oficial configurada. Coordenadas admitidas libremente.',
            ]);
        }

        $distancia = GeoService::distanciaPuntoAPolilinea(
            (float)$data['latitud'],
            (float)$data['longitud'],
            $ruta->coordenadas
        );

        $tolerancia = (int)$ruta->distancia_tolerancia_metros;
        $valido = $distancia <= $tolerancia;

        return response()->json([
            'existe_ruta' => true,
            'valido' => $valido,
            'distancia_metros' => round($distancia, 1),
            'tolerancia_metros' => $tolerancia,
            'ruta_nombre' => $ruta->nombre,
            'mensaje' => $valido
                ? "Ubicación válida: a " . round($distancia, 1) . "m de la ruta oficial (límite: {$tolerancia}m)."
                : "Ubicación fuera de rango: a " . round($distancia, 1) . "m de la ruta oficial (máximo permitido: {$tolerancia}m).",
        ]);
    }
}
