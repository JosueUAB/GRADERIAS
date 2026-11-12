import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { LayoutService } from '@/app/layout/service/layout.service';
import { NotificacionService } from '@/app/core/services/notificacion.service';
import { generarPaletaDesdeHex, PALETAS_SURFACE, PaletaShades } from '@/app/core/helpers/tema.helper';
import { environment } from '@/environments/environment';

interface ColorSugerido {
    nombre: string;
    hex: string;
}

interface SombraItem {
    shade: number;
    color: string;
}

interface ItemSuperficie {
    nombre: string;
    color50: string;
    color500: string;
    color900: string;
}

@Component({
    selector: 'app-personalizacion',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        TagModule,
        TooltipModule,
        InputTextModule,
        ToggleSwitchModule
    ],
    templateUrl: './personalizacion.component.html'
})
export class PersonalizacionComponent implements OnInit {
    layoutService = inject(LayoutService);
    notificacion = inject(NotificacionService);

    colorHexActual: string = environment.primaryColor || '#960023';
    colorHexInput: string = environment.primaryColor || '#960023';
    escalaSombras: SombraItem[] = [];

    superficieHexActual: string = (environment as any).surfaceColor || '#1e293b';
    superficieHexInput: string = (environment as any).surfaceColor || '#1e293b';

    presetActual = computed(() => this.layoutService.layoutConfig().preset);
    superficieActual = computed(() => this.layoutService.layoutConfig().surface);

    coloresSugeridos: ColorSugerido[] = [
        { nombre: 'Carmesí Graderías', hex: '#960023' },
        { nombre: 'Azul Noche', hex: '#1e40af' },
        { nombre: 'Esmeralda', hex: '#059669' },
        { nombre: 'Borgoña Tinto', hex: '#800020' },
        { nombre: 'Ámbar Cálido', hex: '#d97706' },
        { nombre: 'Índigo Real', hex: '#4f46e5' },
        { nombre: 'Violeta Gala', hex: '#7c3aed' },
        { nombre: 'Rojo Rubí', hex: '#dc2626' }
    ];

    listaPresets = [
        { nombre: 'Lara', descripcion: 'Aspecto moderno, bordes sutilmente redondeados y balance visual óptimo.' },
        { nombre: 'Aura', descripcion: 'Estilo clásico característico con sombras y elevaciones profundas.' },
        { nombre: 'Nora', descripcion: 'Aspecto plano, sobrio y compacto.' }
    ];

    listaSuperficies: ItemSuperficie[] = [
        { nombre: 'slate', color50: '#f8fafc', color500: '#64748b', color900: '#0f172a' },
        { nombre: 'zinc', color50: '#fafafa', color500: '#71717a', color900: '#18181b' },
        { nombre: 'gray', color50: '#f9fafb', color500: '#6b7280', color900: '#111827' },
        { nombre: 'neutral', color50: '#fafafa', color500: '#737373', color900: '#171717' },
        { nombre: 'stone', color50: '#fafaf9', color500: '#78716c', color900: '#1c1917' }
    ];

    ngOnInit(): void {
        const primary = this.layoutService.layoutConfig().primary || environment.primaryColor || '#960023';
        this.colorHexActual = primary;
        this.colorHexInput = primary;
        this.recalcularEscalaSombras(primary);

        const currentSurface = this.layoutService.layoutConfig().surface || (environment as any).surfaceColor || '#1e293b';
        if (currentSurface.startsWith('#')) {
            this.superficieHexActual = currentSurface;
            this.superficieHexInput = currentSurface;
        }
    }

    recalcularEscalaSombras(hex: string): void {
        try {
            const paleta = generarPaletaDesdeHex(hex);
            const shadesKeys: (keyof PaletaShades)[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
            this.escalaSombras = shadesKeys.map((k) => ({
                shade: k,
                color: paleta[k]
            }));
        } catch {
            // Ignorar errores si el hex está incompleto mientras se escribe
        }
    }

    alCambiarColorInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const hex = input.value;
        this.colorHexActual = hex;
        this.colorHexInput = hex.toUpperCase();
        this.recalcularEscalaSombras(hex);
        this.layoutService.actualizarColorPrimario(hex);
    }

    alCambiarColorTexto(valor: string): void {
        if (/^#[0-9A-Fa-f]{6}$/.test(valor)) {
            this.colorHexActual = valor;
            this.recalcularEscalaSombras(valor);
            this.layoutService.actualizarColorPrimario(valor);
        }
    }

    aplicarHexDirecto(): void {
        let hex = this.colorHexInput.trim();
        if (!hex.startsWith('#')) {
            hex = '#' + hex;
        }

        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            this.colorHexActual = hex;
            this.colorHexInput = hex.toUpperCase();
            this.recalcularEscalaSombras(hex);
            this.layoutService.actualizarColorPrimario(hex);
            this.notificacion.exito(`Color primario actualizado a ${hex}`);
        } else {
            this.notificacion.advertencia('Ingresa un formato hexadecimal válido (ej. #960023)');
        }
    }

    seleccionarColorSugerido(hex: string): void {
        this.colorHexActual = hex;
        this.colorHexInput = hex.toUpperCase();
        this.recalcularEscalaSombras(hex);
        this.layoutService.actualizarColorPrimario(hex);
        this.notificacion.info(`Tema primario cambiado a ${hex}`);
    }

    seleccionarPreset(preset: string): void {
        this.layoutService.actualizarPreset(preset);
        this.notificacion.info(`Preset estructural cambiado a ${preset}`);
    }

    seleccionarSuperficie(superficie: string): void {
        this.layoutService.actualizarSuperficie(superficie);
        if (superficie.startsWith('#')) {
            this.superficieHexActual = superficie;
            this.superficieHexInput = superficie;
        }
        this.notificacion.info(`Superficie de fondo cambiada a ${superficie}`);
    }

    alCambiarSuperficieInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const hex = input.value;
        this.superficieHexActual = hex;
        this.superficieHexInput = hex.toUpperCase();
        this.layoutService.actualizarSuperficie(hex);
    }

    aplicarSuperficieHexDirecto(): void {
        let hex = this.superficieHexInput.trim();
        if (!hex.startsWith('#')) {
            hex = '#' + hex;
        }

        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            this.superficieHexActual = hex;
            this.superficieHexInput = hex.toUpperCase();
            this.layoutService.actualizarSuperficie(hex);
            this.notificacion.exito(`Superficie personalizada a ${hex}`);
        } else {
            this.notificacion.advertencia('Ingresa un formato hexadecimal válido para la superficie (ej. #1e293b)');
        }
    }

    restablecerDefectos(): void {
        this.layoutService.restablecerValoresPorDefecto();
        this.colorHexActual = environment.primaryColor;
        this.colorHexInput = environment.primaryColor;
        this.superficieHexActual = (environment as any).surfaceColor || '#1e293b';
        this.superficieHexInput = this.superficieHexActual;
        this.recalcularEscalaSombras(environment.primaryColor);
        this.notificacion.exito(`Valores restablecidos: ${environment.primaryColor}, ${(environment as any).surfaceColor || 'slate'}`);
    }

    toggleTema(): void {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            darkTheme: !state.darkTheme
        }));
    }
}
