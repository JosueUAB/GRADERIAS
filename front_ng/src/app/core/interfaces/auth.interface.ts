import { Usuario } from './usuario.interface';

export interface CredencialesLogin {
    username: string;
    password: string;
    rememberMe?: boolean;
}

export interface RespuestaLogin {
    token: string;
    user: Usuario;
    message?: string;
}

export interface EstadoAuth {
    usuario: Usuario | null;
    token: string | null;
    permisos: string[];
    estaAutenticado: boolean;
    cargando: boolean;
    error: string | null;
}
