# Dockerfile para Railway - WhatsApp Agent
# Usando Node.js 18 LTS para compatibilidad con OpenSSL 1.1

FROM node:18-alpine

# Instalar dependencias del sistema si son necesarias
RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo final
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

# Comando de inicio - SIN usar cd
CMD ["npm", "start"]
