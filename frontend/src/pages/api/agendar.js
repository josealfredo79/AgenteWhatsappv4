import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { resumen, descripcion, inicio, fin, email } = req.body;
  if (!resumen || !inicio || !fin || !email) {
    return res.status(400).json({ error: 'Faltan datos para agendar' });
  }
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
      ],
    });
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
