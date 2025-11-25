const fs = require('fs');
const path = require('path');

/**
 * Script para crear google-credentials.json desde variable de entorno
 * Se ejecuta antes de iniciar el servidor (prestart)
 * Necesario para Railway y otros entornos donde no se puede subir archivos
 * 
 * FIX: ERR_OSSL_UNSUPPORTED - Los \n en private_key deben ser saltos de línea reales
 */

const credentialsPath = path.join(__dirname, 'google-credentials.json');

// Soporta dos formas de pasar credenciales:
// 1) GOOGLE_CREDENTIALS_B64  -> Base64 del JSON (RECOMENDADO - evita problemas de escape)
// 2) GOOGLE_CREDENTIALS_JSON -> JSON crudo (puede tener problemas con \n)
let credentialsJson = null;
const credentialsB64 = process.env.GOOGLE_CREDENTIALS_B64;
const credentialsRaw = process.env.GOOGLE_CREDENTIALS_JSON;

// Preferir Base64 si está disponible
if (credentialsB64) {
  try {
    credentialsJson = Buffer.from(credentialsB64, 'base64').toString('utf8');
    console.log('ℹ️  Usando GOOGLE_CREDENTIALS_B64 (Base64)');
  } catch (err) {
    console.error('❌ Error al decodificar GOOGLE_CREDENTIALS_B64:', err.message);
    process.exit(1);
  }
} else if (credentialsRaw) {
  credentialsJson = credentialsRaw;
  console.log('ℹ️  Usando GOOGLE_CREDENTIALS_JSON (raw)');
}

if (credentialsJson) {
  try {
    // Parsear el JSON
    const credentials = JSON.parse(credentialsJson);
    
    // CRÍTICO: Corregir los saltos de línea en private_key
    // Railway/Vercel/Render escapan los \n como \\n en variables de entorno
    if (credentials.private_key) {
      const originalKey = credentials.private_key;
      
      // Detectar si tiene \\n literales (problema común)
      if (originalKey.includes('\\n')) {
        console.log('⚠️  Detectados \\\\n literales en private_key, corrigiendo...');
        credentials.private_key = originalKey.replace(/\\n/g, '\n');
      }
      
      // Normalizar Windows line endings
      credentials.private_key = credentials.private_key.replace(/\r\n/g, '\n');
      
      // Validar estructura de la llave
      const hasBegin = credentials.private_key.includes('-----BEGIN PRIVATE KEY-----');
      const hasEnd = credentials.private_key.includes('-----END PRIVATE KEY-----');
      const hasRealNewlines = credentials.private_key.includes('\n');
      
      if (!hasBegin || !hasEnd) {
        console.error('❌ La private_key no tiene el formato PEM correcto');
        console.error('   Debe comenzar con -----BEGIN PRIVATE KEY-----');
        console.error('   y terminar con -----END PRIVATE KEY-----');
        process.exit(1);
      }
      
      if (!hasRealNewlines) {
        console.error('❌ La private_key no tiene saltos de línea reales');
        console.error('   Esto causará ERR_OSSL_UNSUPPORTED');
        console.error('   Usa GOOGLE_CREDENTIALS_B64 en lugar de GOOGLE_CREDENTIALS_JSON');
        process.exit(1);
      }
      
      console.log('✅ Private key validada correctamente');
    } else {
      console.error('❌ No se encontró private_key en las credenciales');
      process.exit(1);
    }
    
    // Escribir el archivo
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), 'utf8');
    console.log('✅ google-credentials.json creado correctamente');
    console.log(`📧 Service Account: ${credentials.client_email}`);
    
  } catch (error) {
    console.error('❌ Error al procesar credenciales:', error.message);
    if (error.message.includes('JSON')) {
      console.error('   El contenido no es un JSON válido');
    }
    process.exit(1);
  }
} else {
  // En desarrollo local, puede existir el archivo directamente
  if (fs.existsSync(credentialsPath)) {
    console.log('ℹ️  Usando google-credentials.json existente (desarrollo local)');
    
    // Validar que el archivo existente tenga el formato correcto
    try {
      const existing = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      if (existing.private_key && existing.private_key.includes('\\n')) {
        console.warn('⚠️  El archivo existente tiene \\\\n literales, corrigiendo...');
        existing.private_key = existing.private_key.replace(/\\n/g, '\n');
        fs.writeFileSync(credentialsPath, JSON.stringify(existing, null, 2), 'utf8');
        console.log('✅ Archivo corregido');
      }
    } catch (e) {
      console.warn('⚠️  No se pudo validar el archivo existente:', e.message);
    }
  } else {
    console.warn('⚠️  No hay credenciales de Google configuradas');
    console.warn('   Configura GOOGLE_CREDENTIALS_B64 o GOOGLE_CREDENTIALS_JSON');

    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Producción sin credenciales de Google. Abortando.');
      process.exit(1);
    }
  }
}
