
/**
 * @swagger
 * /api/registro:
 *   post:
 *     summary: Registra un cliente en Google Sheets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               telefono:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cliente registrado
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error interno
 */
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { nombre, telefono, email } = req.body;
    if (!nombre || !telefono || !email) {
      return res.status(400).json({ error: 'Faltan datos de registro' });
    }
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
        ],
      });
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
  // Ejemplo de consulta (GET): obtener todos los registros
  if (req.method === 'GET') {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets.readonly',
        ],
      });
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
