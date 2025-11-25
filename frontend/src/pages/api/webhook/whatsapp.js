import { Anthropic } from '@anthropic-ai/sdk';
import twilio from 'twilio';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import path from 'path';

const getKeyFile = () => process.env.GOOGLE_SERVICE_ACCOUNT_FILE || path.join(process.cwd(), 'google-credentials.json');

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

**FORMATO DE RESPUESTA:**
[Respuesta breve basada en lo que preguntó]
[Pregunta de seguimiento para avanzar en el flujo]

Zona horaria: America/Mexico_City`;

const tools = [
  {
    name: 'consultar_documentos',
    description: 'Consulta información de los documentos de Google Docs disponibles sobre terrenos, propiedades, precios, ubicaciones y servicios. Usa esta herramienta PRIMERO cuando el cliente pregunte sobre información del negocio.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Consulta específica del cliente (ej: "terrenos disponibles", "precios", "ubicaciones")'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'agendar_cita',
    description: 'Agenda una cita en Google Calendar. Usa esta herramienta SOLO cuando el cliente confirme que desea agendar una visita o reunión.',
    input_schema: {
      type: 'object',
      properties: {
        resumen: {
          type: 'string',
          description: 'Título breve de la cita (ej: "Cita con Juan Pérez")'
        },
        descripcion: {
          type: 'string',
          description: 'Descripción detallada de la cita incluyendo motivo y datos del cliente'
        },
        fecha: {
          type: 'string',
          description: 'Fecha de la cita en formato YYYY-MM-DD (ej: "2025-11-21")'
        },
        hora_inicio: {
          type: 'string',
          description: 'Hora de inicio en formato HH:MM 24hrs (ej: "14:30")'
        },
        duracion_minutos: {
          type: 'number',
          description: 'Duración de la cita en minutos (default: 60)'
        },
        email_cliente: {
          type: 'string',
          description: 'Email del cliente (si lo proporcionó)'
        }
      },
      required: ['resumen', 'fecha', 'hora_inicio']
    }
  }
];

async function consultarDocumentos({ query }) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: getKeyFile(),
      scopes: ['https://www.googleapis.com/auth/documents.readonly'],
    });
    
    const docs = google.docs({ version: 'v1', auth });
    const docId = process.env.GOOGLE_DOCS_ID;
    
    console.log('📄 Consultando Google Doc:', docId, '| Query:', query);
    
    const response = await docs.documents.get({ documentId: docId });
    const content = response.data.body.content;
    
    let fullText = '';
    content.forEach(element => {
      if (element.paragraph) {
        element.paragraph.elements.forEach(e => {
          if (e.textRun) {
            fullText += e.textRun.content;
          }
        });
      }
    });
    
    console.log('✅ Documento obtenido, texto length:', fullText.length);
    
    return {
      success: true,
      content: fullText,
      query: query
    };
  } catch (error) {
    console.error('❌ Error al consultar documentos:', error);
    return { success: false, error: error.message };
  }
}

async function guardarMensajeEnSheet({ telefono, direccion, mensaje, messageId }) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: getKeyFile(),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    const timestamp = DateTime.now().setZone('America/Mexico_City').toFormat('yyyy-MM-dd\'T\'HH:mm:ss');
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Mensajes!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp, telefono || '', direccion || '', mensaje || '', messageId || '']]
      }
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
    const auth = new google.auth.GoogleAuth({
      keyFile: getKeyFile(),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    const timestamp = DateTime.now().setZone('America/Mexico_City').toFormat('yyyy-MM-dd\'T\'HH:mm:ss.SSSZZZ');
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Clientes!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp, email || '', nombre || '', telefono || '', cita || servicio || '']]
      }
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
    const auth = new google.auth.GoogleAuth({
      keyFile: getKeyFile(),
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    
    const [year, month, day] = fecha.split('-').map(Number);
    const [horas, minutos] = hora_inicio.split(':').map(Number);
    
    const inicio = DateTime.fromObject({
      year,
      month,
      day,
      hour: horas,
      minute: minutos,
      second: 0
    }, { zone: TIMEZONE });
    
    const fin = inicio.plus({ minutes: duracion_minutos });
    
    const event = {
      summary: resumen,
      description: `${descripcion}\n\nAgendado vía WhatsApp${email_cliente ? `\nEmail: ${email_cliente}` : ''}`,
      start: { 
        dateTime: inicio.toISO({ suppressMilliseconds: true }), 
        timeZone: TIMEZONE 
      },
      end: { 
        dateTime: fin.toISO({ suppressMilliseconds: true }), 
        timeZone: TIMEZONE 
      }
    };
    
    console.log('📅 Agendando cita:', JSON.stringify(event, null, 2));
    
    const result = await calendar.events.insert({ calendarId, requestBody: event });
    
    const eventLink = result.data.htmlLink || `https://calendar.google.com/calendar/event?eid=${result.data.id}`;
    
    console.log('🔗 Link del evento:', eventLink);
    
    await guardarClienteEnSheet({
      nombre: nombre_cliente || resumen,
      email: email_cliente,
      telefono: telefono_cliente,
      servicio: '',
      cita: `Cita ${inicio.toFormat('dd/MM/yyyy HH:mm')} - ${eventLink}`
    });
    
    return { 
      success: true, 
      eventId: result.data.id,
      eventLink: eventLink,
      inicio: inicio.toFormat('dd/MM/yyyy HH:mm'),
      fin: fin.toFormat('dd/MM/yyyy HH:mm'),
      crossesMidnight: inicio.day !== fin.day
    };
  } catch (error) {
    console.error('❌ Error al agendar cita:', error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  console.log('🔵 Webhook WhatsApp recibido:', req.method, req.url);
  console.log('📦 Body completo:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    console.log('❌ Método no permitido:', req.method);
    return res.status(405).end();
  }
  
  const { Body, From, MessageSid } = req.body;
  console.log('📨 From:', From, '| Message:', Body);
  
  if (!Body || !From) {
    console.log('❌ Faltan parámetros');
    return res.status(400).json({ error: 'Faltan parámetros Body o From' });
  }
  
  const telefono = From.replace('whatsapp:', '');
  
  await guardarMensajeEnSheet({
    telefono,
    direccion: 'inbound',
    mensaje: Body,
    messageId: MessageSid
  });
  
  // Detectar saludos simples y responder directamente sin Claude
  const mensajeNormalizado = Body.toLowerCase().trim();
  const saludosSimples = /^(hola|hi|hello|hey|buenos días|buenas tardes|buenas noches|qué tal|cómo estás|que tal|como estas|saludos|hola\?|hola!|👋|hola 👋)$/i;
  
  if (saludosSimples.test(mensajeNormalizado)) {
    console.log('👋 Saludo simple detectado, respondiendo directamente');
    
    const respuestasSaludos = [
      '¡Hola! 👋 ¿En qué puedo ayudarte hoy?',
      '¡Hola! 😊 ¿Buscas algún terreno o propiedad en particular?',
      '¡Buenos días! ✨ ¿En qué te puedo asistir?'
    ];
    
    const respuestaRandom = respuestasSaludos[Math.floor(Math.random() * respuestasSaludos.length)];
    
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    const twilioMsg = await client.messages.create({
      from: `whatsapp:${whatsappNumber}`,
      to: From,
      body: respuestaRandom
    });
    
    console.log('✅ Saludo enviado directamente, SID:', twilioMsg.sid);
    
    await guardarMensajeEnSheet({
      telefono,
      direccion: 'outbound',
      mensaje: respuestaRandom,
      messageId: twilioMsg.sid
    });
    
    return res.status(200).json({ success: true, sid: twilioMsg.sid, direct: true });
  }
  
  try {
    console.log('🤖 Iniciando Claude...');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let messages = [{ role: 'user', content: Body }];
    let finalResponse = '';
    
    console.log('📤 Enviando a Claude:', Body);
    let response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      tools: tools,
      messages: messages
    });
    console.log('✅ Respuesta de Claude recibida, stop_reason:', response.stop_reason);
    
    while (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(block => block.type === 'tool_use');
      
      if (!toolUse) break;
      
      let toolResult = null;
      
      console.log('🔧 Claude quiere usar herramienta:', toolUse.name);
      console.log('📥 Input:', JSON.stringify(toolUse.input, null, 2));
      
      if (toolUse.name === 'consultar_documentos') {
        toolResult = await consultarDocumentos(toolUse.input);
      } else if (toolUse.name === 'agendar_cita') {
        toolResult = await agendarCita(toolUse.input);
      }
      
      console.log('📤 Resultado de herramienta:', JSON.stringify(toolResult, null, 2));
      
      messages.push({
        role: 'assistant',
        content: response.content
      });
      
      const resultString = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);
      
      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: resultString
        }]
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
    
    console.log('💬 Respuesta final de Claude:', finalResponse);
    console.log('📞 Enviando WhatsApp a:', From);
    
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    const twilioMsg = await client.messages.create({
      from: `whatsapp:${whatsappNumber}`,
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
    console.error('❌ Error en webhook WhatsApp:', error);
    console.error('Stack:', error.stack);
    return res.status(500).json({ error: 'Error en webhook WhatsApp', message: error.message });
  }
}
