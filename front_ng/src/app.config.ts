import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import Lara from '@primeuix/themes/lara';
import Aura from '@primeuix/themes/aura';
import Nora from '@primeuix/themes/nora';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { appRoutes } from './app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { environment } from './environments/environment';

const PRESET_MAP: Record<string, any> = {
    Lara,
    Aura,
    Nora
};

const initialPreset = PRESET_MAP[environment.defaultPreset] || Lara;

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
        provideZonelessChangeDetection(),
        providePrimeNG({
            theme: {
                preset: initialPreset,
                options: { darkModeSelector: '.app-dark' }
            }
        }),
        MessageService,
        ConfirmationService
    ]
};
