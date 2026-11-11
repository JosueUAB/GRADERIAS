<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Evento;

class EventoSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['nombre' => 'Giza Plateau', 'slug' => 'giza-plateau', 'categoria' => 'site'],
            ['nombre' => 'Egyptian Museum', 'slug' => 'egyptian-museum', 'categoria' => 'museum'],
            ['nombre' => 'Sharm El Sheikh Museum', 'slug' => 'sharm-el-sheikh-museum', 'categoria' => 'museum'],
            ['nombre' => 'Hurghada Museum', 'slug' => 'hurghada-museum', 'categoria' => 'museum'],
            ['nombre' => 'Luxor Temple', 'slug' => 'luxor-temple', 'categoria' => 'temple'],
            ['nombre' => 'Karnak Temple', 'slug' => 'karnak-temple', 'categoria' => 'temple'],
            ['nombre' => 'Hatshepsut Temple', 'slug' => 'hatshepsut-temple', 'categoria' => 'temple'],
            ['nombre' => 'Abu Simbel Temple', 'slug' => 'abu-simbel-temple', 'categoria' => 'temple'],
            ['nombre' => 'Coptic Museum', 'slug' => 'coptic-museum', 'categoria' => 'museum'],
        ];

        $orden = 1;
        foreach ($items as $it) {
            Evento::updateOrCreate(
                ['slug' => $it['slug']],
                [
                    'nombre' => $it['nombre'],
                    'descripcion' => null,
                    'pais' => 'Egypt',
                    'ciudad' => null,
                    'ubicacion' => null,
                    'activo' => true,
                    'categoria' => $it['categoria'],
                    'orden' => $orden++,
                    'regla_nacionalidad' => 'ALL',
//                    'moneda' => 'EGP', euro
                    'moneda' => 'EUR',
                ]
            );
        }
    }
}
