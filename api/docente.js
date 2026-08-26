// api/docente.js
// Función serverless de Vercel. Devuelve el progreso de TODOS los estudiantes,
// protegido con una contraseña simple (guardada como variable de entorno,
// nunca en el código). Pensado para un solo docente, no es un sistema de
// autenticación completo con cuentas individuales.

const requestLog = new Map(); // ip -> [timestamps], para frenar intentos de fuerza bruta
const MAX_ATTEMPTS_PER_WINDOW = 8;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutos

function isRateLimited(ip){
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(t => now - t < WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > MAX_ATTEMPTS_PER_WINDOW;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'desconocida').split(',')[0].trim();
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.' });
  }

  const docentePassword = process.env.DOCENTE_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!docentePassword) {
    return res.status(500).json({ error: 'Falta configurar DOCENTE_PASSWORD en Vercel' });
  }
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Falta configurar SUPABASE_URL o SUPABASE_SERVICE_KEY en Vercel' });
  }

  const { password } = req.body || {};
  if (password !== docentePassword) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  try {
    const url = `${supabaseUrl}/rest/v1/progreso?select=*&order=actualizado_en.desc`;
    const resp = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: 'Error de Supabase: ' + errText });
    }
    const rows = await resp.json();
    return res.status(200).json({ estudiantes: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno: ' + err.message });
  }
}
