import { Anthropic } from '@anthropic-ai/sdk';
import twilio from 'twilio';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
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

const SYSTEM_PROMPT = `Eres un asesor inmobiliario profesional que sigue un FLUJO CONVERSACIONAL estructurado.

**FLUJO OBLIGATORIO (sigue estos pasos en orden):**

🔹 **PASO 1 - CALIFICACIÓN INICIAL:**
   - Pregunta: "¿Qué estás buscando?" o "¿En qué te puedo ayudar?"
   - NO des información sin antes saber qué necesita el cliente
   - Espera su respuesta antes de continuar

🔹 **PASO 2 - IDENTIFICAR NECESIDAD:**
   Cliente dice lo que busca → Haz UNA pregunta específica:
   - Si busca terrenos: "¿Qué tamaño aproximado buscas?" o "¿Tienes alguna zona preferida?"
   - Si pregunta precios: "¿Qué presupuesto manejas aproximadamente?"
   - Si pregunta ubicación: "¿Buscas zona centro o en las afueras?"
   
🔹 **PASO 3 - CONSULTAR Y RESPONDER:**
   - AHORA SÍ usa "consultar_documentos" para obtener información
   - Comparte SOLO 2-3 opciones relevantes
   - Máximo 4 líneas de texto
   - Termina con: "¿Alguna de estas opciones te interesa?"

🔹 **PASO 4 - PROFUNDIZAR:**
   - Si el cliente se interesa en algo específico, da más detalles
   - Si pide más opciones, consulta documentos de nuevo
   - Si muestra interés serio: "¿Te gustaría agendar una visita?"

🔹 **PASO 5 - CIERRE:**
   - Solo si el cliente CONFIRMA: agenda la cita con "agendar_cita"
   - Incluye SIEMPRE el link del calendario
   - Despídete cordialmente

**REGLAS ESTRICTAS:**

❌ NUNCA envíes toda la información de una vez
❌ NUNCA uses herramientas sin que el cliente haya especificado su necesidad
❌ NUNCA des más de 2-3 opciones por mensaje
✅ SIEMPRE pregunta antes de dar información
✅ SIEMPRE máximo 4 líneas por mensaje (excepto cuando consultas documentos)
✅ SIEMPRE termina con una pregunta para continuar el flujo
✅ Usa 1-2 emojis (🏡 ✨ 📍 💰)

Zona horaria: America/Mexico_City`;

const tools = [
  {
    name: 'consultar_documentos',
    description: 'Consulta información de los documentos de Google Docs disponibles sobre terrenos, propiedades, precios, ubicaciones y servicios.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Consulta específica del cliente' }
      },
      required: ['query']
    }
  },
  {
    name: 'agendar_cita',
    description: 'Agenda una cita en Google Calendar.',
    input_schema: {
      type: 'object',
      properties: {
        resumen: { type: 'string', description: 'Título breve de la cita' },
        descripcion: { type: 'string', description: 'Descripción de la cita' },
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        hora_inicio: { type: 'string', description: 'Hora en formato HH:MM' },
        duracion_minutos: { type: 'number', description: 'Duración en minutos' },
        email_cliente: { type: 'string', description: 'Email del cliente' }
      },
      required: ['resumen', 'fecha', 'hora_inicio']
    }
  }
];

async function consultarDocumentos({ query }) {
  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/documents.readonly']);
    const docs = google.docs({ version: 'v1', auth });
    const docId = process.env.GOOGLE_DOCS_ID;
    
    const response = await docs.documents.get({ documentId: docId });
    const content = response.data.body.content;
    
    let fullText = '';
    content.forEach(element => {
      if (element.paragraph) {
        element.paragraph.elements.forEach(e => {
          if (e.textRun) fullText += e.textRun.content;
        });
      }
    });
    
    return { success: true, content: fullText, query };
  } catch (error) {
    console.error('Error al consultar documentos:', error);
    return { success: false, error: error.message };
  }
}

async function guardarMensajeEnSheet({ telefono, direccion, mensaje, messageId }) {
  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const timestamp = DateTime.now().setZone('America/Mexico_City').toFormat("yyyy-MM-dd'T'HH:mm:ss");
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Mensajes!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[timestamp, telefono || '', direccion || '', mensaje || '', messageId || '']] }
    });
    return { success: true };
  } catch (error) {
    console.error('Error al guardar mensaje:', error);
    return { success: false, error: error.message };
  }
}

