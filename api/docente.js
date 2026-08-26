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
    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    };

    const [estudiantesResp, justificacionesResp] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/progreso?select=*&order=actualizado_en.desc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/justificaciones?select=*&order=creado_en.desc&limit=500`, { headers })
    ]);

    if (!estudiantesResp.ok) {
      const errText = await estudiantesResp.text();
      return res.status(estudiantesResp.status).json({ error: 'Error de Supabase (progreso): ' + errText });
    }
    if (!justificacionesResp.ok) {
      const errText = await justificacionesResp.text();
      return res.status(justificacionesResp.status).json({ error: 'Error de Supabase (justificaciones): ' + errText });
    }

    const estudiantes = await estudiantesResp.json();
    const justificaciones = await justificacionesResp.json();
    return res.status(200).json({ estudiantes, justificaciones });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno: ' + err.message });
  }
}
