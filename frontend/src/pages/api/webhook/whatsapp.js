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

async function obtenerEstadoConversacion(telefono) {
  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Estados!A:G'
    });
    
    const rows = response.data.values || [];
    const estadoRow = rows.find(row => row[0] === telefono);
    
    if (estadoRow) {
      return {
        telefono: estadoRow[0],
        tipo_propiedad: estadoRow[1] || '',
        zona: estadoRow[2] || '',
        presupuesto: estadoRow[3] || '',
        etapa: estadoRow[4] || 'inicial',
        resumen: estadoRow[5] || '',
        ultima_actualizacion: estadoRow[6] || ''
      };
    }
    
    return {
      telefono,
      tipo_propiedad: '',
      zona: '',
      presupuesto: '',
      etapa: 'inicial',
      resumen: '',
      ultima_actualizacion: ''
    };
  } catch (error) {
    console.error('Error obtener estado:', error.message);
    return {
      telefono,
      tipo_propiedad: '',
      zona: '',
      presupuesto: '',
      etapa: 'inicial',
      resumen: '',
      ultima_actualizacion: ''
    };
  }
}

async function guardarEstadoConversacion(estado) {
  try {
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Estados!A:A'
    });
    
    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === estado.telefono);
    
    const timestamp = DateTime.now().setZone('America/Mexico_City').toFormat('yyyy-MM-dd HH:mm:ss');
    const rowData = [
      estado.telefono,
      estado.tipo_propiedad || '',
      estado.zona || '',
      estado.presupuesto || '',
      estado.etapa || 'inicial',
      estado.resumen || '',
      timestamp
    ];
    
    if (rowIndex > -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Estados!A${rowIndex + 1}:G${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] }
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Estados!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] }
      });
    }
    
    console.log('💾 Estado guardado para', estado.telefono);
    return { success: true };
  } catch (error) {
    console.error('Error guardar estado:', error.message);
    return { success: false };
  }
}

function construirPromptConEstado(estado) {
  let infoConocida = [];
  
  if (estado.tipo_propiedad) {
    infoConocida.push(`- Tipo de propiedad: ${estado.tipo_propiedad}`);
  }
  if (estado.zona) {
    infoConocida.push(`- Zona/Ciudad: ${estado.zona}`);
  }
  if (estado.presupuesto) {
    infoConocida.push(`- Presupuesto: ${estado.presupuesto}`);
  }
  
  const estadoTexto = infoConocida.length > 0 
    ? `\n\n**INFORMACIÓN YA RECOPILADA DEL CLIENTE:**\n${infoConocida.join('\n')}\n\n**IMPORTANTE: NO vuelvas a preguntar por esta información.**`
    : '';
  
  return `Eres un asesor inmobiliario profesional y amigable.
${estadoTexto}

**FLUJO DE CONVERSACIÓN:**
1. Si NO sabes tipo de propiedad → pregunta qué busca (terreno, casa, departamento)
2. Si ya sabes tipo pero NO zona → pregunta en qué zona o ciudad
3. Si ya sabes tipo y zona pero NO presupuesto → pregunta presupuesto aproximado
4. Si ya tienes TODO (tipo + zona + presupuesto) → usa consultar_documentos para buscar opciones

**REGLAS ESTRICTAS:**
- NUNCA repitas una pregunta si ya tienes esa información arriba
- Máximo 3-4 líneas por mensaje
- 1-2 emojis máximo
- Sé conversacional y amigable

**AL RESPONDER, INCLUYE AL FINAL UN BLOQUE JSON OCULTO:**
[ESTADO]{"tipo":"valor o null","zona":"valor o null","presupuesto":"valor o null"}[/ESTADO]

Extrae los valores de la conversación. Si el cliente menciona algo nuevo, actualízalo.

Zona horaria: America/Mexico_City`;
}

function extraerEstadoDeRespuesta(respuesta, estadoActual) {
  const regex = /\[ESTADO\](.*?)\[\/ESTADO\]/s;
  const match = respuesta.match(regex);
  
  if (match) {
    try {
      const nuevosDatos = JSON.parse(match[1]);
      return {
        ...estadoActual,
        tipo_propiedad: nuevosDatos.tipo || estadoActual.tipo_propiedad || '',
        zona: nuevosDatos.zona || estadoActual.zona || '',
        presupuesto: nuevosDatos.presupuesto || estadoActual.presupuesto || ''
      };
    } catch (e) {
      console.error('Error parsing estado:', e);
    }
  }
  
  return estadoActual;
}

function limpiarRespuesta(respuesta) {
  return respuesta.replace(/\[ESTADO\].*?\[\/ESTADO\]/s, '').trim();
}

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
    description: 'Agenda visita cuando el cliente CONFIRME interés en una propiedad específica.',
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
      .filter(row => row[1] === telefono && row[3])
      .slice(-limite);
    
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
    
    const estado = await obtenerEstadoConversacion(telefono);
    console.log('📋 Estado actual:', JSON.stringify(estado));
    
    const historial = await obtenerHistorialConversacion(telefono, 10);
    
    let messages = [];
    
    if (historial.length > 1) {
      const previos = historial.slice(-6, -1);
      previos.forEach(msg => {
        const role = msg.direccion === 'inbound' ? 'user' : 'assistant';
        const contenido = limpiarRespuesta(msg.mensaje);
        if (contenido) {
          messages.push({ role, content: contenido });
        }
      });
    }
    
    messages.push({ role: 'user', content: Body });
    
    const systemPrompt = construirPromptConEstado(estado);
    
    console.log('📤 Enviando a Claude con estado estructurado');
    
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
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
        max_tokens: 500,
        system: systemPrompt,
        tools,
        messages
      });
    }
    
    const respuestaCompleta = response.content.find(b => b.type === 'text')?.text || 'Error generando respuesta';
    
    const nuevoEstado = extraerEstadoDeRespuesta(respuestaCompleta, estado);
    await guardarEstadoConversacion(nuevoEstado);
    
    const respuestaLimpia = limpiarRespuesta(respuestaCompleta);
    
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const twilioMsg = await client.messages.create({
      from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
      to: From,
      body: respuestaLimpia
    });
    
    await guardarMensajeEnSheet({ telefono, direccion: 'outbound', mensaje: respuestaLimpia, messageId: twilioMsg.sid });
    
    console.log('✅ Respuesta enviada, estado guardado');
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
