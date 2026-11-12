import { Routes } from '@angular/router';
import { GraderiasComponent } from './graderias.component';
import { GraderiaVentaComponent } from './components/graderia-venta/graderia-venta.component';
import { GraderiaDisenarPageComponent } from './components/graderia-disenar-page/graderia-disenar-page.component';

export default [
    {
        path: '',
        component: GraderiasComponent
    },
    {
        path: 'nueva',
        component: GraderiaDisenarPageComponent
    },
    {
        path: ':id/venta',
        component: GraderiaVentaComponent
    }
] as Routes;
