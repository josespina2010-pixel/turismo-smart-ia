import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  ATTRACTION_TYPES,
  type Attraction,
  type AttractionInput,
} from '../types/attraction.ts';
import { SEED_ATTRACTIONS } from './seedData.ts';

const TABLE_NAME = 'atractivos_turisticos';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'atractivos.json');

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.SUPABASE_ANON_KEY?.trim()),
  );
}

function ensureLocalStore(): Attraction[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    fs.writeFileSync(
      LOCAL_DB_FILE,
      JSON.stringify(SEED_ATTRACTIONS, null, 2),
      'utf-8',
    );
    return [...SEED_ATTRACTIONS];
  }
  try {
    const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Attraction[]) : [...SEED_ATTRACTIONS];
  } catch {
    return [...SEED_ATTRACTIONS];
  }
}

function writeLocalStore(items: Attraction[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

export function validateAttractionInput(
  body: unknown,
): { ok: true; data: AttractionInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Datos inválidos en la solicitud.' };
  }

  const input = body as Record<string, unknown>;
  const nombre = String(input.nombre ?? '').trim();
  const tipo = String(input.tipo ?? '').trim();
  const descripcion = String(input.descripcion ?? '').trim();
  const direccion = String(input.direccion ?? '').trim();
  const contacto = String(input.contacto ?? '').trim();
  const actividades = String(input.actividades ?? '').trim();
  const horarios = String(input.horarios ?? '').trim();
  const latitud = Number(input.latitud);
  const longitud = Number(input.longitud);
  const costo_entrada = Number(input.costo_entrada ?? 0);
  const rawImageUrl = String(input.imagen_url ?? '').trim();

  if (nombre.length < 2 || nombre.length > 140) {
    return { ok: false, error: 'El nombre debe tener entre 2 y 140 caracteres.' };
  }
  if (!ATTRACTION_TYPES.includes(tipo as (typeof ATTRACTION_TYPES)[number])) {
    return { ok: false, error: 'Tipo de atractivo no válido.' };
  }
  if (descripcion.length < 5 || descripcion.length > 1500) {
    return { ok: false, error: 'La descripción debe tener entre 5 y 1500 caracteres.' };
  }
  if (direccion.length < 3 || direccion.length > 240) {
    return { ok: false, error: 'La dirección es obligatoria.' };
  }
  if (contacto.length < 3 || contacto.length > 160) {
    return { ok: false, error: 'El contacto es obligatorio.' };
  }
  if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
    return { ok: false, error: 'Latitud fuera de rango (-90 a 90).' };
  }
  if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
    return { ok: false, error: 'Longitud fuera de rango (-180 a 180).' };
  }
  if (actividades.length < 3 || actividades.length > 500) {
    return { ok: false, error: 'Las actividades son obligatorias.' };
  }
  if (horarios.length < 3 || horarios.length > 240) {
    return { ok: false, error: 'Los horarios son obligatorios.' };
  }
  if (!Number.isFinite(costo_entrada) || costo_entrada < 0 || costo_entrada > 50000000) {
    return { ok: false, error: 'El costo de entrada en Gs. debe ser mayor o igual a 0.' };
  }

  let safeImageUrl = '';
  if (rawImageUrl) {
    const isSafeRelative = rawImageUrl.startsWith('/src/assets/images/');
    let isSafeHttps = false;
    try {
      const parsedUrl = new URL(rawImageUrl);
      isSafeHttps = parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
    } catch {
      isSafeHttps = false;
    }
    if (!isSafeRelative && !isSafeHttps) {
      return {
        ok: false,
        error: 'La URL de imagen debe comenzar con https:// o ser una ruta de activo válida.',
      };
    }
    safeImageUrl = rawImageUrl;
  }

  return {
    ok: true,
    data: {
      nombre,
      tipo: tipo as Attraction['tipo'],
      descripcion,
      direccion,
      contacto,
      latitud: Number(latitud.toFixed(6)),
      longitud: Number(longitud.toFixed(6)),
      actividades,
      horarios,
      costo_entrada: Math.round(costo_entrada),
      imagen_url: safeImageUrl,
    },
  };
}

