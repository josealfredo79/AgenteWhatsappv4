# Frontend - Agente WhatsApp

Este es el frontend de la aplicación Agente WhatsApp, construido con **Next.js 16** y **TypeScript**.

[![CI](https://github.com/josealfredo79/AgenteWhatsappv2/actions/workflows/ci.yml/badge.svg)](https://github.com/josealfredo79/AgenteWhatsappv2/actions/workflows/ci.yml)

## 🏗️ Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/              # App Router de Next.js
│   │   ├── dashboard/    # Dashboard de administración
│   │   ├── layout.tsx    # Layout principal
│   │   └── page.tsx      # Página principal
│   └── pages/            # Pages Router (API Routes)
│       └── api/          # Endpoints de la API
│           ├── webhook/
│           │   └── whatsapp.js
│           ├── registro.js
│           ├── agendar.js
│           ├── send-message.js
│           ├── health.js
│           └── ...
├── public/               # Archivos estáticos
├── server.js             # Servidor custom con Socket.io
├── next.config.ts        # Configuración de Next.js
├── tsconfig.json         # Configuración de TypeScript
└── package.json          # Dependencias del proyecto
```

## 🚀 Inicio Rápido

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Producción

```bash
npm run build
npm run start
```

## 📦 Dependencias Principales

- **Next.js 16.0.3** - Framework React con App Router
- **React 19.2.0** - Biblioteca de UI
- **TypeScript 5** - Type safety
- **Socket.io** - WebSockets para tiempo real

## 🔧 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter
- `npm run prestart` - Script pre-start que crea credenciales de Google

## 📡 API Routes

Las rutas de API están en `src/pages/api/`:

### Endpoints Disponibles

- `/api/health` - Health check
- `/api/webhook/whatsapp` - Webhook de Twilio para WhatsApp
- `/api/registro` - Registro de clientes en Google Sheets
- `/api/agendar` - Agendamiento en Google Calendar
- `/api/send-message` - Envío de mensajes vía Twilio
- `/api/messages/[id]` - Historial de mensajes
- `/api/conversations` - Lista de conversaciones
- `/api/google-docs` - Consulta a Google Docs
- `/api/ia-test` - Prueba de integración con Claude AI

## 🔐 Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```env
# Twilio
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=tu_api_key

# Google APIs
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}
GOOGLE_SERVICE_ACCOUNT_FILE=./google-credentials.json
GOOGLE_DOCS_ID=tu_documento_id
GOOGLE_SHEET_ID=tu_spreadsheet_id
GOOGLE_CALENDAR_ID=tu_calendar_id

# Dashboard
NEXT_PUBLIC_DASHBOARD_USER=admin
NEXT_PUBLIC_DASHBOARD_PASS=tu_password
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Otros
NODE_ENV=development
PORT=3000
```

> ⚠️ **Importante:** Nunca subas `.env.local` a git. Está en `.gitignore`.

## 🎨 Dashboard

El dashboard está disponible en `/dashboard` y proporciona:

- Visualización de conversaciones
- Envío de mensajes manuales
- Registro de clientes
- Agendamiento de citas
- Monitoreo del estado del sistema

### Autenticación

El dashboard requiere autenticación básica. Las credenciales se configuran mediante:
- `NEXT_PUBLIC_DASHBOARD_USER`
- `NEXT_PUBLIC_DASHBOARD_PASS`

## 🔌 Socket.io

El proyecto incluye Socket.io para comunicación en tiempo real. El servidor está configurado en `server.js` y se puede acceder desde el cliente usando `socket.io-client`.

### Uso en el Cliente

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  path: '/socket.io'
});

socket.on('server-message', (data) => {
  console.log('Mensaje del servidor:', data);
});
```

## 🧪 Testing

### Pruebas de API

Ejecuta el script de pruebas:

```bash
chmod +x test_api_connections.sh
./test_api_connections.sh
```

Este script prueba todos los endpoints principales de la API.

## 📝 Notas de Desarrollo

### Estructura de API Routes

Las API routes usan el formato de Pages Router de Next.js:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  
  try {
    // Lógica del endpoint
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
}
```

### Manejo de Errores

Todos los endpoints deben:
- Validar el método HTTP
- Validar los parámetros de entrada
- Manejar errores con try/catch
- Retornar códigos HTTP apropiados

## 🚀 Despliegue

Este proyecto está configurado para desplegarse en Railway. Ver el README principal para instrucciones de despliegue.

### Build de Producción

```bash
npm run build
```

Next.js optimizará automáticamente:
- Código JavaScript
- Imágenes
- CSS
- Assets estáticos

## 📚 Recursos

## 📦 Despliegue rápido y credenciales (Railway)

Pasos rápidos para desplegar en Railway y configurar credenciales de Google:

1. En Railway → Project → Variables, añade las variables necesarias (marca como secret cuando corresponda):
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`
  - `ANTHROPIC_API_KEY`
  - `GOOGLE_CREDENTIALS_JSON` (preferido) o `GOOGLE_CREDENTIALS_B64`
  - `GOOGLE_DOCS_ID`, `GOOGLE_SHEET_ID`, `GOOGLE_CALENDAR_ID` (si aplica)

2. Si tu UI no acepta newlines, convierte las credenciales a base64:
  - `base64 -w0 service-account.json > creds.b64`
  - Copia el contenido de `creds.b64` a `GOOGLE_CREDENTIALS_B64` en Railway.

3. Forzar rebuild: después de añadir variables, en Deployments elige `Redeploy` o `Rebuild without cache` para que Nixpacks seleccione `nodejs_20`.

4. Verifica los logs y prueba:
  - Health: `GET /mcp/health` debería devolver `{ "status": "ok" }`.

5. CI: el repo incluye `.github/workflows/ci.yml` que construye y ejecuta tests para validar MCP.

Nota: el script `frontend/create-google-credentials.js` genera `frontend/google-credentials.json` en `prestart` según las variables `GOOGLE_CREDENTIALS_JSON` o `GOOGLE_CREDENTIALS_B64`.

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Socket.io Documentation](https://socket.io/docs/)

---

**Versión:** 0.1.0
