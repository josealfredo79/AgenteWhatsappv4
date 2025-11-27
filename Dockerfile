# Dockerfile para Railway - WhatsApp Agent
# IMPORTANTE: Usando Debian Bullseye que tiene OpenSSL 1.1 nativo

FROM node:18-bullseye-slim

# Establecer directorio de trabajo
WORKDIR /app/frontend

# Copiar package.json primero para cache de dependencias
COPY frontend/package*.json ./

# Instalar dependencias
RUN npm ci --include=dev

# Copiar el código de frontend
COPY frontend/ .

# Asegurar que start.sh sea ejecutable
RUN chmod +x start.sh

# Build de Next.js
RUN npm run build

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=5000

# Exponer puerto
EXPOSE 5000

# Usar script de inicio
CMD ["./start.sh"]
