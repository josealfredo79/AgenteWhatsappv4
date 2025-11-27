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
  if (req.method !== 'POST') return res.status(405).end();
  const { resumen, descripcion, inicio, fin, email } = req.body;
  if (!resumen || !inicio || !fin || !email) {
    return res.status(400).json({ error: 'Faltan datos para agendar' });
  }
  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/calendar']);
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const event = {
      summary: resumen,
      description: descripcion,
      start: { dateTime: inicio, timeZone: 'America/Mexico_City' },
      end: { dateTime: fin, timeZone: 'America/Mexico_City' }
    };
    await calendar.events.insert({ calendarId, requestBody: event });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al agendar evento' });
  }
}
