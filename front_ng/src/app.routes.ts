import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Documentation } from './app/pages/documentation/documentation';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { authGuard } from './app/core/guards/auth.guard';
import { noAuthGuard } from './app/core/guards/no-auth.guard';

export const appRoutes: Routes = [
    // 1. Rutas Públicas de Libre Acceso (Evaluadas primero para no activar guards)
    {
        path: 'g/:code',
        loadChildren: () => import('./app/pages/publico/publico.routes')
    },
    {
        path: 'landing',
        component: Landing
    },
    { 
        path: 'auth', 
        canActivate: [noAuthGuard],
        loadChildren: () => import('./app/pages/auth/auth.routes') 
    },

    // 2. Rutas Privadas / Administrativas
    {
        path: '',
        component: AppLayout,
        canActivateChild: [authGuard],
        children: [
            { path: '', component: Dashboard },
            { path: 'graderias', loadChildren: () => import('./app/pages/graderias/graderias.routes') },
            { path: 'seguimiento-ventas', loadChildren: () => import('./app/pages/seguimiento-ventas/seguimiento-ventas.routes') },
            { path: 'usuarios', loadChildren: () => import('./app/pages/usuarios/usuarios.routes') },
            { path: 'personalizacion', loadChildren: () => import('./app/pages/personalizacion/personalizacion.routes') },
            { path: 'perfil', loadChildren: () => import('./app/pages/perfil/perfil.routes') },
            { path: 'uikit', loadChildren: () => import('./app/pages/uikit/uikit.routes') },
            { path: 'documentation', component: Documentation },
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },

    // 3. Fallback
    { path: 'notfound', component: Notfound },
    { path: '**', redirectTo: '/notfound' }
];
