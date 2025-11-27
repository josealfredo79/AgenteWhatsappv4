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

const SYSTEM_PROMPT = `Eres un asesor inmobiliario profesional que mantiene el CONTEXTO de toda la conversación.

**REGLA CRÍTICA: SIEMPRE recuerda lo que el cliente ya te dijo en mensajes anteriores.**

**FLUJO CONVERSACIONAL:**

🔹 **PASO 1 - CALIFICACIÓN INICIAL:**
   - Si es nuevo: "¿Qué estás buscando?" o "¿En qué te puedo ayudar?"
   - NO repitas esta pregunta si ya sabes qué busca

🔹 **PASO 2 - RECOPILAR INFORMACIÓN:**
   - Haz UNA pregunta a la vez para conocer:
     * Tipo de propiedad (terreno, casa, etc.)
     * Ubicación deseada
     * Presupuesto
     * Tamaño aproximado
   - NUNCA repitas preguntas que ya fueron contestadas

🔹 **PASO 3 - CONSULTAR Y RESPONDER:**
   - Cuando tengas suficiente información, usa "consultar_documentos"
   - Comparte 2-3 opciones que coincidan con lo que busca
   - Menciona los criterios que el cliente ya dio

🔹 **PASO 4 - CIERRE:**
   - Si muestra interés: "¿Te gustaría agendar una visita?"
   - Solo agenda cuando el cliente CONFIRME

**REGLAS ESTRICTAS:**

❌ NUNCA preguntes algo que el cliente ya respondió
❌ NUNCA olvides el contexto de la conversación
✅ SIEMPRE resume lo que ya sabes antes de preguntar más
✅ Máximo 4 líneas por mensaje
✅ Usa 1-2 emojis (🏡 ✨ 📍 💰)

**EJEMPLO DE BUEN CONTEXTO:**
Cliente: "Busco terreno de 500m² en Zapopan"
Tú: "Perfecto, terreno de 500m² en Zapopan 📍 ¿Cuál es tu presupuesto aproximado?"
Cliente: "Hasta 2 millones"
Tú: "Excelente, busco opciones de terreno ~500m² en Zapopan por hasta 2M. Dame un momento... 🏡"
[Usa consultar_documentos]

Zona horaria: America/Mexico_City`;

const tools = [
  {
    name: 'consultar_documentos',
    description: 'Consulta información de propiedades disponibles. Usa cuando tengas suficiente información del cliente.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Búsqueda específica (ej: "terrenos 500m2 Zapopan 2 millones")'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'agendar_cita',
    description: 'Agenda una cita cuando el cliente CONFIRME que desea una visita.',
    input_schema: {
      type: 'object',
      properties: {
        resumen: { type: 'string', description: 'Título de la cita' },
        descripcion: { type: 'string', description: 'Descripción detallada' },
        fecha: { type: 'string', description: 'Fecha YYYY-MM-DD' },
        hora_inicio: { type: 'string', description: 'Hora HH:MM' },
        duracion_minutos: { type: 'number', description: 'Duración (default: 60)' },
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
    
    console.log('📄 Consultando Google Doc:', docId, '| Query:', query);
    
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
    
    console.log('✅ Documento obtenido, texto length:', fullText.length);
    return { success: true, content: fullText, query };
  } catch (error) {
    console.error('❌ Error al consultar documentos:', error);
    return { success: false, error: error.message };
  }
}

async function obtenerHistorialConversacion(telefono, limite = 10) {
  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets.readonly']);
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Mensajes!A:E'
    });
    
    const rows = response.data.values || [];
    
    const mensajesCliente = rows
      .filter(row => row[1] === telefono)
      .slice(-limite)
      .map(row => ({
        timestamp: row[0],
        direccion: row[2],
        mensaje: row[3]
      }));
    
    console.log('📜 Historial obtenido:', mensajesCliente.length, 'mensajes para', telefono);
    return mensajesCliente;
  } catch (error) {
    console.error('❌ Error al obtener historial:', error);
    return [];
  }
}

async function guardarMensajeEnSheet({ telefono, direccion, mensaje, messageId }) {
  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    const timestamp = DateTime.now().setZone('America/Mexico_City').toFormat('yyyy-MM-dd\'T\'HH:mm:ss');
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Mensajes!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[timestamp, telefono || '', direccion || '', mensaje || '', messageId || '']] }
    });
    
    console.log('✅ Mensaje guardado en Google Sheet');
    return { success: true };
  } catch (error) {
    console.error('❌ Error al guardar mensaje:', error);
    return { success: false, error: error.message };
  }
}

