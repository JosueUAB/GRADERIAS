<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Ruta extends Model implements AuditableContract
{
    use SoftDeletes, AuditableTrait;

    protected $table = 'rutas';

    protected $fillable = [
        'nombre',
        'descripcion',
        'coordenadas',
        'distancia_tolerancia_metros',
        'color',
        'activo',
        'user_id',
    ];

    protected $casts = [
        'coordenadas' => 'array',
        'distancia_tolerancia_metros' => 'integer',
        'activo' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
