// api/justificaciones.js
// Función serverless de Vercel. Guarda cada respuesta de justificación obligatoria
// (pregunta, opción elegida, texto escrito por el estudiante, y la evaluación que
// dio la IA) como un registro individual — separado del progreso acumulado.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Falta configurar SUPABASE_URL o SUPABASE_SERVICE_KEY en Vercel' });
  }

  const body = req.body || {};
  const correo = (body.correo || '').toLowerCase().trim();
  const pregunta = (body.pregunta || '').trim();
  const opcion_elegida = (body.opcion_elegida || '').trim();
  const justificacion_texto = (body.justificacion_texto || '').trim();

  if (!correo || !pregunta || !opcion_elegida || !justificacion_texto) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const row = {
    correo,
    pregunta,
    opcion_elegida,
    justificacion_texto,
    evaluacion_ia: body.evaluacion_ia || null,
    acertada: typeof body.acertada === 'boolean' ? body.acertada : null
  };

  try {
    const url = `${supabaseUrl}/rest/v1/justificaciones`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(row)
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: 'Error de Supabase: ' + errText });
    }
    const saved = await resp.json();
    return res.status(200).json({ justificacion: saved[0] || row });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno: ' + err.message });
  }
}
