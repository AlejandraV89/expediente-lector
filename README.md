# Expediente Lector — guía de despliegue paso a paso

Este proyecto tiene dos partes:
- `index.html` → lo que ve el estudiante (el chat y el panel de gamificación)
- `api/chat.js` → el backend que protege tu llave de la API de Anthropic

## Paso 1 — Verifica que tengas Node.js y Git instalados

En la terminal (Mac: la app "Terminal"), escribe:

```
node -v
git --version
```

Si alguno da error, instala Node.js desde https://nodejs.org (versión LTS) y Git desde https://git-scm.com

## Paso 2 — Consigue tu llave de la API de Anthropic

1. Entra a https://console.anthropic.com
2. Crea una cuenta si no tienes una (es distinta de tu cuenta de claude.ai)
3. Ve a "API Keys" y crea una llave nueva
4. Cópiala y guárdala en un lugar seguro — Anthropic solo te la muestra una vez
5. En "Billing", agrega un método de pago y define un límite de gasto mensual bajo al inicio (ej. 10-20 USD) mientras pruebas

## Paso 3 — Crea un repositorio en GitHub

1. Entra a https://github.com y crea una cuenta si no tienes
2. Crea un repositorio nuevo, por ejemplo `expediente-lector`
3. Desde la terminal, dentro de esta carpeta del proyecto, ejecuta:

```
git init
git add .
git commit -m "Primera versión del prototipo"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/expediente-lector.git
git push -u origin main
```

(Reemplaza TU-USUARIO por tu usuario real de GitHub)

## Paso 4 — Despliega en Vercel

1. Entra a https://vercel.com y crea una cuenta (puedes usar tu cuenta de GitHub para entrar, es lo más fácil)
2. Clic en "Add New" → "Project"
3. Selecciona el repositorio `expediente-lector` que acabas de subir
4. Antes de darle a "Deploy", ve a la sección "Environment Variables" y agrega:
   - Nombre: `ANTHROPIC_API_KEY`
   - Valor: la llave que copiaste en el Paso 2
5. Clic en "Deploy"
6. En 1-2 minutos, Vercel te da una URL pública como `expediente-lector.vercel.app`

## Paso 5 — Prueba

1. Abre la URL que te dio Vercel desde tu celular o computador
2. Dale clic a "Abrir el primer caso"
3. Si todo funciona, ya tienes una versión pública y con la llave protegida

Si ves un error, revisa en Vercel: Project → Deployments → clic en el despliegue → "Functions" → busca `api/chat` para ver el mensaje de error exacto.

## Paso 6 — Dominio propio (opcional)

En el panel de tu proyecto en Vercel, ve a "Settings" → "Domains" y sigue las instrucciones para conectar un dominio comprado en cualquier proveedor (ej. Namecheap, GoDaddy).

## Antes de compartirlo con estudiantes reales

- Este prototipo NO guarda el progreso entre sesiones todavía (eso es la Fase 2 — base de datos)
- No recopila datos personales de los estudiantes, pero si vas a usarlo con fines de investigación, primero necesitas la aprobación de tu comité de ética y el consentimiento informado correspondiente
- Revisa el límite de gasto en Anthropic Console regularmente mientras el enlace sea público
