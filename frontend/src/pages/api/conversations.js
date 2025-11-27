import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

function getGoogleAuth(scopes) {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || 
                  path.join(process.cwd(), 'google-credentials.json');
  
  const credentialsRaw = fs.readFileSync(keyFile, 'utf8');
  const credentials = JSON.parse(credentialsRaw);
  
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key
      .split('\\n').join('\n')
      .replace(/\r\n/g, '\n');
  }
  
  return new google.auth.GoogleAuth({
    credentials,
    scopes: Array.isArray(scopes) ? scopes : [scopes]
  });
}

export default async function handler(req, res) {
  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets.readonly']);
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Mensajes!A:E',
    });
    
    const rows = response.data.values || [];
    
    if (rows.length <= 1) {
      return res.json([]);
    }
    
    const conversacionesMap = new Map();
    
    rows.slice(1).forEach(row => {
      const [timestamp, telefono, direccion, mensaje, messageId] = row;
      
      if (!telefono) return;
      
      if (!conversacionesMap.has(telefono)) {
        conversacionesMap.set(telefono, {
          id: telefono,
          usuario: telefono,
          mensajes: [],
          ultimoMensaje: '',
          timestamp: new Date(timestamp).getTime()
        });
      }
      
      const conv = conversacionesMap.get(telefono);
      conv.mensajes.push({
        timestamp,
        direccion,
        mensaje,
        messageId
      });
      
      if (new Date(timestamp).getTime() > conv.timestamp) {
        conv.timestamp = new Date(timestamp).getTime();
        conv.ultimoMensaje = mensaje;
      }
    });
    
    const conversaciones = Array.from(conversacionesMap.values())
      .sort((a, b) => b.timestamp - a.timestamp);
    
    res.json(conversaciones);
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    res.status(500).json({ error: 'Error al obtener conversaciones', message: error.message });
  }
}
