/**
 * Utilidades geoespaciales para cálculo de distancias y validación de puntos sobre la ruta.
 */

const RADIO_TIERRA_METROS = 6371000;

/**
 * Calcula la distancia Haversine en metros entre dos coordenadas geográficas.
 */
export function distanciaHaversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const radLat1 = (lat1 * Math.PI) / 180;
    const radLat2 = (lat2 * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return RADIO_TIERRA_METROS * c;
}

/**
 * Normaliza un punto de coordenadas a [lat, lng].
 * Soporta [lng, lat] (estándar GeoJSON/MapLibre), [lat, lng] o { lat, lng }.
 */
export function normalizarPunto(pto: any): [number, number] | null {
    if (!pto) return null;
    if (typeof pto === 'object') {
        if ('lat' in pto && 'lng' in pto) {
            return [Number(pto.lat), Number(pto.lng)];
        }
        if ('latitud' in pto && 'longitud' in pto) {
            return [Number(pto.latitud), Number(pto.longitud)];
        }
        if (Array.isArray(pto) && pto.length >= 2) {
            const v0 = Number(pto[0]);
            const v1 = Number(pto[1]);
            // Si el primer valor parece longitud (-67.x) y el segundo latitud (-17.x)
            if (Math.abs(v0) > Math.abs(v1) && v1 >= -90 && v1 <= 90) {
                return [v1, v0]; // [lat, lng]
            }
            return [v0, v1];
        }
    }
    return null;
}

/**
 * Calcula la distancia más corta (en metros) desde un punto P a un segmento de línea AB.
 */
export function distanciaPuntoASegmento(
    pLat: number,
    pLng: number,
    aLat: number,
    aLng: number,
    bLat: number,
    bLng: number
): number {
    const latMediaRad = (((aLat + bLat) / 2) * Math.PI) / 180;
    const metrosPorGradoLat = 111132.95;
    const metrosPorGradoLng = 111412.84 * Math.cos(latMediaRad);

    const dx = (bLng - aLng) * metrosPorGradoLng;
    const dy = (bLat - aLat) * metrosPorGradoLat;
    const abLenSq = dx * dx + dy * dy;

    if (abLenSq < 1e-9) {
        return distanciaHaversine(pLat, pLng, aLat, aLng);
    }

    const apX = (pLng - aLng) * metrosPorGradoLng;
    const apY = (pLat - aLat) * metrosPorGradoLat;

    let t = (apX * dx + apY * dy) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    const cLat = aLat + t * (bLat - aLat);
    const cLng = aLng + t * (bLng - aLng);

    return distanciaHaversine(pLat, pLng, cLat, cLng);
}

/**
 * Calcula la distancia mínima en metros desde un punto (lat, lng) a una polilínea de ruta.
 */
export function distanciaPuntoARuta(lat: number, lng: number, coordenadas: any[]): number {
    if (!coordenadas || coordenadas.length === 0) {
        return Infinity;
    }

    const puntos: [number, number][] = [];
    for (const raw of coordenadas) {
        const p = normalizarPunto(raw);
        if (p) puntos.push(p);
    }

    if (puntos.length === 0) return Infinity;
    if (puntos.length === 1) {
        return distanciaHaversine(lat, lng, puntos[0][0], puntos[0][1]);
    }

    let minDist = Infinity;
    for (let i = 0; i < puntos.length - 1; i++) {
        const pA = puntos[i];
        const pB = puntos[i + 1];
        const dist = distanciaPuntoASegmento(lat, lng, pA[0], pA[1], pB[0], pB[1]);
        if (dist < minDist) {
            minDist = dist;
        }
    }

    return minDist;
}

/**
 * Evalúa si un punto se encuentra dentro del rango de tolerancia de una ruta.
 */
export function validarPuntoEnRuta(
    lat: number,
    lng: number,
    coordenadas: any[] | null | undefined,
    toleranciaMetros: number
): { valido: boolean; distancia: number } {
    if (!coordenadas || coordenadas.length < 2) {
        return { valido: true, distancia: 0 }; // Sin ruta definida, se admite libremente
    }

    const distancia = distanciaPuntoARuta(lat, lng, coordenadas);
    const valido = distancia <= toleranciaMetros;
    return { valido, distancia: Math.round(distancia * 10) / 10 };
}
