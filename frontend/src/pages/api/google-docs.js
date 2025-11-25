/**
 * @swagger
 * /api/google-docs:
 *   get:
 *     summary: Obtiene el contenido de un Google Doc
 *     parameters:
 *       - in: query
 *         name: docId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del documento de Google Docs
 *     responses:
 *       200:
 *         description: Contenido del documento
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error interno
 */
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  const { docId } = req.query;
  if (!docId) return res.status(400).json({ error: 'Falta el parámetro docId' });
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
      scopes: ['https://www.googleapis.com/auth/documents.readonly'],
    });
    const docs = google.docs({ version: 'v1', auth });
    const response = await docs.documents.get({ documentId: docId });
    res.status(200).json({ content: response.data });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el documento', details: error.message });
  }
}
