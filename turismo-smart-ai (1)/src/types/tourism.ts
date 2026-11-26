export const TOURISM_CATEGORIES = [
  'Museo',
  'Sitio Histórico',
  'Espacio Cultural',
  'Parque y Naturaleza',
  'Gastronomía y Mercado',
] as const;

export type TourismCategory = (typeof TOURISM_CATEGORIES)[number];

export interface TourismSite {
  id: string;
  nombre: string;
  tipo: TourismCategory;
  descripcion: string;
  direccion: string;
  contacto: string;
  latitud: number;
  longitud: number;
  actividades: string[];
  horarios: string;
  costo_entrada: number;
  imagen_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type TourismSiteInput = Omit<TourismSite, 'id' | 'created_at' | 'updated_at'>;

export interface SystemHealthStatus {
  databaseMode: 'supabase' | 'local';
  supabaseConfigured: boolean;
  supabaseReachable: boolean;
  geminiConfigured: boolean;
  totalSites: number;
  detail?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  recommendedSiteIds?: string[];
  suggestedGoogleMapsRoute?: boolean;
  timestamp: string;
}
