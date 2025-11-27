# 🚀 GUÍA COMPLETA: MIGRACIÓN A RAILWAY

## ¿Qué es Railway?
Railway es una plataforma de deployment similar a Replit pero optimizada para producción. Tu bot WhatsApp funcionará **24/7** sin necesidad de tener el navegador abierto.

---

## 📋 PASO 1: CREAR CUENTA EN RAILWAY (5 min)

1. Ve a: **https://railway.app**
2. Haz clic en **"Login"** o **"Start a New Project"**
3. Selecciona **"Login with GitHub"**
4. Autoriza Railway para acceder a tu cuenta de GitHub
5. ✅ Recibes **$5 de crédito gratis** para empezar

---

## 📦 PASO 2: SUBIR TU CÓDIGO A GITHUB (10 min)

### Opción A: Si NO tienes el código en GitHub

1. Ve a **https://github.com** y haz login
2. Clic en **"New repository"** (botón verde)
3. Configura:
   - **Repository name:** `agente-whatsapp-claude`
   - **Visibility:** Private (recomendado)
   - **NO marques** "Initialize with README"
4. Clic en **"Create repository"**

5. **Descarga el código de Replit:**
   - En Replit, ve a **Tools** > **Git** (en el panel izquierdo)
   - Haz clic en el menú de 3 puntos (⋮)
   - Selecciona **"Download as ZIP"**
   - Guarda el archivo en tu computadora
   - **Descomprime el archivo ZIP**

6. **Sube el código a GitHub:**
   ```bash
   # Abre una terminal en la carpeta descomprimida
   cd agente-whatsapp-claude  # (o como se llame tu carpeta)
   
   # Inicializa git
   git init
   git add .
   git commit -m "Migración desde Replit"
   
   # Conecta con GitHub (reemplaza TU_USUARIO)
   git remote add origin https://github.com/TU_USUARIO/agente-whatsapp-claude.git
   git branch -M main
   git push -u origin main
   ```

### Opción B: Si YA tienes el código en GitHub
✅ Salta al Paso 3

---

## 🚄 PASO 3: CREAR PROYECTO EN RAILWAY (5 min)

1. En Railway dashboard, clic en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Si es la primera vez, clic en **"Configure GitHub App"**
   - Autoriza Railway
   - Selecciona el repositorio: `agente-whatsapp-claude`
4. Railway escaneará tu código y detectará:
   - ✅ Node.js project
   - ✅ Next.js framework
   - ✅ Custom server (server.js)

---

## ⚙️ PASO 4: CONFIGURAR VARIABLES DE ENTORNO (10 min)

En el dashboard de Railway:

1. Haz clic en tu proyecto
2. Ve a la pestaña **"Variables"**
3. Clic en **"+ New Variable"**
4. **Copia y pega estas variables UNA POR UNA:**

### Variables críticas (REQUERIDAS):

```bash
ANTHROPIC_API_KEY
```
**Valor:** Tu API key de Anthropic Claude (empieza con `sk-ant-...`)

```bash
TWILIO_ACCOUNT_SID
```
**Valor:** Tu SID de Twilio (empieza con `AC...`)

```bash
TWILIO_AUTH_TOKEN
```
**Valor:** Tu token de autenticación de Twilio

```bash
TWILIO_WHATSAPP_NUMBER
```
**Valor:** `+14155238886`

```bash
GOOGLE_CREDENTIALS_JSON
```
**Valor:** El contenido COMPLETO del JSON de tu Service Account de Google
*(Copia TODO el contenido, desde la primera `{` hasta la última `}`)*

```bash
GOOGLE_CALENDAR_ID
```
**Valor:** `tecnologicotlaxiaco@gmail.com`

```bash
GOOGLE_SHEET_ID
```
**Valor:** `1-YTVjIqYO-m1XS_t_MRUlE7O4u_8WXKiZTQLh8BrhSE`

```bash
GOOGLE_DOCS_ID
```
**Valor:** `1CWRkJNcsScJOK-NMxtxnUdpuxrYcqaru5qiu9rHzbbw`

```bash
NODE_ENV
```
**Valor:** `production`

### Variables opcionales (Dashboard):

```bash
NEXT_PUBLIC_DASHBOARD_USER
```
**Valor:** `admin` (o el usuario que prefieras)

```bash
NEXT_PUBLIC_DASHBOARD_PASS
```
**Valor:** `admin123` (o la contraseña que prefieras)

---

## 🔧 PASO 5: CONFIGURAR BUILD Y START (AUTOMÁTICO)

Railway detectará automáticamente:

**Build command:**
```bash
cd frontend && npm install && npm run build
```

**Start command:**
```bash
cd frontend && npm start
```

**Puerto:** Railway asignará automáticamente un puerto y lo pasará en `process.env.PORT`

✅ **No necesitas cambiar nada** - Railway lo hace automático

---

## 🚀 PASO 6: HACER DEPLOY (5 min)

1. **Railway iniciará el deploy automáticamente**
2. Verás el progreso en tiempo real:
   - 📦 Installing dependencies...
   - 🔨 Building...
   - 🚀 Starting server...
