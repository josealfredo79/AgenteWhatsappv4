/**
 * Helper para inicializar Google Auth correctamente
 * Soluciona el problema ERR_OSSL_UNSUPPORTED con private keys
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

function getGoogleAuth(scopes) {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || 
                  path.join(process.cwd(), 'google-credentials.json');
  
  try {
    // Leer y parsear el archivo de credenciales
    const credentialsRaw = fs.readFileSync(keyFile, 'utf8');
    const credentials = JSON.parse(credentialsRaw);
    
    // CRÍTICO: Convertir \\n literales a newlines reales en private_key
    if (credentials.private_key) {
      // Reemplazar \\n literales con newlines reales
      credentials.private_key = credentials.private_key
        .split('\\n').join('\n')
        .replace(/\r\n/g, '\n');
    }
    
    // Usar credentials directamente (no keyFile) para evitar re-parsing
    return new google.auth.GoogleAuth({
      credentials,
      scopes: Array.isArray(scopes) ? scopes : [scopes]
    });
  } catch (error) {
    console.error('Error cargando credenciales de Google:', error.message);
    throw error;
  }
}

module.exports = { getGoogleAuth };