export async function listAttractions(filters?: {
  search?: string;
  tipo?: string;
  maxBudget?: number | null;
}): Promise<{ items: Attraction[]; storageMode: 'supabase' | 'local' }> {
  const supabase = getSupabaseClient();
  let items: Attraction[] = [];
  let storageMode: 'supabase' | 'local' = 'local';

  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Error al consultar Supabase: ${error.message}`);
    }
    items = (data ?? []) as Attraction[];
    storageMode = 'supabase';
  } else {
    items = ensureLocalStore();
  }

  const search = filters?.search?.trim().toLowerCase() ?? '';
  const tipo = filters?.tipo?.trim() ?? '';
  const maxBudget = filters?.maxBudget;

  const filtered = items.filter((item) => {
    if (tipo && tipo !== 'Todos' && item.tipo !== tipo) {
      return false;
    }
    if (
      typeof maxBudget === 'number' &&
      Number.isFinite(maxBudget) &&
      maxBudget >= 0 &&
      item.costo_entrada > maxBudget
    ) {
      return false;
    }
    if (search) {
      const haystack = [
        item.nombre,
        item.tipo,
        item.descripcion,
        item.direccion,
        item.actividades,
        item.horarios,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });

  return { items: filtered, storageMode };
}

export async function getAttractionById(id: string): Promise<Attraction | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Error al consultar atractivo en Supabase: ${error.message}`);
    }
    return (data as Attraction) ?? null;
  }

  const items = ensureLocalStore();
  return items.find((item) => item.id === id) ?? null;
}

export async function createAttraction(input: AttractionInput): Promise<Attraction> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([input])
      .select('*')
      .single();

    if (error) {
      throw new Error(`Error al guardar en Supabase: ${error.message}`);
    }
    return data as Attraction;
  }

  const items = ensureLocalStore();
  const created: Attraction = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  items.push(created);
  writeLocalStore(items);
  return created;
}

export async function updateAttraction(
  id: string,
  input: AttractionInput,
): Promise<Attraction | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(input)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new Error(`Error al actualizar en Supabase: ${error.message}`);
    }
    return (data as Attraction) ?? null;
  }

  const items = ensureLocalStore();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return null;

  const updated: Attraction = {
    ...items[idx],
    ...input,
    id: items[idx].id,
  };
  items[idx] = updated;
  writeLocalStore(items);
  return updated;
}

export async function deleteAttraction(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error, count } = await supabase
      .from(TABLE_NAME)
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      throw new Error(`Error al eliminar en Supabase: ${error.message}`);
    }
    return (count ?? 0) > 0;
  }

  const items = ensureLocalStore();
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  writeLocalStore(next);
  return true;
}

export async function seedDatabaseIfEmpty(): Promise<{
  inserted: number;
  storageMode: 'supabase' | 'local';
}> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { count, error: countError } = await supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Error verificando Supabase: ${countError.message}`);
    }
    if ((count ?? 0) > 0) {
      return { inserted: 0, storageMode: 'supabase' };
    }
    const payload = SEED_ATTRACTIONS.map(({ id: _id, created_at: _c, ...rest }) => rest);
    const { error: insertError } = await supabase.from(TABLE_NAME).insert(payload);
    if (insertError) {
      throw new Error(`Error al insertar datos iniciales en Supabase: ${insertError.message}`);
    }
    return { inserted: payload.length, storageMode: 'supabase' };
  }

  const items = ensureLocalStore();
  if (items.length === 0) {
    writeLocalStore([...SEED_ATTRACTIONS]);
    return { inserted: SEED_ATTRACTIONS.length, storageMode: 'local' };
  }
  return { inserted: 0, storageMode: 'local' };
}
