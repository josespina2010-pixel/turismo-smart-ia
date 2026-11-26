import type { TourismSite } from '../types/tourism.ts';

export function formatGuaranies(amount: number): string {
  if (!amount || amount <= 0) {
    return 'Entrada libre';
  }
  return `${new Intl.NumberFormat('es-PY').format(amount)} Gs.`;
}

export function buildGoogleMapsPlaceUrl(site: Pick<TourismSite, 'latitud' | 'longitud'>): string {
  const coords = `${site.latitud},${site.longitud}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`;
}

export function buildGoogleMapsDirectionsUrl(site: Pick<TourismSite, 'latitud' | 'longitud'>): string {
  const coords = `${site.latitud},${site.longitud}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coords)}`;
}

export function buildGoogleMapsRouteUrl(sites: TourismSite[]): string | null {
  if (sites.length === 0) return null;
  if (sites.length === 1) {
    return buildGoogleMapsPlaceUrl(sites[0]);
  }
  const limited = sites.slice(0, 10);
  const pathSegments = limited.map((s) => `${s.latitud},${s.longitud}`).join('/');
  return `https://www.google.com/maps/dir/${pathSegments}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function downloadSitesAsKml(sites: TourismSite[], filename = 'turismo-smart-ai-google-maps.kml'): void {
  const placemarks = sites
    .map(
      (site) => `    <Placemark>
      <name>${escapeXml(site.nombre)}</name>
      <description>${escapeXml(
        `${site.tipo} · ${formatGuaranies(site.costo_entrada)}\nDirección: ${site.direccion}\nHorarios: ${site.horarios}\nContacto: ${site.contacto}`
      )}</description>
      <Point>
        <coordinates>${site.longitud},${site.latitud},0</coordinates>
      </Point>
    </Placemark>`
    )
    .join('\n');

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Turismo Smart AI - Ubicaciones</name>
    <description>Catálogo de sitios turísticos, museos y espacios culturales exportado desde OpenStreetMap para Google My Maps.</description>
${placemarks}
  </Document>
</kml>`;

  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSitesAsGeoJson(sites: TourismSite[], filename = 'turismo-smart-ai.geojson'): void {
  const geojson = {
    type: 'FeatureCollection',
    features: sites.map((site) => ({
      type: 'Feature',
      properties: {
        id: site.id,
        nombre: site.nombre,
        tipo: site.tipo,
        direccion: site.direccion,
        horarios: site.horarios,
        costo_entrada_gs: site.costo_entrada,
        contacto: site.contacto,
        google_maps_url: buildGoogleMapsPlaceUrl(site),
      },
      geometry: {
        type: 'Point',
        coordinates: [site.longitud, site.latitud],
      },
    })),
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], {
    type: 'application/geo+json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
