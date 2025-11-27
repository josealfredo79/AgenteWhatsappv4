# 🤖 Agente WhatsApp con Claude AI

[![Next.js](https://img.shields.io/badge/Next.js-14.2.23-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Railway](https://img.shields.io/badge/Railway-Ready-0B0D0E)](https://railway.app/)

> ⚠️ **ADVERTENCIA DE SEGURIDAD:** 
> 
> **NUNCA subas credenciales, API keys, tokens o archivos `.env` a GitHub.**
> 
> Google, GitHub y otras plataformas escanean repositorios automáticamente e invalidan credenciales expuestas.

Agente inteligente de WhatsApp con **Claude AI Haiku 4.5**, integración completa de **Google APIs** (Calendar, Sheets, Docs), y dashboard profesional en tiempo real.

## ✨ Características Principales

- 💬 **WhatsApp Messaging** vía Twilio
- 🧠 **Claude AI Haiku 4.5** con tool calling para conversaciones inteligentes
- 📅 **Agendamiento automático** en Google Calendar con links compartibles
- 📊 **Registro de clientes** en Google Sheets
- 📄 **Consulta de documentos** desde Google Docs
- 🎨 **Dashboard profesional** estilo WhatsApp Web con Socket.io en tiempo real
- 📱 **100% Responsive** - Mobile First Design
- 🔒 **Seguro** - Variables de entorno y autenticación de dashboard

---

## 🚀 Deploy en Railway (⭐ Recomendado)

Railway es la plataforma ideal para este proyecto porque:
- ✅ Soporta Next.js custom server + Socket.io
- ✅ Funciona 24/7 sin necesidad de navegador abierto
- ✅ Auto-deploy con cada push a GitHub
- ✅ $5 USD de crédito gratis para empezar
- ✅ Healthchecks automáticos

### 📋 Guía Rápida de Deployment:

**1. Sube el código a GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

**2. Crea proyecto en Railway:**
- Ve a [railway.app](https://railway.app)
- Clic en "New Project" → "Deploy from GitHub repo"
- Selecciona tu repositorio
- Railway detectará automáticamente la configuración

**3. Configura las variables de entorno:**

En Railway → Variables, agrega las siguientes (una por una):

```bash
ANTHROPIC_API_KEY=tu_api_key
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}
GOOGLE_CALENDAR_ID=tu_email@gmail.com
GOOGLE_SHEET_ID=tu_sheet_id
GOOGLE_DOCS_ID=tu_docs_id
NODE_ENV=production
NEXT_PUBLIC_DASHBOARD_USER=admin
NEXT_PUBLIC_DASHBOARD_PASS=admin123
```

**4. Railway hace el deploy automático** ✅

**5. Genera dominio público:**
- Settings → Generate Domain
- Copia tu URL: `https://tu-proyecto.up.railway.app`

**6. Configura Twilio Webhook:**
- Ve a [Twilio Console](https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox)
- When a message comes in: `https://tu-proyecto.up.railway.app/api/webhook/whatsapp`
- HTTP Method: **POST**
- Save

**7. ¡Prueba tu bot!** 🎉

📖 **Guía completa paso a paso:** [INSTRUCCIONES_RAILWAY.md](./INSTRUCCIONES_RAILWAY.md)

---

## 🛠️ Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/josealfredo79/AgenteWhatsappv3.git
cd AgenteWhatsappv3

# Instalar dependencias
cd frontend
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales

# Ejecutar en desarrollo
npm run dev

# O ejecutar en producción
npm run build
npm start
```

El servidor estará en: `http://localhost:5000`

---

## 📁 Estructura del Proyecto

```
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/         # Dashboard WhatsApp Web
│   │   │   │   └── page.tsx       # Componente principal del dashboard
│   │   │   ├── globals.css
│   │   │   └── layout.tsx
│   │   └── pages/
│   │       └── api/
│   │           ├── webhook/
│   │           │   └── whatsapp.js    # Webhook Twilio
│   │           └── messages/
│   │               └── [id].js        # Mensajes por conversación
│   ├── server.js                  # Servidor custom Next.js + Socket.io
│   ├── create-google-credentials.js   # Crea credenciales desde env
│   ├── package.json
│   └── next.config.js
├── railway.json                   # Configuración Railway
├── railway.toml                   # Configuración alternativa Railway
├── .railwayignore                 # Archivos ignorados en deploy
├── INSTRUCCIONES_RAILWAY.md       # Guía completa paso a paso
└── README.md
```

---

## 🔧 Stack Tecnológico

**Frontend:**
- Next.js 14.2.23 (App Router)
- React 18
- Socket.io Client (tiempo real)
- TypeScript

**Backend:**
- Node.js 20 LTS
- Custom Server (server.js)
- Socket.io Server
- Next.js API Routes

**Integraciones:**
- Anthropic Claude Haiku 4.5 (AI)
- Twilio WhatsApp API (mensajería)
- Google Calendar API (agendamiento)
- Google Sheets API (persistencia)
- Google Docs API (base de conocimiento)

**Deployment:**
- Railway (recomendado para producción)
- Replit (desarrollo)

---

## 📊 Dashboard en Tiempo Real

Accede al dashboard en: `https://tu-url/dashboard`

**Credenciales por defecto:**
- Usuario: `admin`
- Contraseña: `admin123`

**Características:**
- 📱 Interfaz idéntica a WhatsApp Web 2024
- 💬 Lista de conversaciones en tiempo real
- ✅ Estados de mensajes (enviado/entregado/leído)
- ⌨️ Indicador de "escribiendo..." en vivo
- 🔍 Búsqueda de conversaciones
- 📱 100% Responsive (desktop y móvil)
- 🎨 Dark mode profesional
- 🔄 Auto-scroll a nuevos mensajes
- 🔔 Badges de mensajes no leídos

---

## 🤖 Capacidades del Bot

### Conversación Inteligente:
- Responde como asesor inmobiliario profesional
- Tono amigable con 1-2 emojis por mensaje
- Respuestas concisas y claras (no párrafos largos)

### Agendamiento Automático:
- Detecta intenciones de agendar citas
- Procesa fechas relativas ("mañana", "próximo lunes", "en 3 días")
- Crea eventos en Google Calendar automáticamente
- Genera y comparte links del evento
- Confirma citas por WhatsApp

### Información de Propiedades:
- Consulta base de conocimiento en Google Docs
- Responde sobre terrenos disponibles
- Proporciona precios y características
- Información sobre ubicaciones específicas

### Registro de Clientes:
- Guarda automáticamente conversaciones en Google Sheets
- Registra número, nombre, mensajes y timestamps
- Tracking de citas agendadas

---

## 📝 Variables de Entorno

### ⚡ Variables Críticas (REQUERIDAS):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | API key de Claude | `sk-ant-api03-...` |
| `TWILIO_ACCOUNT_SID` | SID de Twilio | `AC...` |
| `TWILIO_AUTH_TOKEN` | Token de Twilio | `...` |
| `TWILIO_WHATSAPP_NUMBER` | Número WhatsApp | `+14155238886` |
| `GOOGLE_CREDENTIALS_JSON` | Service Account JSON completo | `{"type":"service_account",...}` |
| `GOOGLE_CALENDAR_ID` | ID del calendario | `email@gmail.com` |
| `GOOGLE_SHEET_ID` | ID de la hoja | `1-YTVj...` |
| `GOOGLE_DOCS_ID` | ID del documento | `1CWRk...` |
| `NODE_ENV` | Entorno | `production` |

### 🔒 Variables Opcionales (Dashboard):

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_DASHBOARD_USER` | Usuario dashboard | `admin` |
| `NEXT_PUBLIC_DASHBOARD_PASS` | Contraseña dashboard | `admin123` |

> ⚠️ **Importante:** En Railway, `GOOGLE_CREDENTIALS_JSON` debe estar en **UNA SOLA LÍNEA**. Usa [JSON Minifier](https://www.text-utils.com/json-formatter/) si es necesario.

---

## 📡 Endpoints de la API

### Webhook WhatsApp
```http
POST /api/webhook/whatsapp
Content-Type: application/x-www-form-urlencoded

Body=Hola&From=whatsapp:+5215551234567
```
Procesa mensajes entrantes de WhatsApp usando Claude AI.

### Obtener Mensajes
```http
GET /api/messages/[conversationId]
```
Obtiene el historial de mensajes de una conversación.

### Health Check
```http
GET /api/health
```
Verifica el estado de la aplicación.

---

## 💰 Costos Estimados

### Railway:
- **Gratis:** $5 USD/mes (crédito inicial)
- **Después:** ~$5-15 USD/mes (según tráfico)
- **Ventaja:** Funciona 24/7

### APIs:
- **Claude Haiku 4.5:** ~$0.25 / 1M tokens input, ~$1.25 / 1M tokens output
- **Twilio WhatsApp:** $0.005 por mensaje
- **Google APIs:** Gratis hasta límites generosos

**Total estimado:** $10-25 USD/mes para tráfico moderado (mejor que Replit Reserved VM a $20/mes)

---

## 🐛 Troubleshooting

### El bot no responde en WhatsApp:
1. Verifica que el webhook en Twilio esté configurado correctamente
2. Revisa los logs en Railway: Deployments → View Logs
3. Verifica que `ANTHROPIC_API_KEY` esté configurada
4. Asegúrate que enviaste `join <codigo>` al sandbox

### Dashboard muestra error 401:
1. Verifica `NEXT_PUBLIC_DASHBOARD_USER` y `NEXT_PUBLIC_DASHBOARD_PASS`
2. Limpia el localStorage del navegador
3. Intenta en modo incógnito

### Error con Google Calendar:
1. Verifica que `GOOGLE_CREDENTIALS_JSON` esté en una línea
2. Asegúrate que las APIs estén habilitadas en Google Cloud Console
3. Verifica permisos de la Service Account
4. Comprueba que `GOOGLE_CALENDAR_ID` sea correcto

### El deploy falla en Railway:
1. Revisa los logs de build en Railway
2. Verifica que railway.json esté en la raíz
3. Asegúrate que todas las variables estén configuradas
4. Intenta "Rebuild without cache"

---

## ⚠️ Notas Importantes

1. **Meta AI Ban (15 enero 2026):** Meta bloqueará bots de terceros en WhatsApp. Considera migrar a Llama AI.

2. **Twilio Sandbox:** El número +14155238886 es para pruebas. Para producción necesitas:
   - Número propio verificado
   - Plantillas de mensaje aprobadas
   - Cumplir políticas de WhatsApp Business

3. **Socket.io:** Requiere custom server, por eso Replit Reserved VM NO funciona. Railway SÍ funciona.

4. **Seguridad:** Nunca subas credenciales a GitHub. Usa siempre variables de entorno.

---

## 🆘 Soporte y Recursos

- **Railway Discord:** [discord.gg/railway](https://discord.gg/railway)
- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **Twilio Docs:** [twilio.com/docs/whatsapp](https://www.twilio.com/docs/whatsapp)
- **Claude AI Docs:** [docs.anthropic.com](https://docs.anthropic.com)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)

---

## ✅ Checklist de Deploy

Antes de cerrar Replit, asegúrate de:

- [ ] Código subido a GitHub
- [ ] Proyecto creado en Railway
- [ ] 10 variables de entorno configuradas
- [ ] Deploy exitoso (status: SUCCESS)
- [ ] Dominio público generado
- [ ] Webhook de Twilio configurado
- [ ] Bot probado con mensaje de WhatsApp
- [ ] Dashboard accesible y funcionando
- [ ] Google Calendar creando citas correctamente

---

## 📜 Licencia

Este proyecto es privado. Todos los derechos reservados.

---

## 👨‍💻 Autor

Desarrollado por [@josealfredo79](https://github.com/josealfredo79)

---

**¿Listo para deployment?** 🚀  
Sigue la [Guía Completa de Railway](./INSTRUCCIONES_RAILWAY.md) para instrucciones paso a paso detalladas.

**Versión:** 1.0.0  
**Última actualización:** Noviembre 2025
