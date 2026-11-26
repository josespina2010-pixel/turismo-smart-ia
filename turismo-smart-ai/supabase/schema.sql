-- Esquema de base de datos para Turismo Smart AI en Supabase (PostgreSQL)
-- Ejecutar en Supabase -> SQL Editor -> New Query

create extension if not exists pgcrypto;

create table if not exists public.atractivos_turisticos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('Museo', 'Sitio Histórico', 'Espacio Cultural', 'Mirador y Paseo', 'Naturaleza y Parque')),
  descripcion text not null,
  direccion text not null,
  contacto text not null,
  latitud double precision not null,
  longitud double precision not null,
  actividades text not null,
  horarios text not null,
  costo_entrada integer not null default 0 check (costo_entrada >= 0),
  imagen_url text default '',
  created_at timestamptz not null default now()
);

-- Habilitar Row Level Security (RLS) y permitir acceso público de lectura/escritura
-- o mediante la clave del servidor según configuración del proyecto
alter table public.atractivos_turisticos enable row level security;

drop policy if exists "Lectura publica atractivos" on public.atractivos_turisticos;
create policy "Lectura publica atractivos"
  on public.atractivos_turisticos for select
  using (true);

drop policy if exists "Insercion atractivos" on public.atractivos_turisticos;
create policy "Insercion atractivos"
  on public.atractivos_turisticos for insert
  with check (true);

drop policy if exists "Actualizacion atractivos" on public.atractivos_turisticos;
create policy "Actualizacion atractivos"
  on public.atractivos_turisticos for update
  using (true)
  with check (true);

drop policy if exists "Eliminacion atractivos" on public.atractivos_turisticos;
create policy "Eliminacion atractivos"
  on public.atractivos_turisticos for delete
  using (true);

-- Datos iniciales (7 atractivos reales de Asunción, Paraguay)
insert into public.atractivos_turisticos
  (nombre, tipo, descripcion, direccion, contacto, latitud, longitud, actividades, horarios, costo_entrada, imagen_url)
values
  (
    'Panteón Nacional de los Héroes',
    'Sitio Histórico',
    'Monumento arquitectónico neoclásico inaugurado en 1936 que alberga los restos de figuras históricas del Paraguay y funciona como símbolo cívico del centro asunceno.',
    'Palma y Chile, Centro Histórico, Asunción',
    '+595 21 441 440',
    -25.282089,
    -57.635069,
    'Visita guiada histórica, Observación del cambio de guardia, Fotografía arquitectónica',
    'Lunes a Sábado de 08:30 a 17:30 hs · Domingos de 09:00 a 12:30 hs',
    0,
    ''
  ),
  (
    'Museo Casa de la Independencia',
    'Museo',
    'Vivienda colonial de 1772 donde se gestó la emancipación paraguaya en mayo de 1811. Conserva mobiliario de época, documentos históricos y el emblemático Callejón Histórico.',
    '14 de Mayo esq. Presidente Franco, Asunción',
    '+595 21 493 918 · casadelaindependencia.org.py',
    -25.280614,
    -57.637864,
    'Recorrido por salas coloniales, Callejón Histórico, Exhibición de documentos de 1811',
    'Martes a Viernes de 08:00 a 18:00 hs · Sábados de 08:00 a 13:00 hs',
    0,
    ''
  ),
  (
    'Centro de Artes Visuales / Museo del Barro',
    'Museo',
    'Referente museográfico del Paraguay que reúne colecciones de arte indígena, cerámica popular tradicional y artes visuales contemporáneas del país y la región.',
    'Grabadores del Cabichuí 2716, Isla de Francia, Asunción',
    '+595 21 607 996 · museodelbarro.org',
    -25.276482,
    -57.562134,
    'Exhibición de cerámica indígena, Arte popular paraguayo, Salas de arte contemporáneo',
    'Martes a Sábado de 14:00 a 20:00 hs',
    40000,
    ''
  ),
  (
    'Palacio de los López',
    'Sitio Histórico',
    'Sede del Poder Ejecutivo y joya arquitectónica decimonónica frente a la Bahía de Asunción. Su explanada y jardines ofrecen vistas abiertas hacia la Costanera.',
    'El Paraguayo Independiente entre Ayolas y O''Leary, Asunción',
    '+595 21 414 0000',
    -25.277576,
    -57.637652,
    'Recorrido exterior arquitectónico, Iluminación nocturna, Paseo hacia la Costanera',
    'Visitas exteriores todos los días de 07:00 a 22:00 hs',
    0,
    ''
  ),
  (
    'Centro Cultural de la República El Cabildo',
    'Espacio Cultural',
    'Antigua sede legislativa convertida en centro cultural multidisciplinario con salas dedicadas al arpa paraguaya, música, cine, arte sacro e historia nacional.',
    'Avda. República y Alberdi, Centro Histórico, Asunción',
    '+595 21 443 094 · cabildocultura.gov.py',
    -25.279715,
    -57.633971,
    'Museo de música e historia, Galería de arte sacro, Exposiciones temporales y conciertos',
    'Martes a Viernes de 09:00 a 19:00 hs · Fines de semana de 09:00 a 17:00 hs',
    0,
    ''
  ),
  (
    'Museo Ferroviario Estación Central',
    'Museo',
    'Histórica terminal ferroviaria de 1861 que conserva locomotoras a vapor inglesas, vagones de madera de época, telégrafos y archivos de la historia ferroviaria sudamericana.',
    'Eligio Ayala 145 esq. México, Asunción',
    '+595 21 443 273 · fepasa.com.py',
    -25.284672,
    -57.631193,
    'Visita a locomotoras históricas a vapor, Recorrido por vagones presidenciales, Archivo ferroviario',
    'Lunes a Viernes de 08:30 a 15:30 hs · Sábados de 09:00 a 13:00 hs',
    15000,
    ''
  ),
  (
    'Loma San Jerónimo',
    'Mirador y Paseo',
    'Barrio tradicional de callejones peatonales coloridos, escalinatas artísticas y miradores sobre la Bahía de Asunción, reconocido por su turismo comunitario y ferias culturales.',
    'Agustín Barboza y Estrella, Barrio San Jerónimo, Asunción',
    '+595 981 452 100 · Turismo Comunitario San Jerónimo',
    -25.276841,
    -57.644872,
    'Caminata por pasillos coloridos, Mirador a la Bahía, Degustación de gastronomía típica',
    'Todos los días de 09:00 a 20:00 hs (Feria gastronómica domingos)',
    25000,
    ''
  )
on conflict do nothing;
