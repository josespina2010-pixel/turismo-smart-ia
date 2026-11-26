import type { Attraction } from '../types/attraction.ts';

export const SEED_ATTRACTIONS: Attraction[] = [
  {
    id: 'panteon-nacional-heroes',
    nombre: 'Panteón Nacional de los Héroes',
    tipo: 'Sitio Histórico',
    descripcion:
      'Monumento arquitectónico neoclásico inaugurado en 1936 que alberga los restos de figuras históricas del Paraguay y funciona como símbolo cívico del centro asunceno.',
    direccion: 'Palma y Chile, Centro Histórico, Asunción',
    contacto: '+595 21 441 440',
    latitud: -25.282089,
    longitud: -57.635069,
    actividades:
      'Visita guiada histórica, Observación del cambio de guardia, Fotografía arquitectónica',
    horarios: 'Lunes a Sábado de 08:30 a 17:30 hs · Domingos de 09:00 a 12:30 hs',
    costo_entrada: 0,
    imagen_url: '/src/assets/images/panteon_heroes_asuncion_1795693406188.jpg',
    created_at: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'museo-casa-independencia',
    nombre: 'Museo Casa de la Independencia',
    tipo: 'Museo',
    descripcion:
      'Vivienda colonial de 1772 donde se gestó la emancipación paraguaya en mayo de 1811. Conserva mobiliario de época, documentos históricos y el emblemático Callejón Histórico.',
    direccion: '14 de Mayo esq. Presidente Franco, Asunción',
    contacto: '+595 21 493 918 · casadelaindependencia.org.py',
    latitud: -25.280614,
    longitud: -57.637864,
    actividades:
      'Recorrido por salas coloniales, Callejón Histórico, Exhibición de documentos de 1811',
    horarios: 'Martes a Viernes de 08:00 a 18:00 hs · Sábados de 08:00 a 13:00 hs',
    costo_entrada: 0,
    imagen_url: '/src/assets/images/museo_casa_independencia_1795693405505.jpg',
    created_at: '2026-01-11T09:00:00.000Z',
  },
  {
    id: 'museo-del-barro',
    nombre: 'Centro de Artes Visuales / Museo del Barro',
    tipo: 'Museo',
    descripcion:
      'Referente museográfico del Paraguay que reúne colecciones de arte indígena, cerámica popular tradicional y artes visuales contemporáneas del país y la región.',
    direccion: 'Grabadores del Cabichuí 2716, Isla de Francia, Asunción',
    contacto: '+595 21 607 996 · museodelbarro.org',
    latitud: -25.276482,
    longitud: -57.562134,
    actividades:
      'Exhibición de cerámica indígena, Arte popular paraguayo, Salas de arte contemporáneo',
    horarios: 'Martes a Sábado de 14:00 a 20:00 hs (Acceso gratuito viernes y sábados)',
    costo_entrada: 40000,
    imagen_url: '/src/assets/images/museo_del_barro_1795693405930.jpg',
    created_at: '2026-01-12T09:00:00.000Z',
  },
  {
    id: 'palacio-de-los-lopez',
    nombre: 'Palacio de los López',
    tipo: 'Sitio Histórico',
    descripcion:
      'Sede del Poder Ejecutivo y joya arquitectónica decimonónica frente a la Bahía de Asunción. Su explanada y jardines ofrecen vistas abiertas hacia la Costanera.',
    direccion: "El Paraguayo Independiente entre Ayolas y O'Leary, Asunción",
    contacto: '+595 21 414 0000',
    latitud: -25.277576,
    longitud: -57.637652,
    actividades:
      'Recorrido exterior arquitectónico, Iluminación nocturna, Paseo hacia la Costanera',
    horarios: 'Visitas exteriores todos los días de 07:00 a 22:00 hs',
    costo_entrada: 0,
    imagen_url: '/src/assets/images/hero_asuncion_patrimonio_1795693421902.jpg',
    created_at: '2026-01-13T09:00:00.000Z',
  },
  {
    id: 'centro-cultural-cabildo',
    nombre: 'Centro Cultural de la República El Cabildo',
    tipo: 'Espacio Cultural',
    descripcion:
      'Antigua sede legislativa convertida en centro cultural multidisciplinario con salas dedicadas al arpa paraguaya, música, cine, arte sacro e historia nacional.',
    direccion: 'Avda. República y Alberdi, Centro Histórico, Asunción',
    contacto: '+595 21 443 094 · cabildocultura.gov.py',
    latitud: -25.279715,
    longitud: -57.633971,
    actividades:
      'Museo de música e historia, Galería de arte sacro, Exposiciones temporales y conciertos',
    horarios: 'Martes a Viernes de 09:00 a 19:00 hs · Fines de semana de 09:00 a 17:00 hs',
    costo_entrada: 0,
    imagen_url: '',
    created_at: '2026-01-14T09:00:00.000Z',
  },
  {
    id: 'museo-ferroviario-estacion-central',
    nombre: 'Museo Ferroviario Estación Central',
    tipo: 'Museo',
    descripcion:
      'Histórica terminal ferroviaria de 1861 que conserva locomotoras a vapor inglesas, vagones de madera de época, telégrafos y archivos de la historia ferroviaria sudamericana.',
    direccion: 'Eligio Ayala 145 esq. México, Asunción',
    contacto: '+595 21 443 273 · fepasa.com.py',
    latitud: -25.284672,
    longitud: -57.631193,
    actividades:
      'Visita a locomotoras históricas a vapor, Recorrido por vagones presidenciales, Archivo ferroviario',
    horarios: 'Lunes a Viernes de 08:30 a 15:30 hs · Sábados de 09:00 a 13:00 hs',
    costo_entrada: 15000,
    imagen_url: '',
    created_at: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'loma-san-jeronimo',
    nombre: 'Loma San Jerónimo',
    tipo: 'Mirador y Paseo',
    descripcion:
      'Barrio tradicional de callejones peatonales coloridos, escalinatas artísticas y miradores sobre la Bahía de Asunción, reconocido por su turismo comunitario y ferias culturales.',
    direccion: 'Agustín Barboza y Estrella, Barrio San Jerónimo, Asunción',
    contacto: '+595 981 452 100 · Turismo Comunitario San Jerónimo',
    latitud: -25.276841,
    longitud: -57.644872,
    actividades:
      'Caminata por pasillos coloridos, Mirador a la Bahía, Degustación de gastronomía típica',
    horarios: 'Todos los días de 09:00 a 20:00 hs (Feria gastronómica domingos)',
    costo_entrada: 25000,
    imagen_url: '',
    created_at: '2026-01-16T09:00:00.000Z',
  },
];
