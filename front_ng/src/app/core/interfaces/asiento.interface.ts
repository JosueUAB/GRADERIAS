export type EstadoAsiento = 'LIBRE' | 'RESERVADO' | 'PAGADO' | 'BLOQUEADO';

export interface Asiento {
    id: number;
    graderia_id: number;
    fila: number;
    columna: number;
    codigo: string;
    descripcion?: string | null;
    estado: EstadoAsiento;
    cliente_nombre?: string | null;
    cliente_celular?: string | null;
    monto?: number | null;
    reservado_at?: string | null;
    pagado_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface ActualizarAsientoDTO {
    estado: EstadoAsiento;
    cliente_nombre?: string | null;
    cliente_celular?: string | null;
    monto?: number | null;
}

export interface ActualizarBulkAsientosDTO {
    seat_ids: number[];
    estado: EstadoAsiento;
    cliente_nombre?: string | null;
    cliente_celular?: string | null;
    monto_total?: number | null;
}
