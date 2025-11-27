# Agente WhatsApp con Claude AI

## Overview
This project is a professional WhatsApp agent integrated with Claude AI (Anthropic), Google APIs (Calendar, Sheets, Docs), and Twilio for WhatsApp communication. Its core purpose is to automate customer interactions for real estate inquiries, including scheduling appointments and providing property information, all managed through a modern, responsive dashboard. The system aims to provide a seamless and intelligent conversational experience for users seeking real estate assistance.

## User Preferences
- **Flujo conversacional estructurado** - El bot sigue un flujo paso a paso, sin bombardear con información.
- **Mensajes cortos** - Máximo 4 líneas por mensaje (300 tokens max).
- **Preguntas progresivas** - Califica la necesidad antes de dar información.
- **Respuestas directas para saludos** - Saludos simples ("hola", "buenos días") se responden sin invocar a Claude.
- Use 1-2 emojis per message (professional but friendly).
- Only mention scheduling when the client shows real interest.
- Act as a trustworthy real estate advisor (not a generic bot).

## System Architecture
The application is built on a Next.js 14 server with React 18, utilizing Socket.io for real-time communication. It employs a custom server (`server.js`) to integrate Socket.io alongside Next.js.

### UI/UX Decisions
The dashboard features a professional design inspired by WhatsApp Web, incorporating official WhatsApp 2024 colors (`#075E54`, `#128C7E`, `#25D366`) and a modern dark mode (`#111B21`, `#202C33`, `#2A3942`). Key UI elements include:
- Professional login screen with animated WhatsApp logo.
- Left sidebar for conversations with circular avatars.
- Differentiated chat bubbles for agent and client.
- Smart timestamps and message status icons (sent, delivered, read).
- Real-time "typing..." indicator via Socket.io.
- Unread message badges and automatic conversation reordering.
- Auto-scroll to new messages.
- Fully responsive design with mobile sidebar toggle.

### Technical Implementations
- **Real-time Communication:** Socket.io is integrated for live updates in the dashboard.
- **AI Integration:** Claude Haiku 4.5 is used for intelligent conversational responses and tool use.
- **Automated Scheduling:** Claude's `agendar_cita` tool automatically schedules appointments in Google Calendar, handles relative dates, and generates event links.
- **Document Consultation:** Claude's `consultar_documentos` tool retrieves real-time property information from Google Docs.
- **Data Persistence:** Customer messages and appointment details are saved to Google Sheets.
- **Next.js Version:** Next.js 14.2.23 is used for stability and compatibility.
- **Security:** Configured security headers, CORS for Socket.io, and sensitive variables stored in environment secrets.

### Feature Specifications
- **Automatic Appointment Scheduling:** Claude can extract date, time, and reason to create Google Calendar events, generating and sharing event links.
- **Real Estate Information Retrieval:** Claude can query Google Docs to provide detailed property information.
- **Dashboard Functionality:** Displays conversations, messages, and real-time updates for agent management.

### System Design Choices
- **Microservices-oriented:** Clear separation between frontend, backend, and API endpoints.
- **Model Context Protocol (MCP):** Utilized for context management.
- **Containerization-friendly:** Designed for deployment on platforms like Replit and Railway.
- **Environment Variables:** All sensitive information and configurations are managed through environment variables.

## External Dependencies
- **Anthropic Claude AI:** Specifically Claude Haiku 4.5 for conversational intelligence and tool use.
- **Twilio:** For WhatsApp communication (sending and receiving messages via webhooks).
- **Google APIs:**
    - **Google Calendar API:** For scheduling and managing appointments.
    - **Google Sheets API:** For data persistence (messages, customer records).
    - **Google Docs API:** For retrieving real estate property information.
- **Socket.io:** For real-time, bidirectional communication between the server and the dashboard.
- **Next.js 14:** Web framework for the frontend and API routes.
- **React 18:** JavaScript library for building user interfaces.
- **Luxon:** For advanced date and time manipulation, especially for handling timezones and relative dates.