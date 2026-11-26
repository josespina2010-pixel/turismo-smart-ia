import { Check, Copy, Database, GitBranch, Globe } from 'lucide-react';
import { useState } from 'react';
import type { ConfigStatus } from '../types/attraction.ts';

interface DeploymentGuideSectionProps {
  status: ConfigStatus | null;
  onSeedSupabase: () => Promise<void>;
}

const SUPABASE_SQL_SNIPPET = `create table if not exists public.atractivos_turisticos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null,
  descripcion text not null,
  direccion text not null,
  contacto text not null,
  latitud double precision not null,
  longitud double precision not null,
  actividades text not null,
  horarios text not null,
  costo_entrada integer not null default 0,
  imagen_url text default '',
  created_at timestamptz not null default now()
);`;

export function DeploymentGuideSection({
  status,
  onSeedSupabase,
}: DeploymentGuideSectionProps) {
  const [copied, setCopied] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SNIPPET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleSeedClick = async () => {
    setSeeding(true);
    setSeedNotice(null);
    try {
      await onSeedSupabase();
      setSeedNotice('Datos iniciales verificados y cargados correctamente.');
    } catch (err) {
      setSeedNotice(
        err instanceof Error ? err.message : 'No se pudieron cargar los datos.',
      );
    } finally {
      setSeeding(false);
    }
  };

  return (
    <section
      id="despliegue"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-stone-200"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500">
            Arquitectura · Persistencia y publicación
          </p>
          <h2 className="font-serif text-3xl font-semibold text-stone-900 mt-1">
            Integración con Supabase, GitHub y Render
          </h2>
        </div>

        <div className="text-xs text-stone-700 bg-[#F4EFE6] border border-stone-200 rounded-lg px-3.5 py-2">
          Almacenamiento activo:{' '}
          <span className="font-semibold text-stone-950">
            {status?.storageMode === 'supabase'
              ? 'Supabase PostgreSQL en la nube'
              : 'Repositorio local de vista previa (listo para conectar Supabase)'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Supabase */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
              <Database className="w-4 h-4 text-amber-900" aria-hidden="true" />
              <span>1. Base de datos Supabase</span>
            </div>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Ejecuta el archivo <code className="font-mono text-stone-900">supabase/schema.sql</code>{' '}
              en el SQL Editor de tu proyecto Supabase para crear la tabla{' '}
              <code className="font-mono text-stone-900">atractivos_turisticos</code> y poblar los
              7 sitios patrimoniales iniciales.
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleCopySql}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-800 bg-[#FBF9F5] border border-stone-300 rounded-lg hover:bg-stone-100 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  SQL copiado al portapapeles
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  Copiar esquema SQL básico
                </>
              )}
            </button>

            {status?.storageMode === 'supabase' && status.totalAttractions === 0 && (
              <button
                type="button"
                disabled={seeding}
                onClick={handleSeedClick}
                className="w-full px-3 py-2 text-xs font-medium text-white bg-amber-900 rounded-lg hover:bg-amber-950 disabled:opacity-60 cursor-pointer"
              >
                {seeding ? 'Cargando...' : 'Cargar 7 sitios iniciales en Supabase'}
              </button>
            )}

            {seedNotice && <p className="text-[11px] text-stone-700">{seedNotice}</p>}
          </div>
        </div>

        {/* Card 2: GitHub */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
              <GitBranch className="w-4 h-4 text-amber-900" aria-hidden="true" />
              <span>2. Repositorio en GitHub</span>
            </div>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              El proyecto incluye <code className="font-mono text-stone-900">.gitignore</code>{' '}
              protegiendo tus archivos <code className="font-mono text-stone-900">.env</code> y{' '}
              <code className="font-mono text-stone-900">.env.example</code> documentando las claves
              necesarias sin exponer secretos en el repositorio.
            </p>
          </div>

          <div className="bg-[#FBF9F5] border border-stone-200 rounded-lg p-3 font-mono text-[11px] text-stone-700 space-y-1">
            <div>git add .</div>
            <div>git commit -m &quot;Turismo Smart AI&quot;</div>
            <div>git push origin main</div>
          </div>
        </div>

        {/* Card 3: Render */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
              <Globe className="w-4 h-4 text-amber-900" aria-hidden="true" />
              <span>3. Publicación en Render</span>
            </div>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Conecta tu repositorio en Render como Web Service (o usa{' '}
              <code className="font-mono text-stone-900">render.yaml</code>) y define en{' '}
              <strong>Environment Variables</strong> tus claves privadas del servidor:
            </p>
          </div>

          <ul className="bg-[#FBF9F5] border border-stone-200 rounded-lg p-3 font-mono text-[11px] text-stone-800 space-y-1">
            <li>GEMINI_API_KEY</li>
            <li>SUPABASE_URL</li>
            <li>SUPABASE_ANON_KEY</li>
            <li>NODE_ENV=production</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
