<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

//        User::factory()->create([
//            'name' => 'Test User',
//            'email' => 'test@example.com',
//        ]);
        $userAdmin = User::create([
            'name' => 'Admin User',
            'username' => 'admin',
            'role' => 'Administrador',
            'avatar' => 'default.png',
            'email' => '',
            'password' => 'admin123Admin',
        ]);
        $permisos = [
            'Dashboard',
            'Usuarios',
            'Graderias',
//            'Reservas',
//            'Idiomas',
//            'Precios',
//            'Reportes'
        ];;
        foreach ($permisos as $permiso) {
            Permission::create(['name' => $permiso]);
        }
        $userAdmin->givePermissionTo(Permission::all());
//        $this->call([
//                EventoSeeder::class,
////                EventoHorarioSeeder::class,
//        ]);
    }
}
