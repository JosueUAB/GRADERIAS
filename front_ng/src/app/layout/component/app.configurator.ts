import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { $t, updatePreset, updateSurfacePalette } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';
import Nora from '@primeuix/themes/nora';
import { PrimeNG } from 'primeng/config';
import { SelectButtonModule } from 'primeng/selectbutton';
import { LayoutService } from '@/app/layout/service/layout.service';
import { environment } from '@/environments/environment';
import {
    generarPaletaDesdeHex,
    construirPresetExt,
    PALETAS_SURFACE
} from '@/app/core/helpers/tema.helper';

const presets = {
    Aura,
    Lara,
    Nora
} as const;

declare type KeyOfType<T> = keyof T extends infer U ? U : never;

declare type SurfacesType = {
    name?: string;
    palette?: {
        0?: string;
        50?: string;
        100?: string;
        200?: string;
        300?: string;
        400?: string;
        500?: string;
        600?: string;
        700?: string;
        800?: string;
        900?: string;
        950?: string;
    };
};

@Component({
    selector: 'app-configurator',
    standalone: true,
    imports: [CommonModule, FormsModule, SelectButtonModule],
    template: `
        <div class="flex flex-col gap-4 text-xs">
            <!-- 1. TEMAS RÁPIDOS ORURO (1-CLIC) -->
            <div>
                <div class="flex items-center justify-between pb-1">
                    <span class="font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                        Temas Oruro (1-Clic)
                    </span>
                    <span class="text-[10px] text-primary font-semibold">Alto Contraste</span>
                </div>
                <div class="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                        type="button"
                        (click)="aplicarTemaRapido('carmesi_oro')"
                        class="flex items-center gap-2 p-2 rounded-xl text-left border border-surface hover:border-amber-400 bg-surface-50 dark:bg-surface-800 transition-all cursor-pointer"
                        title="Fondo Carmesí Nocturno con Botones y Acentos en Dorado Carnaval"
                    >
                        <div class="w-4 h-4 rounded-full bg-[#eab308] border border-[#28050c] shadow-xs shrink-0"></div>
                        <div class="flex flex-col min-w-0">
                            <span class="font-bold truncate text-surface-900 dark:text-surface-0">Carmesí & Oro</span>
                            <span class="text-[10px] text-surface-400 truncate">Estilo Oficial</span>
                        </div>
                    </button>

                    <button
                        type="button"
                        (click)="aplicarTemaRapido('carmesi_blanco')"
                        class="flex items-center gap-2 p-2 rounded-xl text-left border border-surface hover:border-slate-300 bg-surface-50 dark:bg-surface-800 transition-all cursor-pointer"
                        title="Fondo Carmesí Nocturno con Botones y Acentos en Blanco Marfil"
                    >
                        <div class="w-4 h-4 rounded-full bg-[#ffffff] border border-[#28050c] shadow-xs shrink-0"></div>
                        <div class="flex flex-col min-w-0">
                            <span class="font-bold truncate text-surface-900 dark:text-surface-0">Carmesí & Marfil</span>
                            <span class="text-[10px] text-surface-400 truncate">Máximo Brillo</span>
                        </div>
                    </button>

                    <button
                        type="button"
                        (click)="aplicarTemaRapido('carmesi_rubi')"
                        class="flex items-center gap-2 p-2 rounded-xl text-left border border-surface hover:border-rose-400 bg-surface-50 dark:bg-surface-800 transition-all cursor-pointer"
                        title="Fondo Carmesí Nocturno con Acentos Rubí Radiante"
                    >
                        <div class="w-4 h-4 rounded-full bg-[#f43f5e] border border-[#28050c] shadow-xs shrink-0"></div>
                        <div class="flex flex-col min-w-0">
                            <span class="font-bold truncate text-surface-900 dark:text-surface-0">Carmesí & Rubí</span>
                            <span class="text-[10px] text-surface-400 truncate">Vino Elegante</span>
                        </div>
                    </button>

                    <button
                        type="button"
                        (click)="aplicarTemaRapido('slate_guindo')"
                        class="flex items-center gap-2 p-2 rounded-xl text-left border border-surface hover:border-primary bg-surface-50 dark:bg-surface-800 transition-all cursor-pointer"
                        title="Fondo Slate (Pizarra) con Acentos Guindo Oruro"
                    >
                        <div class="w-4 h-4 rounded-full bg-[#960023] border border-surface shadow-xs shrink-0"></div>
                        <div class="flex flex-col min-w-0">
                            <span class="font-bold truncate text-surface-900 dark:text-surface-0">Pizarra Oruro</span>
                            <span class="text-[10px] text-surface-400 truncate">Moderno</span>
                        </div>
                    </button>
                </div>
            </div>

            <!-- 2. FONDO / SUPERFICIE (SURFACE) -->
            <div>
                <div class="flex items-center justify-between pb-1">
                    <span class="font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                        Fondo / Superficie
                    </span>
                    <span class="text-[10px] text-surface-400 font-mono">{{ selectedSurfaceColor() || 'slate' }}</span>
                </div>
                <div class="pt-1 flex gap-2 flex-wrap items-center">
                    @for (surface of surfaces; track surface.name) {
                        <button
                            type="button"
                            [title]="surface.name"
                            (click)="updateColors($event, 'surface', surface)"
                            class="cursor-pointer w-6 h-6 rounded-full flex shrink-0 items-center justify-center p-0 outline-offset-2 transition-transform hover:scale-110 shadow-xs"
                            [ngClass]="{
                                'outline-2 outline-primary scale-110 shadow-md': selectedSurfaceColor() ? selectedSurfaceColor() === surface.name : surface.name === 'carmesi'
                            }"
                            [style.background-color]="surface?.palette?.['800'] || surface?.palette?.['500']"
                        >
                            @if (selectedSurfaceColor() === surface.name) {
                                <i class="pi pi-check text-[10px] text-white"></i>
                            }
                        </button>
                    }

                    <!-- Selector Personalizado Hex para Fondo -->
                    <label
                        class="cursor-pointer flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-primary hover:border-primary/80 relative overflow-hidden transition-transform hover:scale-110 shadow-xs"
                        title="Elegir cualquier color Hexadecimal para el fondo"
                    >
                        <i class="pi pi-palette text-[11px] text-primary"></i>
                        <input
                            type="color"
                            class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                            [value]="surfaceHexValue()"
                            (input)="onColorSurfacePersonalizado($event)"
                        />
                    </label>
                </div>
            </div>

            <!-- 3. COLOR PRIMARIO / ACENTOS (PRIMARY) -->
            <div>
                <div class="flex items-center justify-between pb-1">
                    <span class="font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                        Color Primario (Botones / Acentos)
                    </span>
                    <span class="text-[10px] text-surface-400 font-mono">{{ selectedPrimaryColor() || '#960023' }}</span>
                </div>
                <div class="pt-1 flex gap-2 flex-wrap items-center">
                    @for (primaryColor of primaryColors(); track primaryColor.name) {
                        <button
                            type="button"
                            [title]="primaryColor.name"
                            (click)="updateColors($event, 'primary', primaryColor)"
                            class="cursor-pointer w-6 h-6 rounded-full flex shrink-0 items-center justify-center p-0 outline-offset-2 transition-transform hover:scale-110 shadow-xs"
                            [ngClass]="{
                                'outline-2 outline-primary scale-110 shadow-md': primaryColor.name === selectedPrimaryColor()
                            }"
                            [style.background-color]="primaryColor?.name === 'noir' ? 'var(--text-color)' : primaryColor?.palette?.['500']"
                        >
                            @if (selectedPrimaryColor() === primaryColor.name) {
                                <i class="pi pi-check text-[10px] text-white"></i>
                            }
                        </button>
                    }

                    <!-- Selector Personalizado Hex para Primario -->
                    <label
                        class="cursor-pointer flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-primary hover:border-primary/80 relative overflow-hidden transition-transform hover:scale-110 shadow-xs"
                        title="Elegir cualquier color Hexadecimal para los botones y acentos"
                    >
                        <i class="pi pi-pencil text-[11px] text-primary"></i>
                        <input
                            type="color"
                            class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                            [value]="primaryHexValue()"
                            (input)="onColorPrimarioPersonalizado($event)"
                        />
                    </label>
                </div>
            </div>

            <!-- 4. PRESETS DE DISEÑO ESTRUCTURAL -->
            <div class="flex flex-col gap-1.5">
                <span class="font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    Estilo de Componentes
                </span>
                <p-selectbutton
                    [options]="presets"
                    [ngModel]="selectedPreset()"
                    (ngModelChange)="onPresetChange($event)"
                    [allowEmpty]="false"
                    size="small"
                />
            </div>

            <!-- 5. MODO DE MENÚ -->
            <div *ngIf="showMenuModeButton()" class="flex flex-col gap-1.5">
                <span class="font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    Menú Lateral
                </span>
                <p-selectbutton
                    [ngModel]="menuMode()"
                    (ngModelChange)="onMenuModeChange($event)"
                    [options]="menuModeOptions"
                    [allowEmpty]="false"
                    size="small"
                />
            </div>

            <!-- 6. BOTÓN RESTABLECER -->
            <div class="pt-2 border-t border-surface flex items-center justify-between">
                <span class="text-[10px] text-surface-400">Se guarda automáticamente</span>
                <button
                    type="button"
                    (click)="restablecerDefecto()"
                    class="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer py-1"
                >
                    <i class="pi pi-refresh text-[10px]"></i>
                    <span>Restablecer tema</span>
                </button>
            </div>
        </div>
    `,
    host: {
        class: 'hidden absolute top-13 right-0 w-84 max-w-[92vw] p-4 bg-surface-0 dark:bg-surface-900 border border-surface rounded-2xl origin-top shadow-2xl z-50 max-h-[85vh] overflow-y-auto'
    }
})
export class AppConfigurator {
    router = inject(Router);
    config: PrimeNG = inject(PrimeNG);
    layoutService: LayoutService = inject(LayoutService);
    platformId = inject(PLATFORM_ID);
    primeng = inject(PrimeNG);

