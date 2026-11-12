import { Injectable, effect, signal, computed } from '@angular/core';
import { environment } from '@/environments/environment';
import { $t, updatePreset, updateSurfacePalette } from '@primeuix/themes';
import Lara from '@primeuix/themes/lara';
import Aura from '@primeuix/themes/aura';
import Nora from '@primeuix/themes/nora';
import {
    generarPaletaDesdeHex,
    PALETAS_SURFACE,
    obtenerPaletaSurface,
    construirPresetExt,
    PaletaShades
} from '@/app/core/helpers/tema.helper';

export interface LayoutConfig {
    preset: string;
    primary: string;
    primaryDark?: string;
    surface: string | undefined | null;
    darkTheme: boolean;
    menuMode: string;
}

interface LayoutState {
    staticMenuDesktopInactive: boolean;
    overlayMenuActive: boolean;
    configSidebarVisible: boolean;
    mobileMenuActive: boolean;
    menuHoverActive: boolean;
    activePath: string | null;
}

const PRESETS: Record<string, any> = {
    Lara,
    Aura,
    Nora
};

const THEME_STORAGE_KEY = 'themeConfigTicket';

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    // Configuración inicial basada en variables de entorno
    private readonly configPorDefecto: LayoutConfig = {
        preset: environment.defaultPreset || 'Lara',
        primary: environment.primaryColor || '#960023',
        primaryDark: (environment as any).primaryDarkColor || undefined,
        surface: (environment as any).surfaceColor || '#1e293b',
        darkTheme: false,
        menuMode: 'static'
    };

    layoutConfig = signal<LayoutConfig>(this.obtenerConfiguracionInicial());

    layoutState = signal<LayoutState>({
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        configSidebarVisible: false,
        mobileMenuActive: false,
        menuHoverActive: false,
        activePath: null
    });

    theme = computed(() => (this.layoutConfig().darkTheme ? 'light' : 'dark'));

    isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().mobileMenuActive);

    isDarkTheme = computed(() => this.layoutConfig().darkTheme);

    getPrimary = computed(() => this.layoutConfig().primary);

    getSurface = computed(() => this.layoutConfig().surface);

    isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');

    transitionComplete = signal<boolean>(false);

    private initialized = false;

    constructor() {
        // Inicializar tema visual en el cliente
        if (typeof window !== 'undefined') {
            setTimeout(() => {
                this.aplicarTemaCompleto(this.layoutConfig());
            }, 0);
        }

        effect(() => {
            const config = this.layoutConfig();

            if (!this.initialized || !config) {
                this.initialized = true;
                return;
            }

            this.handleDarkModeTransition(config);
        });
    }

    private obtenerConfiguracionInicial(): LayoutConfig {
        if (typeof window !== 'undefined') {
            const guardado = localStorage.getItem(THEME_STORAGE_KEY);
            if (guardado) {
                try {
                    const parsed = JSON.parse(guardado);
                    return {
                        ...this.configPorDefecto,
                        ...parsed
                    };
                } catch {
                    return { ...this.configPorDefecto };
                }
            }
        }
        return { ...this.configPorDefecto };
    }

    /**
     * Aplica atómicamente el preset, la paleta primaria (desde el hex en entorno) y la superficie seleccionada.
     */
    aplicarTemaCompleto(config?: LayoutConfig): void {
        const c = config || this.layoutConfig();
        if (typeof window === 'undefined') return;

        const presetObj = PRESETS[c.preset] || PRESETS['Lara'];
        const primaryHex = c.primary || environment.primaryColor || '#960023';
        const primaryDarkHex = c.primaryDark || (environment as any).primaryDarkColor || undefined;
        const surfaceVal = c.surface || (environment as any).surfaceColor || '#1e293b';

        const paletaPrimaria = generarPaletaDesdeHex(primaryHex);
        const presetExt = construirPresetExt(paletaPrimaria, primaryDarkHex);
        const surfacePalette = obtenerPaletaSurface(surfaceVal);

        try {
            $t()
                .preset(presetObj)
                .preset(presetExt)
                .surfacePalette(surfacePalette)
                .use({ useDefaultOptions: true });

            this.toggleDarkMode(c);
            localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(c));
        } catch (error) {
            console.warn('[LayoutService] Error al aplicar tema dinámico:', error);
        }
    }

    /**
     * Actualiza el color primario a un nuevo hex y recomputa toda la paleta armónica.
     */
    actualizarColorPrimario(hex: string, darkHex?: string): void {
        this.layoutConfig.update((state) => ({
            ...state,
            primary: hex,
            ...(darkHex ? { primaryDark: darkHex } : {})
        }));
        const paleta = generarPaletaDesdeHex(hex);
        const presetExt = construirPresetExt(paleta, darkHex || this.layoutConfig().primaryDark);
        updatePreset(presetExt);

        if (typeof window !== 'undefined') {
            localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(this.layoutConfig()));
        }
    }

    /**
     * Actualiza la superficie visual (soporta hexadecimal ej. '#1e293b' o nombre de preset 'slate', 'zinc').
     */
    actualizarSuperficie(superficieHexONombre: string): void {
        this.layoutConfig.update((state) => ({ ...state, surface: superficieHexONombre }));
        const palette = obtenerPaletaSurface(superficieHexONombre);
        updateSurfacePalette(palette);

        if (typeof window !== 'undefined') {
            localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(this.layoutConfig()));
        }
    }

    /**
     * Cambia el preset estructural ('Lara', 'Aura', 'Nora').
     */
    actualizarPreset(nombrePreset: string): void {
        this.layoutConfig.update((state) => ({ ...state, preset: nombrePreset }));
        this.aplicarTemaCompleto(this.layoutConfig());
    }

    /**
     * Restablece todos los parámetros a los valores por defecto configurados en el environment.
     */
    restablecerValoresPorDefecto(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(THEME_STORAGE_KEY);
        }
        this.layoutConfig.set({ ...this.configPorDefecto });
        this.aplicarTemaCompleto(this.configPorDefecto);
    }

    private handleDarkModeTransition(config: LayoutConfig): void {
        const supportsViewTransition = typeof document !== 'undefined' && 'startViewTransition' in document;

        if (supportsViewTransition) {
            this.startViewTransition(config);
        } else {
            this.toggleDarkMode(config);
        }
    }

    private startViewTransition(config: LayoutConfig): void {
        (document as any).startViewTransition(() => {
            this.toggleDarkMode(config);
        });
    }

    toggleDarkMode(config?: LayoutConfig): void {
        if (typeof document === 'undefined') return;
        const _config = config || this.layoutConfig();
        if (_config.darkTheme) {
            document.documentElement.classList.add('app-dark');
        } else {
            document.documentElement.classList.remove('app-dark');
        }
    }

    onMenuToggle() {
        if (this.isOverlay()) {
            this.layoutState.update((prev) => ({ ...prev, overlayMenuActive: !this.layoutState().overlayMenuActive }));
        }

        if (this.isDesktop()) {
            this.layoutState.update((prev) => ({ ...prev, staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive }));
        } else {
            this.layoutState.update((prev) => ({ ...prev, mobileMenuActive: !this.layoutState().mobileMenuActive }));
        }
    }

    isDesktop() {
        return typeof window !== 'undefined' ? window.innerWidth > 991 : true;
    }
}
