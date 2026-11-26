import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  TOURISM_CATEGORIES,
  type SystemHealthStatus,
  type TourismCategory,
  type TourismSite,
  type TourismSiteInput,
} from '../src/types/tourism.ts';
import { INITIAL_TOURISM_SITES } from './seedData.ts';

const TABLE_NAME = 'sitios_turisticos';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_FILE = path.join(DATA_DIR, 'sitios.json');

export interface SiteFilterOptions {
  search?: string;
  tipo?: string;
  maxCost?: number | null;
}

function getSupabaseCredentials(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
  } catch {
    return null;
  }
  return { url, key };
}

function createSupabaseServerClient(): SupabaseClient | null {
  const creds = getSupabaseCredentials();
  if (!creds) return null;
  return createClient(creds.url, creds.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeSiteRow(row: Record<string, unknown>): TourismSite {
  const rawActividades = row.actividades;
  const actividades = Array.isArray(rawActividades)
    ? rawActividades.map((item) => String(item).trim()).filter(Boolean)
    : typeof rawActividades === 'string'
      ? rawActividades
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  return {
    id: String(row.id),
    nombre: String(row.nombre ?? ''),
    tipo: (TOURISM_CATEGORIES.includes(row.tipo as TourismCategory)
      ? row.tipo
      : 'Espacio Cultural') as TourismCategory,
    descripcion: String(row.descripcion ?? ''),
    direccion: String(row.direccion ?? ''),
    contacto: String(row.contacto ?? ''),
    latitud: Number(row.latitud),
    longitud: Number(row.longitud),
    actividades,
    horarios: String(row.horarios ?? ''),
    costo_entrada: Math.max(0, Math.round(Number(row.costo_entrada ?? 0))),
    imagen_url: row.imagen_url ? String(row.imagen_url) : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function ensureLocalStore(): TourismSite[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_FILE)) {
    const now = new Date().toISOString();
    const seeded = INITIAL_TOURISM_SITES.map((site) => ({
      ...site,
      created_at: now,
      updated_at: now,
    }));
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(seeded, null, 2), 'utf8');
    return seeded;
  }
  const raw = fs.readFileSync(LOCAL_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => normalizeSiteRow(item));
    }
  } catch {
    // Re-seed if corrupted
  }
  const fallback = INITIAL_TOURISM_SITES;
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(fallback, null, 2), 'utf8');
  return fallback;
}

function writeLocalStore(sites: TourismSite[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(sites, null, 2), 'utf8');
}

function applyFilters(sites: TourismSite[], filters: SiteFilterOptions): TourismSite[] {
  const search = (filters.search || '').trim().toLowerCase();
  const tipo = (filters.tipo || '').trim();
  const maxCost =
    filters.maxCost !== undefined && filters.maxCost !== null && !Number.isNaN(filters.maxCost)
      ? filters.maxCost
      : null;

  return sites.filter((site) => {
    if (tipo && tipo !== 'Todos' && site.tipo !== tipo) {
      return false;
    }
    if (maxCost !== null && site.costo_entrada > maxCost) {
      return false;
    }
    if (search) {
      const haystack = [
        site.nombre,
        site.tipo,
        site.descripcion,
        site.direccion,
        site.horarios,
        ...site.actividades,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

export function validateSitePayload(raw: unknown): { data?: TourismSiteInput; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Datos inválidos en la solicitud.' };
  }
  const body = raw as Record<string, unknown>;

  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const tipo = typeof body.tipo === 'string' ? body.tipo.trim() : '';
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
  const direccion = typeof body.direccion === 'string' ? body.direccion.trim() : '';
  const contacto = typeof body.contacto === 'string' ? body.contacto.trim() : '';
  const horarios = typeof body.horarios === 'string' ? body.horarios.trim() : '';
  const latitud = Number(body.latitud);
  const longitud = Number(body.longitud);
  const costo = Number(body.costo_entrada ?? 0);

  if (nombre.length < 2 || nombre.length > 160) {
    return { error: 'El nombre debe tener entre 2 y 160 caracteres.' };
  }
  if (!TOURISM_CATEGORIES.includes(tipo as TourismCategory)) {
    return { error: 'La categoría seleccionada no es válida.' };
  }
  if (direccion.length < 4 || direccion.length > 260) {
    return { error: 'La dirección es obligatoria (4 a 260 caracteres).' };
  }
  if (contacto.length < 3 || contacto.length > 120) {
    return { error: 'El contacto es obligatorio.' };
  }
  if (horarios.length < 3 || horarios.length > 180) {
    return { error: 'El horario de atención es obligatorio.' };
  }
  if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
    return { error: 'La latitud debe ser un número válido entre -90 y 90.' };
  }
  if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
    return { error: 'La longitud debe ser un número válido entre -180 y 180.' };
  }
  if (!Number.isFinite(costo) || costo < 0 || costo > 50_000_000) {
    return { error: 'El costo de entrada debe ser un monto válido en Guaraníes (>= 0).' };
  }

  let actividades: string[] = [];
  if (Array.isArray(body.actividades)) {
    actividades = body.actividades
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .slice(0, 20);
  } else if (typeof body.actividades === 'string') {
    actividades = body.actividades
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  if (actividades.length === 0) {
    return { error: 'Agrega al menos una actividad disponible en el sitio.' };
  }

  let imagen_url: string | null = null;
  if (typeof body.imagen_url === 'string' && body.imagen_url.trim()) {
    const trimmedUrl = body.imagen_url.trim();
    if (trimmedUrl.startsWith('/src/assets/images/')) {
      imagen_url = trimmedUrl;
    } else {
      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          return { error: 'La URL de la imagen debe comenzar con https:// o http://.' };
        }
        imagen_url = parsed.toString();
      } catch {
        return { error: 'La URL de la imagen no tiene un formato válido.' };
      }
    }
  }

  return {
    data: {
      nombre,
      tipo: tipo as TourismCategory,
      descripcion: descripcion.slice(0, 1200),
      direccion,
      contacto,
      latitud: Number(latitud.toFixed(6)),
      longitud: Number(longitud.toFixed(6)),
      actividades,
      horarios,
      costo_entrada: Math.round(costo),
      imagen_url,
    },
  };
}

export async function getSystemHealth(): Promise<SystemHealthStatus> {
  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY.trim() !== '' &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    const localSites = ensureLocalStore();
    return {
      databaseMode: 'local',
      supabaseConfigured: false,
      supabaseReachable: false,
      geminiConfigured,
      totalSites: localSites.length,
      detail: 'Persistencia local activa. Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para sincronizar con Supabase.',
    };
  }

  try {
    const { count, error } = await supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true });

    if (error) {
      const localSites = ensureLocalStore();
      return {
        databaseMode: 'local',
        supabaseConfigured: true,
        supabaseReachable: false,
        geminiConfigured,
        totalSites: localSites.length,
        detail: `Supabase configurado pero la tabla '${TABLE_NAME}' aún no responde (${error.message}). Usando respaldo local.`,
      };
    }

    return {
      databaseMode: 'supabase',
      supabaseConfigured: true,
      supabaseReachable: true,
      geminiConfigured,
      totalSites: count ?? 0,
      detail: 'Conectado a Supabase PostgreSQL en tiempo real.',
    };
  } catch (err) {
    const localSites = ensureLocalStore();
    return {
      databaseMode: 'local',
      supabaseConfigured: true,
      supabaseReachable: false,
      geminiConfigured,
      totalSites: localSites.length,
      detail: `Error de conexión a Supabase: ${err instanceof Error ? err.message : 'desconocido'}.`,
    };
  }
}

