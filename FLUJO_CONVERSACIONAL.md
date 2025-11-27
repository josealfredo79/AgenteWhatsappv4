# 📱 Flujo Conversacional del Bot WhatsApp

## 🎯 Objetivo

El bot sigue un **flujo estructurado paso a paso** para calificar al cliente y brindar información relevante sin saturarlo. NO bombardea con información innecesaria.

---

## 🔄 Flujo de Conversación (5 Pasos)

### **PASO 1: Saludo y Calificación Inicial** 👋

**Cliente dice:** "Hola", "Buenos días", "Hola cómo estás"

**Bot responde:**
```
¡Hola! 👋 ¿En qué puedo ayudarte hoy?
```

**Características:**
- ✅ Respuesta **directa** sin invocar a Claude (más rápido)
- ✅ **1 línea** de texto
- ✅ Pregunta abierta para calificar necesidad
- ❌ NO envía información del negocio aún

---

### **PASO 2: Identificar Necesidad** 🔍

**Cliente dice:** "Quiero información de terrenos"

**Bot responde:**
```
¿Qué tamaño aproximado buscas? 📍
```

**Características:**
- ✅ Hace **UNA pregunta específica** para calificar
- ✅ Opciones de preguntas:
  - "¿Qué tamaño aproximado buscas?"
  - "¿Tienes alguna zona preferida?"
  - "¿Qué presupuesto manejas aproximadamente?"
- ❌ NO consulta documentos todavía
- ❌ NO da información aún

---

### **PASO 3: Consultar y Responder** 📄

**Cliente dice:** "De 200 a 300 metros"

**Bot responde:**
```
Perfecto, tenemos estas opciones en tu rango: ✨

🏡 Terreno 250m² - Zona Centro - $450,000
📍 Terreno 280m² - Las Lomas - $520,000

¿Alguna de estas opciones te interesa?
```

**Características:**
- ✅ **AHORA SÍ** consulta Google Docs con `consultar_documentos`
- ✅ Comparte **SOLO 2-3 opciones** relevantes
- ✅ Máximo **4 líneas** de texto
- ✅ Termina con pregunta de seguimiento
- ✅ 1-2 emojis (🏡 📍 💰 ✨)

---

### **PASO 4: Profundizar** 🎯

**Cliente dice:** "Me interesa el de Las Lomas"

**Bot responde:**
```
Excelente elección. El terreno de Las Lomas cuenta con agua, luz y drenaje. 💧

¿Te gustaría agendar una visita para conocerlo?
```

**Características:**
- ✅ Da **más detalles** del terreno específico
- ✅ Solo **si el cliente muestra interés serio**, ofrece agendar
- ✅ Pregunta clara de cierre
- ❌ NO presiona para agendar

---

### **PASO 5: Cierre y Agendamiento** 📅

**Cliente dice:** "Sí, quiero agendar para mañana a las 3pm"

**Bot responde:**
```
¡Listo! Tu cita quedó agendada para mañana 23/11 a las 15:00. 📅

Puedes verla aquí: https://calendar.google.com/...

¡Nos vemos mañana! 😊
```

**Características:**
- ✅ Usa la herramienta `agendar_cita`
- ✅ **SIEMPRE incluye** el link del calendario
- ✅ Confirmación clara con fecha y hora
- ✅ Despedida cordial

---

## ⚙️ Configuración Técnica

### **Límites Implementados:**

| Configuración | Valor | Propósito |
|--------------|-------|-----------|
| `max_tokens` | 300 | Fuerza respuestas cortas (antes: 1024) |
| Líneas máximas | 4 | Evita párrafos largos |
| Opciones por mensaje | 2-3 | No satura al cliente |
| Emojis | 1-2 | Tono amigable sin exagerar |

### **Detección de Saludos:**

El bot detecta automáticamente estos patrones y responde **directamente** (sin Claude):

```regex
hola|hi|hello|hey|buenos días|buenas tardes|buenas noches
qué tal|cómo estás|que tal|como estas|saludos|hola?|hola!|👋
```

