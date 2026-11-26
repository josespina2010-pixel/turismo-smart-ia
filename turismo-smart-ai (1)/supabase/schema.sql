-- Script SQL para Supabase (PostgreSQL)
-- Ejecutar en el SQL Editor de tu proyecto en Supabase

create extension if not exists pgcrypto;

create table if not exists public.sitios_turisticos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('Museo', 'Sitio Histórico', 'Espacio Cultural', 'Parque y Naturaleza', 'Gastronomía y Mercado')),
  descripcion text not null default '',
  direccion text not null,
  contacto text not null,
  latitud double precision not null,
  longitud double precision not null,
  actividades text[] not null default '{}',
  horarios text not null,
  costo_entrada integer not null default 0 check (costo_entrada >= 0),
  imagen_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para búsqueda y filtrado por tipo y presupuesto
create index if not exists idx_sitios_tipo on public.sitios_turisticos (tipo);
create index if not exists idx_sitios_costo on public.sitios_turisticos (costo_entrada);

-- Trigger para actualizar updated_at automáticamente
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sitios_updated_at on public.sitios_turisticos;
create trigger trg_sitios_updated_at
  before update on public.sitios_turisticos
  for each row execute function public.set_updated_at();

-- Habilitar Row Level Security (RLS)
alter table public.sitios_turisticos enable row level security;

-- Política de lectura pública (el servidor usa SUPABASE_SERVICE_ROLE_KEY para escrituras seguras,
-- o puedes habilitar políticas para anon si utilizas únicamente la anon key)
drop policy if exists "Lectura pública de sitios turísticos" on public.sitios_turisticos;
create policy "Lectura pública de sitios turísticos"
  on public.sitios_turisticos for select
  using (true);

drop policy if exists "Gestión completa desde backend" on public.sitios_turisticos;
create policy "Gestión completa desde backend"
  on public.sitios_turisticos for all
  using (true)
  with check (true);
