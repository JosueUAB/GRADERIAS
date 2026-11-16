import * as maplibregl from 'maplibre-gl';

let workerConfigured = false;

/**
 * URLs de estilos vectoriales de OpenFreeMap (100% libres, sin API key)
 */
export const ESTILO_VECTOR_CLARO = 'https://tiles.openfreemap.org/styles/liberty';
export const ESTILO_VECTOR_OSCURO = 'https://tiles.openfreemap.org/styles/dark';

/**
 * Estilo Raster OpenStreetMap Estándar
 * 100% Libre (Fundación OpenStreetMap), sin API keys, sin cuotas y sin marcas de agua.
 */
export const ESTILO_RASTER_OSM: any = {
    version: 8,
    sources: {
        'osm-tiles': {
            type: 'raster',
            tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
        }
    },
    layers: [
        {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
        }
    ]
};

export type ModoEstiloMapa = 'vector' | 'raster';

/**
 * Resuelve el estilo de mapa según el modo oscuro o claro y el tipo (vector o raster).
 * Ambos estilos son 100% libres de API keys y nunca muestran advertencias de pago ni marcas de agua.
 */
export function resolverEstiloMapa(isDark: boolean, modo: ModoEstiloMapa = 'vector'): any {
    if (modo === 'raster') {
        return ESTILO_RASTER_OSM;
    }
    return isDark ? ESTILO_VECTOR_OSCURO : ESTILO_VECTOR_CLARO;
}

/**
 * Configura la URL del Web Worker de MapLibre GL JS v6+.
 */
export function configurarMapLibreWorker(): void {
    if (workerConfigured || typeof window === 'undefined') return;

    try {
        const workerUrl = `${window.location.origin}/maplibre-gl-worker.mjs`;
        maplibregl.setWorkerUrl(workerUrl);
        workerConfigured = true;
    } catch {
        try {
            maplibregl.setWorkerUrl('https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl-worker.mjs');
            workerConfigured = true;
        } catch {
            // Ignorar
        }
    }
}
