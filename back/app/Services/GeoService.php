<?php

namespace App\Services;

class GeoService
{
    private const RADIO_TIERRA_METROS = 6371000;

    /**
     * Calcula la distancia Haversine en metros entre dos puntos geográficos (lat1, lng1) y (lat2, lng2).
     */
    public static function distanciaHaversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLng / 2) * sin($dLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return self::RADIO_TIERRA_METROS * $c;
    }

    /**
     * Normaliza un punto a [lat, lng].
     * Soporta [lng, lat] (GeoJSON), [lat, lng] o ['lat' => ..., 'lng' => ...]
     */
    public static function normalizarPunto(mixed $pto): ?array
    {
        if (is_array($pto)) {
            if (isset($pto['lat']) && isset($pto['lng'])) {
                return [(float)$pto['lat'], (float)$pto['lng']];
            }
            if (isset($pto['latitud']) && isset($pto['longitud'])) {
                return [(float)$pto['latitud'], (float)$pto['longitud']];
            }
            if (isset($pto[0]) && isset($pto[1])) {
                // Si viene como GeoJSON [lng, lat] donde lng está entre -180 y 180 y lat entre -90 y 90
                // En Oruro, Bolivia: lat ~ -17.9, lng ~ -67.1
                $val0 = (float)$pto[0];
                $val1 = (float)$pto[1];

                // Si el primer valor parece longitud (ej: -67.1) y el segundo latitud (-17.9)
                if (abs($val0) > abs($val1) && $val1 >= -90 && $val1 <= 90) {
                    return [$val1, $val0]; // [lat, lng]
                }
                return [$val0, $val1];
            }
        }
        return null;
    }

    /**
     * Calcula la distancia mínima en metros desde un punto (lat, lng) a una polilínea de ruta.
     */
    public static function distanciaPuntoAPolilinea(float $lat, float $lng, array $coordenadas): float
    {
        if (empty($coordenadas)) {
            return PHP_FLOAT_MAX;
        }

        $puntos = [];
        foreach ($coordenadas as $raw) {
            $p = self::normalizarPunto($raw);
            if ($p) {
                $puntos[] = $p;
            }
        }

        if (count($puntos) === 0) {
            return PHP_FLOAT_MAX;
        }

        if (count($puntos) === 1) {
            return self::distanciaHaversine($lat, $lng, $puntos[0][0], $puntos[0][1]);
        }

        $distanciaMinima = PHP_FLOAT_MAX;

        for ($i = 0; $i < count($puntos) - 1; $i++) {
            $pA = $puntos[$i];
            $pB = $puntos[$i + 1];

            $dist = self::distanciaPuntoASegmento($lat, $lng, $pA[0], $pA[1], $pB[0], $pB[1]);
            if ($dist < $distanciaMinima) {
                $distanciaMinima = $dist;
            }
        }

        return $distanciaMinima;
    }

    /**
     * Calcula la distancia más corta desde un punto P a un segmento de línea AB en metros.
     */
    public static function distanciaPuntoASegmento(
        float $pLat, float $pLng,
        float $aLat, float $aLng,
        float $bLat, float $bLng
    ): float {
        $latMediaRad = deg2rad(($aLat + $bLat) / 2);
        $metrosPorGradoLat = 111132.95;
        $metrosPorGradoLng = 111412.84 * cos($latMediaRad);

        // Vector AB en metros planos locales
        $dx = ($bLng - $aLng) * $metrosPorGradoLng;
        $dy = ($bLat - $aLat) * $metrosPorGradoLat;

        // Longitud al cuadrado de AB
        $abLenSq = ($dx * $dx) + ($dy * $dy);

        if ($abLenSq < 1e-9) {
            // A y B son casi el mismo punto
            return self::distanciaHaversine($pLat, $pLng, $aLat, $aLng);
        }

        // Vector AP
        $apX = ($pLng - $aLng) * $metrosPorGradoLng;
        $apY = ($pLat - $aLat) * $metrosPorGradoLat;

        // Proyección escalar t de AP sobre AB, acotada en [0, 1]
        $t = ($apX * $dx + $apY * $dy) / $abLenSq;
        $t = max(0.0, min(1.0, $t));

        // Punto más cercano C en el segmento
        $cLat = $aLat + $t * ($bLat - $aLat);
        $cLng = $aLng + $t * ($bLng - $aLng);

        return self::distanciaHaversine($pLat, $pLng, $cLat, $cLng);
    }
}
