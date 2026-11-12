import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../store/auth.store';

export const adminGuard: CanActivateFn = () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    if (authStore.estaAutenticado() && authStore.esAdmin()) {
        return true;
    }

    router.navigate(['/']);
    return false;
};
