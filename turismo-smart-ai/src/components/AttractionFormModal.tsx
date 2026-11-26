import L from 'leaflet';
import { MapPin, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ATTRACTION_TYPES,
  type Attraction,
  type AttractionInput,
} from '../types/attraction.ts';

interface AttractionFormModalProps {
  isOpen: boolean;
  editingAttraction: Attraction | null;
  onClose: () => void;
  onSave: (payload: AttractionInput, editingId?: string) => Promise<void>;
}

const DEFAULT_FORM: AttractionInput = {
  nombre: '',
  tipo: 'Museo',
  descripcion: '',
  direccion: '',
  contacto: '',
  latitud: -25.2808,
  longitud: -57.6345,
  actividades: '',
  horarios: '',
  costo_entrada: 0,
  imagen_url: '',
};

export function AttractionFormModal({
  isOpen,
  editingAttraction,
  onClose,
  onSave,
}: AttractionFormModalProps) {
  const [form, setForm] = useState<AttractionInput>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickerMapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingAttraction) {
      setForm({
        nombre: editingAttraction.nombre,
        tipo: editingAttraction.tipo,
        descripcion: editingAttraction.descripcion,
        direccion: editingAttraction.direccion,
        contacto: editingAttraction.contacto,
        latitud: editingAttraction.latitud,
        longitud: editingAttraction.longitud,
        actividades: editingAttraction.actividades,
        horarios: editingAttraction.horarios,
        costo_entrada: editingAttraction.costo_entrada,
        imagen_url: editingAttraction.imagen_url ?? '',
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [isOpen, editingAttraction]);

  useEffect(() => {
    if (!isOpen || !pickerMapRef.current) return;

    const initialLat = editingAttraction?.latitud ?? DEFAULT_FORM.latitud;
    const initialLng = editingAttraction?.longitud ?? DEFAULT_FORM.longitud;

    const map = L.map(pickerMapRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'picker-osm-pin',
      html: `<div style="width:22px;height:22px;border-radius:9999px;background:#9A3412;border:3px solid #FBF9F5;box-shadow:0 3px 10px rgba(0,0,0,0.35);"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const marker = L.marker([initialLat, initialLng], { icon: pinIcon }).addTo(map);

    map.on('click', (event: L.LeafletMouseEvent) => {
      const lat = Number(event.latlng.lat.toFixed(6));
      const lng = Number(event.latlng.lng.toFixed(6));
      marker.setLatLng([lat, lng]);
      setForm((prev) => ({ ...prev, latitud: lat, longitud: lng }));
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen, editingAttraction]);

  useEffect(() => {
    if (markerRef.current && Number.isFinite(form.latitud) && Number.isFinite(form.longitud)) {
      markerRef.current.setLatLng([form.latitud, form.longitud]);
    }
  }, [form.latitud, form.longitud]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSave(form, editingAttraction?.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar el registro.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attraction-form-title"
    >
      <div className="bg-[#FBF9F5] border border-stone-300 rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 z-10 bg-[#FBF9F5] border-b border-stone-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-stone-500">
              Gestión de catálogo
            </p>
            <h2
              id="attraction-form-title"
              className="font-serif text-2xl font-semibold text-stone-900"
            >
              {editingAttraction ? 'Editar atractivo turístico' : 'Registrar nuevo atractivo'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 cursor-pointer"
            aria-label="Cerrar formulario"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-900">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="attr-nombre"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Nombre del lugar *
              </label>
              <input
                id="attr-nombre"
                type="text"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Museo Nacional de Bellas Artes"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900/30 focus:border-amber-900"
              />
            </div>

            <div>
              <label
                htmlFor="attr-tipo"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Tipo de atractivo *
              </label>
              <select
                id="attr-tipo"
                value={form.tipo}
                onChange={(e) =>
                  setForm({ ...form, tipo: e.target.value as Attraction['tipo'] })
                }
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900/30 focus:border-amber-900"
              >
                {ATTRACTION_TYPES.map((typeOption) => (
                  <option key={typeOption} value={typeOption}>
                    {typeOption}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="attr-descripcion"
              className="block text-xs font-medium text-stone-700 mb-1.5"
            >
              Descripción curatorial *
            </label>
            <textarea
              id="attr-descripcion"
              required
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Reseña histórica, valor cultural y colección principal del sitio..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900/30 focus:border-amber-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="attr-direccion"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Dirección *
              </label>
              <input
                id="attr-direccion"
                type="text"
                required
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Ej: Eligio Ayala 1345, Asunción"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900/30 focus:border-amber-900"
              />
            </div>

            <div>
              <label
                htmlFor="attr-contacto"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Contacto (teléfono / web) *
              </label>
              <input
                id="attr-contacto"
                type="text"
                required
                value={form.contacto}
                onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                placeholder="Ej: +595 21 211 578"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900/30 focus:border-amber-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="attr-horarios"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Horarios de atención *
              </label>
              <input
                id="attr-horarios"
                type="text"
                required
                value={form.horarios}
                onChange={(e) => setForm({ ...form, horarios: e.target.value })}
                placeholder="Ej: Martes a Sábado de 09:00 a 17:00 hs"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900/30 focus:border-amber-900"
              />
            </div>

            <div>
              <label
                htmlFor="attr-costo"
                className="block text-xs font-medium text-stone-700 mb-1.5"
              >
                Costo de entrada (en Guaraníes Gs.) *
              </label>
              <input
                id="attr-costo"
                type="number"
                min={0}
                step={1000}
                required
                value={form.costo_entrada}
                onChange={(e) =>
                  setForm({ ...form, costo_entrada: Number(e.target.value) || 0 })
                }
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900/30 focus:border-amber-900"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Ingresa 0 si el acceso es gratuito.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="attr-actividades"
              className="block text-xs font-medium text-stone-700 mb-1.5"
            >
              Actividades disponibles *
            </label>
            <input
              id="attr-actividades"
              type="text"
              required
              value={form.actividades}
              onChange={(e) => setForm({ ...form, actividades: e.target.value })}
              placeholder="Ej: Recorrido guiado, Exposiciones temporales, Talleres culturales"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900/30 focus:border-amber-900"
            />
          </div>

          {/* Interactive OpenStreetMap Coordinate Picker */}
          <div className="border border-stone-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-medium text-stone-800">
                <MapPin className="w-4 h-4 text-amber-900" aria-hidden="true" />
                <span>Ubicación en OpenStreetMap (haz clic en el mapa para ajustar)</span>
              </div>
              <span className="text-xs font-mono tabular-nums text-stone-500">
                {form.latitud.toFixed(6)}, {form.longitud.toFixed(6)}
              </span>
            </div>

            <div
              ref={pickerMapRef}
              className="w-full h-48 rounded-lg overflow-hidden border border-stone-200"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="attr-lat"
                  className="block text-[11px] font-medium text-stone-600 mb-1"
                >
                  Latitud *
                </label>
                <input
                  id="attr-lat"
                  type="number"
                  step="0.000001"
                  required
                  value={form.latitud}
                  onChange={(e) =>
                    setForm({ ...form, latitud: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label
                  htmlFor="attr-lng"
                  className="block text-[11px] font-medium text-stone-600 mb-1"
                >
                  Longitud *
                </label>
                <input
                  id="attr-lng"
                  type="number"
                  step="0.000001"
                  required
                  value={form.longitud}
                  onChange={(e) =>
                    setForm({ ...form, longitud: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-amber-900 rounded-lg hover:bg-amber-950 disabled:opacity-60 cursor-pointer"
            >
              {submitting
                ? 'Guardando...'
                : editingAttraction
                  ? 'Guardar cambios'
                  : 'Registrar atractivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
