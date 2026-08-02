// api/progress.js
// Función serverless de Vercel. Lee y guarda el progreso del estudiante en Supabase.
// La llave "service_role" de Supabase nunca llega al navegador: solo la usa este backend.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`
  };
}

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Falta configurar SUPABASE_URL o SUPABASE_SERVICE_KEY en Vercel' });
  }

  // ---------- Leer progreso existente ----------
  if (req.method === 'GET') {
    const correo = (req.query.correo || '').toLowerCase().trim();
    if (!correo || !EMAIL_REGEX.test(correo)) {
      return res.status(400).json({ error: 'Correo inválido' });
    }

    try {
      const url = `${supabaseUrl}/rest/v1/progreso?correo=eq.${encodeURIComponent(correo)}&select=*`;
      const resp = await fetch(url, { headers: supabaseHeaders() });
      if (!resp.ok) {
        const errText = await resp.text();
        return res.status(resp.status).json({ error: 'Error de Supabase: ' + errText });
      }
      const rows = await resp.json();
      return res.status(200).json({ progreso: rows[0] || null });
    } catch (err) {
      return res.status(500).json({ error: 'Error interno: ' + err.message });
    }
  }

  // ---------- Guardar / actualizar progreso ----------
  if (req.method === 'POST') {
    const body = req.body || {};
    const correo = (body.correo || '').toLowerCase().trim();
    const nombre = (body.nombre || '').trim();

    if (!correo || !EMAIL_REGEX.test(correo)) {
      return res.status(400).json({ error: 'Correo inválido' });
    }
    if (!nombre) {
      return res.status(400).json({ error: 'Falta el nombre' });
    }

    const row = {
      correo,
      nombre,
      xp_literal: Number(body.xp_literal) || 0,
      xp_inferencial: Number(body.xp_inferencial) || 0,
      xp_critico: Number(body.xp_critico) || 0,
      nivel: Number(body.nivel) || 1,
      xp_to_level: Number(body.xp_to_level) || 30,
      badges: Array.isArray(body.badges) ? body.badges : [],
      casos_resueltos: Number(body.casos_resueltos) || 0,
      actualizado_en: new Date().toISOString()
    };

    try {
      const url = `${supabaseUrl}/rest/v1/progreso`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          ...supabaseHeaders(),
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(row)
      });
      if (!resp.ok) {
        const errText = await resp.text();
        return res.status(resp.status).json({ error: 'Error de Supabase: ' + errText });
      }
      const saved = await resp.json();
      return res.status(200).json({ progreso: saved[0] || row });
    } catch (err) {
      return res.status(500).json({ error: 'Error interno: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