export async function listSites(filters: SiteFilterOptions = {}): Promise<{
  sites: TourismSite[];
  source: 'supabase' | 'local';
}> {
  const supabase = createSupabaseServerClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        if (data.length === 0) {
          // Auto-seed initial catalog on first connection to an empty Supabase table
          const { data: seededData, error: seedError } = await supabase
            .from(TABLE_NAME)
            .insert(INITIAL_TOURISM_SITES)
            .select('*');

          if (!seedError && seededData) {
            const normalized = seededData.map((r) => normalizeSiteRow(r as Record<string, unknown>));
            return { sites: applyFilters(normalized, filters), source: 'supabase' };
          }
        }
        const normalized = data.map((r) => normalizeSiteRow(r as Record<string, unknown>));
        return { sites: applyFilters(normalized, filters), source: 'supabase' };
      }
    } catch {
      // Fall back cleanly to local store if Supabase table isn't created yet
    }
  }

  const localSites = ensureLocalStore();
  return { sites: applyFilters(localSites, filters), source: 'local' };
}

export async function createSite(input: TourismSiteInput): Promise<{
  site: TourismSite;
  source: 'supabase' | 'local';
}> {
  const supabase = createSupabaseServerClient();
  const id = randomUUID();
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert({ id, ...input })
        .select('*')
        .single();

      if (!error && data) {
        return {
          site: normalizeSiteRow(data as Record<string, unknown>),
          source: 'supabase',
        };
      }
    } catch {
      // Fallback below
    }
  }

  const sites = ensureLocalStore();
  const created: TourismSite = {
    id,
    ...input,
    created_at: now,
    updated_at: now,
  };
  sites.push(created);
  writeLocalStore(sites);
  return { site: created, source: 'local' };
}

export async function updateSite(
  id: string,
  input: TourismSiteInput
): Promise<{ site: TourismSite | null; source: 'supabase' | 'local' }> {
  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({ ...input, updated_at: now })
        .eq('id', id)
        .select('*')
        .single();

      if (!error && data) {
        return {
          site: normalizeSiteRow(data as Record<string, unknown>),
          source: 'supabase',
        };
      }
    } catch {
      // Fallback below
    }
  }

  const sites = ensureLocalStore();
  const idx = sites.findIndex((s) => s.id === id);
  if (idx === -1) {
    return { site: null, source: 'local' };
  }
  const updated: TourismSite = {
    ...sites[idx],
    ...input,
    id,
    updated_at: now,
  };
  sites[idx] = updated;
  writeLocalStore(sites);
  return { site: updated, source: 'local' };
}

export async function deleteSite(id: string): Promise<{
  deleted: boolean;
  source: 'supabase' | 'local';
}> {
  const supabase = createSupabaseServerClient();

  if (supabase) {
    try {
      const { error, count } = await supabase
        .from(TABLE_NAME)
        .delete({ count: 'exact' })
        .eq('id', id);

      if (!error && (count ?? 0) > 0) {
        return { deleted: true, source: 'supabase' };
      }
    } catch {
      // Fallback below
    }
  }

  const sites = ensureLocalStore();
  const filtered = sites.filter((s) => s.id !== id);
  if (filtered.length === sites.length) {
    return { deleted: false, source: 'local' };
  }
  writeLocalStore(filtered);
  return { deleted: true, source: 'local' };
}
