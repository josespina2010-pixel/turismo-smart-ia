import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import {
  createSite,
  deleteSite,
  getSystemHealth,
  listSites,
  updateSite,
  validateSitePayload,
} from './server/repository.ts';

const PORT = Number(process.env.PORT || 3000);

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isSafeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{3,80}$/.test(id);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Estado del sistema (sin exponer claves ni secretos)
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      const status = await getSystemHealth();
      res.json(status);
    } catch (err) {
      res.status(500).json({
        error: 'No se pudo verificar el estado del servidor.',
        detail: err instanceof Error ? err.message : undefined,
      });
    }
  });

  // Listar y filtrar sitios turísticos
  app.get('/api/sites', async (req: Request, res: Response) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const tipo = typeof req.query.tipo === 'string' ? req.query.tipo : undefined;
      const maxCostRaw = typeof req.query.maxCost === 'string' ? req.query.maxCost : undefined;
      const maxCost =
        maxCostRaw !== undefined && maxCostRaw !== '' && !Number.isNaN(Number(maxCostRaw))
          ? Number(maxCostRaw)
          : null;

      const result = await listSites({ search, tipo, maxCost });
      res.json(result);
    } catch (err) {
      res.status(500).json({
        error: 'Error al consultar el catálogo de sitios turísticos.',
        detail: err instanceof Error ? err.message : undefined,
      });
    }
  });

  // Crear nuevo sitio turístico
  app.post('/api/sites', async (req: Request, res: Response) => {
    try {
      const { data, error } = validateSitePayload(req.body);
      if (error || !data) {
        res.status(400).json({ error: error || 'Datos inválidos.' });
        return;
      }
      const created = await createSite(data);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({
        error: 'No se pudo guardar el nuevo sitio turístico.',
        detail: err instanceof Error ? err.message : undefined,
      });
    }
  });

  // Actualizar sitio existente
  app.put('/api/sites/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '');
      if (!isSafeId(id)) {
        res.status(400).json({ error: 'Identificador de sitio no válido.' });
        return;
      }
      const { data, error } = validateSitePayload(req.body);
      if (error || !data) {
        res.status(400).json({ error: error || 'Datos inválidos.' });
        return;
      }
      const updated = await updateSite(id, data);
      if (!updated.site) {
        res.status(404).json({ error: 'Sitio turístico no encontrado.' });
        return;
      }
      res.json(updated);
    } catch (err) {
      res.status(500).json({
        error: 'No se pudo actualizar el sitio turístico.',
        detail: err instanceof Error ? err.message : undefined,
      });
    }
  });

  // Eliminar sitio
  app.delete('/api/sites/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '');
      if (!isSafeId(id)) {
        res.status(400).json({ error: 'Identificador de sitio no válido.' });
        return;
      }
      const result = await deleteSite(id);
      if (!result.deleted) {
        res.status(404).json({ error: 'Sitio turístico no encontrado.' });
        return;
      }
      res.json({ ok: true, source: result.source });
    } catch (err) {
      res.status(500).json({
        error: 'No se pudo eliminar el sitio turístico.',
        detail: err instanceof Error ? err.message : undefined,
      });
    }
  });

  // Asistente Inteligente con Gemini API consultando registros reales de la base de datos
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        message?: unknown;
        history?: Array<{ role?: string; text?: string }>;
      };

      const message = typeof body?.message === 'string' ? body.message.trim() : '';
      if (!message || message.length > 1500) {
        res.status(400).json({ error: 'Escribe una consulta válida (máximo 1500 caracteres).' });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'La clave GEMINI_API_KEY no está configurada en el servidor. Configúrala en Settings > Secrets o en las variables de entorno de Render.',
        });
        return;
      }

      const { sites, source } = await listSites({});
      const catalogContext = sites.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        tipo: s.tipo,
        costo_entrada_gs: s.costo_entrada,
        horarios: s.horarios,
        direccion: s.direccion,
        contacto: s.contacto,
        latitud: s.latitud,
        longitud: s.longitud,
        actividades: s.actividades,
        descripcion: s.descripcion,
      }));

      const conversationHistory = Array.isArray(body?.history)
        ? body.history
            .slice(-6)
            .filter(
              (h) =>
                h &&
                (h.role === 'user' || h.role === 'model') &&
                typeof h.text === 'string' &&
                h.text.trim()
            )
            .map((h) => `${h.role === 'user' ? 'Usuario' : 'Asistente'}: ${h.text!.trim()}`)
            .join('\n')
        : '';

      const systemInstruction = `Eres el guía turístico inteligente de "Turismo Smart AI", una plataforma cultural de Asunción y Paraguay.
Tu única fuente de verdad para responder sobre lugares, museos, precios en Guaraníes (Gs.), horarios, direcciones y actividades es el siguiente catálogo real obtenido en vivo de la base de datos (origen: ${source}):

${JSON.stringify(catalogContext, null, 2)}

Reglas estrictas:
1. Responde siempre en español claro, amable y bien organizado.
2. Utiliza únicamente los lugares registrados en el catálogo de arriba; nunca inventes museos, precios ni direcciones fuera del registro real.
3. Cuando el usuario pregunte por un presupuesto (por ejemplo, "50.000 Gs."), verifica el campo costo_entrada_gs de cada sitio, menciona qué lugares entran dentro de ese monto (tanto individualmente como combinando entradas gratuitas y pagas cuya suma no supere el presupuesto) y especifica el costo exacto en Gs.
4. Cuando te pidan un itinerario, organiza las paradas en un orden geográfico lógico con horarios, dirección, actividades destacadas y costo total en Guaraníes.
5. Incluye en recommendedSiteIds los IDs exactos de los sitios del catálogo que mencionas en tu respuesta para que el usuario pueda verlos en el mapa OpenStreetMap o abrir la ruta en Google Maps.
6. Marca suggestedGoogleMapsRoute como true cuando recomiendes 2 o más lugares o un itinerario.`;

      const prompt = conversationHistory
        ? `Historial reciente:\n${conversationHistory}\n\nNueva consulta del usuario:\n${message}`
        : message;

      const callGeminiWithRetry = async () => {
        const delays = [500, 1200];
        let lastErr: unknown;
        for (let attempt = 0; attempt <= delays.length; attempt++) {
          try {
            return await ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: prompt,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    reply: {
                      type: Type.STRING,
                      description:
                        'Respuesta detallada y estructurada en español usando saltos de línea y listas limpias.',
                    },
                    recommendedSiteIds: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description:
                        'Lista de los IDs exactos de los sitios del catálogo mencionados en la respuesta.',
                    },
                    suggestedGoogleMapsRoute: {
                      type: Type.BOOLEAN,
                      description:
                        'True si conviene ofrecer al usuario abrir el recorrido en Google Maps.',
                    },
                  },
                  required: ['reply', 'recommendedSiteIds', 'suggestedGoogleMapsRoute'],
                },
              },
            });
          } catch (err) {
            lastErr = err;
            const msg = err instanceof Error ? err.message : '';
            const isTransient = msg.includes('503') || msg.includes('429') || msg.includes('UNAVAILABLE');
            if (!isTransient || attempt === delays.length) {
              throw err;
            }
            await new Promise((r) => setTimeout(r, delays[attempt]));
          }
        }
        throw lastErr;
      };

      const response = await callGeminiWithRetry();

      const rawText = (response.text ?? '{}').trim();
      let parsed: {
        reply?: string;
        recommendedSiteIds?: string[];
        suggestedGoogleMapsRoute?: boolean;
      };
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {
          reply: rawText || 'No se pudo interpretar la respuesta del asistente.',
          recommendedSiteIds: [],
          suggestedGoogleMapsRoute: false,
        };
      }

      const validIdSet = new Set(sites.map((s) => s.id));
      const safeRecommendedIds = Array.isArray(parsed.recommendedSiteIds)
        ? parsed.recommendedSiteIds.filter((id) => validIdSet.has(id))
        : [];

      res.json({
        reply: parsed.reply || 'Consulta procesada.',
        recommendedSiteIds: safeRecommendedIds,
        suggestedGoogleMapsRoute: Boolean(parsed.suggestedGoogleMapsRoute),
        catalogCount: sites.length,
        source,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error interno del asistente.';
      res.status(502).json({
        error: `No se pudo obtener respuesta de Gemini API: ${msg}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Turismo Smart AI escuchando en http://0.0.0.0:${PORT}`);
  });
}

startServer();
