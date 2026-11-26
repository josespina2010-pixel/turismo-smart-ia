# Turismo Smart AI

Sistema web dinámico dedicado a sitios turísticos, museos y espacios culturales, con base de datos en **Supabase**, mapa interactivo con **OpenStreetMap (Leaflet)** con exportación directa a **Google Maps**, y asistente inteligente integrado con **Gemini API (`@google/genai`)**.

- **Institución:** Colegio Nacional EMD Asunción Escalada
- **Curso:** Segundo Bachillerato Técnico en Informática
- **Alumna:** Giménez Zárate, Constanza Milagros

## Funcionalidades principales

- **Catálogo cultural CRUD:** Altas, bajas, modificaciones, consultas detalladas, búsqueda en tiempo real y filtrado por tipo de atractivo o presupuesto máximo en Guaraníes (Gs.).
- **Mapa OpenStreetMap + Enlace a Google Maps:** Visualización interactiva de todos los puntos registrados con Leaflet + OpenStreetMap, captura de coordenadas al hacer clic en el mapa, enlace directo para abrir o trazar ruta en **Google Maps**, y exportación **KML** compatible con Google My Maps.
- **Asistente Inteligente (Gemini API):** Chat en tiempo real que consulta los registros actuales de la base de datos y responde preguntas sobre presupuestos, museos disponibles e itinerarios personalizados.
- **Arquitectura lista para Supabase + GitHub + Render:** Todas las claves privadas se gestionan mediante variables de entorno en el servidor (`server.ts`).

## Despliegue en Supabase + GitHub + Render

1. **Supabase:**
   - Crea un proyecto en Supabase y abre el **SQL Editor**.
   - Ejecuta el contenido de `supabase/schema.sql` para crear la tabla `sitios_turisticos`.
   - En **Settings -> API**, copia `Project URL` (`SUPABASE_URL`) y `service_role` (`SUPABASE_SERVICE_ROLE_KEY`).
2. **GitHub:**
   - Sube este repositorio a tu cuenta de GitHub (`git init`, `git add .`, `git commit -m "Turismo Smart AI"`, `git push`).
3. **Render:**
   - Crea un **Web Service** conectado a tu repositorio de GitHub (o importa `render.yaml`).
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Agrega las variables de entorno en Render:
     - `NODE_ENV=production`
     - `GEMINI_API_KEY=<tu clave de Google AI Studio>`
     - `SUPABASE_URL=<tu URL de Supabase>`
     - `SUPABASE_SERVICE_ROLE_KEY=<tu Service Role Key de Supabase>`
