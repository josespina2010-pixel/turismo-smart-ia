# Turismo Smart AI

Sistema web dinámico dedicado a sitios turísticos, museos y espacios culturales, desarrollado para el Examen Práctico Individual del **Colegio Nacional EMD Asunción Escalada** (Segundo Bachillerato Técnico en Informática — **Gimenez Zarate, Constanza Milagros**).

## Funcionalidades principales

- **Catálogo patrimonial completo (CRUD)**: Altas, bajas, modificaciones, consultas detalladas, búsqueda en tiempo real y filtrado por tipo de atractivo y presupuesto máximo en Guaraníes (`Gs.`).
- **Base de datos en Supabase (PostgreSQL)**: Persistencia en la tabla `atractivos_turisticos` con nombre, tipo, descripción, dirección, contacto, latitud, longitud, actividades, horarios y costo de entrada (con respaldo local automático para vista previa).
- **Mapa interactivo con OpenStreetMap (Leaflet) + puente a Google Maps**:
  - Visualización de marcadores interactivos en OpenStreetMap y selector de coordenadas por clic al crear o editar un atractivo.
  - Botones directos **Ver en Google Maps** y **Cómo llegar en Google Maps** para cada ubicación.
  - Botón **Abrir ruta en Google Maps** para generar un itinerario multiparada con las ubicaciones filtradas.
  - Botón **Exportar KML (Google Maps)** para importar todas las ubicaciones directamente en Google My Maps.
- **Asistente inteligente con Gemini API (`@google/genai`)**: Chat conectado al servidor que lee en vivo los registros reales del catálogo para responder consultas sobre presupuestos, museos e itinerarios.

## Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Abre **SQL Editor** → **New Query**, pega el contenido de `supabase/schema.sql` y ejecútalo.
3. En **Project Settings → API**, copia `Project URL` y `anon public` key.

## Variables de entorno (`.env`)

```env
GEMINI_API_KEY=tu_clave_de_gemini
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

## Publicación en GitHub y Render

1. Sube el código a GitHub (`git add . && git commit -m "Turismo Smart AI" && git push`).
2. En [Render](https://render.com), crea un **New Web Service** conectado a tu repositorio (o utiliza `render.yaml`).
3. Configura:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Agrega en **Environment Variables** las claves `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `NODE_ENV=production`.