async function guardarClienteEnSheet({ nombre, email, telefono, servicio, cita }) {
  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const timestamp = DateTime.now().setZone('America/Mexico_City').toFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZZZ");
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Clientes!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[timestamp, email || '', nombre || '', telefono || '', cita || servicio || '']] }
    });
    return { success: true };
  } catch (error) {
    console.error('Error al guardar cliente:', error);
    return { success: false, error: error.message };
  }
}

async function agendarCita({ resumen, descripcion = '', fecha, hora_inicio, duracion_minutos = 60, email_cliente, nombre_cliente, telefono_cliente }) {
  try {
    const TIMEZONE = 'America/Mexico_City';
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/calendar']);
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    
    const [year, month, day] = fecha.split('-').map(Number);
    const [horas, minutos] = hora_inicio.split(':').map(Number);
    
    const inicio = DateTime.fromObject({ year, month, day, hour: horas, minute: minutos, second: 0 }, { zone: TIMEZONE });
    const fin = inicio.plus({ minutes: duracion_minutos });
    
    const event = {
      summary: resumen,
      description: descripcion + (email_cliente ? '\nEmail: ' + email_cliente : ''),
      start: { dateTime: inicio.toISO({ suppressMilliseconds: true }), timeZone: TIMEZONE },
      end: { dateTime: fin.toISO({ suppressMilliseconds: true }), timeZone: TIMEZONE }
    };
    
    const result = await calendar.events.insert({ calendarId, requestBody: event });
    const eventLink = result.data.htmlLink;
    
    await guardarClienteEnSheet({
      nombre: nombre_cliente || resumen,
      email: email_cliente,
      telefono: telefono_cliente,
      cita: 'Cita ' + inicio.toFormat('dd/MM/yyyy HH:mm') + ' - ' + eventLink
    });
    
    return { success: true, eventId: result.data.id, eventLink, inicio: inicio.toFormat('dd/MM/yyyy HH:mm') };
  } catch (error) {
    console.error('Error al agendar cita:', error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { Body, From, MessageSid } = req.body;
  if (!Body || !From) return res.status(400).json({ error: 'Faltan parámetros' });
  
  const telefono = From.replace('whatsapp:', '');
  await guardarMensajeEnSheet({ telefono, direccion: 'inbound', mensaje: Body, messageId: MessageSid });
  
  const mensajeNormalizado = Body.toLowerCase().trim();
  const saludosSimples = /^(hola|hi|hello|hey|buenos días|buenas tardes|buenas noches|qué tal|cómo estás|que tal|como estas|saludos)$/i;
  
  if (saludosSimples.test(mensajeNormalizado)) {
    const respuestasSaludos = ['¡Hola! 👋 ¿En qué puedo ayudarte hoy?', '¡Hola! 😊 ¿Buscas algún terreno o propiedad?'];
    const respuestaRandom = respuestasSaludos[Math.floor(Math.random() * respuestasSaludos.length)];
    
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const twilioMsg = await client.messages.create({
      from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
      to: From,
      body: respuestaRandom
    });
    
    await guardarMensajeEnSheet({ telefono, direccion: 'outbound', mensaje: respuestaRandom, messageId: twilioMsg.sid });
    return res.status(200).json({ success: true, sid: twilioMsg.sid });
  }
  
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let messages = [{ role: 'user', content: Body }];
    
    let response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      tools,
      messages
    });
    
    while (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(block => block.type === 'tool_use');
      if (!toolUse) break;
      
      let toolResult = null;
      if (toolUse.name === 'consultar_documentos') toolResult = await consultarDocumentos(toolUse.input);
      else if (toolUse.name === 'agendar_cita') toolResult = await agendarCita(toolUse.input);
      
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }] });
      
      response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        tools,
        messages
      });
    }
    
    const textContent = response.content.find(block => block.type === 'text');
    const finalResponse = textContent?.text || 'No se pudo generar respuesta.';
    
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const twilioMsg = await client.messages.create({
      from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
      to: From,
      body: finalResponse
    });
    
    await guardarMensajeEnSheet({ telefono, direccion: 'outbound', mensaje: finalResponse, messageId: twilioMsg.sid });
    return res.status(200).json({ success: true, sid: twilioMsg.sid });
  } catch (error) {
    console.error('Error en webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}
