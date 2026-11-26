import {
  Clock,
  Edit3,
  ExternalLink,
  Landmark,
  MapPin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AiAssistantSection } from './components/AiAssistantSection.tsx';
import { AttractionDetailDrawer } from './components/AttractionDetailDrawer.tsx';
import { AttractionFormModal } from './components/AttractionFormModal.tsx';
import { DeploymentGuideSection } from './components/DeploymentGuideSection.tsx';
import { OpenStreetMapPanel } from './components/OpenStreetMapPanel.tsx';
import {
  ATTRACTION_TYPES,
  buildGoogleMapsViewUrl,
  formatGuaranies,
  type Attraction,
  type AttractionInput,
  type ConfigStatus,
} from './types/attraction.ts';

const HERO_IMAGE = '/src/assets/images/hero_asuncion_patrimonio_1795693421902.jpg';

const BUDGET_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Todos los presupuestos', value: '' },
  { label: 'Gratuito (0 Gs.)', value: '0' },
  { label: 'Hasta 25.000 Gs.', value: '25000' },
  { label: 'Hasta 50.000 Gs.', value: '50000' },
  { label: 'Hasta 100.000 Gs.', value: '100000' },
];

function CatalogCardThumbnail({ item }: { item: Attraction }) {
  const [failed, setFailed] = useState(false);

  if (item.imagen_url && !failed) {
    return (
      <img
        src={item.imagen_url}
        alt={item.nombre}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-20 h-20 rounded-lg object-cover border border-stone-200 shrink-0"
      />
    );
  }

  return (
    <div className="w-20 h-20 rounded-lg border border-stone-200 bg-gradient-to-br from-[#EFEAE1] to-[#E3DBD0] flex items-center justify-center shrink-0">
      <Landmark className="w-6 h-6 text-amber-900/75" aria-hidden="true" />
    </div>
  );
}

