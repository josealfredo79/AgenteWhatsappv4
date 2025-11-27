#!/bin/bash

echo "🚀 Starting WhatsApp Agent Server..."

# Create Google credentials from environment variable if exists
if [ -n "$GOOGLE_CREDENTIALS_JSON" ]; then
    echo "📝 Creating Google credentials file..."
    echo "$GOOGLE_CREDENTIALS_JSON" > /app/frontend/google-credentials.json
    export GOOGLE_SERVICE_ACCOUNT_FILE=/app/frontend/google-credentials.json
    echo "✅ Google credentials created"
fi

# Start the server
echo "🌐 Starting server on port ${PORT:-5000}..."
exec node server.js
