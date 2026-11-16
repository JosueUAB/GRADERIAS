import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { PwaService } from '@/app/core/services/pwa.service';

@Component({
    selector: 'app-pwa-install-banner',
    standalone: true,
    imports: [CommonModule, ButtonModule, DialogModule, TagModule],
    template: `
        <!-- Toast Flotante Elegante de Instalación PWA (Móvil y Escritorio) -->
        @if (pwa.showToast() && !pwa.isInstalled()) {
            <div
                class="fixed bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6 sm:right-6 sm:left-auto sm:translate-x-0 z-[1100] w-[94vw] max-w-[420px] pwa-toast-container"
            >
                <div
                    class="p-4 rounded-2xl border border-surface bg-surface-0/95 dark:bg-surface-900/95 backdrop-blur-md shadow-2xl transition-all flex flex-col gap-3"
                >
                    <!-- Cabecera del Toast -->
                    <div class="flex items-start gap-3">
                        <!-- Icono / Logo de la Aplicación -->
                        <div
                            class="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs"
                        >
                            <i class="pi pi-mobile text-2xl"></i>
                        </div>

                        <!-- Textos Descriptivos -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <span class="text-sm font-bold text-surface-900 dark:text-surface-0 tracking-tight">
                                    Instalar Butacas
                                </span>
                                <p-tag
                                    value="App Móvil"
                                    severity="success"
                                    [rounded]="true"
                                    styleClass="text-[9px] py-0 px-1.5"
                                />
                            </div>
                            <p class="text-xs text-surface-600 dark:text-surface-300 leading-snug mt-1">
                                Instala la aplicación en tu pantalla de inicio.
                            </p>
                        </div>

                        <!-- Botón de Cerrar Discreto -->
                        <button
                            type="button"
                            (click)="pwa.descartar()"
                            class="text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors cursor-pointer p-1 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800"
                            title="Cerrar"
                        >
                            <i class="pi pi-times text-xs"></i>
                        </button>
                    </div>

                    <!-- Botones de Acción -->
                    <div class="flex items-center justify-end gap-2 pt-1 border-t border-surface">
                        <p-button
                            label="Ahora no"
                            [text]="true"
                            severity="secondary"
                            size="small"
                            (onClick)="pwa.descartar()"
                            styleClass="text-xs font-medium"
                        />

                        @if (pwa.isIos()) {
                            <p-button
                                label="Cómo instalar"
                                icon="pi pi-apple"
                                size="small"
                                (onClick)="pwa.instalarApp()"
                                styleClass="text-xs font-semibold shadow-xs"
                            />
                        } @else {
                            <p-button
                                label="Instalar ahora"
                                icon="pi pi-download"
                                size="small"
                                (onClick)="pwa.instalarApp()"
                                styleClass="text-xs font-semibold shadow-xs"
                            />
                        }
                    </div>
                </div>
            </div>
        }

        <!-- Guía Visual para Instalación en iOS (iPhone / iPad en Safari) -->
        <p-dialog
            [(visible)]="pwa.showIosGuide"
            [modal]="true"
            [dismissableMask]="true"
            [draggable]="false"
            [resizable]="false"
            header="Instalar en tu iPhone o iPad"
            styleClass="w-[92vw] max-w-[400px] rounded-2xl"
        >
            <div class="flex flex-col gap-4 text-xs">
                <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface">
                    <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <i class="pi pi-apple text-xl"></i>
                    </div>
                    <div>
                        <div class="font-bold text-surface-900 dark:text-surface-0">Safari en iOS</div>
                        <div class="text-[11px] text-surface-500 dark:text-surface-400">
                            Sigue estos 2 sencillos pasos para agregarla a tu pantalla de inicio:
                        </div>
                    </div>
                </div>

                <!-- Pasos Numerados -->
                <div class="space-y-3">
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
                            1
                        </div>
                        <div class="leading-relaxed">
                            <span class="text-surface-800 dark:text-surface-100">
                                Toca el botón <strong>Compartir</strong>
                            </span>
                            <span class="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 border border-surface font-semibold text-primary">
                                <i class="pi pi-share-alt text-[10px]"></i>
                            </span>
                            <span class="text-surface-500 dark:text-surface-400">(ubicado en la barra inferior de Safari).</span>
                        </div>
                    </div>

                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
                            2
                        </div>
                        <div class="leading-relaxed">
                            <span class="text-surface-800 dark:text-surface-100">
                                Desliza hacia abajo y presiona
                            </span>
                            <strong class="text-primary block mt-0.5">"Agregar a inicio"</strong>
                            <span class="text-surface-500 dark:text-surface-400">con el icono cuadrado (+).</span>
                        </div>
                    </div>
                </div>

                <div class="pt-2 flex justify-end">
                    <p-button
                        label="Entendido"
                        size="small"
                        (onClick)="pwa.cerrarGuiaIos()"
                        styleClass="w-full sm:w-auto"
                    />
                </div>
            </div>
        </p-dialog>
    `
})
export class PwaInstallBannerComponent {
    pwa = inject(PwaService);
}
