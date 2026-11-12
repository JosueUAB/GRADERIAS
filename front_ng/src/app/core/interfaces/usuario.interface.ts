export interface Permiso {
    id: number;
    name: string;
    guard_name?: string;
    checked?: boolean;
}

export type RolUsuario = 'Administrador' | 'Soporte' | 'Operador' | 'Cliente';

export interface Usuario {
    id: number;
    name: string;
    username: string;
    email?: string | null;
    role: string;
    avatar?: string | null;
    telefono_contacto_1?: string | null;
    telefono_contacto_2?: string | null;
    permissions?: Permiso[];
    created_at?: string;
    updated_at?: string;
}

export interface CrearUsuarioDTO {
    name: string;
    username: string;
    password?: string;
    email?: string | null;
    role: string;
    telefono_contacto_1?: string | null;
    telefono_contacto_2?: string | null;
}

export interface ActualizarUsuarioDTO {
    name?: string;
    username?: string;
    email?: string | null;
    role?: string;
    avatar?: string | null;
    telefono_contacto_1?: string | null;
    telefono_contacto_2?: string | null;
}

export interface CambiarPasswordDTO {
    current_password: string;
    password: string;
    password_confirmation: string;
}

export interface AdminResetPasswordDTO {
    password: string;
    password_confirmation: string;
    reason?: string;
}
