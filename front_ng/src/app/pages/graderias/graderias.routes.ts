import { Routes } from '@angular/router';
import { GraderiasComponent } from './graderias.component';
import { GraderiaVentaComponent } from './components/graderia-venta/graderia-venta.component';
import { GraderiaDisenarPageComponent } from './components/graderia-disenar-page/graderia-disenar-page.component';
import { GraderiaMapaPageComponent } from './components/graderia-mapa-page/graderia-mapa-page.component';

export default [
    {
        path: '',
        component: GraderiasComponent
    },
    {
        path: 'mapa',
        component: GraderiaMapaPageComponent
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
