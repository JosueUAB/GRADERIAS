export interface ResumenGlobalVentas {
    total_recaudado: number;
    total_reservado_monto: number;
    total_pagados: number;
    total_reservados: number;
    total_libres: number;
    total_bloqueados: number;
    capacidad_total: number;
    porcentaje_ocupacion: number;
    total_graderias: number;
}

export interface UsuarioGraderiaBrief {
    id: number;
    nombre: string;
    direccion?: string;
    capacidad_total: number;
}

export interface UsuarioVentaStat {
    id: number;
    name: string;
    username: string;
    role: string;
    avatar?: string;
    telefono_contacto_1?: string;
    graderias_count: number;
    graderias: UsuarioGraderiaBrief[];
    total_asientos: number;
    total_pagados: number;
    total_reservados: number;
    total_libres: number;
    total_bloqueados: number;
    total_recaudado: number;
    total_reservado_monto: number;
    porcentaje_ocupacion: number;
    ultima_venta_at?: string | null;
}

export interface AuditoriaAsiento {
    id: number;
    graderia_id: number;
    fila: number;
    columna: number;
    codigo: string;
    estado: 'PAGADO' | 'RESERVADO' | 'LIBRE' | 'BLOQUEADO';
    cliente_nombre?: string;
    cliente_celular?: string;
    monto?: number;
    reservado_at?: string;
    pagado_at?: string;
    created_at?: string;
    updated_at?: string;
    graderia_nombre: string;
    graderia_user_id: number;
    operador_nombre: string;
    operador_username: string;
}

export interface GraderiaFiltro {
    id: number;
    nombre: string;
    user_id: number;
}

export interface SeguimientoVentasResponse {
    ok: boolean;
    resumen_global: ResumenGlobalVentas;
    usuarios: UsuarioVentaStat[];
    auditoria_asientos: AuditoriaAsiento[];
    graderias_filtro: GraderiaFiltro[];
}

export interface FiltrosSeguimiento {
    user_id?: number | null;
    graderia_id?: number | null;
    estado?: string | null;
    fecha_desde?: string | null;
    fecha_hasta?: string | null;
    search?: string | null;
}

export interface GraderiaDetalleUsuario {
    id: number;
    nombre: string;
    direccion?: string;
    capacidad_total: number;
    total_pagados: number;
    total_reservados: number;
    total_libres: number;
    total_bloqueados: number;
    total_recaudado: number;
    total_reservado_monto: number;
    porcentaje_ocupacion: number;
}

export interface AsientoActivoUsuario {
    id: number;
    graderia_id: number;
    graderia_nombre: string;
    codigo: string;
    fila: number;
    columna: number;
    estado: 'PAGADO' | 'RESERVADO';
    cliente_nombre?: string;
    cliente_celular?: string;
    monto: number;
    pagado_at?: string;
    reservado_at?: string;
}

export interface DetalleUsuarioVentasResponse {
    ok: boolean;
    usuario: {
        id: number;
        name: string;
        username: string;
        role: string;
        avatar?: string;
        telefono_contacto_1?: string;
    };
    resumen: ResumenGlobalVentas;
    graderias: GraderiaDetalleUsuario[];
    asientos_activos: AsientoActivoUsuario[];
}
