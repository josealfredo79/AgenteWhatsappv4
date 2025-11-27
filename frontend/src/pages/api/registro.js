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
  if (req.method === 'POST') {
    const { nombre, telefono, email } = req.body;
    if (!nombre || !telefono || !email) {
      return res.status(400).json({ error: 'Faltan datos de registro' });
    }
    try {
      const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets']);
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      const range = 'Clientes!A:C';
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values: [[nombre, telefono, email]] }
      });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: 'Error al registrar cliente', details: error.message });
    }
  }
  if (req.method === 'GET') {
    try {
      const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets.readonly']);
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      const range = 'Clientes!A:C';
      const result = await sheets.spreadsheets.values.get({ spreadsheetId, range });
      return res.status(200).json({ data: result.data.values });
    } catch (error) {
      return res.status(500).json({ error: 'Error al consultar clientes', details: error.message });
    }
  }
  return res.status(405).json({ error: 'Método no permitido' });
}
