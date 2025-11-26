# Dockerfile para Railway - WhatsApp Agent
# Usando Node.js 18 LTS para compatibilidad con OpenSSL 1.1 (evita ERR_OSSL_UNSUPPORTED)

FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo
WORKDIR /app/frontend

# Variable de entorno para OpenSSL legacy (por si acaso)
ENV NODE_OPTIONS="--openssl-legacy-provider"

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
