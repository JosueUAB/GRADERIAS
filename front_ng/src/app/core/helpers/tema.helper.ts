export interface PaletaShades {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
}

export interface PaletaSurface {
    0: string;
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
}

export function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '').trim();
    const full = clean.length === 3 
        ? clean.split('').map(c => c + c).join('') 
        : clean;
    const num = parseInt(full, 16);
    return [
        (num >> 16) & 255,
        (num >> 8) & 255,
        num & 255
    ];
}

export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
        const val = Math.round(Math.max(0, Math.min(255, x)));
        return val.toString(16).padStart(2, '0');
    }).join('');
}

export function mezclarColores(
    c1: [number, number, number], 
    c2: [number, number, number], 
    peso: number
): string {
    const r = c1[0] * peso + c2[0] * (1 - peso);
    const g = c1[1] * peso + c2[1] * (1 - peso);
    const b = c1[2] * peso + c2[2] * (1 - peso);
    return rgbToHex(r, g, b);
}

/**
 * Genera una escala armónica de 11 tonos (50 a 950) a partir de cualquier código hexadecimal.
 */
export function generarPaletaDesdeHex(baseHex: string): PaletaShades {
    const rgb = hexToRgb(baseHex);
    const blanco: [number, number, number] = [255, 255, 255];
    const negro: [number, number, number] = [0, 0, 0];

    return {
        50: mezclarColores(rgb, blanco, 0.08),
        100: mezclarColores(rgb, blanco, 0.16),
        200: mezclarColores(rgb, blanco, 0.30),
        300: mezclarColores(rgb, blanco, 0.50),
        400: mezclarColores(rgb, blanco, 0.75),
        500: baseHex.startsWith('#') ? baseHex : `#${baseHex}`,
        600: mezclarColores(rgb, negro, 0.85),
        700: mezclarColores(rgb, negro, 0.70),
        800: mezclarColores(rgb, negro, 0.55),
        900: mezclarColores(rgb, negro, 0.40),
        950: mezclarColores(rgb, negro, 0.25)
    };
}

/**
 * Catálogo de superficies PrimeNG (con 'slate' como la predeterminada del sistema)
 */
export const PALETAS_SURFACE: Record<string, PaletaSurface> = {
    slate: {
        0: '#ffffff',
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
        950: '#020617'
    },
    zinc: {
        0: '#ffffff',
        50: '#fafafa',
        100: '#f4f4f5',
        200: '#e4e4e7',
        300: '#d4d4d8',
        400: '#a1a1aa',
        500: '#71717a',
        600: '#52525b',
        700: '#3f3f46',
        800: '#27272a',
        900: '#18181b',
        950: '#09090b'
    },
    gray: {
        0: '#ffffff',
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
        950: '#030712'
    },
    neutral: {
        0: '#ffffff',
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#e5e5e5',
        300: '#d4d4d4',
        400: '#a3a3a3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
        950: '#0a0a0a'
    },
    stone: {
        0: '#ffffff',
        50: '#fafaf9',
        100: '#f5f5f4',
        200: '#e7e5e4',
        300: '#d6d3d1',
        400: '#a8a29e',
        500: '#78716c',
        600: '#57534e',
        700: '#44403c',
        800: '#292524',
        900: '#1c1917',
        950: '#0c0a09'
    }
};

/**
 * Genera una paleta de superficie armónica (0 a 950) a partir de cualquier código hexadecimal.
 */
