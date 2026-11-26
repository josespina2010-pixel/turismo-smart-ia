import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createAttraction,
  deleteAttraction,
  getAttractionById,
  isSupabaseConfigured,
  listAttractions,
  seedDatabaseIfEmpty,
  updateAttraction,
  validateAttractionInput,
} from './src/server/repository.ts';
import { formatGuaranies } from './src/types/attraction.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Healthcheck for Render & monitoring
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Configuration status (without exposing secret values)
  app.get('/api/config/status', async (_req, res) => {
    try {
      const { items, storageMode } = await listAttractions();
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      res.json({
        storageMode,
        supabaseConfigured: isSupabaseConfigured(),
        geminiConfigured: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
        totalAttractions: items.length,
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo obtener el estado del sistema.',
      });
    }
  });

  // Read / Search / Filter
  app.get('/api/attractions', async (req, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : '';
      const tipo = typeof req.query.tipo === 'string' ? req.query.tipo : '';
      const maxBudgetRaw = req.query.maxBudget;
      const maxBudget =
        typeof maxBudgetRaw === 'string' && maxBudgetRaw.trim() !== ''
          ? Number(maxBudgetRaw)
          : null;

      const result = await listAttractions({ search, tipo, maxBudget });
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Error al consultar el catálogo.',
      });
    }
  });

  // Read single record
  app.get('/api/attractions/:id', async (req, res) => {
    try {
      const item = await getAttractionById(req.params.id);
      if (!item) {
        res.status(404).json({ error: 'Atractivo no encontrado.' });
        return;
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Error al obtener el atractivo.',
      });
    }
  });

  // Create
  app.post('/api/attractions', async (req, res) => {
    const validation = validateAttractionInput(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }
    try {
      const created = await createAttraction(validation.data);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Error al registrar el atractivo.',
      });
    }
  });

  // Update
  app.put('/api/attractions/:id', async (req, res) => {
    const validation = validateAttractionInput(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }
    try {
      const updated = await updateAttraction(req.params.id, validation.data);
      if (!updated) {
        res.status(404).json({ error: 'Atractivo no encontrado.' });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Error al actualizar el atractivo.',
      });
    }
  });

  // Delete
  app.delete('/api/attractions/:id', async (req, res) => {
    try {
      const deleted = await deleteAttraction(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Atractivo no encontrado.' });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Error al eliminar el atractivo.',
      });
    }
  });

  // Seed empty Supabase table with initial Asunción landmarks
  app.post('/api/attractions/seed', async (_req, res) => {
    try {
      const result = await seedDatabaseIfEmpty();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Error al poblar la base de datos.',
      });
    }
  });

  // Gemini AI Chat Assistant grounded in live database records
  app.post('/api/chat', async (req, res) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message) {
      res.status(400).json({ error: 'Escribe una consulta para el asistente.' });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'El servicio de Gemini AI requiere configurar la variable de entorno GEMINI_API_KEY en el servidor (Settings > Secrets o en Render).',
      });
      return;
    }

    try {
      const { items, storageMode } = await listAttractions();

      const catalogContext = items.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        tipo: item.tipo,
        direccion: item.direccion,
        contacto: item.contacto,
        horarios: item.horarios,
        costo_entrada_gs: item.costo_entrada,
        costo_legible: formatGuaranies(item.costo_entrada),
        actividades: item.actividades,
        latitud: item.latitud,
        longitud: item.longitud,
        descripcion: item.descripcion,
      }));

      const systemInstruction = [
        'Eres el Asistente Turístico Inteligente de "Turismo Smart AI", dedicado a sitios turísticos, museos y espacios culturales.',
        `Origen de datos actual: ${storageMode === 'supabase' ? 'Base de datos Supabase en vivo' : 'Catálogo local sincronizado'} (${items.length} registros).`,
        'REGLAS ESTRICTAS:',
        '1. Responde siempre en español claro, amable y bien estructurado.',
        '2. Basa TODAS tus recomendaciones, precios en Guaraníes (Gs.), horarios, direcciones y actividades EXCLUSIVAMENTE en los registros reales proporcionados abajo. No inventes lugares ni tarifas.',
        '3. Si el usuario pregunta por un presupuesto en Gs. (por ejemplo 50.000 Gs.), calcula qué lugares individuales o combinaciones de lugares puede visitar sin superar ese monto, mostrando el costo exacto de cada uno.',
        '4. Si pide museos, enumera los lugares cuyo tipo sea "Museo" (y menciona espacios culturales con salas museográficas si corresponde, aclarando su tipo).',
        '5. Si pide un itinerario, organiza los lugares reales en un recorrido lógico por horario (mañana / tarde), indicando dirección, actividades, costo total estimado y cómo abrirlos en el mapa.',
        '6. Cuando menciones un lugar del catálogo, usa exactamente su nombre registrado para que el usuario pueda identificarlo fácilmente.',
        '',
        'REGISTROS REALES DEL CATÁLOGO (JSON):',
        JSON.stringify(catalogContext, null, 2),
      ].join('\n');

      const recentHistory = history
        .slice(-8)
        .filter(
          (entry: unknown): entry is { role: string; text: string } =>
            Boolean(entry) &&
            typeof entry === 'object' &&
            typeof (entry as { text?: unknown }).text === 'string',
        )
        .map((entry: { role: string; text: string }) => ({
          role: entry.role === 'model' ? 'model' : 'user',
          parts: [{ text: entry.text }],
        }));

      const contents = [
        ...recentHistory,
        { role: 'user', parts: [{ text: message }] },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
        },
      });

      const replyText =
        response.text?.trim() ||
        'No se recibió contenido del asistente. Intenta reformular tu pregunta.';

      const normalizedReply = replyText.toLowerCase();
      const referencedIds = items
        .filter((item) => normalizedReply.includes(item.nombre.toLowerCase()))
        .map((item) => item.id);

      res.json({
        reply: replyText,
        referencedIds,
      });
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : 'Error al consultar Gemini AI.';
      res.status(502).json({
        error: `No se pudo generar la respuesta del asistente Gemini: ${errMsg}`,
      });
    }
  });

  // Vite middleware in development, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Turismo Smart AI escuchando en http://0.0.0.0:${PORT}`);
  });
}

startServer();
