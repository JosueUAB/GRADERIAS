import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../store/auth.store';

export const authGuard: CanActivateFn = (route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    if (authStore.estaAutenticado()) {
        // Verificar permisos si la ruta especifica 'perm'
        const permisoRequerido = route.data?.['perm'];
        if (permisoRequerido && !authStore.tienePermiso(permisoRequerido)) {
            router.navigate(['/']);
            return false;
        }
        return true;
    }

    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
};
