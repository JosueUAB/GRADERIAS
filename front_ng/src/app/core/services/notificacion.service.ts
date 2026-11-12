import { inject, Injectable } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';

export interface OpcionesConfirmacion {
    mensaje: string;
    titulo?: string;
    icono?: string;
    textoAceptar?: string;
    textoCancelar?: string;
    alAceptar: () => void;
    alCancelar?: () => void;
}

@Injectable({
    providedIn: 'root'
})
export class NotificacionService {
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    exito(mensaje: string, titulo: string = 'Éxito') {
        this.messageService.add({
            severity: 'success',
            summary: titulo,
            detail: mensaje,
            life: 3500
        });
    }

    error(mensaje: string, titulo: string = 'Error') {
        this.messageService.add({
            severity: 'error',
            summary: titulo,
            detail: mensaje,
            life: 4500
        });
    }

    advertencia(mensaje: string, titulo: string = 'Atención') {
        this.messageService.add({
            severity: 'warn',
            summary: titulo,
            detail: mensaje,
            life: 4000
        });
    }

    info(mensaje: string, titulo: string = 'Información') {
        this.messageService.add({
            severity: 'info',
            summary: titulo,
            detail: mensaje,
            life: 3000
        });
    }

    confirmar(opciones: OpcionesConfirmacion) {
        this.confirmationService.confirm({
            message: opciones.mensaje,
            header: opciones.titulo || 'Confirmación',
            icon: opciones.icono || 'pi pi-exclamation-triangle',
            rejectButtonProps: {
                label: opciones.textoCancelar || 'Cancelar',
                severity: 'secondary',
                outlined: true,
                rounded: true
            },
            acceptButtonProps: {
                label: opciones.textoAceptar || 'Confirmar',
                severity: 'primary',
                rounded: true
            },
            accept: () => {
                opciones.alAceptar();
            },
            reject: () => {
                if (opciones.alCancelar) {
                    opciones.alCancelar();
                }
            }
        });
    }
}
