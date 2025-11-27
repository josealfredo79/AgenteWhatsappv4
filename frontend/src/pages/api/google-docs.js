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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  const { docId } = req.query;
  if (!docId) return res.status(400).json({ error: 'Falta el parámetro docId' });
  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/documents.readonly']);
    const docs = google.docs({ version: 'v1', auth });
    const response = await docs.documents.get({ documentId: docId });
    res.status(200).json({ content: response.data });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el documento', details: error.message });
  }
}