async function guardarClienteEnSheet({ nombre, email, telefono, servicio, cita }) {
  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    const timestamp = DateTime.now().setZone('America/Mexico_City').toFormat('yyyy-MM-dd\'T\'HH:mm:ss.SSSZZZ');
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Clientes!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[timestamp, email || '', nombre || '', telefono || '', cita || servicio || '']] }
    });
    
    console.log('✅ Cliente guardado en Google Sheet');
    return { success: true };
  } catch (error) {
    console.error('❌ Error al guardar cliente:', error);
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
    
    console.log('📅 Agendando cita:', JSON.stringify(event, null, 2));
    
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
    console.error('❌ Error al agendar cita:', error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  console.log('🔵 Webhook WhatsApp recibido:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  
  const { Body, From, MessageSid } = req.body;
  console.log('📨 From:', From, '| Message:', Body);
  
  if (!Body || !From) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }
  
  const telefono = From.replace('whatsapp:', '');
  
  await guardarMensajeEnSheet({
    telefono,
    direccion: 'inbound',
    mensaje: Body,
    messageId: MessageSid
  });
  
  const mensajeNormalizado = Body.toLowerCase().trim();
  const saludosSimples = /^(hola|hi|hello|hey|buenos días|buenas tardes|buenas noches|qué tal|cómo estás|que tal|como estas|saludos|hola!|👋)$/i;
  
  if (saludosSimples.test(mensajeNormalizado)) {
    console.log('👋 Saludo simple detectado');
    
    const respuesta = '¡Hola! 👋 Bienvenido/a a nuestro servicio inmobiliario. ¿Qué estás buscando hoy? 🏡';
    
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    const twilioMsg = await client.messages.create({
      from: 'whatsapp:' + whatsappNumber,
      to: From,
      body: respuesta
    });
    
    await guardarMensajeEnSheet({
      telefono,
      direccion: 'outbound',
      mensaje: respuesta,
      messageId: twilioMsg.sid
    });
    
    return res.status(200).json({ success: true, sid: twilioMsg.sid, direct: true });
  }
  
  try {
    console.log('🤖 Iniciando Claude con contexto...');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const historial = await obtenerHistorialConversacion(telefono, 10);
    
    let messages = [];
    
    if (historial.length > 0) {
      historial.forEach(msg => {
        if (msg.direccion === 'inbound') {
          messages.push({ role: 'user', content: msg.mensaje });
        } else if (msg.direccion === 'outbound') {
          messages.push({ role: 'assistant', content: msg.mensaje });
        }
      });
      console.log('📜 Contexto cargado:', messages.length, 'mensajes previos');
    }
    
    messages.push({ role: 'user', content: Body });
    
    let finalResponse = '';
    
    console.log('📤 Enviando a Claude con', messages.length, 'mensajes de contexto');
    let response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      tools: tools,
      messages: messages
    });
    
    while (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(block => block.type === 'tool_use');
      if (!toolUse) break;
      
      let toolResult = null;
      console.log('🔧 Claude usa herramienta:', toolUse.name);
      
      if (toolUse.name === 'consultar_documentos') {
        toolResult = await consultarDocumentos(toolUse.input);
      } else if (toolUse.name === 'agendar_cita') {
        toolResult = await agendarCita(toolUse.input);
      }
      
      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }]
      });
      
      response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        tools: tools,
        messages: messages
      });
    }
    
    const textContent = response.content.find(block => block.type === 'text');
    finalResponse = textContent?.text || 'No se pudo generar respuesta.';
    
    console.log('💬 Respuesta final:', finalResponse);
    
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    const twilioMsg = await client.messages.create({
      from: 'whatsapp:' + whatsappNumber,
      to: From,
      body: finalResponse
    });
    
    console.log('✅ WhatsApp enviado, SID:', twilioMsg.sid);
    
    await guardarMensajeEnSheet({
      telefono,
      direccion: 'outbound',
      mensaje: finalResponse,
      messageId: twilioMsg.sid
    });
    
    return res.status(200).json({ success: true, sid: twilioMsg.sid });
  } catch (error) {
    console.error('❌ Error en webhook:', error);
    return res.status(500).json({ error: 'Error en webhook', message: error.message });
  }
}
