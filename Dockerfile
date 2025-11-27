# Dockerfile para Railway - WhatsApp Agent
# REBUILD: 2025-11-27-v4-force
FROM node:18-bullseye-slim

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm ci --include=dev

# Copiar código - IMPORTANTE: esto incluye start.sh
COPY frontend/ ./

# Verificar archivos y hacer ejecutable con ruta explícita
RUN echo "=== Archivos copiados ===" && ls -la ./ && chmod +x ./start.sh

RUN npm run build

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["./start.sh"]
