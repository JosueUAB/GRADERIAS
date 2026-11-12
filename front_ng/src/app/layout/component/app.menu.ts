import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthStore } from '@/app/core/store/auth.store';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model; track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul> `,
})
export class AppMenu {
    authStore = inject(AuthStore);
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'General',
                items: [
                    { label: 'Panel Principal', icon: 'pi pi-fw pi-chart-pie', routerLink: ['/'] }
                ]
            },
            {
                label: 'Graderías y Butacas',
                items: [
                    { label: 'Mis Graderías', icon: 'pi pi-fw pi-th-large', routerLink: ['/graderias'] },
                    { label: 'Diseñar Gradería', icon: 'pi pi-fw pi-plus-circle', routerLink: ['/graderias/nueva'] }
                ]
            },
            {
                label: 'Reportes y Auditoría',
                items: [
                    {
                        label: 'Seguimiento de Ventas',
                        icon: 'pi pi-fw pi-chart-line',
                        routerLink: ['/seguimiento-ventas'],
                        visible: this.authStore.esAdmin() || this.authStore.tienePermiso('Usuarios')
                    }
                ]
            },
            {
                label: 'Seguridad y Accesos',
                items: [
                    { label: 'Gestión de Usuarios', icon: 'pi pi-fw pi-users', routerLink: ['/usuarios'], visible: this.authStore.esAdmin() || this.authStore.tienePermiso('Usuarios') },
                    { label: 'Cambiar Contraseña', icon: 'pi pi-fw pi-lock', routerLink: ['/perfil/cambiar-contrasena'] }
                ]
            },
            {
                label: 'Configuración y Apariencia',
                items: [
                    { 
                        label: 'Personalización de Tema', 
                        icon: 'pi pi-fw pi-palette', 
                        routerLink: ['/personalizacion'], 
                        visible: this.authStore.esAdmin() 
                    }
                ]
            },
            {
                label: 'Recursos & Demo',
                items: [
                    { label: 'Componentes PrimeNG', icon: 'pi pi-fw pi-palette', routerLink: ['/uikit/formlayout'] },
                    { label: 'Documentación UI', icon: 'pi pi-fw pi-book', routerLink: ['/documentation'] }
                ]
            }
        ];
    }
}
