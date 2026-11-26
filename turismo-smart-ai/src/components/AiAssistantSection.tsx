import {
  Bot,
  ExternalLink,
  MapPin,
  RotateCcw,
  Send,
} from 'lucide-react';
import { Fragment, useState, type FormEvent } from 'react';
import {
  buildGoogleMapsViewUrl,
  type Attraction,
  type ChatMessage,
} from '../types/attraction.ts';

interface AiAssistantSectionProps {
  attractions: Attraction[];
  onFocusAttractionOnMap: (id: string) => void;
}

const SAMPLE_PROMPTS = [
  '¿Qué lugares registrados puedo visitar con 50.000 Gs.?',
  '¿Qué museos del catálogo puedo visitar?',
  '¿Puedes sugerir un itinerario con los lugares registrados?',
];

function renderFormattedLine(line: string) {
  const segments = line.split(/(\*\*[^*]+\*\*)/g);
  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-stone-950">
          {segment.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={index}>{segment}</Fragment>;
  });
}

function FormattedResponse({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-stone-800">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={index} className="h-1" />;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={index} className="flex items-start gap-2 pl-1">
              <span className="text-amber-900 mt-1" aria-hidden="true">
                •
              </span>
              <span>{renderFormattedLine(trimmed.slice(2))}</span>
            </div>
          );
        }
        return <p key={index}>{renderFormattedLine(trimmed)}</p>;
      })}
    </div>
  );
}

export function AiAssistantSection({
  attractions,
  onFocusAttractionOnMap,
}: AiAssistantSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Bienvenido al asistente turístico inteligente. Consulto en tiempo real los atractivos, horarios y tarifas en Guaraníes registrados en el catálogo. Selecciona una consulta de prueba o escribe tu propia pregunta.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: nextMessages
            .filter((m) => m.id !== 'welcome')
            .slice(0, -1)
            .map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo obtener respuesta del asistente.');
      }

      const modelMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply,
        referencedIds: Array.isArray(data.referencedIds) ? data.referencedIds : [],
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al comunicarse con el asistente Gemini.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleReset = () => {
    setError(null);
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: 'Conversación reiniciada. Pregúntame sobre museos, costos de entrada en Guaraníes, horarios o itinerarios con los lugares registrados.',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <section
      id="asistente"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-stone-200"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Context & Quick Exam Test Prompts */}
        <div className="lg:col-span-4 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-stone-500">
              Inteligencia artificial · Gemini API
            </p>
            <h2 className="font-serif text-3xl font-semibold text-stone-900 mt-1 text-balance">
              Asistente turístico conectado al catálogo
            </h2>
            <p className="text-sm text-stone-600 mt-2.5 leading-relaxed">
              Las respuestas se generan dinámicamente leyendo los{' '}
              <span className="font-medium text-stone-900 tabular-nums">
                {attractions.length} registros reales
              </span>{' '}
              almacenados en la base de datos. Si agregas o editas un sitio en el catálogo,
              el asistente lo incorpora al instante.
            </p>
          </div>

          <div className="bg-[#F4EFE6] border border-stone-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-700">
              Consultas de prueba sugeridas
            </p>
            <div className="space-y-2">
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendMessage(prompt)}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-stone-800 bg-white border border-stone-200 rounded-lg hover:border-amber-900/50 hover:text-amber-950 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Interactive Chat Window */}
        <div className="lg:col-span-8 bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-stone-200 bg-[#F7F4EE] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-amber-900" aria-hidden="true" />
              <span className="text-sm font-semibold text-stone-900">
                Guía Turístico Smart AI
              </span>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-950 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Nueva consulta
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[460px] overflow-y-auto bg-[#FBF9F5]/60">
            {messages.map((msg) => {
              const referencedItems = (msg.referencedIds ?? [])
                .map((id) => attractions.find((a) => a.id === id))
                .filter((item): item is Attraction => Boolean(item));

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[82%] rounded-xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-stone-900 text-[#FBF9F5] text-sm'
                        : 'bg-white border border-stone-200 text-stone-800'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="leading-relaxed">{msg.text}</p>
                    ) : (
                      <FormattedResponse text={msg.text} />
                    )}

                    {referencedItems.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-stone-200 flex flex-wrap gap-2">
                        {referencedItems.map((item) => (
                          <div
                            key={item.id}
                            className="inline-flex items-center gap-1.5 text-xs bg-[#F4EFE6] border border-stone-200 rounded-md px-2.5 py-1"
                          >
                            <button
                              type="button"
                              onClick={() => onFocusAttractionOnMap(item.id)}
                              className="inline-flex items-center gap-1 font-medium text-stone-900 hover:text-amber-900 cursor-pointer"
                            >
                              <MapPin className="w-3 h-3 text-amber-900" aria-hidden="true" />
                              {item.nombre}
                            </button>
                            <span className="text-stone-400" aria-hidden="true">
                              ·
                            </span>
                            <a
                              href={buildGoogleMapsViewUrl(
                                item.latitud,
                                item.longitud,
                                item.nombre,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-blue-900 hover:underline"
                            >
                              Google Maps
                              <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start">
                <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 text-xs text-stone-600">
                  Consultando catálogo y redactando recomendación...
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                {error}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-4 border-t border-stone-200 bg-white flex items-center gap-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej: ¿Qué lugares puedo visitar con 50.000 Gs.?"
              disabled={loading}
              className="flex-1 min-w-0 px-3.5 py-2.5 text-sm bg-[#FBF9F5] border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900/30 focus:border-amber-900"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-900 rounded-lg hover:bg-amber-950 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              Enviar
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