export default function App() {
  const [allAttractions, setAllAttractions] = useState<Attraction[]>([]);
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('Todos');
  const [maxBudget, setMaxBudget] = useState<string>('');

  // Selection & Modals
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [detailAttraction, setDetailAttraction] = useState<Attraction | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const fetchCatalogAndStatus = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [attrRes, statusRes] = await Promise.all([
        fetch('/api/attractions'),
        fetch('/api/config/status'),
      ]);

      const attrData = await attrRes.json();
      if (!attrRes.ok) {
        throw new Error(attrData.error || 'Error al cargar el catálogo.');
      }

      const items = (attrData.items ?? []) as Attraction[];
      setAllAttractions(items);
      setSelectedMapId((prev) =>
        prev && items.some((i) => i.id === prev) ? prev : (items[0]?.id ?? null),
      );

      if (statusRes.ok) {
        const statusData = (await statusRes.json()) as ConfigStatus;
        setStatus(statusData);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'No se pudo conectar con el servidor.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCatalogAndStatus();
  }, [fetchCatalogAndStatus]);

  const filteredAttractions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const budgetNum = maxBudget !== '' ? Number(maxBudget) : null;

    return allAttractions.filter((item) => {
      if (selectedType !== 'Todos' && item.tipo !== selectedType) {
        return false;
      }
      if (budgetNum !== null && Number.isFinite(budgetNum) && item.costo_entrada > budgetNum) {
        return false;
      }
      if (q) {
        const haystack = [
          item.nombre,
          item.tipo,
          item.direccion,
          item.actividades,
          item.descripcion,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allAttractions, searchQuery, selectedType, maxBudget]);

  useEffect(() => {
    if (
      filteredAttractions.length > 0 &&
      !filteredAttractions.some((item) => item.id === selectedMapId)
    ) {
      setSelectedMapId(filteredAttractions[0].id);
    }
  }, [filteredAttractions, selectedMapId]);

  const museumsCount = useMemo(
    () => allAttractions.filter((item) => item.tipo === 'Museo').length,
    [allAttractions],
  );

  const freeCount = useMemo(
    () => allAttractions.filter((item) => item.costo_entrada === 0).length,
    [allAttractions],
  );

  const handleSaveAttraction = async (
    payload: AttractionInput,
    editingId?: string,
  ) => {
    const url = editingId ? `/api/attractions/${editingId}` : '/api/attractions';
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo guardar el registro.');
    }

    await fetchCatalogAndStatus();
    if (data?.id) {
      setSelectedMapId(data.id);
    }
  };

  const handleDeleteAttraction = async (id: string) => {
    const response = await fetch(`/api/attractions/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo eliminar el registro.');
    }
    setPendingDeleteId(null);
    await fetchCatalogAndStatus();
  };

  const handleSeedSupabase = async () => {
    const response = await fetch('/api/attractions/seed', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo poblar la base de datos.');
    }
    await fetchCatalogAndStatus();
  };

  const handleFocusOnMap = useCallback((id: string) => {
    setSelectedMapId(id);
    const el = document.getElementById('mapa');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-stone-900">
      {/* Three-Zone Top Bar Contract */}
      <header className="border-b border-stone-200 bg-[#FBF9F5]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#inicio"
            className="font-serif text-xl font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
          >
            Turismo Smart AI
          </a>

          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600"
          >
            <a
              href="#catalogo"
              className="hover:text-stone-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Catálogo
            </a>
            <a
              href="#mapa"
              className="hover:text-stone-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Mapa
            </a>
            <a
              href="#asistente"
              className="hover:text-stone-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Asistente IA
            </a>
            <a
              href="#despliegue"
              className="hover:text-stone-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Despliegue
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingAttraction(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-amber-900 rounded-lg hover:bg-amber-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Nuevo atractivo
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section
          id="inicio"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center py-2">
              <p className="text-xs uppercase tracking-widest text-stone-500">
                Asunción · Patrimonio, Museos y Cultura
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-stone-900 mt-3 leading-[1.12] text-balance">
                Catálogo patrimonial y guía inteligente de turismo cultural
              </h1>
              <p className="mt-4 text-base text-stone-600 leading-relaxed max-w-xl">
                Explora museos, monumentos históricos y espacios culturales con tarifas en
                Guaraníes, mapa interactivo en OpenStreetMap con exportación directa a Google
                Maps y un asistente Gemini conectado en vivo a la base de datos.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#catalogo"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0"
                >
                  Explorar catálogo y mapa
                </a>
                <a
                  href="#asistente"
                  className="px-5 py-2.5 text-sm font-medium text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors whitespace-nowrap shrink-0"
                >
                  Consultar asistente IA
                </a>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col">
              <div className="flex-1 rounded-xl overflow-hidden border border-stone-200 bg-[#EBE6DF] min-h-[260px]">
                {!heroImgFailed ? (
                  <img
                    src={HERO_IMAGE}
                    alt="Palacio neoclásico y plaza histórica en Asunción, Paraguay"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full lg:h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                    <Landmark className="w-12 h-12 text-amber-900/70 mb-2" aria-hidden="true" />
                    <p className="font-serif text-xl text-stone-800">
                      Patrimonio Arquitectónico de Asunción
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs font-serif italic text-stone-500 mt-2">
                Fig. 1 — Arquitectura cívica y patrimonio histórico en el centro de Asunción.
              </p>
            </div>
          </div>

          {/* Operational Utility Ribbon */}
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-stone-200 border border-stone-200 rounded-xl bg-white">
            <div className="p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wider text-stone-500">
                Atractivos registrados
              </p>
              <p className="font-serif text-2xl font-semibold text-stone-900 mt-1 tabular-nums">
                {allAttractions.length} sitios
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wider text-stone-500">
                Museos en catálogo
              </p>
              <p className="font-serif text-2xl font-semibold text-stone-900 mt-1 tabular-nums">
                {museumsCount} museos
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wider text-stone-500">
                Acceso gratuito
              </p>
              <p className="font-serif text-2xl font-semibold text-stone-900 mt-1 tabular-nums">
                {freeCount} sin costo
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wider text-stone-500">
                Cartografía y rutas
              </p>
              <p className="font-serif text-2xl font-semibold text-stone-900 mt-1">
                OpenStreetMap + Google Maps
              </p>
            </div>
          </div>
        </section>

        {/* Catalog & Interactive OpenStreetMap Workspace */}
        <section
          id="catalogo"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-stone-200"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500">
                Catálogo curatorial · Gestión CRUD
              </p>
              <h2 className="font-serif text-3xl font-semibold text-stone-900 mt-1">
                Atractivos, horarios y mapa interactivo
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingAttraction(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Agregar lugar al catálogo
            </button>
          </div>

          {/* Search & Multi-Filter Bar */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7 relative">
                <Search
                  className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, dirección o actividad..."
                  aria-label="Buscar atractivos"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FBF9F5] border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900/30 focus:border-amber-900"
                />
              </div>

              <div className="md:col-span-5 flex items-center gap-2">
                <label htmlFor="budget-filter" className="sr-only">
                  Filtrar por presupuesto máximo
                </label>
                <select
                  id="budget-filter"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FBF9F5] border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900/30 focus:border-amber-900"
                >
                  {BUDGET_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Type Segmented Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {['Todos', ...ATTRACTION_TYPES].map((typeName) => {
                const active = selectedType === typeName;
                return (
                  <button
                    key={typeName}
                    type="button"
                    onClick={() => setSelectedType(typeName)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-stone-900 text-[#FBF9F5]'
                        : 'bg-[#F4EFE6] text-stone-700 hover:text-stone-950 hover:bg-[#EAE2D6]'
                    }`}
                  >
                    {typeName}
                  </button>
                );
              })}

              {(searchQuery || selectedType !== 'Todos' || maxBudget !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedType('Todos');
                    setMaxBudget('');
                  }}
                  className="ml-auto text-xs font-medium text-amber-900 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {loadError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-900">
              {loadError}
            </div>
          )}

          {/* Split Catalog List + Sticky OpenStreetMap */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Catalog Items */}
            <div className="lg:col-span-5 space-y-3.5">
              {loading ? (
                <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-sm text-stone-600">
                  Cargando catálogo cultural...
                </div>
              ) : filteredAttractions.length === 0 ? (
                <div className="bg-white border border-stone-200 rounded-xl p-8 text-center space-y-3">
                  <p className="font-serif text-lg text-stone-900">
                    Sin resultados para estos filtros
                  </p>
                  <p className="text-xs text-stone-600">
                    Prueba ampliar el presupuesto en Gs. o seleccionar &quot;Todos&quot; los tipos.
                  </p>
                </div>
              ) : (
                filteredAttractions.map((item, idx) => {
                  const isSelected = selectedMapId === item.id;
                  const isPendingDelete = pendingDeleteId === item.id;

                  return (
                    <article
                      key={item.id}
                      className={`rounded-xl border p-4 transition-colors ${
                        isSelected
                          ? 'bg-[#F7F4EE] border-amber-900/70'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <CatalogCardThumbnail item={item} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span className="font-mono tabular-nums text-stone-400">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-amber-900">{item.tipo}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-stone-800 tabular-nums">
                              {formatGuaranies(item.costo_entrada)}
                            </span>
                          </div>

                          <h3 className="font-serif text-lg font-semibold text-stone-900 mt-1 leading-snug">
                            <button
                              type="button"
                              onClick={() => setSelectedMapId(item.id)}
                              className="text-left hover:text-amber-900 transition-colors cursor-pointer"
                            >
                              {item.nombre}
                            </button>
                          </h3>

                          <p className="text-xs text-stone-600 mt-1.5 line-clamp-2 leading-relaxed">
                            {item.descripcion}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-stone-200/80 space-y-1 text-xs text-stone-600">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" aria-hidden="true" />
                          <span className="truncate">{item.direccion}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" aria-hidden="true" />
                          <span className="truncate">{item.horarios}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailAttraction(item)}
                            className="text-xs font-medium text-stone-900 hover:text-amber-900 underline underline-offset-2 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Ver ficha
                          </button>
                          <span className="text-stone-300" aria-hidden="true">
                            ·
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedMapId(item.id)}
                            className="text-xs font-medium text-stone-700 hover:text-stone-950 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Ubicar en mapa
                          </button>
                          <span className="text-stone-300" aria-hidden="true">
                            ·
                          </span>
                          <a
                            href={buildGoogleMapsViewUrl(
                              item.latitud,
                              item.longitud,
                              item.nombre,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#1E3A8A] hover:underline whitespace-nowrap shrink-0"
                          >
                            Google Maps
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        </div>

                        {!isPendingDelete ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAttraction(item);
                                setIsFormOpen(true);
                              }}
                              aria-label={`Editar ${item.nombre}`}
                              className="p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-200/60 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(item.id)}
                              aria-label={`Eliminar ${item.nombre}`}
                              className="p-1.5 text-stone-500 hover:text-red-700 rounded-md hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleDeleteAttraction(item.id)}
                              className="px-2 py-1 text-[11px] font-medium text-white bg-red-700 rounded hover:bg-red-800 cursor-pointer"
                            >
                              Eliminar
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              className="px-2 py-1 text-[11px] font-medium text-stone-700 bg-stone-200 rounded hover:bg-stone-300 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* Right: Sticky Interactive OpenStreetMap Panel */}
            <div id="mapa" className="lg:col-span-7 lg:sticky lg:top-20">
              <OpenStreetMapPanel
                attractions={filteredAttractions}
                selectedId={selectedMapId}
                onSelectAttraction={setSelectedMapId}
                onOpenDetail={setDetailAttraction}
              />
            </div>
          </div>
        </section>

        {/* Gemini AI Interactive Assistant */}
        <AiAssistantSection
          attractions={allAttractions}
          onFocusAttractionOnMap={handleFocusOnMap}
        />

        {/* Supabase + GitHub + Render Architecture Guide */}
        <DeploymentGuideSection
          status={status}
          onSeedSupabase={handleSeedSupabase}
        />
      </main>

      {/* Clean Institutional Footer */}
      <footer className="border-t border-stone-200 bg-[#F7F4EE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-stone-600">
          <div className="space-y-1">
            <p className="font-serif text-sm font-semibold text-stone-900">
              Turismo Smart AI
            </p>
            <p>
              Colegio Nacional EMD Asunción Escalada · Segundo Bachillerato Técnico en Informática ·
              Gimenez Zarate, Constanza Milagros
            </p>
          </div>
          <div className="flex items-center gap-5 whitespace-nowrap">
            <a href="#catalogo" className="hover:text-stone-950">
              Catálogo
            </a>
            <a href="#mapa" className="hover:text-stone-950">
              Mapa
            </a>
            <a href="#asistente" className="hover:text-stone-950">
              Asistente IA
            </a>
            <a href="#despliegue" className="hover:text-stone-950">
              Despliegue
            </a>
          </div>
        </div>
      </footer>

      {/* Create / Edit Modal */}
      <AttractionFormModal
        isOpen={isFormOpen}
        editingAttraction={editingAttraction}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAttraction(null);
        }}
        onSave={handleSaveAttraction}
      />

      {/* Detail / Accession Drawer */}
      <AttractionDetailDrawer
        attraction={detailAttraction}
        onClose={() => setDetailAttraction(null)}
        onEdit={(item) => {
          setEditingAttraction(item);
          setIsFormOpen(true);
        }}
        onDelete={handleDeleteAttraction}
        onFocusMap={handleFocusOnMap}
      />
    </div>
  );
}
