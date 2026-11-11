<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class WhatsAppController extends Controller
{
    public function sendTickets(Request $request)
    {
        $data = $request->validate([
            'cliente_nombre' => 'required|string',
            'cliente_celular' => 'required|string',
            'pdf_base64' => 'required|string',
            'asiento_codigos' => 'nullable|array'
        ]);

        // 1) guardar PDF en storage (temporal)
        $bin = base64_decode($data['pdf_base64']);
        $name = 'boletos_' . time() . '.pdf';
//        \Storage::disk('public')->put("tmp/$name", $bin);
        Storage::put("public/tmp/$name", $bin);
        $urlPublica = asset("storage/tmp/$name");

        // 2) enviar por WhatsApp Cloud API:
        // - subir media => te devuelve media_id
        // - enviar mensaje tipo document con ese media_id

        // (aquí va tu integración real con Meta)
        return response()->json(['ok' => true, 'url' => $urlPublica]);
    }
}
