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

const SYSTEM_PROMPT = `Eres un asesor inmobiliario profesional.

**TU REGLA MÁS IMPORTANTE: NUNCA repitas una pregunta que ya fue contestada en la conversación.**

Antes de responder, ANALIZA todo el historial de mensajes y extrae:
- ¿Qué tipo de propiedad busca? (terreno, casa, departamento)
- ¿En qué zona/ciudad?
- ¿Cuál es su presupuesto?
- ¿Qué tamaño?

**FLUJO:**
1. Si NO sabes qué busca → pregunta tipo de propiedad
2. Si ya sabes tipo pero NO zona → pregunta zona/ciudad
3. Si ya sabes tipo y zona pero NO presupuesto → pregunta presupuesto
4. Si ya tienes tipo + zona + presupuesto → usa consultar_documentos y muestra opciones

**FORMATO:**
- Máximo 3-4 líneas
- Resume lo que YA sabes antes de preguntar lo siguiente
- 1-2 emojis máximo

**EJEMPLO CORRECTO:**
Usuario: "terreno"
Tú: "Perfecto, buscas un terreno 🏡 ¿En qué zona o ciudad te interesa?"
Usuario: "no mas de 2 millones"  
Tú: "Entendido, terreno con presupuesto hasta 2M 💰 ¿En qué zona o ciudad lo buscas?"
Usuario: "zapopan"
Tú: "Excelente! Busco terrenos en Zapopan hasta 2M... [usa consultar_documentos]"

Zona horaria: America/Mexico_City`;

const tools = [
  {
    name: 'consultar_documentos',
    description: 'Consulta propiedades disponibles. Usa cuando tengas: tipo + zona + presupuesto.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Búsqueda (ej: "terrenos Zapopan 2 millones")' }
      },
      required: ['query']
    }
  },
  {
    name: 'agendar_cita',
    description: 'Agenda visita cuando el cliente CONFIRME.',
    input_schema: {
      type: 'object',
      properties: {
        resumen: { type: 'string' },
        fecha: { type: 'string', description: 'YYYY-MM-DD' },
        hora_inicio: { type: 'string', description: 'HH:MM' },
        duracion_minutos: { type: 'number' }
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
    let fullText = '';
    response.data.body.content.forEach(el => {
      if (el.paragraph) {
        el.paragraph.elements.forEach(e => {
          if (e.textRun) fullText += e.textRun.content;
        });
      }
    });
    
    return { success: true, content: fullText, query };
  } catch (error) {
    console.error('Error docs:', error);
    return { success: false, error: error.message };
  }
}

async function obtenerHistorialConversacion(telefono, limite = 20) {
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
      .filter(row => row[1] === telefono && row[3])
      .slice(-limite);
    
    console.log('📜 Historial:', mensajesCliente.length, 'msgs para', telefono);
    
    return mensajesCliente.map(row => ({
      direccion: row[2],
      mensaje: row[3]
    }));
  } catch (error) {
    console.error('Error historial:', error);
    return [];
  }
}

async function guardarMensajeEnSheet({ telefono, direccion, mensaje, messageId }) {
  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const timestamp = DateTime.now().setZone('America/Mexico_City').toFormat('yyyy-MM-dd HH:mm:ss');
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Mensajes!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[timestamp, telefono, direccion, mensaje, messageId || '']] }
    });
    return { success: true };
  } catch (error) {
    console.error('Error guardar:', error);
    return { success: false };
  }
}

async function agendarCita({ resumen, fecha, hora_inicio, duracion_minutos = 60 }) {
  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/calendar']);
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    
    const [year, month, day] = fecha.split('-').map(Number);
    const [horas, minutos] = hora_inicio.split(':').map(Number);
    
    const inicio = DateTime.fromObject({ year, month, day, hour: horas, minute: minutos }, { zone: 'America/Mexico_City' });
    const fin = inicio.plus({ minutes: duracion_minutos });
    
    const result = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: resumen,
        start: { dateTime: inicio.toISO(), timeZone: 'America/Mexico_City' },
        end: { dateTime: fin.toISO(), timeZone: 'America/Mexico_City' }
      }
    });
    
    return { success: true, eventLink: result.data.htmlLink };
  } catch (error) {
    console.error('Error cita:', error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { Body, From, MessageSid } = req.body;
  if (!Body || !From) return res.status(400).json({ error: 'Faltan params' });
  
  const telefono = From.replace('whatsapp:', '');
  console.log('📨 Mensaje de', telefono, ':', Body);
  
  await guardarMensajeEnSheet({ telefono, direccion: 'inbound', mensaje: Body, messageId: MessageSid });
  
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const historial = await obtenerHistorialConversacion(telefono, 20);
    
    let messages = [];
    let contextoResumen = '';
    
    if (historial.length > 1) {
      const previos = historial.slice(0, -1);
      
      previos.forEach(msg => {
        const role = msg.direccion === 'inbound' ? 'user' : 'assistant';
        messages.push({ role, content: msg.mensaje });
      });
      
      contextoResumen = previos.map(m => 
        (m.direccion === 'inbound' ? 'Cliente: ' : 'Asesor: ') + m.mensaje
      ).join('\n');
      
      console.log('📜 Contexto cargado:', messages.length, 'mensajes');
    }
    
    messages.push({ role: 'user', content: Body });
    
    console.log('📤 Enviando a Claude:', messages.length, 'mensajes');
    
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: SYSTEM_PROMPT + (contextoResumen ? '\n\n**RESUMEN DE CONVERSACIÓN PREVIA:**\n' + contextoResumen : ''),
      tools,
      messages
    });
    
    while (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(b => b.type === 'tool_use');
      if (!toolUse) break;
      
      console.log('🔧 Tool:', toolUse.name);
      let toolResult = toolUse.name === 'consultar_documentos' 
        ? await consultarDocumentos(toolUse.input)
        : await agendarCita(toolUse.input);
      
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }] });
      
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        tools,
        messages
      });
    }
    
    const finalResponse = response.content.find(b => b.type === 'text')?.text || 'Error generando respuesta';
    
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const twilioMsg = await client.messages.create({
      from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
      to: From,
      body: finalResponse
    });
    
    await guardarMensajeEnSheet({ telefono, direccion: 'outbound', mensaje: finalResponse, messageId: twilioMsg.sid });
    
    console.log('✅ Respuesta enviada');
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