    presets = Object.keys(presets);
    showMenuModeButton = signal(!this.router.url.includes('auth'));

    menuModeOptions = [
        { label: 'Fijo (Static)', value: 'static' },
        { label: 'Superpuesto (Overlay)', value: 'overlay' }
    ];

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.onPresetChange(this.layoutService.layoutConfig().preset);
        }
    }

    surfaces: SurfacesType[] = [
        {
            name: 'carmesi',
            palette: PALETAS_SURFACE['carmesi'] as any
        },
        {
            name: 'guindo',
            palette: PALETAS_SURFACE['guindo'] as any
        },
        {
            name: 'slate',
            palette: PALETAS_SURFACE['slate'] as any
        },
        {
            name: 'zinc',
            palette: PALETAS_SURFACE['zinc'] as any
        },
        {
            name: 'gray',
            palette: PALETAS_SURFACE['gray'] as any
        },
        {
            name: 'neutral',
            palette: PALETAS_SURFACE['neutral'] as any
        },
        {
            name: 'stone',
            palette: PALETAS_SURFACE['stone'] as any
        },
        {
            name: 'ocean',
            palette: {
                0: '#ffffff',
                50: '#fbfcfc',
                100: '#F7F9F8',
                200: '#EFF3F2',
                300: '#DADEDD',
                400: '#B1B7B6',
                500: '#828787',
                600: '#5F7274',
                700: '#415B61',
                800: '#29444E',
                900: '#183240',
                950: '#0c1920'
            }
        }
    ];

    selectedPrimaryColor = computed(() => this.layoutService.layoutConfig().primary);
    selectedSurfaceColor = computed(() => this.layoutService.layoutConfig().surface);
    selectedPreset = computed(() => this.layoutService.layoutConfig().preset);
    menuMode = computed(() => this.layoutService.layoutConfig().menuMode);

    primaryHexValue = computed(() => {
        const val = this.selectedPrimaryColor();
        return val && val.startsWith('#') ? val : '#960023';
    });

    surfaceHexValue = computed(() => {
        const val = this.selectedSurfaceColor();
        return val && val.startsWith('#') ? val : '#28050c';
    });

    primaryColors = computed<SurfacesType[]>(() => {
        const presetPalette = presets[this.layoutService.layoutConfig().preset as KeyOfType<typeof presets>].primitive;
        const envColor = environment.primaryColor || '#960023';

        const palettes: SurfacesType[] = [
            { name: '#eab308', palette: generarPaletaDesdeHex('#eab308') as any }, // Dorado Carnaval
            { name: envColor, palette: generarPaletaDesdeHex(envColor) as any },   // Carmesí Oruro
            { name: '#f43f5e', palette: generarPaletaDesdeHex('#f43f5e') as any }, // Rosa Rubí brillante
            { name: '#f8fafc', palette: generarPaletaDesdeHex('#f8fafc') as any }, // Blanco Marfil
            { name: '#3b82f6', palette: generarPaletaDesdeHex('#3b82f6') as any }, // Azul Real
            { name: 'emerald', palette: presetPalette?.['emerald' as KeyOfType<typeof presetPalette>] as any },
            { name: 'amber', palette: presetPalette?.['amber' as KeyOfType<typeof presetPalette>] as any },
            { name: 'violet', palette: presetPalette?.['violet' as KeyOfType<typeof presetPalette>] as any },
            { name: 'noir', palette: {} }
        ];

        return palettes;
    });

    aplicarTemaRapido(presetKey: 'carmesi_oro' | 'carmesi_blanco' | 'carmesi_rubi' | 'slate_guindo'): void {
        this.layoutService.aplicarTemaPreconfigurado(presetKey);
    }

    onColorPrimaryChange(hex: string): void {
        this.layoutService.actualizarColorPrimario(hex);
    }

    onColorSurfaceChange(hex: string): void {
        this.layoutService.actualizarSuperficie(hex);
    }

    onColorPrimarioPersonalizado(event: Event): void {
        const hex = (event.target as HTMLInputElement).value;
        this.layoutService.actualizarColorPrimario(hex);
    }

    onColorSurfacePersonalizado(event: Event): void {
        const hex = (event.target as HTMLInputElement).value;
        this.layoutService.actualizarSuperficie(hex);
    }

    restablecerDefecto(): void {
        this.layoutService.restablecerValoresPorDefecto();
    }

    updateColors(event: any, type: string, color: any) {
        if (type === 'primary') {
            this.layoutService.actualizarColorPrimario(color.name);
        } else if (type === 'surface') {
            this.layoutService.actualizarSuperficie(color.name);
        }
        event.stopPropagation();
    }

    onPresetChange(event: any) {
        this.layoutService.actualizarPreset(event);
    }

    onMenuModeChange(event: string) {
        this.layoutService.layoutConfig.update((prev) => ({ ...prev, menuMode: event }));
    }
}
