<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Evento;
use App\Models\EventoHorario;
use Carbon\Carbon;

class EventoHorarioSeeder extends Seeder
{
    public function run(): void
    {
        // Config: crea horarios para los próximos N días
        $days = 1;

        // Horarios por defecto (puedes ajustar)
        $slots = [
            ['hora_inicio' => '08:00', 'hora_fin' => '09:00', 'capacidad' => 200],
//            ['hora_inicio' => '10:00', 'hora_fin' => '12:00', 'capacidad' => 200],
//            ['hora_inicio' => '12:00', 'hora_fin' => '14:00', 'capacidad' => 200],
//            ['hora_inicio' => '14:00', 'hora_fin' => '16:00', 'capacidad' => 200],
        ];

        $eventos = Evento::query()->where('activo', true)->get();

        foreach ($eventos as $evento) {
            for ($i = 0; $i < $days; $i++) {
                $date = Carbon::now()->startOfDay()->addDays($i)->toDateString();

                foreach ($slots as $slot) {
                    $startsAt = Carbon::parse($date . ' ' . $slot['hora_inicio']);
                    $endsAt   = Carbon::parse($date . ' ' . $slot['hora_fin']);

                    EventoHorario::updateOrCreate(
                        [
                            'evento_id' => $evento->id,
                            'fecha' => $date,
                            'hora_inicio' => $slot['hora_inicio'],
                            'hora_fin' => $slot['hora_fin'],
                        ],
                        [
                            'plan' => 'Adulto',
                            'precio' => 20,
                            'starts_at' => $startsAt,
                            'ends_at' => $endsAt,
                            'capacidad' => $slot['capacidad'],
                            'reservados' => 0,
                            'activo' => true,
                            'nota' => null,
                        ]
                    );
                }
            }
        }
    }
}
