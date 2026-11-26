import { Check, Copy, Database, ExternalLink, GitBranch, Globe, Server } from 'lucide-react';
import { useState } from 'react';
import type { SystemHealthStatus, TourismSite } from '../types/tourism.ts';
import { buildGoogleMapsRouteUrl, downloadSitesAsGeoJson, downloadSitesAsKml } from '../utils/maps.ts';

interface DeploymentViewProps {
  health: SystemHealthStatus | null;
  sites: TourismSite[];
  onRefreshHealth: () => void;
}

const SUPABASE_SQL_SNIPPET = `create extension if not exists pgcrypto;

create table if not exists public.sitios_turisticos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null,
  descripcion text not null default '',
  direccion text not null,
  contacto text not null,
  latitud double precision not null,
  longitud double precision not null,
  actividades text[] not null default '{}',
  horarios text not null,
  costo_entrada integer not null default 0,
  imagen_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);`;

const RENDER_YAML_SNIPPET = `services:
  - type: web
    name: turismo-smart-ai
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: GEMINI_API_KEY
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false`;

export function DeploymentView({ health, sites, onRefreshHealth }: DeploymentViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard blocked in sandbox
    }
  };

  const fullGoogleMapsUrl = buildGoogleMapsRouteUrl(sites);

  return (
    <div className="space-y-8">
      {/* Encabezado de estado real del servidor */}
      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              Conexión Supabase, GitHub, Render y Google Maps
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Diagnóstico en vivo de servicios del servidor y guía de publicación en producción con variables de entorno protegidas.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefreshHealth}
            className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Verificar conexión
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Database className="h-4 w-4 text-blue-900" aria-hidden="true" />
              <span>Base de datos Supabase</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {health?.databaseMode === 'supabase'
                ? 'Conectado a Supabase PostgreSQL'
                : 'Persistencia local activa'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {health?.detail ||
                'Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Settings > Secrets o Render.'}
            </p>
          </div>

          <div className="border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Server className="h-4 w-4 text-blue-900" aria-hidden="true" />
              <span>API Gemini (Servidor)</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {health?.geminiConfigured
                ? 'GEMINI_API_KEY activa'
                : 'Pendiente de configurar GEMINI_API_KEY'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Las consultas se ejecutan exclusivamente desde Express (`/api/chat`) sin exponer claves en el navegador.
            </p>
          </div>

          <div className="border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Globe className="h-4 w-4 text-blue-900" aria-hidden="true" />
              <span>OpenStreetMap → Google Maps</span>
            </div>
            <p className="mt-2 font-mono text-sm font-semibold tabular-nums text-slate-900">
              {sites.length} ubicaciones listas
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Visualiza las coordenadas en OpenStreetMap y transfiere cualquier selección o ruta a Google Maps o Google My Maps.
            </p>
          </div>
        </div>
      </section>

      {/* Herramientas de migración/exportación hacia Google Maps */}
      <section className="border border-slate-200 bg-white p-6">
        <h3 className="font-display text-lg font-semibold text-slate-900">
          Pasar ubicaciones de OpenStreetMap a Google Maps
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Cada sitio registrado conserva su latitud y longitud estándar WGS84. Puedes abrir los puntos directamente en Google Maps o descargar el archivo KML para importarlo en Google My Maps.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {fullGoogleMapsUrl && (
            <a
              href={fullGoogleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-950"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Abrir recorrido en Google Maps</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => downloadSitesAsKml(sites)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Descargar KML para Google My Maps
          </button>
          <button
            type="button"
            onClick={() => downloadSitesAsGeoJson(sites)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Descargar GeoJSON
          </button>
        </div>
      </section>

      {/* SQL de Supabase + Configuración GitHub & Render */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-slate-900">
              1. Script SQL para Supabase
            </h3>
            <button
              type="button"
              onClick={() => handleCopy('sql', SUPABASE_SQL_SNIPPET)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copiedKey === 'sql' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copiar SQL</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Ejecútalo en el SQL Editor de tu proyecto Supabase (archivo incluido en <span className="font-mono">supabase/schema.sql</span>).
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
            {SUPABASE_SQL_SNIPPET}
          </pre>
        </section>

        <section className="border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-slate-900">
              2. GitHub y Render (`render.yaml`)
            </h3>
            <button
              type="button"
              onClick={() => handleCopy('render', RENDER_YAML_SNIPPET)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copiedKey === 'render' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copiar YAML</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Conecta tu repositorio de GitHub a Render y declara las variables de entorno privadas en el panel de Render.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
            {RENDER_YAML_SNIPPET}
          </pre>
          <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
            <GitBranch className="mt-0.5 h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <span>
              Variables requeridas en Render / Secrets: <span className="font-mono">GEMINI_API_KEY</span>, <span className="font-mono">SUPABASE_URL</span>, <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span>.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
