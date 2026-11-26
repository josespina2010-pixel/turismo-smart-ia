import { formatGuaranies, type Attraction } from '../types/attraction.ts';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function generateKmlDocument(attractions: Attraction[]): string {
  const placemarks = attractions
    .map((item) => {
      const details = [
        `Tipo: ${item.tipo}`,
        `Dirección: ${item.direccion}`,
        `Horarios: ${item.horarios}`,
        `Costo: ${formatGuaranies(item.costo_entrada)}`,
        `Actividades: ${item.actividades}`,
        `Contacto: ${item.contacto}`,
        '',
        item.descripcion,
      ].join('\n');

      return `  <Placemark>
    <name>${escapeXml(item.nombre)}</name>
    <description>${escapeXml(details)}</description>
    <Point>
      <coordinates>${item.longitud},${item.latitud},0</coordinates>
    </Point>
  </Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Turismo Smart AI - Catálogo Cultural</name>
  <description>Ubicaciones exportadas desde Turismo Smart AI para importar en Google My Maps o Google Earth.</description>
${placemarks}
</Document>
</kml>
`;
}

export function downloadKmlFile(attractions: Attraction[]): void {
  const kml = generateKmlDocument(attractions);
  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'turismo-smart-ai-ubicaciones.kml';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
