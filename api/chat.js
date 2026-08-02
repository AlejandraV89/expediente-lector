// api/chat.js
// Función serverless de Vercel. Recibe { system, messages } desde el frontend,
// llama a la API de Anthropic usando la llave guardada en el servidor
// (nunca visible para el estudiante), y devuelve la respuesta.

// --- Límite de solicitudes por IP (protección básica contra scripts/abuso) ---
// Nota: esta memoria vive solo mientras la función esté "caliente" en Vercel;
// no es un control perfecto (una función nueva reinicia el conteo), pero sí
// frena los intentos automatizados más obvios sin necesitar una base de datos.
const requestLog = new Map(); // ip -> [timestamps]
const MAX_REQUESTS_PER_WINDOW = 15;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutos

function isRateLimited(ip){
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(t => now - t < WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > MAX_REQUESTS_PER_WINDOW;
}

// Definición estructural de la respuesta: en vez de pedirle al modelo que "escriba"
// JSON como texto libre (poco confiable), usamos "tool use" de Anthropic para que el
// formato quede garantizado por la API misma, no por buena voluntad del modelo.
const RESPONSE_TOOL = {
  name: 'responder_caso',
  description: 'Entrega la respuesta estructurada de Detective Vega para este turno de la conversación.',
  input_schema: {
    type: 'object',
    properties: {
      feedback: {
        type: ['string', 'null'],
        description: 'Retroalimentación sobre la respuesta anterior del estudiante, o null si no aplica.'
      },
      case_text: {
        type: ['string', 'null'],
        description: 'Texto completo del caso nuevo (pista + pregunta), o null si este turno no presenta un caso nuevo.'
      },
      options: {
        type: 'array',
        items: { type: 'string' },
        description: 'Exactamente 4 opciones (A-D) si case_text no es null. Arreglo vacío [] si case_text es null.'
      },
      state_update: {
        type: 'object',
        properties: {
          xp_gain: {
            type: 'object',
            properties: {
              literal: { type: 'integer' },
              inferencial: { type: 'integer' },
              critico: { type: 'integer' }
            },
            required: ['literal', 'inferencial', 'critico']
          },
          competency_focus: { type: ['string', 'null'], enum: ['literal', 'inferencial', 'critico', null] },
          badge_earned: { type: ['string', 'null'] },
          case_solved: { type: 'boolean' }
        },
        required: ['xp_gain', 'competency_focus', 'badge_earned', 'case_solved']
      }
    },
    required: ['feedback', 'case_text', 'options', 'state_update'],
    // Regla condicional: si case_text es un string (hay caso nuevo), "options" debe
    // tener exactamente 4 elementos. Si case_text es null, "options" debe estar vacío.
    // Esto ata estructuralmente la presencia de una pregunta a sus 4 opciones.
    if: {
      properties: { case_text: { type: 'string' } },
      required: ['case_text']
    },
    then: {
      properties: { options: { minItems: 4, maxItems: 4 } }
    },
    else: {
      properties: { options: { maxItems: 0 } }
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'desconocida').split(',')[0].trim();
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes en poco tiempo. Espera unos minutos e intenta de nuevo.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar ANTHROPIC_API_KEY en Vercel' });
  }

  const { system, messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Falta el arreglo de mensajes' });
  }

  // --- Límite simple de tamaño de conversación para controlar costos ---
  // Evita que una sola sesión crezca sin control.
  const MAX_MESSAGES = 40;
  const trimmedMessages = messages.slice(-MAX_MESSAGES);

  // --- Límite de longitud del system prompt, por si algo lo infla sin control ---
  const safeSystem = (system || '').slice(0, 6000);

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: safeSystem,
        messages: trimmedMessages,
        tools: [RESPONSE_TOOL],
        tool_choice: { type: 'tool', name: 'responder_caso' }
      })
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      return res.status(anthropicResponse.status).json({ error: 'Error de Anthropic: ' + errText });
    }

    const data = await anthropicResponse.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Error interno: ' + err.message });
  }
}
