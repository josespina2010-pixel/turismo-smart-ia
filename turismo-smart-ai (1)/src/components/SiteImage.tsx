import { Landmark, MapPin, Palette, Trees, Utensils } from 'lucide-react';
import { useState } from 'react';
import type { TourismCategory } from '../types/tourism.ts';

interface SiteImageProps {
  src?: string | null;
  alt: string;
  tipo: TourismCategory;
  className?: string;
}

function getCategoryVisual(tipo: TourismCategory) {
  switch (tipo) {
    case 'Museo':
      return {
        bg: 'from-slate-100 via-stone-100 to-blue-50',
        Icon: Landmark,
        accent: 'text-blue-900',
      };
    case 'Sitio Histórico':
      return {
        bg: 'from-stone-100 via-slate-100 to-amber-50/70',
        Icon: Landmark,
        accent: 'text-stone-800',
      };
    case 'Parque y Naturaleza':
      return {
        bg: 'from-emerald-50/70 via-stone-100 to-slate-100',
        Icon: Trees,
        accent: 'text-emerald-900',
      };
    case 'Gastronomía y Mercado':
      return {
        bg: 'from-amber-50/60 via-stone-100 to-slate-100',
        Icon: Utensils,
        accent: 'text-slate-800',
      };
    case 'Espacio Cultural':
    default:
      return {
        bg: 'from-blue-50/60 via-slate-100 to-stone-100',
        Icon: Palette,
        accent: 'text-blue-900',
      };
  }
}

export function SiteImage({ src, alt, tipo, className = '' }: SiteImageProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    );
  }

  const { bg, Icon, accent } = getCategoryVisual(tipo);

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative flex flex-col items-center justify-center bg-gradient-to-br ${bg} p-6 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/80 bg-white/80">
        <Icon className={`h-5 w-5 ${accent}`} aria-hidden="true" />
      </div>
      <span className="mt-3 max-w-[200px] truncate text-xs font-medium text-slate-600">
        {tipo}
      </span>
      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
        <MapPin className="h-3 w-3" aria-hidden="true" />
        Asunción, Paraguay
      </span>
    </div>
  );
}
