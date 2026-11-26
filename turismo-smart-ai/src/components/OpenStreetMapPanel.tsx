import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Clock,
  Compass,
  Download,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Ticket,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsMultiRouteUrl,
  buildGoogleMapsViewUrl,
  formatGuaranies,
  type Attraction,
} from '../types/attraction.ts';
import { downloadKmlFile } from '../utils/exportKml.ts';

interface OpenStreetMapPanelProps {
  attractions: Attraction[];
  selectedId: string | null;
  onSelectAttraction: (id: string) => void;
  onOpenDetail: (attraction: Attraction) => void;
}

const ASUNCION_CENTER: [number, number] = [-25.2805, -57.632];

function createMarkerIcon(index: number, isSelected: boolean): L.DivIcon {
  const bg = isSelected ? '#9A3412' : '#1C1917';
  const ring = isSelected ? '#FDBA74' : '#FBF9F5';
  const scale = isSelected ? 'transform: scale(1.14);' : '';

  return L.divIcon({
    className: 'custom-osm-marker',
    html: `<div style="width:32px;height:32px;border-radius:9999px;background:${bg};color:#FBF9F5;border:2.5px solid ${ring};display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;box-shadow:0 4px 12px rgba(28,25,23,0.28);${scale}transition:transform 160ms ease;">${index + 1}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function buildPopupElement(
  item: Attraction,
  onOpenDetail: (attraction: Attraction) => void,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'p-3.5 text-stone-900 max-w-[260px]';

  const kicker = document.createElement('p');
  kicker.className = 'text-[11px] uppercase tracking-wider text-stone-500 font-medium';
  kicker.textContent = item.tipo;

  const title = document.createElement('h4');
  title.className = 'font-serif text-base font-semibold text-stone-900 mt-0.5 leading-snug';
  title.textContent = item.nombre;

  const address = document.createElement('p');
  address.className = 'text-xs text-stone-600 mt-1.5 leading-relaxed';
  address.textContent = item.direccion;

  const meta = document.createElement('p');
  meta.className = 'text-xs font-medium text-amber-900 mt-2 tabular-nums';
  meta.textContent = formatGuaranies(item.costo_entrada);

  const actions = document.createElement('div');
  actions.className = 'mt-3 pt-2.5 border-t border-stone-200 flex items-center gap-2 flex-wrap';

  const gmapsLink = document.createElement('a');
  gmapsLink.href = buildGoogleMapsViewUrl(item.latitud, item.longitud, item.nombre);
  gmapsLink.target = '_blank';
  gmapsLink.rel = 'noopener noreferrer';
  gmapsLink.className =
    'inline-flex items-center gap-1 text-xs font-medium text-blue-900 hover:underline';
  gmapsLink.textContent = 'Ver en Google Maps ↗';

  const detailBtn = document.createElement('button');
  detailBtn.type = 'button';
  detailBtn.className =
    'text-xs font-medium text-stone-700 hover:text-stone-950 underline cursor-pointer';
  detailBtn.textContent = 'Ver ficha';
  detailBtn.addEventListener('click', () => onOpenDetail(item));

  actions.append(gmapsLink, detailBtn);
  wrapper.append(kicker, title, address, meta, actions);
  return wrapper;
}

export function OpenStreetMapPanel({
  attractions,
  selectedId,
  onSelectAttraction,
  onOpenDetail,
}: OpenStreetMapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerByIdRef = useRef<Map<string, L.Marker>>(new Map());

  const selectedAttraction =
    attractions.find((a) => a.id === selectedId) ?? attractions[0] ?? null;

  const multiRouteUrl = buildGoogleMapsMultiRouteUrl(attractions);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: ASUNCION_CENTER,
      zoom: 13,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      markerByIdRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    markerByIdRef.current.clear();

    if (attractions.length === 0) {
      map.setView(ASUNCION_CENTER, 13);
      return;
    }

    const bounds = L.latLngBounds([]);

    attractions.forEach((item, index) => {
      const isSelected = selectedAttraction?.id === item.id;
      const marker = L.marker([item.latitud, item.longitud], {
        icon: createMarkerIcon(index, isSelected),
        zIndexOffset: isSelected ? 500 : 0,
      });

      marker.bindPopup(buildPopupElement(item, onOpenDetail));
      marker.on('click', () => {
        onSelectAttraction(item.id);
      });

      marker.addTo(layerGroup);
      markerByIdRef.current.set(item.id, marker);
      bounds.extend([item.latitud, item.longitud]);
    });

    if (attractions.length === 1) {
      map.setView([attractions[0].latitud, attractions[0].longitud], 15);
    } else if (bounds.isValid() && !selectedId) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
    }
  }, [attractions, selectedId, selectedAttraction?.id, onSelectAttraction, onOpenDetail]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedId) return;

    const target = attractions.find((a) => a.id === selectedId);
    const marker = markerByIdRef.current.get(selectedId);
    if (target) {
      map.flyTo([target.latitud, target.longitud], 15, { duration: 0.5 });
    }
    if (marker && !marker.isPopupOpen()) {
      marker.openPopup();
    }
  }, [selectedId, attractions]);

  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map || attractions.length === 0) return;
    const bounds = L.latLngBounds(
      attractions.map((item) => [item.latitud, item.longitud] as [number, number]),
    );
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col">
      {/* Map Header & Google Maps Bridge Controls */}
      <div className="px-4 py-3.5 border-b border-stone-200 bg-[#F7F4EE] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-semibold text-stone-900">
            Mapa interactivo OpenStreetMap
          </h3>
          <p className="text-xs text-stone-600">
            {attractions.length} ubicaciones visibles · Selecciona un marcador para ver detalles o abrir en Google Maps
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFitAll}
            disabled={attractions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            Encuadrar todos
          </button>

          {multiRouteUrl && (
            <a
              href={multiRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1E3A8A] rounded-lg hover:bg-blue-950 transition-colors whitespace-nowrap shrink-0"
            >
              <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
              Abrir ruta en Google Maps
            </a>
          )}

          <button
            type="button"
            onClick={() => downloadKmlFile(attractions)}
            disabled={attractions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            title="Descarga un archivo KML para importar todas estas ubicaciones en Google My Maps"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Exportar KML (Google Maps)
          </button>
        </div>
      </div>

      {/* Interactive Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-[360px] lg:h-[420px] relative"
        aria-label="Mapa interactivo de sitios turísticos en OpenStreetMap"
      />

      {/* Selected Location Detail Strip + Direct Google Maps Links */}
      {selectedAttraction ? (
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-[#FBF9F5]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="font-medium text-amber-900">{selectedAttraction.tipo}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {selectedAttraction.latitud.toFixed(5)}, {selectedAttraction.longitud.toFixed(5)}
                </span>
              </div>

              <h4 className="font-serif text-xl font-semibold text-stone-900 mt-1">
                {selectedAttraction.nombre}
              </h4>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-stone-700">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{selectedAttraction.direccion}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Ticket className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="font-medium text-stone-900 tabular-nums">
                    {formatGuaranies(selectedAttraction.costo_entrada)}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{selectedAttraction.horarios}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{selectedAttraction.contacto}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-stone-200 flex flex-wrap items-center gap-2.5">
            <a
              href={buildGoogleMapsViewUrl(
                selectedAttraction.latitud,
                selectedAttraction.longitud,
                selectedAttraction.nombre,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#1E3A8A] rounded-lg hover:bg-blue-950 transition-colors whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              Ver en Google Maps
            </a>

            <a
              href={buildGoogleMapsDirectionsUrl(
                selectedAttraction.latitud,
                selectedAttraction.longitud,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
              Cómo llegar en Google Maps
            </a>

            <button
              type="button"
              onClick={() => onOpenDetail(selectedAttraction)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-700 hover:text-stone-950 underline whitespace-nowrap shrink-0 cursor-pointer ml-auto"
            >
              Abrir ficha completa
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 border-t border-stone-200 text-sm text-stone-600">
          No hay ubicaciones que coincidan con los filtros actuales.
        </div>
      )}
    </div>
  );
}
