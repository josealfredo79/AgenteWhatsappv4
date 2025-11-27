#!/bin/sh
echo "========================================="
echo "🚀 SCRIPT DE INICIO"
echo "========================================="

# Crear credenciales de Google
echo "📍 Ejecutando create-google-credentials.js..."
node create-google-credentials.js
CRED_EXIT=$?
echo "📍 create-google-credentials.js terminó con código: $CRED_EXIT"

# Iniciar servidor (siempre, incluso si las credenciales fallan)
echo "📍 Iniciando server.js..."
exec node server.js
