export interface Ruta {
    id: number;
    nombre: string;
    descripcion?: string | null;
    coordenadas: [number, number][]; // Array de puntos [lng, lat]
    distancia_tolerancia_metros: number;
    color?: string;
    activo: boolean;
    user_id?: number;
    user?: {
        id: number;
        name: string;
        username: string;
    };
    created_at?: string;
    updated_at?: string;
}

export interface CrearRutaDTO {
    nombre: string;
    descripcion?: string;
    coordenadas: [number, number][];
    distancia_tolerancia_metros: number;
    color?: string;
    activo?: boolean;
}

export interface ValidarPuntoRespuesta {
    existe_ruta: boolean;
    valido: boolean;
    distancia_metros?: number;
    tolerancia_metros?: number;
    ruta_nombre?: string;
    mensaje: string;
}
