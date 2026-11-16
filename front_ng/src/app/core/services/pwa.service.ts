import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const DISMISS_STORAGE_KEY = 'pwa_install_dismissed_until';

@Injectable({
    providedIn: 'root'
})
export class PwaService {
    private platformId = inject(PLATFORM_ID);
    private deferredPrompt: any = null;

    // Estado reactivo con Signals de Angular 19
    canInstall = signal<boolean>(false);
    isInstalled = signal<boolean>(false);
    isIos = signal<boolean>(false);
    showToast = signal<boolean>(false);
    showIosGuide = signal<boolean>(false);

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            this.inicializarPwa();
        }
    }

    private inicializarPwa(): void {
        // 1. Verificar si ya se está ejecutando instalada como Standalone / App
        const esStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true ||
            document.referrer.includes('android-app://');

        if (esStandalone) {
            this.isInstalled.set(true);
            return;
        }

        // 2. Registrar el Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    // Actualización periódica silenciosa
                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // Nueva versión lista
                                }
                            };
                        }
                    };
                })
                .catch((err) => {
                    console.warn('[PWA] Error al registrar Service Worker:', err);
                });
        }

        // 3. Detectar si es iOS (iPhone/iPad en Safari)
        const userAgent = window.navigator.userAgent.toLowerCase();
        const esDispositivoIos = /iphone|ipad|ipod/.test(userAgent);
        const esSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
        const esIosSafari = esDispositivoIos && esSafari;
        this.isIos.set(esIosSafari);

        // 4. Capturar el evento estándar de instalación (Android, Chrome, Edge, Samsung Internet)
        window.addEventListener('beforeinstallprompt', (e: Event) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.canInstall.set(true);

            // Mostrar el toast tras 2.5 segundos si no fue descartado recientemente
            if (!this.estaDescartado()) {
                setTimeout(() => {
                    this.showToast.set(true);
                }, 2500);
            }
        });

        // 5. Detectar cuando la app ha sido instalada exitosamente
        window.addEventListener('appinstalled', () => {
            this.isInstalled.set(true);
            this.canInstall.set(false);
            this.showToast.set(false);
            this.showIosGuide.set(false);
            this.deferredPrompt = null;
            if (typeof window !== 'undefined') {
                localStorage.removeItem(DISMISS_STORAGE_KEY);
            }
        });

        // 6. Si es iOS Safari y no está instalado ni descartado, sugerir instalación
        if (esIosSafari && !this.estaDescartado()) {
            this.canInstall.set(true);
            setTimeout(() => {
                this.showToast.set(true);
            }, 3000);
        }
    }

    /**
     * Lanza el diálogo nativo de instalación o abre la guía para iOS
     */
    async instalarApp(): Promise<void> {
        if (this.isIos()) {
            this.showIosGuide.set(true);
            return;
        }

        if (!this.deferredPrompt) {
            return;
        }

        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                this.canInstall.set(false);
                this.showToast.set(false);
            }
            this.deferredPrompt = null;
        } catch (error) {
            console.warn('[PWA] Error al invocar prompt de instalación:', error);
        }
    }

    /**
     * Descarta el toast temporalmente (por defecto 3 días) para no saturar al usuario
     */
    descartar(diasExpiracion = 3): void {
        this.showToast.set(false);
        this.showIosGuide.set(false);
        if (typeof window !== 'undefined') {
            const expiraEn = Date.now() + diasExpiracion * 24 * 60 * 60 * 1000;
            localStorage.setItem(DISMISS_STORAGE_KEY, expiraEn.toString());
        }
    }

    /**
     * Forzar apertura manual del prompt (por ejemplo, desde un botón en la barra superior o menú)
     */
    abrirModalManual(): void {
        if (this.isIos()) {
            this.showIosGuide.set(true);
        } else if (this.deferredPrompt) {
            this.instalarApp();
        } else {
            this.showToast.set(true);
        }
    }

    cerrarGuiaIos(): void {
        this.showIosGuide.set(false);
    }

    private estaDescartado(): boolean {
        if (typeof window === 'undefined') return false;
        const saved = localStorage.getItem(DISMISS_STORAGE_KEY);
        if (!saved) return false;
        const timestamp = parseInt(saved, 10);
        if (isNaN(timestamp)) return false;
        return Date.now() < timestamp;
    }
}