---

## ✅ Reglas Estrictas del Bot

### **NUNCA:**
- ❌ Enviar toda la información de una vez
- ❌ Usar herramientas sin que el cliente haya especificado su necesidad
- ❌ Dar más de 2-3 opciones por mensaje
- ❌ Presionar para agendar si el cliente solo está consultando

### **SIEMPRE:**
- ✅ Preguntar antes de dar información
- ✅ Máximo 4 líneas por mensaje
- ✅ Terminar con una pregunta para continuar el flujo
- ✅ Usar 1-2 emojis profesionales

---

## 📊 Ejemplos de Conversaciones

### **Ejemplo 1: Cliente que solo saluda**

```
Cliente: Hola
Bot: ¡Hola! 👋 ¿En qué puedo ayudarte hoy?

Cliente: Nada, solo saludaba
Bot: ¡Perfecto! Cuando necesites algo, aquí estoy. 😊
```

**Resultado:** ✅ Sin saturar al cliente

---

### **Ejemplo 2: Cliente interesado en terrenos**

```
Cliente: Hola, quiero información de terrenos
Bot: ¡Hola! 😊 ¿Qué tamaño aproximado buscas?

Cliente: Entre 200 y 300 metros
Bot: Perfecto, tengo estas opciones: ✨
     🏡 250m² - Centro - $450,000
     📍 280m² - Las Lomas - $520,000
     ¿Alguna te interesa?

Cliente: El de Las Lomas
Bot: Excelente. Cuenta con todos los servicios. 💧
     ¿Te gustaría agendar una visita?

Cliente: Sí, mañana a las 3pm
Bot: ¡Listo! Cita agendada para 23/11 a las 15:00 📅
     Link: https://calendar.google.com/...
```

**Resultado:** ✅ Flujo natural y progresivo

---

### **Ejemplo 3: Cliente solo consultando**

```
Cliente: ¿Cuánto cuesta un terreno?
Bot: ¿Qué tamaño buscas aproximadamente? 📍

Cliente: 200 metros más o menos
Bot: Tenemos desde $400,000 en esa medida. ✨
     ¿Te interesa alguna zona específica?

Cliente: Gracias, solo estaba consultando
Bot: ¡Perfecto! Cuando decidas, aquí estoy. 😊
```

**Resultado:** ✅ Sin presión de ventas

---

## 🔧 Mantenimiento del Flujo

### **Para modificar el flujo:**

1. Edita `frontend/src/pages/api/webhook/whatsapp.js`
2. Modifica la variable `SYSTEM_PROMPT`
3. Reinicia el workflow: `Start application`

### **Para cambiar respuestas de saludo:**

Edita el array `respuestasSaludos` en la línea 297:

```javascript
const respuestasSaludos = [
  '¡Hola! 👋 ¿En qué puedo ayudarte hoy?',
  '¡Hola! 😊 ¿Buscas algún terreno o propiedad en particular?',
  '¡Buenos días! ✨ ¿En qué te puedo asistir?'
];
```

---

## 📈 Beneficios del Flujo Estructurado

1. **Mejor experiencia del cliente** - No se siente abrumado
2. **Mayor conversión** - Clientes calificados antes de dar info
3. **Ahorro de costos** - Menos tokens de Claude consumidos
4. **Respuestas más rápidas** - Saludos sin esperar a Claude
5. **Tono profesional** - Asesor confiable, no spam

---

## 🆘 Troubleshooting

### **El bot aún envía mucha información:**
- Verifica que `max_tokens` esté en 300 (no 1024)
- Revisa que el SYSTEM_PROMPT tenga las reglas actualizadas
- Reinicia el workflow

### **Los saludos no se detectan:**
- Verifica el regex `saludosSimples` en línea 292
- Agrega más patrones si es necesario
- Prueba con diferentes variaciones

---

**Última actualización:** Noviembre 2025  
**Versión del flujo:** 2.0 (Flujo estructurado)
