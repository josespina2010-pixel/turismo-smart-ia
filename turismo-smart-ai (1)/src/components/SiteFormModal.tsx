import L from 'leaflet';
import { MapPin, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  TOURISM_CATEGORIES,
  type TourismCategory,
  type TourismSite,
  type TourismSiteInput,
} from '../types/tourism.ts';

interface SiteFormModalProps {
  isOpen: boolean;
  editingSite: TourismSite | null;
  onClose: () => void;
  onSubmit: (payload: TourismSiteInput, editingId?: string) => Promise<void>;
}

const DEFAULT_COORDS = { lat: -25.2805, lng: -57.6345 };

export function SiteFormModal({
  isOpen,
  editingSite,
  onClose,
  onSubmit,
}: SiteFormModalProps) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TourismCategory>('Museo');
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [contacto, setContacto] = useState('');
  const [horarios, setHorarios] = useState('');
  const [costoEntrada, setCostoEntrada] = useState('0');
  const [actividadesText, setActividadesText] = useState('');
  const [latitud, setLatitud] = useState(String(DEFAULT_COORDS.lat));
  const [longitud, setLongitud] = useState(String(DEFAULT_COORDS.lng));
  const [imagenUrl, setImagenUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pickerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingSite) {
      setNombre(editingSite.nombre);
      setTipo(editingSite.tipo);
      setDescripcion(editingSite.descripcion);
      setDireccion(editingSite.direccion);
      setContacto(editingSite.contacto);
      setHorarios(editingSite.horarios);
      setCostoEntrada(String(editingSite.costo_entrada));
      setActividadesText(editingSite.actividades.join(', '));
      setLatitud(String(editingSite.latitud));
      setLongitud(String(editingSite.longitud));
      setImagenUrl(editingSite.imagen_url || '');
    } else {
      setNombre('');
      setTipo('Museo');
      setDescripcion('');
      setDireccion('');
      setContacto('');
      setHorarios('');
      setCostoEntrada('0');
      setActividadesText('');
      setLatitud(String(DEFAULT_COORDS.lat));
      setLongitud(String(DEFAULT_COORDS.lng));
      setImagenUrl('');
    }
    setErrorMsg(null);
  }, [isOpen, editingSite]);

  // Mini OpenStreetMap coordinate picker
  useEffect(() => {
    if (!isOpen || !pickerRef.current) return;

    const initLat = Number(latitud) || DEFAULT_COORDS.lat;
    const initLng = Number(longitud) || DEFAULT_COORDS.lng;

    const map = L.map(pickerRef.current, {
      center: [initLat, initLng],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.circleMarker([initLat, initLng], {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: '#1E3A8A',
      fillOpacity: 1,
    }).addTo(map);

    map.on('click', (ev: L.LeafletMouseEvent) => {
      const nextLat = Number(ev.latlng.lat.toFixed(6));
      const nextLng = Number(ev.latlng.lng.toFixed(6));
      setLatitud(String(nextLat));
      setLongitud(String(nextLng));
      marker.setLatLng([nextLat, nextLng]);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen]);

  // Sync marker when user edits coordinate inputs manually
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const lat = Number(latitud);
    const lng = Number(longitud);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      marker.setLatLng([lat, lng]);
    }
  }, [latitud, longitud]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedLat = Number(latitud);
    const parsedLng = Number(longitud);
    const parsedCost = Number(costoEntrada);

    if (!nombre.trim() || !direccion.trim() || !contacto.trim() || !horarios.trim()) {
      setErrorMsg('Completa todos los campos obligatorios.');
      return;
    }
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      setErrorMsg('Las coordenadas de latitud y longitud deben ser números válidos.');
      return;
    }
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setErrorMsg('El costo de entrada debe ser un valor mayor o igual a 0 Gs.');
      return;
    }

    const actividades = actividadesText
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    if (actividades.length === 0) {
      setErrorMsg('Ingresa al menos una actividad separada por comas.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(
        {
          nombre: nombre.trim(),
          tipo,
          descripcion: descripcion.trim(),
          direccion: direccion.trim(),
          contacto: contacto.trim(),
          horarios: horarios.trim(),
          costo_entrada: Math.round(parsedCost),
          actividades,
          latitud: Number(parsedLat.toFixed(6)),
          longitud: Number(parsedLng.toFixed(6)),
          imagen_url: imagenUrl.trim() || null,
        },
        editingSite?.id
      );
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo guardar el registro.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-site-title"
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 id="modal-site-title" className="font-display text-xl font-semibold text-slate-900">
              {editingSite ? 'Modificar sitio turístico' : 'Registrar nuevo sitio turístico'}
            </h2>
            <p className="text-xs text-slate-500">
              Los cambios se guardan en la base de datos y se actualizan en OpenStreetMap y el asistente IA.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {errorMsg && (
            <div
              role="alert"
              className="border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
            >
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Nombre del sitio o museo *
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Museo Ferroviario Estación Central"
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Tipo de atractivo *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TourismCategory)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-900 focus:outline-none"
              >
                {TOURISM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Descripción cultural o reseña
            </label>
            <textarea
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Breve reseña histórica, arquitectónica o cultural del atractivo..."
              className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Dirección *</label>
              <input
                type="text"
                required
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej. Eligio Ayala y México, Asunción"
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Contacto (teléfono o correo) *
              </label>
              <input
                type="text"
                required
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="Ej. +595 21 447 848"
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Horarios *</label>
              <input
                type="text"
                required
                value={horarios}
                onChange={(e) => setHorarios(e.target.value)}
                placeholder="Ej. Martes a Domingo · 09:00 a 17:00"
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Costo de entrada en Gs. (0 = Gratis) *
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                required
                value={costoEntrada}
                onChange={(e) => setCostoEntrada(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-blue-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Actividades (separadas por coma) *
            </label>
            <input
              type="text"
              required
              value={actividadesText}
              onChange={(e) => setActividadesText(e.target.value)}
              placeholder="Ej. Visita guiada, Exhibición fotográfica, Taller infantil"
              className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-900 focus:outline-none"
            />
          </div>

          {/* Selector de ubicación en OpenStreetMap */}
          <div className="border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <MapPin className="h-3.5 w-3.5 text-blue-900" aria-hidden="true" />
                <span>Ubicación geográfica (haz clic en OpenStreetMap para marcar)</span>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-slate-500">
                {Number(latitud || 0).toFixed(5)}, {Number(longitud || 0).toFixed(5)}
              </span>
            </div>

            <div ref={pickerRef} className="mt-3 h-48 w-full border border-slate-200" />

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600">Latitud *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={latitud}
                  onChange={(e) => setLatitud(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs tabular-nums text-slate-900 focus:border-blue-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600">Longitud *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={longitud}
                  onChange={(e) => setLongitud(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs tabular-nums text-slate-900 focus:border-blue-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600">
                  URL de imagen (opcional)
                </label>
                <input
                  type="text"
                  value={imagenUrl}
                  onChange={(e) => setImagenUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-900 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-950 disabled:opacity-50"
            >
              {submitting
                ? 'Guardando...'
                : editingSite
                  ? 'Guardar cambios'
                  : 'Registrar sitio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
