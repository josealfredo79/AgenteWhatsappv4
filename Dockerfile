# Dockerfile para Railway - WhatsApp Agent
# VERSION: 2025-11-27-v5-npm-start
FROM node:18-bullseye-slim

WORKDIR /app/frontend

# Copiar package files
COPY frontend/package*.json ./

# Instalar TODAS las dependencias (incluyendo dev para build)
RUN npm ci

# Copiar código
COPY frontend/ ./

# Build de Next.js
RUN npm run build

# Limpiar devDependencies para imagen más ligera
RUN npm prune --production

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Usar npm start directamente - ejecuta prestart + start
CMD ["npm", "start"]
