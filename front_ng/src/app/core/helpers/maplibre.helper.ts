import * as maplibregl from 'maplibre-gl';
import { normalizarPunto } from './geo.helper';

export { normalizarPunto } from './geo.helper';

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

/**
 * Dibuja o actualiza una ruta en una instancia de MapLibre con capas estilizadas de buffer y línea principal.
 */
export function dibujarRutaEnMapa(
    map: maplibregl.Map,
    coordenadas: [number, number][],
    color: string = '#e11d48',
    sourceId: string = 'ruta-oficial-source'
): void {
    if (!map || !coordenadas || coordenadas.length < 2) return;

    const ejecutarDibujo = () => {
        try {
            if (!map.isStyleLoaded()) {
                map.once('styledata', ejecutarDibujo);
                return;
            }
        } catch {
            return;
        }

        // Normalizar a coordenadas GeoJSON [lng, lat]
        const geoJsonCoords: [number, number][] = [];
        for (const c of coordenadas) {
            const p = normalizarPunto(c);
            if (p) {
                geoJsonCoords.push([p[1], p[0]]); // [lng, lat]
            }
        }

        if (geoJsonCoords.length < 2) return;

        const geojsonData: any = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: geoJsonCoords
            }
        };

        const existingSource = map.getSource(sourceId) as maplibregl.GeoJSONSource;
        if (existingSource) {
            existingSource.setData(geojsonData);
        } else {
            map.addSource(sourceId, {
                type: 'geojson',
                data: geojsonData
            });

            // Capa de halo / buffer de tolerancia
            if (!map.getLayer(`${sourceId}-buffer`)) {
                map.addLayer({
                    id: `${sourceId}-buffer`,
                    type: 'line',
                    source: sourceId,
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': color,
                        'line-opacity': 0.32,
                        'line-width': 26
                    }
                });
            }

            // Capa de línea sólida principal
            if (!map.getLayer(`${sourceId}-line`)) {
                map.addLayer({
                    id: `${sourceId}-line`,
                    type: 'line',
                    source: sourceId,
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': color,
                        'line-width': 5.5,
                        'line-opacity': 0.95
                    }
                });
            }

            // Capa de línea central punteada blanca de pista
            if (!map.getLayer(`${sourceId}-dash`)) {
                map.addLayer({
                    id: `${sourceId}-dash`,
                    type: 'line',
                    source: sourceId,
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': '#ffffff',
                        'line-width': 2,
                        'line-dasharray': [2, 2]
                    }
                });
            }
        }
    };

    if (map.isStyleLoaded()) {
        ejecutarDibujo();
    } else {
        map.once('styledata', ejecutarDibujo);
    }
}

/**
 * Elimina las capas y fuente de una ruta en MapLibre.
 */
export function removerRutaDeMapa(map: maplibregl.Map, sourceId: string = 'ruta-oficial-source'): void {
    if (!map) return;
    try {
        if (!map.isStyleLoaded()) return;
        [`${sourceId}-dash`, `${sourceId}-line`, `${sourceId}-buffer`].forEach((layerId) => {
            if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
            }
        });
        if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
        }
    } catch {
        // Ignorar si el estilo está en transición o recargándose
    }
}
