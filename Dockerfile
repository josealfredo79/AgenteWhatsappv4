# Dockerfile para Railway - WhatsApp Agent
# VERSION: 2025-11-27 21:50 - PRODUCTION READY
FROM node:18-bullseye-slim

# Establecer directorio de trabajo
WORKDIR /app/frontend

# Copiar package.json primero para cache de dependencias
COPY frontend/package*.json ./

# Instalar dependencias
RUN npm ci --include=dev

# Copiar el código de frontend
COPY frontend/ .

# Hacer start.sh ejecutable
RUN chmod +x start.sh

# Build de Next.js
RUN npm run build

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=5000

# Exponer puerto
EXPOSE 5000

# Usar start.sh que maneja credenciales y servidor
CMD ["./start.sh"]
