import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { filter } from 'rxjs';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, ToastModule, ConfirmDialogModule],
    template: `
        <p-toast position="top-right" />
        <p-confirmdialog />
        <router-outlet></router-outlet>
    `
})
export class AppComponent implements OnInit, OnDestroy {
    private platformId = inject(PLATFORM_ID);
    private router = inject(Router);
    private observer: MutationObserver | null = null;

    ngOnInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            // 1. Desbloqueo garantizado de scroll en cada cambio de ruta
            this.router.events
                .pipe(filter((event) => event instanceof NavigationEnd))
                .subscribe(() => {
                    this.limpiarBloqueoScroll();
                });

            // 2. Observar el body para eliminar bloqueos de scroll huérfanos dejados por diálogos cerrados
            this.observer = new MutationObserver(() => {
                const tieneBloqueo =
                    document.body.classList.contains('p-overflow-hidden') ||
                    document.body.classList.contains('blocked-scroll') ||
                    document.body.style.overflow === 'hidden';

                if (tieneBloqueo) {
                    const hayModalActivo = document.querySelector(
                        '.p-dialog-mask, .p-overlay-mask, .p-sidebar-mask, .layout-mobile-active'
                    );
                    if (!hayModalActivo) {
                        this.limpiarBloqueoScroll();
                    }
                }
            });

            this.observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['class', 'style']
            });
        }
    }

    private limpiarBloqueoScroll(): void {
        if (typeof document === 'undefined') return;
        document.body.classList.remove('blocked-scroll');
        document.body.classList.remove('p-overflow-hidden');
        if (document.body.style.overflow === 'hidden') {
            document.body.style.overflow = '';
        }
        if (document.documentElement.style.overflow === 'hidden') {
            document.documentElement.style.overflow = '';
        }
    }

    ngOnDestroy(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}
