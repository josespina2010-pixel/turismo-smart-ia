import L from 'leaflet';
import {
  Clock,
  Download,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Route,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { TourismSite } from '../types/tourism.ts';
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsPlaceUrl,
  buildGoogleMapsRouteUrl,
  downloadSitesAsGeoJson,
  downloadSitesAsKml,
  formatGuaranies,
} from '../utils/maps.ts';

interface TourismMapProps {
  sites: TourismSite[];
  selectedSite: TourismSite | null;
  onSelectSite: (site: TourismSite) => void;
  routeSiteIds: string[];
  onToggleRouteSite: (siteId: string) => void;
  onClearRoute: () => void;
  heightClass?: string;
}

const ASUNCION_CENTER: [number, number] = [-25.2805, -57.628];

export function TourismMap({
  sites,
  selectedSite,
  onSelectSite,
  routeSiteIds,
  onToggleRouteSite,
  onClearRoute,
  heightClass = 'h-[420px] lg:h-[520px]',
}: TourismMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: ASUNCION_CENTER,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Re-render markers whenever sites, selectedSite, or routeSiteIds change
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    sites.forEach((site, idx) => {
      const isSelected = selectedSite?.id === site.id;
      const inRoute = routeSiteIds.includes(site.id);

      const bgColor = isSelected ? '#1E3A8A' : inRoute ? '#14532D' : '#0F172A';
      const ring = isSelected
        ? '0 0 0 4px rgba(30, 58, 138, 0.25)'
        : inRoute
          ? '0 0 0 3px rgba(20, 83, 45, 0.22)'
          : '0 2px 8px rgba(15, 23, 42, 0.25)';

      const icon = L.divIcon({
        className: 'osm-custom-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        html: `<div style="width:30px;height:30px;border-radius:9999px;background:${bgColor};color:#ffffff;border:2px solid #ffffff;box-shadow:${ring};display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;cursor:pointer;">${idx + 1}</div>`,
      });

      const marker = L.marker([site.latitud, site.longitud], { icon });
      marker.bindTooltip(site.nombre, {
        direction: 'top',
        offset: [0, -14],
      });
      marker.on('click', () => {
        onSelectSite(site);
      });
      marker.addTo(group);
    });

    // Draw polyline if at least 2 sites are in the Google Maps route tray
    const routeSites = routeSiteIds
      .map((id) => sites.find((s) => s.id === id))
      .filter((s): s is TourismSite => Boolean(s));

    if (routeSites.length >= 2) {
      L.polyline(
        routeSites.map((s) => [s.latitud, s.longitud] as [number, number]),
        {
          color: '#1E3A8A',
          weight: 3,
          dashArray: '6 6',
          opacity: 0.85,
        }
      ).addTo(group);
    }
  }, [sites, selectedSite, routeSiteIds, onSelectSite]);

  // Center map smoothly when selectedSite changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSite) return;
    map.flyTo([selectedSite.latitud, selectedSite.longitud], 15, {
      duration: 0.6,
    });
  }, [selectedSite]);

  const routeSites = routeSiteIds
    .map((id) => sites.find((s) => s.id === id))
    .filter((s): s is TourismSite => Boolean(s));

  const targetExportSites = routeSites.length > 0 ? routeSites : sites;
  const multiRouteUrl = buildGoogleMapsRouteUrl(targetExportSites);

  const handleFitAll = () => {
    const map = mapRef.current;
    if (!map || sites.length === 0) return;
    const bounds = L.latLngBounds(sites.map((s) => [s.latitud, s.longitud] as [number, number]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
  };

  return (
    <div className="flex flex-col border border-slate-200 bg-white">
      {/* Barra superior del mapa OpenStreetMap + Exportación a Google Maps */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900">
            Mapa interactivo OpenStreetMap
          </h3>
          <p className="text-xs text-slate-500">
            {sites.length} ubicaciones visibles · Selecciona un marcador para ver detalles o pasar a Google Maps
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFitAll}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Ver todos</span>
          </button>

          {multiRouteUrl && (
            <a
              href={multiRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-950 whitespace-nowrap shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {routeSites.length > 0
                  ? `Abrir ruta (${routeSites.length}) en Google Maps`
                  : 'Pasar visibles a Google Maps'}
              </span>
            </a>
          )}

          <button
            type="button"
            onClick={() => downloadSitesAsKml(targetExportSites)}
            disabled={targetExportSites.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 whitespace-nowrap shrink-0"
            title="Descargar archivo KML compatible con Google My Maps"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Exportar KML</span>
          </button>

          <button
            type="button"
            onClick={() => downloadSitesAsGeoJson(targetExportSites)}
            disabled={targetExportSites.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 whitespace-nowrap shrink-0"
            title="Descargar coordenadas en formato GeoJSON"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>GeoJSON</span>
          </button>
        </div>
      </div>

      {/* Contenedor del mapa Leaflet */}
      <div className="relative">
        <div ref={containerRef} className={`w-full ${heightClass}`} />
        {routeSites.length > 0 && (
          <div className="border-t border-slate-200 bg-emerald-950/5 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-medium">
              <Route className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Ruta armada para Google Maps ({routeSites.length}{' '}
                {routeSites.length === 1 ? 'parada' : 'paradas'}):{' '}
                {routeSites.map((s) => s.nombre).join(' → ')}
              </span>
            </div>
            <button
              type="button"
              onClick={onClearRoute}
              className="text-slate-600 underline hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              Limpiar ruta
            </button>
          </div>
        )}
      </div>

      {/* Ficha del marcador seleccionado */}
      {selectedSite ? (
        <div className="border-t border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-blue-900">{selectedSite.tipo}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums font-medium text-slate-800">
                  {formatGuaranies(selectedSite.costo_entrada)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-500">
                  {selectedSite.latitud.toFixed(5)}, {selectedSite.longitud.toFixed(5)}
                </span>
              </div>
              <h4 className="mt-1 font-display text-xl font-semibold text-slate-900">
                {selectedSite.nombre}
              </h4>
              {selectedSite.descripcion && (
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {selectedSite.descripcion}
                </p>
              )}
            </div>

            {/* Acciones directas hacia Google Maps */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={buildGoogleMapsPlaceUrl(selectedSite)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-950 whitespace-nowrap shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ver en Google Maps</span>
              </a>
              <a
                href={buildGoogleMapsDirectionsUrl(selectedSite)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cómo llegar</span>
              </a>
              <button
                type="button"
                onClick={() => onToggleRouteSite(selectedSite.id)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  routeSiteIds.includes(selectedSite.id)
                    ? 'border-emerald-800 bg-emerald-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Route className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {routeSiteIds.includes(selectedSite.id) ? 'En ruta' : 'Sumar a ruta'}
                </span>
              </button>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <div>
                <dt className="font-medium text-slate-500">Dirección</dt>
                <dd className="mt-0.5 text-slate-800">{selectedSite.direccion}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <div>
                <dt className="font-medium text-slate-500">Horarios</dt>
                <dd className="mt-0.5 text-slate-800">{selectedSite.horarios}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <div>
                <dt className="font-medium text-slate-500">Contacto</dt>
                <dd className="mt-0.5 text-slate-800">{selectedSite.contacto}</dd>
              </div>
            </div>
          </dl>

          {selectedSite.actividades.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <span className="font-medium text-slate-500">Actividades: </span>
              <span>{selectedSite.actividades.join(' · ')}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-4 text-xs text-slate-500">
          Haz clic en cualquier marcador numerado del mapa OpenStreetMap para inspeccionar su ficha completa o abrir la ubicación en Google Maps.
        </div>
      )}
    </div>
  );
}
