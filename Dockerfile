# Dockerfile para Railway - WhatsApp Agent
FROM node:18-bullseye-slim

# CACHE BUSTER - Cambiar este valor fuerza rebuild completo
ARG CACHE_BUST=v2_20251127_2030

# Establecer directorio de trabajo
WORKDIR /app/frontend

# Copiar package.json primero
COPY frontend/package*.json ./

# Instalar dependencias
RUN npm ci --include=dev

# Copiar el código
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
