import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../store/auth.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);
    const token = authStore.token();

    let requestModificada = req;

    if (token) {
        requestModificada = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
            }
        });
    }

    return next(requestModificada).pipe(
        catchError((error: HttpErrorResponse) => {
            // Manejar sesión vencida (401) excepto en el endpoint de login o rutas públicas
            if (error.status === 401 && !req.url.includes('/login')) {
                const currentPath = typeof window !== 'undefined' ? window.location.pathname : router.url;
                if (!currentPath.startsWith('/g/')) {
                    authStore.cerrarSesionLocal();
                }
            }
            return throwError(() => error);
        })
    );
};
