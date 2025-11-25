import { Anthropic } from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Falta el parámetro prompt' });
  }
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const completion = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 512,
      system: 'Prueba de clave Claude AI',
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    const aiResponse = completion.content?.[0]?.text || 'No se pudo generar respuesta.';
    res.status(200).json({ response: aiResponse });
  } catch (error) {
    console.error('Error en /api/ia-test:', error);
    res.status(500).json({ error: 'Error al consultar Claude AI' });
  }
}
