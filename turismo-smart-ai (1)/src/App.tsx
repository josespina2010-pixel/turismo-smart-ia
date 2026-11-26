import {
  Clock,
  Edit3,
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  Route,
  Search,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DeploymentView } from './components/DeploymentView.tsx';
import { GeminiAssistant } from './components/GeminiAssistant.tsx';
import { SiteFormModal } from './components/SiteFormModal.tsx';
import { SiteImage } from './components/SiteImage.tsx';
import { TopBar, type ActiveView } from './components/TopBar.tsx';
import { TourismMap } from './components/TourismMap.tsx';
import {
  TOURISM_CATEGORIES,
  type SystemHealthStatus,
  type TourismSite,
  type TourismSiteInput,
} from './types/tourism.ts';
import { buildGoogleMapsPlaceUrl, formatGuaranies } from './utils/maps.ts';

const BUDGET_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: 'Cualquier costo', value: null },
  { label: 'Entrada libre', value: 0 },
  { label: 'Hasta 25.000 Gs.', value: 25000 },
  { label: 'Hasta 50.000 Gs.', value: 50000 },
];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('explorar');
  const [sites, setSites] = useState<TourismSite[]>([]);
  const [health, setHealth] = useState<SystemHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [maxBudget, setMaxBudget] = useState<number | null>(null);

  // Selección en mapa y ruta Google Maps
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [routeSiteIds, setRouteSiteIds] = useState<string[]>([]);

  // Modal CRUD y confirmación de eliminación
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<TourismSite | null>(null);
  const [deletingSite, setDeletingSite] = useState<TourismSite | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [sitesRes, healthRes] = await Promise.all([
        fetch('/api/sites'),
        fetch('/api/health'),
      ]);

      if (!sitesRes.ok) {
        throw new Error('No se pudieron cargar los sitios turísticos.');
      }
      const sitesData = (await sitesRes.json()) as { sites: TourismSite[] };
      setSites(sitesData.sites);
      setSelectedSiteId((prev) => {
        if (prev && sitesData.sites.some((s) => s.id === prev)) return prev;
        return sitesData.sites[0]?.id ?? null;
      });

      if (healthRes.ok) {
        const healthData = (await healthRes.json()) as SystemHealthStatus;
        setHealth(healthData);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg((current) => (current === msg ? null : current));
    }, 3500);
  };

  const filteredSites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sites.filter((site) => {
      if (selectedCategory !== 'Todos' && site.tipo !== selectedCategory) {
        return false;
      }
      if (maxBudget !== null && site.costo_entrada > maxBudget) {
        return false;
      }
      if (q) {
        const text = [
          site.nombre,
          site.tipo,
          site.direccion,
          site.descripcion,
          site.horarios,
          ...site.actividades,
        ]
          .join(' ')
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [sites, searchQuery, selectedCategory, maxBudget]);

  const selectedSite = useMemo(
    () =>
      filteredSites.find((s) => s.id === selectedSiteId) ||
      sites.find((s) => s.id === selectedSiteId) ||
      filteredSites[0] ||
      null,
    [filteredSites, sites, selectedSiteId]
  );

  const freeCount = useMemo(
    () => sites.filter((s) => s.costo_entrada === 0).length,
    [sites]
  );

  const museumCount = useMemo(
    () => sites.filter((s) => s.tipo === 'Museo').length,
    [sites]
  );

  const handleSaveSite = async (payload: TourismSiteInput, editingId?: string) => {
    const url = editingId ? `/api/sites/${editingId}` : '/api/sites';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as { site?: TourismSite; error?: string };
    if (!res.ok || !data.site) {
      throw new Error(data.error || 'No se pudo guardar el sitio.');
    }

    await loadData();
    setSelectedSiteId(data.site.id);
    showToast(
      editingId
        ? `Sitio "${data.site.nombre}" actualizado correctamente.`
        : `Sitio "${data.site.nombre}" registrado en el catálogo.`
    );
  };

  const handleConfirmDelete = async () => {
    if (!deletingSite) return;
    setDeletingBusy(true);
    try {
      const res = await fetch(`/api/sites/${deletingSite.id}`, {
        method: 'DELETE',
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar el registro.');
      }
      setRouteSiteIds((prev) => prev.filter((id) => id !== deletingSite.id));
      const deletedName = deletingSite.nombre;
      setDeletingSite(null);
      await loadData();
      showToast(`"${deletedName}" eliminado del catálogo.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al eliminar el sitio.');
      setDeletingSite(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  const handleToggleRouteSite = (siteId: string) => {
    setRouteSiteIds((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  };

  const handleFocusSiteOnMap = (site: TourismSite) => {
    setSelectedSiteId(site.id);
    if (activeView !== 'mapa' && activeView !== 'explorar') {
      setActiveView('mapa');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <TopBar
        activeView={activeView}
        onNavigate={setActiveView}
        onOpenCreate={() => {
          setEditingSite(null);
          setIsFormOpen(true);
        }}
      />

      {/* Aviso temporal de operaciones CRUD */}
      {feedbackMsg && (
        <div className="mx-auto mt-4 w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
          <div
            role="status"
            className="border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900"
          >
            {feedbackMsg}
          </div>
        </div>
      )}

      <main className="flex-1">
        {/* Hero Editorial en la vista Catálogo */}
        {activeView === 'explorar' && (
          <section className="border-b border-slate-200 bg-slate-50/40">
            <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
              <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
                <div className="flex flex-col justify-between lg:col-span-7">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-blue-900">
                      Asunción y Gran Asunción · Catálogo Turístico y Cultural
                    </p>
                    <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-slate-900 text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
                      Museos, patrimonio histórico y espacios culturales en un mapa inteligente
                    </h1>
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                      Explora horarios, actividades y tarifas reales en Guaraníes. Visualiza cada punto en OpenStreetMap, transfiere tu ruta a Google Maps y consulta al asistente Gemini sobre presupuestos e itinerarios.
                    </p>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveView('asistente')}
                      className="rounded-md bg-blue-900 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-950 whitespace-nowrap shrink-0"
                    >
                      Consultar asistente IA
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('mapa')}
                      className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      Abrir mapa completo
                    </button>
                  </div>
                </div>

                <figure className="flex flex-col lg:col-span-5">
                  <div className="relative h-64 w-full overflow-hidden border border-slate-200 bg-slate-100 lg:h-full lg:min-h-[300px]">
                    <img
                      src="/src/assets/images/hero_asuncion_patrimonio_1795694290044.jpg"
                      alt="Palacio de los López en el centro histórico de Asunción al atardecer"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <figcaption className="mt-2 font-serif text-xs italic text-slate-500">
                    Fig. 1 — Palacio de los López y bahía de Asunción, patrimonio arquitectónico registrado.
                  </figcaption>
                </figure>
              </div>

              {/* Franja operativa de métricas reales del catálogo */}
              <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Sitios registrados</dt>
                  <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                    {sites.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Museos en catálogo</dt>
                  <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                    {museumCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Entrada libre (0 Gs.)</dt>
                  <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                    {freeCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Cartografía activa</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    OpenStreetMap → Google Maps
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        )}

        <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8">
          {errorMsg && (
            <div
              role="alert"
              className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
            >
              {errorMsg}
            </div>
          )}

          {/* Barra de búsqueda y filtros para Catálogo o Mapa */}
          {(activeView === 'explorar' || activeView === 'mapa') && (
            <section
              aria-label="Filtros del catálogo"
              className="mb-8 border border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar sitio, dirección o actividad..."
                    className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-900 focus:outline-none"
                  />
                </div>

                {/* Control segmentado por presupuesto */}
                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {BUDGET_OPTIONS.map((opt) => {
                    const active = maxBudget === opt.value;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setMaxBudget(opt.value)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pestañas por tipo de atractivo */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-4">
                {['Todos', ...TOURISM_CATEGORIES].map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-blue-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Vista principal: Catálogo + Mapa OpenStreetMap integrado */}
          {activeView === 'explorar' && (
            <div className="space-y-10">
              {/* Mapa OpenStreetMap */}
              <section aria-label="Mapa OpenStreetMap">
                <TourismMap
                  sites={filteredSites}
                  selectedSite={selectedSite}
                  onSelectSite={(site) => setSelectedSiteId(site.id)}
                  routeSiteIds={routeSiteIds}
                  onToggleRouteSite={handleToggleRouteSite}
                  onClearRoute={() => setRouteSiteIds([])}
                  heightClass="h-[420px]"
                />
              </section>

              {/* Catálogo de tarjetas */}
              <section aria-label="Catálogo de lugares registrados">
                <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-3">
                  <h2 className="font-display text-2xl font-semibold text-slate-900">
                    Catálogo de sitios registrados
                  </h2>
                  <span className="font-mono text-xs tabular-nums text-slate-500">
                    Mostrando {filteredSites.length} de {sites.length} registros
                  </span>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="h-96 animate-pulse border border-slate-200 bg-slate-50"
                      />
                    ))}
                  </div>
                ) : filteredSites.length === 0 ? (
                  <div className="border border-slate-200 bg-slate-50/50 p-10 text-center">
                    <p className="font-display text-lg font-medium text-slate-900">
                      No hay sitios que coincidan con los filtros actuales
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Ajusta la búsqueda, cambia el presupuesto en Gs. o registra un nuevo atractivo turístico.
                    </p>
                    <div className="mt-4 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('Todos');
                          setMaxBudget(null);
                        }}
                        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Restablecer filtros
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSite(null);
                          setIsFormOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-950"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Registrar sitio</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredSites.map((site) => {
                      const isSelected = selectedSite?.id === site.id;
                      const inRoute = routeSiteIds.includes(site.id);

                      return (
                        <article
                          key={site.id}
                          className={`flex flex-col border transition-colors ${
                            isSelected
                              ? 'border-blue-900 bg-blue-50/10'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="aspect-[4/3] w-full overflow-hidden border-b border-slate-200 bg-slate-100">
                            <SiteImage
                              src={site.imagen_url}
                              alt={site.nombre}
                              tipo={site.tipo}
                              className="h-full w-full"
                            />
                          </div>

                          <div className="flex flex-1 flex-col p-5">
                            {/* Metadatos sin píldoras */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                              <span className="font-semibold text-blue-900">{site.tipo}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums font-medium text-slate-800">
                                {formatGuaranies(site.costo_entrada)}
                              </span>
                            </div>

                            <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug text-slate-900">
                              {site.nombre}
                            </h3>

                            {site.descripcion && (
                              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                                {site.descripcion}
                              </p>
                            )}

                            <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                              <div className="flex items-start gap-2">
                                <MapPin
                                  className="mt-0.5 h-3.5 w-3.5 text-slate-400 shrink-0"
                                  aria-hidden="true"
                                />
                                <dd className="line-clamp-1">{site.direccion}</dd>
                              </div>
                              <div className="flex items-start gap-2">
                                <Clock
                                  className="mt-0.5 h-3.5 w-3.5 text-slate-400 shrink-0"
                                  aria-hidden="true"
                                />
                                <dd className="line-clamp-1">{site.horarios}</dd>
                              </div>
                              <div className="flex items-start gap-2">
                                <Phone
                                  className="mt-0.5 h-3.5 w-3.5 text-slate-400 shrink-0"
                                  aria-hidden="true"
                                />
                                <dd className="truncate">{site.contacto}</dd>
                              </div>
                            </dl>

                            {site.actividades.length > 0 && (
                              <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 line-clamp-2">
                                <span className="font-medium text-slate-700">Actividades: </span>
                                {site.actividades.join(' · ')}
                              </p>
                            )}

                            {/* Acciones de la tarjeta */}
                            <div className="mt-auto pt-4">
                              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSiteId(site.id);
                                    window.scrollTo({ top: 360, behavior: 'smooth' });
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                                >
                                  <MapPin className="h-3 w-3" aria-hidden="true" />
                                  <span>Ver en mapa</span>
                                </button>

                                <a
                                  href={buildGoogleMapsPlaceUrl(site)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-blue-900 hover:bg-blue-50 whitespace-nowrap shrink-0"
                                >
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                  <span>Google Maps</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleToggleRouteSite(site.id)}
                                  className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap shrink-0 ${
                                    inRoute
                                      ? 'border-emerald-800 bg-emerald-900 text-white'
                                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <Route className="h-3 w-3" aria-hidden="true" />
                                  <span>{inRoute ? 'En ruta' : 'Ruta'}</span>
                                </button>

                                <div className="ml-auto flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSite(site);
                                      setIsFormOpen(true);
                                    }}
                                    aria-label={`Editar ${site.nombre}`}
                                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingSite(site)}
                                    aria-label={`Eliminar ${site.nombre}`}
                                    className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Vista enfocada en Mapa OpenStreetMap */}
          {activeView === 'mapa' && (
            <TourismMap
              sites={filteredSites}
              selectedSite={selectedSite}
              onSelectSite={(site) => setSelectedSiteId(site.id)}
              routeSiteIds={routeSiteIds}
              onToggleRouteSite={handleToggleRouteSite}
              onClearRoute={() => setRouteSiteIds([])}
              heightClass="h-[520px] lg:h-[600px]"
            />
          )}

          {/* Vista enfocada en Asistente Inteligente Gemini */}
          {activeView === 'asistente' && (
            <GeminiAssistant sites={sites} onFocusSiteOnMap={handleFocusSiteOnMap} />
          )}

          {/* Vista de Conexión Supabase, GitHub y Render */}
          {activeView === 'despliegue' && (
            <DeploymentView health={health} sites={sites} onRefreshHealth={loadData} />
          )}
        </div>
      </main>

      {/* Pie institucional limpio */}
      <footer className="border-t border-slate-200 bg-slate-50/50 py-6">
        <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-3 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>
            Turismo Smart AI · Colegio Nacional EMD Asunción Escalada · Segundo Bachillerato Técnico en Informática · Alumna: Giménez Zárate, Constanza Milagros
          </p>
          <p className="font-mono text-[11px] text-slate-400">
            OpenStreetMap · Google Maps · Supabase · Gemini API
          </p>
        </div>
      </footer>

      {/* Modal de Alta y Modificación */}
      <SiteFormModal
        isOpen={isFormOpen}
        editingSite={editingSite}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSite(null);
        }}
        onSubmit={handleSaveSite}
      />

      {/* Modal de confirmación de baja */}
      {deletingSite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="w-full max-w-md border border-slate-200 bg-white p-6 shadow-xl">
            <h3
              id="delete-confirm-title"
              className="font-display text-lg font-semibold text-slate-900"
            >
              Eliminar sitio del catálogo
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              ¿Confirmas que deseas eliminar <strong>{deletingSite.nombre}</strong> de la base de datos? Esta acción quitará el marcador del mapa y del asistente inteligente.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={deletingBusy}
                onClick={() => setDeletingSite(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingBusy}
                onClick={handleConfirmDelete}
                className="rounded-md bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {deletingBusy ? 'Eliminando...' : 'Eliminar registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
