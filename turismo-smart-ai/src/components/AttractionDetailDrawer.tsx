import {
  Clock,
  Edit3,
  ExternalLink,
  Landmark,
  MapPin,
  Navigation,
  Phone,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsViewUrl,
  formatGuaranies,
  type Attraction,
} from '../types/attraction.ts';

interface AttractionDetailDrawerProps {
  attraction: Attraction | null;
  onClose: () => void;
  onEdit: (attraction: Attraction) => void;
  onDelete: (id: string) => Promise<void>;
  onFocusMap: (id: string) => void;
}

export function AttractionDetailDrawer({
  attraction,
  onClose,
  onEdit,
  onDelete,
  onFocusMap,
}: AttractionDetailDrawerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!attraction) return null;

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(attraction.id);
      setConfirmDelete(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-drawer-title"
    >
      <div className="bg-[#FBF9F5] border border-stone-300 rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 z-10 bg-[#FBF9F5] border-b border-stone-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-stone-500 truncate">
              Ficha patrimonial · {attraction.tipo}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(false);
              onClose();
            }}
            className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 cursor-pointer shrink-0"
            aria-label="Cerrar ficha"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Editorial Media Frame with Zero-Broken-Image Fallback */}
          <div className="aspect-[16/9] w-full rounded-lg overflow-hidden border border-stone-200 bg-[#EBE6DF]">
            {attraction.imagen_url && !imgError ? (
              <img
                src={attraction.imagen_url}
                alt={attraction.nombre}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#EFEAE1] to-[#E3DBD0]">
                <Landmark className="w-10 h-10 text-amber-900/70 mb-2" aria-hidden="true" />
                <p className="font-serif text-lg text-stone-800">{attraction.nombre}</p>
                <p className="text-xs text-stone-600 mt-1">{attraction.tipo}</p>
              </div>
            )}
          </div>

          <div>
            <h2
              id="detail-drawer-title"
              className="font-serif text-3xl font-semibold text-stone-900 leading-tight"
            >
              {attraction.nombre}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-stone-700 leading-relaxed max-w-prose">
              {attraction.descripcion}
            </p>
          </div>

          {/* Museum Accession-Style Definition List */}
          <dl className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
            <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
              <dt className="text-xs uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
                Costo de entrada
              </dt>
              <dd className="sm:col-span-2 font-medium text-stone-900 tabular-nums">
                {formatGuaranies(attraction.costo_entrada)}
              </dd>
            </div>

            <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
              <dt className="text-xs uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Horarios
              </dt>
              <dd className="sm:col-span-2 text-stone-800">{attraction.horarios}</dd>
            </div>

            <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
              <dt className="text-xs uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                Dirección
              </dt>
              <dd className="sm:col-span-2 text-stone-800">{attraction.direccion}</dd>
            </div>

            <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
              <dt className="text-xs uppercase tracking-wider text-stone-500">
                Actividades
              </dt>
              <dd className="sm:col-span-2 text-stone-800 leading-relaxed">
                {attraction.actividades}
              </dd>
            </div>

            <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
              <dt className="text-xs uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                Contacto
              </dt>
              <dd className="sm:col-span-2 text-stone-800">{attraction.contacto}</dd>
            </div>

            <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
              <dt className="text-xs uppercase tracking-wider text-stone-500">
                Coordenadas
              </dt>
              <dd className="sm:col-span-2 font-mono text-xs tabular-nums text-stone-700">
                Lat {attraction.latitud.toFixed(6)} · Lng {attraction.longitud.toFixed(6)}
              </dd>
            </div>
          </dl>

          {/* Google Maps & Map Focus Bridge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={buildGoogleMapsViewUrl(
                attraction.latitud,
                attraction.longitud,
                attraction.nombre,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1E3A8A] rounded-lg hover:bg-blue-950 transition-colors whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              Ver en Google Maps
            </a>

            <a
              href={buildGoogleMapsDirectionsUrl(
                attraction.latitud,
                attraction.longitud,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
              Cómo llegar (Google Maps)
            </a>

            <button
              type="button"
              onClick={() => {
                onFocusMap(attraction.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              Ubicar en OpenStreetMap
            </button>
          </div>

          {/* CRUD Management Controls */}
          <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(attraction);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
              Modificar registro
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Eliminar del catálogo
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-900 font-medium">
                  ¿Confirmar eliminación?
                </span>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-60 cursor-pointer"
                >
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
