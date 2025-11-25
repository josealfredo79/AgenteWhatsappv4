import twilio from 'twilio';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { to, body } = req.body;
  if (!to || !body) {
    return res.status(400).json({ error: 'Faltan parámetros to o body' });
  }
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    await client.messages.create({
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:${to}`,
      body
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
}