export function generarPaletaSurfaceDesdeHex(baseHex: string): PaletaSurface {
    const cleanHex = baseHex.startsWith('#') ? baseHex : `#${baseHex}`;
    const rgb = hexToRgb(cleanHex);
    const blanco: [number, number, number] = [255, 255, 255];
    const negro: [number, number, number] = [0, 0, 0];

    const luminance = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];

    if (luminance < 128) {
        // Hexadecimal oscuro (destinado al modo oscuro, como fondo/tarjetas)
        return {
            0: '#ffffff',
            50: mezclarColores(rgb, blanco, 0.04),
            100: mezclarColores(rgb, blanco, 0.10),
            200: mezclarColores(rgb, blanco, 0.20),
            300: mezclarColores(rgb, blanco, 0.35),
            400: mezclarColores(rgb, blanco, 0.55),
            500: mezclarColores(rgb, blanco, 0.72),
            600: mezclarColores(rgb, blanco, 0.86),
            700: mezclarColores(rgb, blanco, 0.94),
            800: cleanHex, // Tono exacto para cards en modo oscuro
            900: mezclarColores(rgb, negro, 0.70), // Fondo general en modo oscuro
            950: mezclarColores(rgb, negro, 0.45)  // Fondo profundo
        };
    } else {
        // Hexadecimal claro
        return {
            0: '#ffffff',
            50: cleanHex,
            100: mezclarColores(rgb, negro, 0.92),
            200: mezclarColores(rgb, negro, 0.82),
            300: mezclarColores(rgb, negro, 0.70),
            400: mezclarColores(rgb, negro, 0.55),
            500: mezclarColores(rgb, negro, 0.40),
            600: mezclarColores(rgb, negro, 0.30),
            700: mezclarColores(rgb, negro, 0.22),
            800: mezclarColores(rgb, negro, 0.15),
            900: mezclarColores(rgb, negro, 0.08),
            950: mezclarColores(rgb, negro, 0.03)
        };
    }
}

/**
 * Resuelve la paleta de superficie ya sea desde un nombre de preset ('slate', 'zinc', etc.)
 * o generando una escala completa a partir de un código hexadecimal (ej. '#1e293b').
 */
export function obtenerPaletaSurface(valor?: string | null): PaletaSurface {
    if (!valor) return PALETAS_SURFACE['slate'];

    const limpio = valor.trim().toLowerCase();
    if (PALETAS_SURFACE[limpio]) {
        return PALETAS_SURFACE[limpio];
    }

    if (/^#?[0-9a-f]{3,8}$/i.test(limpio)) {
        return generarPaletaSurfaceDesdeHex(limpio);
    }

    return PALETAS_SURFACE['slate'];
}

/**
 * Genera el objeto de extensión semántica para PrimeNG $t() / updatePreset()
 * Soporta personalización opcional para el color primario en modo oscuro para que los botones
 * resalten y nunca se pierdan en fondos oscuros.
 */
export function construirPresetExt(palette: PaletaShades, primaryDarkHex?: string) {
    const paletteDark = primaryDarkHex ? generarPaletaDesdeHex(primaryDarkHex) : null;

    const semanticObj: any = {
        primary: palette,
        colorScheme: {
            light: {
                primary: {
                    color: '{primary.500}',
                    contrastColor: '#ffffff',
                    hoverColor: '{primary.600}',
                    activeColor: '{primary.700}'
                },
                highlight: {
                    background: '{primary.50}',
                    focusBackground: '{primary.100}',
                    color: '{primary.700}',
                    focusColor: '{primary.800}'
                }
            },
            dark: {
                primary: {
                    color: paletteDark ? '{primaryDark.500}' : '{primary.400}',
                    contrastColor: '#ffffff',
                    hoverColor: paletteDark ? '{primaryDark.400}' : '{primary.300}',
                    activeColor: paletteDark ? '{primaryDark.300}' : '{primary.200}'
                },
                highlight: {
                    background: paletteDark
                        ? 'color-mix(in srgb, {primaryDark.500}, transparent 84%)'
                        : 'color-mix(in srgb, {primary.400}, transparent 84%)',
                    focusBackground: paletteDark
                        ? 'color-mix(in srgb, {primaryDark.500}, transparent 76%)'
                        : 'color-mix(in srgb, {primary.400}, transparent 76%)',
                    color: 'rgba(255,255,255,.87)',
                    focusColor: 'rgba(255,255,255,.87)'
                }
            }
        }
    };

    if (paletteDark) {
        semanticObj.primaryDark = paletteDark;
    }

    return {
        semantic: semanticObj
    };
}
