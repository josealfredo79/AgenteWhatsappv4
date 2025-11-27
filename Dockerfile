# Dockerfile para Railway - WhatsApp Agent
# Usando Node.js 18 con Debian Bullseye (tiene OpenSSL 1.1, evita ERR_OSSL_UNSUPPORTED)

FROM node:18-bullseye-slim

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

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

# Variables de entorno de producción
ENV NODE_ENV=production
ENV PORT=5000

# Exponer puerto
EXPOSE 5000

# Comando de inicio
CMD ["npm", "start"]
