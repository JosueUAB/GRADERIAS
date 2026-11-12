<?php

namespace App\Http\Controllers;

use App\Models\Asiento;
use App\Models\Graderia;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReporteVentasController extends Controller
{
    /**
     * Dashboard general y seguimiento de ventas por usuario y graderías.
     */
    public function seguimiento(Request $request)
    {
        $currentUser = $request->user();
        $esAdmin = $currentUser->esAdmin();

        $filtroUserId = $request->query('user_id');
        $filtroGraderiaId = $request->query('graderia_id');
        $filtroEstado = $request->query('estado'); // PAGADO, RESERVADO, LIBRE, BLOQUEADO o ALL
        $fechaDesde = $request->query('fecha_desde');
        $fechaHasta = $request->query('fecha_hasta');
        $search = trim((string) $request->query('search', ''));

        // Si no es admin, solo puede ver sus propias ventas y graderías
        if (!$esAdmin) {
            $filtroUserId = $currentUser->id;
        }

        // 1. Resumen global (o filtrado si se seleccionó un usuario o gradería)
        $asientosQuery = Asiento::query()
            ->join('graderias', 'asientos.graderia_id', '=', 'graderias.id')
            ->whereNull('asientos.deleted_at')
            ->whereNull('graderias.deleted_at');

        if ($filtroUserId) {
            $asientosQuery->where('graderias.user_id', $filtroUserId);
        }

        if ($filtroGraderiaId) {
            $asientosQuery->where('asientos.graderia_id', $filtroGraderiaId);
        }

        if ($fechaDesde) {
            $asientosQuery->where(function ($q) use ($fechaDesde) {
                $q->whereDate('asientos.pagado_at', '>=', $fechaDesde)
                  ->orWhereDate('asientos.reservado_at', '>=', $fechaDesde);
            });
        }

        if ($fechaHasta) {
            $asientosQuery->where(function ($q) use ($fechaHasta) {
                $q->whereDate('asientos.pagado_at', '<=', $fechaHasta)
                  ->orWhereDate('asientos.reservado_at', '<=', $fechaHasta);
            });
        }

        // Estadísticas agregadas
        $conteoPorEstado = (clone $asientosQuery)
            ->select('asientos.estado', DB::raw('COUNT(*) as total'), DB::raw('SUM(asientos.monto) as monto_total'))
            ->groupBy('asientos.estado')
            ->pluck('monto_total', 'asientos.estado')
            ->toArray();

        $cantidadesPorEstado = (clone $asientosQuery)
            ->select('asientos.estado', DB::raw('COUNT(*) as total'))
            ->groupBy('asientos.estado')
            ->pluck('total', 'asientos.estado')
            ->toArray();

        $totalPagados = (int) ($cantidadesPorEstado['PAGADO'] ?? 0);
        $totalReservados = (int) ($cantidadesPorEstado['RESERVADO'] ?? 0);
        $totalLibres = (int) ($cantidadesPorEstado['LIBRE'] ?? 0);
        $totalBloqueados = (int) ($cantidadesPorEstado['BLOQUEADO'] ?? 0);
        $capacidadTotal = $totalPagados + $totalReservados + $totalLibres + $totalBloqueados;

        $totalRecaudado = (float) ($conteoPorEstado['PAGADO'] ?? 0);
        $totalReservadoMonto = (float) ($conteoPorEstado['RESERVADO'] ?? 0);

        $porcentajeOcupacion = $capacidadTotal > 0
            ? round((($totalPagados + $totalReservados) / $capacidadTotal) * 100, 1)
            : 0;

        // Conteo de graderías activas involucradas
        $graderiasCountQuery = Graderia::query();
        if ($filtroUserId) {
            $graderiasCountQuery->where('user_id', $filtroUserId);
        }
        $totalGraderias = $graderiasCountQuery->count();

        $resumenGlobal = [
            'total_recaudado'        => $totalRecaudado,
            'total_reservado_monto'  => $totalReservadoMonto,
            'total_pagados'          => $totalPagados,
            'total_reservados'       => $totalReservados,
            'total_libres'           => $totalLibres,
            'total_bloqueados'       => $totalBloqueados,
            'capacidad_total'        => $capacidadTotal,
            'porcentaje_ocupacion'   => $porcentajeOcupacion,
            'total_graderias'        => $totalGraderias,
        ];

        // 2. Desglose por Usuario / Cajero
        $usersQuery = User::query()->select('id', 'name', 'username', 'role', 'avatar', 'telefono_contacto_1');
        if (!$esAdmin) {
            $usersQuery->where('id', $currentUser->id);
        }

        $allUsers = $usersQuery->with(['graderias' => function ($g) {
            $g->select('id', 'user_id', 'nombre', 'direccion', 'filas', 'columnas', 'capacidad_total', 'activo');
        }])->get();

        $usuariosStats = [];
        foreach ($allUsers as $u) {
            $graderiaIds = $u->graderias->pluck('id')->toArray();
            if (empty($graderiaIds)) {
                // Si el usuario no tiene graderías ni ventas, igual lo mostramos con ceros
                $usuariosStats[] = [
                    'id'                   => $u->id,
                    'name'                 => $u->name,
                    'username'             => $u->username,
                    'role'                 => $u->role,
                    'avatar'               => $u->avatar,
                    'telefono_contacto_1'  => $u->telefono_contacto_1,
                    'graderias_count'      => 0,
                    'graderias'            => [],
                    'total_asientos'       => 0,
                    'total_pagados'        => 0,
                    'total_reservados'     => 0,
                    'total_libres'         => 0,
                    'total_bloqueados'     => 0,
                    'total_recaudado'      => 0.0,
                    'total_reservado_monto'=> 0.0,
                    'porcentaje_ocupacion' => 0.0,
                    'ultima_venta_at'      => null,
                ];
                continue;
            }

            $uSeats = Asiento::whereIn('graderia_id', $graderiaIds);

            if ($fechaDesde) {
                $uSeats->where(function ($q) use ($fechaDesde) {
                    $q->whereDate('pagado_at', '>=', $fechaDesde)
                      ->orWhereDate('reservado_at', '>=', $fechaDesde);
                });
            }
            if ($fechaHasta) {
                $uSeats->where(function ($q) use ($fechaHasta) {
                    $q->whereDate('pagado_at', '<=', $fechaHasta)
                      ->orWhereDate('reservado_at', '<=', $fechaHasta);
                });
            }

            $counts = (clone $uSeats)
                ->select('estado', DB::raw('COUNT(*) as cant'), DB::raw('SUM(monto) as total_monto'))
                ->groupBy('estado')
                ->get()
                ->keyBy('estado');

            $uPagados = (int) ($counts['PAGADO']->cant ?? 0);
            $uReservados = (int) ($counts['RESERVADO']->cant ?? 0);
            $uLibres = (int) ($counts['LIBRE']->cant ?? 0);
            $uBloqueados = (int) ($counts['BLOQUEADO']->cant ?? 0);
            $uCapacidad = $uPagados + $uReservados + $uLibres + $uBloqueados;

            $uRecaudado = (float) ($counts['PAGADO']->total_monto ?? 0);
            $uReservadoMonto = (float) ($counts['RESERVADO']->total_monto ?? 0);

            $uPorcentaje = $uCapacidad > 0
                ? round((($uPagados + $uReservados) / $uCapacidad) * 100, 1)
                : 0;

            $ultimaVenta = (clone $uSeats)
                ->where('estado', 'PAGADO')
                ->whereNotNull('pagado_at')
                ->max('pagado_at');

            $usuariosStats[] = [
                'id'                   => $u->id,
                'name'                 => $u->name,
                'username'             => $u->username,
                'role'                 => $u->role,
                'avatar'               => $u->avatar,
                'telefono_contacto_1'  => $u->telefono_contacto_1,
                'graderias_count'      => $u->graderias->count(),
                'graderias'            => $u->graderias->map(function ($g) {
                    return [
                        'id' => $g->id,
                        'nombre' => $g->nombre,
                        'direccion' => $g->direccion,
                        'capacidad_total' => $g->capacidad_total,
                    ];
                }),
                'total_asientos'       => $uCapacidad,
                'total_pagados'        => $uPagados,
                'total_reservados'     => $uReservados,
                'total_libres'         => $uLibres,
                'total_bloqueados'     => $uBloqueados,
                'total_recaudado'      => $uRecaudado,
                'total_reservado_monto'=> $uReservadoMonto,
                'porcentaje_ocupacion' => $uPorcentaje,
                'ultima_venta_at'      => $ultimaVenta,
            ];
        }

        // Ordenar usuarios por total recaudado descendente
        usort($usuariosStats, fn($a, $b) => $b['total_recaudado'] <=> $a['total_recaudado']);

        // 3. Auditoría detallada de asientos (historial de ventas / reservas)
        $auditoriaQuery = Asiento::query()
            ->select([
                'asientos.id',
                'asientos.graderia_id',
                'asientos.fila',
                'asientos.columna',
                'asientos.codigo',
                'asientos.estado',
                'asientos.cliente_nombre',
                'asientos.cliente_celular',
                'asientos.monto',
                'asientos.reservado_at',
                'asientos.pagado_at',
                'asientos.created_at',
                'asientos.updated_at',
                'graderias.nombre as graderia_nombre',
                'graderias.user_id as graderia_user_id',
                'users.name as operador_nombre',
                'users.username as operador_username',
            ])
            ->join('graderias', 'asientos.graderia_id', '=', 'graderias.id')
            ->join('users', 'graderias.user_id', '=', 'users.id')
            ->whereNull('asientos.deleted_at')
            ->whereNull('graderias.deleted_at');

        if ($filtroUserId) {
            $auditoriaQuery->where('graderias.user_id', $filtroUserId);
        }
        if ($filtroGraderiaId) {
            $auditoriaQuery->where('asientos.graderia_id', $filtroGraderiaId);
        }

        if ($filtroEstado && strtoupper($filtroEstado) !== 'ALL') {
            $auditoriaQuery->where('asientos.estado', strtoupper($filtroEstado));
        } else if (!$filtroEstado) {
            // Por defecto mostrar los que tienen actividad (PAGADO o RESERVADO)
            $auditoriaQuery->whereIn('asientos.estado', ['PAGADO', 'RESERVADO']);
        }

        if ($fechaDesde) {
            $auditoriaQuery->where(function ($q) use ($fechaDesde) {
                $q->whereDate('asientos.pagado_at', '>=', $fechaDesde)
                  ->orWhereDate('asientos.reservado_at', '>=', $fechaDesde);
            });
        }
        if ($fechaHasta) {
            $auditoriaQuery->where(function ($q) use ($fechaHasta) {
                $q->whereDate('asientos.pagado_at', '<=', $fechaHasta)
                  ->orWhereDate('asientos.reservado_at', '<=', $fechaHasta);
            });
        }

        if ($search !== '') {
            $auditoriaQuery->where(function ($q) use ($search) {
                $q->where('asientos.cliente_nombre', 'like', "%{$search}%")
                  ->orWhere('asientos.cliente_celular', 'like', "%{$search}%")
                  ->orWhere('asientos.codigo', 'like', "%{$search}%")
                  ->orWhere('graderias.nombre', 'like', "%{$search}%")
                  ->orWhere('users.name', 'like', "%{$search}%");
            });
        }

        $auditoriaAsientos = $auditoriaQuery
            ->orderByRaw('COALESCE(asientos.pagado_at, asientos.reservado_at, asientos.updated_at) DESC')
            ->limit(250)
            ->get();

        // 4. Lista de graderías disponibles para el selector de filtro
        $graderiasDisponiblesQuery = Graderia::query()->select('id', 'nombre', 'user_id');
        if ($filtroUserId) {
            $graderiasDisponiblesQuery->where('user_id', $filtroUserId);
        }
        $graderiasFiltro = $graderiasDisponiblesQuery->orderBy('nombre')->get();

        return response()->json([
            'ok'                   => true,
            'resumen_global'       => $resumenGlobal,
            'usuarios'             => $usuariosStats,
            'auditoria_asientos'   => $auditoriaAsientos,
            'graderias_filtro'     => $graderiasFiltro,
        ]);
    }

    /**
     * Detalle completo de ventas y butacas de un usuario específico.
     */
    public function detalleUsuario(Request $request, User $user)
    {
        $currentUser = $request->user();
        if (!$currentUser->esAdmin() && (int) $currentUser->id !== (int) $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $graderias = Graderia::where('user_id', $user->id)
            ->with(['asientos' => function ($q) {
                $q->orderBy('fila')->orderBy('columna');
            }])
            ->get();

        $graderiasDetalle = [];
        $todosAsientosVendidos = [];
        $totalRecaudado = 0.0;
        $totalReservado = 0.0;
        $totalPagados = 0;
        $totalReservados = 0;
        $totalLibres = 0;
        $totalBloqueados = 0;
        $capacidadTotal = 0;

        foreach ($graderias as $g) {
            $pagados = $g->asientos->where('estado', 'PAGADO');
            $reservados = $g->asientos->where('estado', 'RESERVADO');
            $libres = $g->asientos->where('estado', 'LIBRE');
            $bloqueados = $g->asientos->where('estado', 'BLOQUEADO');

            $montoPagado = (float) $pagados->sum('monto');
            $montoReservado = (float) $reservados->sum('monto');
            $cap = $g->asientos->count();

            $totalRecaudado += $montoPagado;
            $totalReservado += $montoReservado;
            $totalPagados += $pagados->count();
            $totalReservados += $reservados->count();
            $totalLibres += $libres->count();
            $totalBloqueados += $bloqueados->count();
            $capacidadTotal += $cap;

            $graderiasDetalle[] = [
                'id'                   => $g->id,
                'nombre'               => $g->nombre,
                'direccion'            => $g->direccion,
                'capacidad_total'      => $cap,
                'total_pagados'        => $pagados->count(),
                'total_reservados'     => $reservados->count(),
                'total_libres'         => $libres->count(),
                'total_bloqueados'     => $bloqueados->count(),
                'total_recaudado'      => $montoPagado,
                'total_reservado_monto'=> $montoReservado,
                'porcentaje_ocupacion' => $cap > 0 ? round((($pagados->count() + $reservados->count()) / $cap) * 100, 1) : 0,
            ];

            foreach ($pagados->concat($reservados) as $asiento) {
                $todosAsientosVendidos[] = [
                    'id'               => $asiento->id,
                    'graderia_id'      => $g->id,
                    'graderia_nombre'  => $g->nombre,
                    'codigo'           => $asiento->codigo,
                    'fila'             => $asiento->fila,
                    'columna'          => $asiento->columna,
                    'estado'           => $asiento->estado,
                    'cliente_nombre'   => $asiento->cliente_nombre,
                    'cliente_celular'  => $asiento->cliente_celular,
                    'monto'            => (float) $asiento->monto,
                    'pagado_at'        => $asiento->pagado_at,
                    'reservado_at'     => $asiento->reservado_at,
                ];
            }
        }

        // Ordenar por fecha descendente
        usort($todosAsientosVendidos, function ($a, $b) {
            $fA = $a['pagado_at'] ?? $a['reservado_at'] ?? '';
            $fB = $b['pagado_at'] ?? $b['reservado_at'] ?? '';
            return strcmp($fB, $fA);
        });

        return response()->json([
            'ok'      => true,
            'usuario' => [
                'id'                  => $user->id,
                'name'                => $user->name,
                'username'            => $user->username,
                'role'                => $user->role,
                'avatar'              => $user->avatar,
                'telefono_contacto_1' => $user->telefono_contacto_1,
            ],
            'resumen' => [
                'total_recaudado'        => $totalRecaudado,
                'total_reservado_monto'  => $totalReservado,
                'total_pagados'          => $totalPagados,
                'total_reservados'       => $totalReservados,
                'total_libres'           => $totalLibres,
                'total_bloqueados'       => $totalBloqueados,
                'capacidad_total'        => $capacidadTotal,
                'porcentaje_ocupacion'   => $capacidadTotal > 0 ? round((($totalPagados + $totalReservados) / $capacidadTotal) * 100, 1) : 0,
                'total_graderias'        => count($graderiasDetalle),
            ],
            'graderias' => $graderiasDetalle,
            'asientos_activos' => $todosAsientosVendidos,
        ]);
    }
}
