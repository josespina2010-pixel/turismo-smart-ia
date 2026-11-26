import { ExternalLink, Loader2, MapPin, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ChatMessage, TourismSite } from '../types/tourism.ts';
import { buildGoogleMapsRouteUrl, formatGuaranies } from '../utils/maps.ts';

interface GeminiAssistantProps {
  sites: TourismSite[];
  onFocusSiteOnMap: (site: TourismSite) => void;
}

const TEST_PROMPTS = [
  '¿Qué lugares registrados puedo visitar con 50.000 Gs.?',
  '¿Qué museos del catálogo puedo visitar?',
  '¿Puedes sugerir un itinerario con los lugares registrados?',
];

export function GeminiAssistant({ sites, onFocusSiteOnMap }: GeminiAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hola. Soy el asistente inteligente de Turismo Smart AI. Consulto en tiempo real los sitios turísticos, museos, horarios y tarifas registrados en la base de datos para ayudarte a planificar visitas, filtrar por presupuesto en Guaraníes o armar un itinerario.',
      timestamp: new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        recommendedSiteIds?: string[];
        suggestedGoogleMapsRoute?: boolean;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Error al consultar el asistente inteligente.');
      }

      const aiMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply || 'Sin respuesta disponible.',
        recommendedSiteIds: data.recommendedSiteIds || [],
        suggestedGoogleMapsRoute: Boolean(data.suggestedGoogleMapsRoute),
        timestamp: new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo conectar con Gemini API.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: 'Conversación reiniciada. Realiza una nueva consulta sobre el catálogo actual.',
        timestamp: new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setErrorMsg(null);
  };

  return (
    <div className="border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/70 px-6 py-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">
            Asistente Inteligente Gemini
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Respuestas dinámicas conectadas en tiempo real con los {sites.length} registros del catálogo.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetChat}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Limpiar chat</span>
        </button>
      </div>

      {/* Consultas de prueba rápidas */}
      <div className="border-b border-slate-200 bg-white px-6 py-3.5">
        <p className="text-xs font-semibold text-slate-600">Consultas rápidas de prueba:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TEST_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => sendPrompt(q)}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:border-blue-900/40 hover:bg-blue-50/60 hover:text-blue-950 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Historial de mensajes */}
      <div className="max-h-[460px] space-y-5 overflow-y-auto px-6 py-5">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const recommendedSites = (msg.recommendedSiteIds || [])
            .map((id) => sites.find((s) => s.id === id))
            .filter((s): s is TourismSite => Boolean(s));
          const routeUrl = buildGoogleMapsRouteUrl(recommendedSites);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-medium text-slate-600">
                  {isUser ? 'Tú' : 'Asistente Turismo Smart AI'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-3xl whitespace-pre-line rounded-lg px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-blue-900 text-white'
                    : 'border border-slate-200 bg-slate-50/70 text-slate-800'
                }`}
              >
                {msg.text}
              </div>

              {/* Sitios referenciados por Gemini con enlace directo al mapa OpenStreetMap y Google Maps */}
              {!isUser && recommendedSites.length > 0 && (
                <div className="mt-2.5 w-full max-w-3xl border border-slate-200 bg-white p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">
                      Lugares consultados del registro ({recommendedSites.length})
                    </span>
                    {msg.suggestedGoogleMapsRoute && routeUrl && (
                      <a
                        href={routeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 hover:underline whitespace-nowrap shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Abrir itinerario en Google Maps</span>
                      </a>
                    )}
                  </div>

                  <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {recommendedSites.map((site) => (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => onFocusSiteOnMap(site)}
                        className="flex items-start justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-left transition-colors hover:border-blue-900/40 hover:bg-blue-50/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900">
                            {site.nombre}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {site.tipo} ·{' '}
                            <span className="font-mono tabular-nums">
                              {formatGuaranies(site.costo_entrada)}
                            </span>
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-900 shrink-0">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          Mapa
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-blue-900" aria-hidden="true" />
            <span>Consultando base de datos y generando respuesta con Gemini...</span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
          >
            {errorMsg}
          </div>
        )}
      </div>

      {/* Barra de envío */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendPrompt(input);
        }}
        className="flex items-center gap-3 border-t border-slate-200 bg-white px-6 py-4"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Pregunta por museos, presupuesto en Gs., horarios o solicita un itinerario..."
          className="flex-1 rounded-md border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-900 focus:outline-none disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-950 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Enviar</span>
        </button>
      </form>
    </div>
  );
}
