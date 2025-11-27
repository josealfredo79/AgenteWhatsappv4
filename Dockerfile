# Dockerfile para Railway - WhatsApp Agent
# CACHE_BUSTER: 2025-11-27-v3
FROM node:18-bullseye-slim

# Establecer directorio de trabajo
WORKDIR /app/frontend

# Copiar package.json primero para cache de dependencias
COPY frontend/package*.json ./

# Instalar dependencias
RUN npm ci --include=dev

# Copiar todo el código de frontend (incluyendo start.sh)
COPY frontend/ .

# Verificar que start.sh existe y hacerlo ejecutable
RUN ls -la && chmod +x start.sh

# Build de Next.js
RUN npm run build

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=5000

# Exponer puerto
EXPOSE 5000

# Usar start.sh que maneja credenciales y servidor
CMD ["./start.sh"]
