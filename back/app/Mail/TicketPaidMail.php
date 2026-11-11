<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Barryvdh\DomPDF\Facade\Pdf;

class TicketPaidMail extends Mailable
{
    use Queueable, SerializesModels;

    public $order;

    public function __construct($order)
    {
        $this->order = $order;
    }

    public function build()
    {
        // Generar PDF desde Blade
        $pdf = Pdf::loadView('pdf.ticket', [
            'order' => $this->order
        ])->setPaper('a4');

        return $this->subject('Tu entrada - Pago confirmado')
            ->view('emails.ticket_paid')
            ->attachData(
                $pdf->output(),
                'entrada-'.$this->order->id.'.pdf',
                ['mime' => 'application/pdf']
            );
    }
}
