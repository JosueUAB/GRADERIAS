import { Routes } from '@angular/router';
import { SeguimientoVentasComponent } from './seguimiento-ventas.component';
import { adminGuard } from '@/app/core/guards/admin.guard';

export default [
    {
        path: '',
        component: SeguimientoVentasComponent,
        canActivate: [adminGuard]
    }
] as Routes;
