import { Component, computed, inject } from '@angular/core';
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
        @for (item of model(); track item.label) {
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

    readonly model = computed<MenuItem[]>(() => {
        const esAdmin = this.authStore.esAdmin();
        const tienePermisoUsuarios = this.authStore.tienePermiso('Usuarios');

        const menu: MenuItem[] = [
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
                    { label: 'Diseñar Gradería', icon: 'pi pi-fw pi-plus-circle', routerLink: ['/graderias/nueva'] },
                    { label: 'Mapa de Graderías', icon: 'pi pi-fw pi-map-marker', routerLink: ['/graderias/mapa'] }
                ]
            }
        ];

        // Reportes y Auditoría (Visible exclusivamente para Administrador)
        if (esAdmin || tienePermisoUsuarios) {
            menu.push({
                label: 'Reportes y Auditoría',
                items: [
                    { label: 'Seguimiento de Ventas', icon: 'pi pi-fw pi-chart-line', routerLink: ['/seguimiento-ventas'] }
                ]
            });
        }

        // Administración del Sistema (Visible exclusivamente para Administrador)
        if (esAdmin || tienePermisoUsuarios) {
            const adminItems: MenuItem[] = [];
            if (esAdmin || tienePermisoUsuarios) {
                adminItems.push({ label: 'Gestión de Usuarios', icon: 'pi pi-fw pi-users', routerLink: ['/usuarios'] });
            }
            // if (esAdmin) {
            //     adminItems.push({ label: 'Personalización de Tema', icon: 'pi pi-fw pi-palette', routerLink: ['/personalizacion'] });
            // }

            if (adminItems.length > 0) {
                menu.push({
                    label: 'Administración del Sistema',
                    items: adminItems
                });
            }
        }

        // Mi Cuenta (Accesible para todos los usuarios)
        menu.push({
            label: 'Mi Cuenta',
            items: [
                { label: 'Cambiar Contraseña', icon: 'pi pi-fw pi-lock', routerLink: ['/perfil/cambiar-contrasena'] }
            ]
        });

        return menu;
    });
}

