export const ATTRACTION_TYPES = [
  'Museo',
  'Sitio Histórico',
  'Espacio Cultural',
  'Mirador y Paseo',
  'Naturaleza y Parque',
] as const;

export type AttractionType = (typeof ATTRACTION_TYPES)[number];

export interface Attraction {
  id: string;
  nombre: string;
  tipo: AttractionType;
  descripcion: string;
  direccion: string;
  contacto: string;
  latitud: number;
  longitud: number;
  actividades: string;
  horarios: string;
  costo_entrada: number;
  imagen_url?: string;
  created_at?: string;
}

export type AttractionInput = Omit<Attraction, 'id' | 'created_at'>;

export interface ConfigStatus {
  storageMode: 'supabase' | 'local';
  supabaseConfigured: boolean;
  geminiConfigured: boolean;
  totalAttractions: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  referencedIds?: string[];
  timestamp: string;
}

export function formatGuaranies(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Entrada gratuita';
  }
  return `${new Intl.NumberFormat('es-PY').format(Math.round(amount))} Gs.`;
}

export function buildGoogleMapsViewUrl(lat: number, lng: number, label?: string): string {
  const query = label ? `${lat},${lng} (${label})` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function buildGoogleMapsMultiRouteUrl(attractions: Attraction[]): string | null {
  if (attractions.length === 0) return null;
  if (attractions.length === 1) {
    return buildGoogleMapsDirectionsUrl(attractions[0].latitud, attractions[0].longitud);
  }
  const stops = attractions
    .slice(0, 10)
    .map((item) => `${item.latitud},${item.longitud}`)
    .join('/');
  return `https://www.google.com/maps/dir/${stops}`;
}
