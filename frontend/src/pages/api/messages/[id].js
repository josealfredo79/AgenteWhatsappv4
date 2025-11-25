import { google } from 'googleapis';
import path from 'path';

const getKeyFile = () => process.env.GOOGLE_SERVICE_ACCOUNT_FILE || path.join(process.cwd(), 'google-credentials.json');

export default async function handler(req, res) {
  const { query: { id } } = req;

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: getKeyFile(),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Mensajes!A2:E',
    });

    const rows = response.data.values || [];
    
    const messages = rows
      .filter(row => {
        const telefono = row[1] || '';
        return telefono === id || telefono.includes(id) || id.includes(telefono.replace(/\D/g, ''));
      })
      .map((row, idx) => ({
        messageId: row[4] || `msg-${Date.now()}-${idx}`,
        conversationId: id,
        from: row[2] === 'inbound' ? (row[1] || 'Cliente') : 'Agente',
        to: row[2] === 'inbound' ? 'Agente' : (row[1] || 'Cliente'),
        body: row[3] || '',
        timestamp: new Date(row[0]).getTime() || Date.now(),
        status: 'read',
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error obteniendo mensajes desde Google Sheets:', error);
    res.status(200).json([]);
  }
}
