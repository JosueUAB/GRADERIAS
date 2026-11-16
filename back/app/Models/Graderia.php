<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;
use OwenIt\Auditing\Auditable as AuditableTrait;
class Graderia extends Model implements AuditableContract
{
    use SoftDeletes, AuditableTrait;

    protected $table = 'graderias';

    protected $fillable = [
        'nombre','codigo','code',
        'direccion','latitud','longitud',
        'ref_izquierda','ref_derecha','ref_frente',
        'filas','columnas','capacidad_total',
        'etiqueta_modo','start_top','start_left',
        'user_id',
        'activo',
    ];

    protected $casts = [
        'latitud' => 'float',
        'longitud' => 'float',
        'filas' => 'integer',
        'columnas' => 'integer',
        'capacidad_total' => 'integer',
        'start_top' => 'boolean',
        'start_left' => 'boolean',
        'activo' => 'boolean',
    ];

    public function asientos()
    {
        return $this->hasMany(Asiento::class, 'graderia_id');
    }
    function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