3. Espera **3-5 minutos**
4. Cuando veas **"SUCCESS"**, tu app está lista

---

## 🌐 PASO 7: OBTENER TU URL PÚBLICA

1. En Railway, ve a la pestaña **"Settings"**
2. Busca la sección **"Domains"**
3. Haz clic en **"Generate Domain"**
4. Railway generará una URL como:
   ```
   https://agente-whatsapp-production.up.railway.app
   ```
5. ✅ **Copia esta URL** (la necesitarás para Twilio)

---

## 📞 PASO 8: CONFIGURAR WEBHOOK DE TWILIO (3 min)

1. Ve a: **https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox**
2. En la sección **"Sandbox Configuration"**:
   - **When a message comes in:** `https://TU-URL.up.railway.app/api/webhook/whatsapp`
   - **HTTP Method:** `POST`
3. Clic en **"Save"**

---

## ✅ PASO 9: PROBAR EL BOT (2 min)

1. Envía un mensaje WhatsApp al número de prueba: **+1 415 523 8886**
2. Primero envía: `join <codigo-sandbox>` (lo verás en Twilio console)
3. Luego envía: `Hola, quiero agendar una cita para mañana a las 3pm`
4. El bot debe responder y crear la cita en Google Calendar

---

## 📊 PASO 10: ACCEDER AL DASHBOARD

Tu dashboard estará en:
```
https://TU-URL.up.railway.app/dashboard
```

**Credenciales:**
- Usuario: `admin` (o el que configuraste)
- Contraseña: `admin123` (o la que configuraste)

---

## 💰 COSTOS ESTIMADOS

Railway usa **pricing por uso real:**

- **$5/mes gratis** (crédito inicial)
- **Después:** $0.000463 por GB-hora de RAM
- **Estimado para tu bot:** $5-15/mes (depende del tráfico)

**Comparación:**
- Replit Reserved VM: $20/mes (fijo, no funciona)
- Railway: $5-15/mes (funciona 24/7)

---

## 🔍 TROUBLESHOOTING

### El deploy falla con error de build:
1. Verifica que el repositorio tenga la carpeta `frontend/`
2. Revisa los logs en Railway > **"Deployments"** > **"View Logs"**

### El bot no responde:
1. Verifica que todas las variables de entorno estén configuradas
2. Revisa los logs: Railway > **"Deployments"** > **"View Logs"**
3. Busca errores relacionados con: `ANTHROPIC_API_KEY`, `TWILIO_`, `GOOGLE_`

### Error 500 en el dashboard:
1. Verifica que `GOOGLE_CREDENTIALS_JSON` esté configurado correctamente
2. El JSON debe estar en una **sola línea** (sin saltos de línea)
3. Puedes usar: https://www.text-utils.com/json-formatter/ para minificar el JSON

### El webhook de Twilio no llega:
1. Verifica que la URL en Twilio sea correcta
2. Debe terminar en: `/api/webhook/whatsapp`
3. Debe ser HTTPS (no HTTP)

---

## 📝 COMANDOS ÚTILES DE RAILWAY CLI (OPCIONAL)

Si quieres controlar Railway desde la terminal:

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Ver logs en tiempo real
railway logs

# Redeploy
railway up

# Ver variables de entorno
railway variables
```

---

## 🆘 SOPORTE

Si algo falla:

1. **Railway Discord:** https://discord.gg/railway
2. **Railway Docs:** https://docs.railway.app
3. **Railway Help:** help@railway.app

---

## ✅ CHECKLIST FINAL

Antes de cerrar Replit, asegúrate de:

- [ ] Código subido a GitHub
- [ ] Proyecto creado en Railway
- [ ] Todas las variables de entorno configuradas (10 variables)
- [ ] Deploy exitoso (status: SUCCESS)
- [ ] URL pública generada
- [ ] Webhook de Twilio configurado
- [ ] Bot probado con mensaje de WhatsApp
- [ ] Dashboard accesible
- [ ] Google Calendar funcionando

---

## 🎉 ¡ÉXITO!

Tu bot WhatsApp con Claude AI está ahora funcionando **24/7** en Railway.

**Funcionalidades activas:**
- ✅ WhatsApp messaging (Twilio)
- ✅ Claude AI Haiku 4.5 (conversaciones inteligentes)
- ✅ Agendamiento automático (Google Calendar)
- ✅ Registro de clientes (Google Sheets)
- ✅ Consulta de documentos (Google Docs)
- ✅ Dashboard en tiempo real (Socket.io)

---

## 📌 NOTAS IMPORTANTES

1. **No borres el proyecto de Replit** hasta estar 100% seguro que Railway funciona
2. **Guarda las variables de entorno** en un lugar seguro (password manager)
3. **Railway hace autodeploy** cada vez que hagas `git push` a GitHub
4. **Los logs de Railway** se guardan 7 días (plan gratuito)

---

**¿Necesitas ayuda?** Mientras estés en Replit, puedo ayudarte. Una vez en Railway, deberás gestionar el proyecto de forma independiente.

¡Buena suerte! 🚀
