# Dockerfile para Railway - WhatsApp Agent
# IMPORTANTE: Usando Debian Bullseye que tiene OpenSSL 1.1 nativo (no 3.0)

FROM node:18-bullseye-slim

# Cache buster - cambiar este valor fuerza rebuild completo
ARG CACHE_BUSTER=20251127v1

# Establecer directorio de trabajo
WORKDIR /app/frontend

# Copiar package.json primero para cache de dependencias
COPY frontend/package*.json ./

# Instalar dependencias
RUN npm ci --include=dev

# Copiar el código de frontend
COPY frontend/ .

# Build de Next.js
RUN npm run build

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=5000

# Exponer puerto
EXPOSE 5000

# IMPORTANTE: Ejecutar node directamente, NO npm (evita scripts cacheados)
CMD ["sh", "-c", "node create-google-credentials.js && node server.js"]
