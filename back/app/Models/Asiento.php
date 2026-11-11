<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;
use OwenIt\Auditing\Auditable as AuditableTrait;
class Asiento extends Model implements AuditableContract
{
    use SoftDeletes, AuditableTrait;

    protected $table = 'asientos';

    protected $fillable = [
        'graderia_id',
        'fila','columna','codigo','descripcion',
        'estado',
        'cliente_nombre','cliente_celular','monto',
        'reservado_at','pagado_at',
    ];

    protected $casts = [
        'reservado_at' => 'datetime',
        'pagado_at' => 'datetime',
        'monto' => 'decimal:2',
    ];

    public function graderia()
    {
        return $this->belongsTo(Graderia::class, 'graderia_id');
    }
}
