import { Plus } from 'lucide-react';

export type ActiveView = 'explorar' | 'mapa' | 'asistente' | 'despliegue';

interface TopBarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onOpenCreate: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveView; label: string }> = [
  { id: 'explorar', label: 'Catálogo' },
  { id: 'mapa', label: 'Mapa' },
  { id: 'asistente', label: 'Asistente IA' },
  { id: 'despliegue', label: 'Despliegue' },
];

export function TopBar({ activeView, onNavigate, onOpenCreate }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zona 1: Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('explorar')}
          className="font-display text-left text-xl font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-900"
        >
          Turismo Smart AI
        </button>

        {/* Zona 2: Enlaces de navegación de una sola línea */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-900 ${
                  isActive
                    ? 'text-blue-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-[2px] bg-blue-900"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zona 3: Acción primaria */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-blue-950 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Nuevo sitio</span>
          </button>
        </div>
      </div>

      {/* Barra compacta en móviles (mantiene altura <= 15% del viewport) */}
      <nav
        aria-label="Navegación móvil"
        className="flex md:hidden items-center justify-around border-t border-slate-100 px-2 py-1.5 text-xs font-medium text-slate-600"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`px-2.5 py-1.5 rounded-md whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
