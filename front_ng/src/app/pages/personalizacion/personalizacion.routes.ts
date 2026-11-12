import { Routes } from '@angular/router';
import { PersonalizacionComponent } from './personalizacion.component';
import { adminGuard } from '@/app/core/guards/admin.guard';

export default [
    {
        path: '',
        component: PersonalizacionComponent,
        canActivate: [adminGuard]
    }
] as Routes;
