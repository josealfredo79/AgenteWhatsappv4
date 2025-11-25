const fs = require('fs');
const path = require('path');

/**
 * Script para crear google-credentials.json desde variable de entorno
 * Se ejecuta antes de iniciar el servidor (prestart)
 */

console.log('========================================');
console.log('🔧 CREATE-GOOGLE-CREDENTIALS.JS');
console.log('========================================');
console.log('📍 NODE_ENV:', process.env.NODE_ENV);
console.log('📍 PWD:', process.cwd());

const credentialsPath = path.join(__dirname, 'google-credentials.json');
console.log('📍 Credentials path:', credentialsPath);

// Debug: mostrar qué variables existen (sin mostrar valores sensibles)
console.log('📍 GOOGLE_CREDENTIALS_B64 exists:', !!process.env.GOOGLE_CREDENTIALS_B64);
console.log('📍 GOOGLE_CREDENTIALS_B64 length:', process.env.GOOGLE_CREDENTIALS_B64?.length || 0);
console.log('📍 GOOGLE_CREDENTIALS_JSON exists:', !!process.env.GOOGLE_CREDENTIALS_JSON);

let credentialsJson = null;
const credentialsB64 = process.env.GOOGLE_CREDENTIALS_B64;
const credentialsRaw = process.env.GOOGLE_CREDENTIALS_JSON;

// Preferir Base64 si está disponible
if (credentialsB64) {
  try {
    credentialsJson = Buffer.from(credentialsB64, 'base64').toString('utf8');
    console.log('✅ Decodificado GOOGLE_CREDENTIALS_B64 correctamente');
    console.log('📍 JSON length después de decode:', credentialsJson.length);
  } catch (err) {
    console.error('❌ Error al decodificar GOOGLE_CREDENTIALS_B64:', err.message);
    console.error('   Primeros 50 chars del B64:', credentialsB64?.substring(0, 50));
    // NO exit - continuar para debug
  }
} else if (credentialsRaw) {
  credentialsJson = credentialsRaw;
  console.log('ℹ️  Usando GOOGLE_CREDENTIALS_JSON (raw)');
}

if (credentialsJson) {
  try {
    const credentials = JSON.parse(credentialsJson);
    console.log('✅ JSON parseado correctamente');
    console.log('📍 Keys en credentials:', Object.keys(credentials).join(', '));
    
    if (credentials.private_key) {
      const originalKey = credentials.private_key;
      
      // Detectar si tiene \\n literales
      if (originalKey.includes('\\n')) {
        console.log('⚠️  Detectados \\\\n literales en private_key, corrigiendo...');
        credentials.private_key = originalKey.replace(/\\n/g, '\n');
      }
      
      // Normalizar Windows line endings
      credentials.private_key = credentials.private_key.replace(/\r\n/g, '\n');
      
      // Validar estructura
      const hasBegin = credentials.private_key.includes('-----BEGIN PRIVATE KEY-----');
      const hasEnd = credentials.private_key.includes('-----END PRIVATE KEY-----');
      const hasRealNewlines = credentials.private_key.includes('\n');
      
      console.log('📍 Private key validation:');
      console.log('   - Has BEGIN:', hasBegin);
      console.log('   - Has END:', hasEnd);
      console.log('   - Has newlines:', hasRealNewlines);
      
      if (!hasBegin || !hasEnd) {
        console.error('❌ La private_key no tiene el formato PEM correcto');
        // Continuar de todas formas para ver más logs
      }
      
      console.log('✅ Private key procesada');
    } else {
      console.error('❌ No se encontró private_key en las credenciales');
    }
    
    // Escribir el archivo
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), 'utf8');
    console.log('✅ google-credentials.json creado correctamente');
    console.log('📧 Service Account:', credentials.client_email);
    
  } catch (error) {
    console.error('❌ Error al procesar credenciales:', error.message);
    console.error('   Stack:', error.stack);
    // Mostrar primeros chars del JSON para debug
    console.error('   Primeros 100 chars del JSON:', credentialsJson?.substring(0, 100));
  }
} else {
  // Sin credenciales de entorno
  if (fs.existsSync(credentialsPath)) {
    console.log('ℹ️  Usando google-credentials.json existente');
    
    try {
      const existing = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      if (existing.private_key && existing.private_key.includes('\\n')) {
        console.warn('⚠️  El archivo existente tiene \\\\n literales, corrigiendo...');
        existing.private_key = existing.private_key.replace(/\\n/g, '\n');
        fs.writeFileSync(credentialsPath, JSON.stringify(existing, null, 2), 'utf8');
        console.log('✅ Archivo corregido');
      }
      console.log('📧 Service Account:', existing.client_email);
    } catch (e) {
      console.warn('⚠️  No se pudo validar el archivo existente:', e.message);
    }
  } else {
    console.warn('========================================');
    console.warn('⚠️  NO HAY CREDENCIALES DE GOOGLE');
    console.warn('========================================');
    console.warn('   Variables de entorno disponibles:');
    console.warn('   - GOOGLE_CREDENTIALS_B64:', !!process.env.GOOGLE_CREDENTIALS_B64);
    console.warn('   - GOOGLE_CREDENTIALS_JSON:', !!process.env.GOOGLE_CREDENTIALS_JSON);
    console.warn('');
    console.warn('   Para configurar, usa GOOGLE_CREDENTIALS_B64 con el JSON en Base64');
    
    // En producción, NO hacer exit para poder ver logs del servidor
    if (process.env.NODE_ENV === 'production') {
      console.warn('');
      console.warn('⚠️  PRODUCCIÓN: Continuando SIN credenciales de Google');
      console.warn('   Las APIs de Google NO funcionarán');
      // NO exit - dejar que el servidor inicie para ver logs
    }
  }
}

console.log('========================================');
console.log('🏁 CREATE-GOOGLE-CREDENTIALS.JS TERMINADO');
console.log('========================================');
