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
        'direccion','ref_izquierda','ref_derecha','ref_frente',
        'filas','columnas','capacidad_total',
        'etiqueta_modo','start_top','start_left',
        'user_id',
        'activo',
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
