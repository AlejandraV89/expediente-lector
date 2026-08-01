// api/chat.js
// Función serverless de Vercel. Recibe { system, messages } desde el frontend,
// llama a la API de Anthropic usando la llave guardada en el servidor
// (nunca visible para el estudiante), y devuelve la respuesta.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
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
        system: system || '',
        messages: trimmedMessages
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
