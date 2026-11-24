export interface Graderia {
    id: number;
    user_id?: number;
    nombre: string | null;
    codigo: string | null;
    code: string;
    direccion: string | null;
    latitud?: number | null;
    longitud?: number | null;
    ref_izquierda: string | null;
    ref_derecha: string | null;
    ref_frente: string | null;
    filas: number;
    columnas: number;
    capacidad_total: number;
    etiqueta_modo: 'fila' | 'columna';
    start_top: boolean;
    start_left: boolean;
    activo: boolean;
    created_at?: string;
    updated_at?: string;
    asientos_count?: number;
    pagados_count?: number;
    reservados_count?: number;
    libres_count?: number;
    bloqueados_count?: number;
    user?: {
        id: number;
        name: string;
        username: string;
        role: string;
        avatar?: string;
        telefono_contacto_1?: string;
        telefono_contacto_2?: string;
    };
}

export interface CrearGraderiaDTO {
    nombre: string;
    direccion?: string;
    latitud?: number | null;
    longitud?: number | null;
    filas: number;
    columnas: number;
    etiqueta_modo: 'fila' | 'columna';
    start_top: boolean;
    start_left: boolean;
    activo: boolean;
}

export interface ActualizarGraderiaDTO extends CrearGraderiaDTO {
    regenerar_asientos?: boolean;
}

export interface AsientoPreview {
    id: number;
    graderia_id: number;
    fila: number;
    columna: number;
    codigo: string;
    estado: 'LIBRE' | 'RESERVADO' | 'PAGADO' | 'BLOQUEADO';
    descripcion?: string | null;
    cliente_nombre?: string | null;
    cliente_celular?: string | null;
    monto?: number | null;
    reservado_at?: string | null;
    pagado_at?: string | null;
}

export interface GraderiaDetalleRespuesta {
    graderia: Graderia;
    asientos_count: number;
    asientos_preview: AsientoPreview[];
    preview: {
        rows: number;
        cols: number;
    };
}

export interface GraderiaVentaRespuesta {
    graderia: Graderia;
    asientos: AsientoPreview[];
    total: number;
    layout: {
        filas: number;
        columnas: number;
        etiqueta_modo: string;
        start_top: boolean;
        start_left: boolean;
    };
}
