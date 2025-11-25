"use client";
import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

const USER = process.env.NEXT_PUBLIC_DASHBOARD_USER || "admin";
const PASS = process.env.NEXT_PUBLIC_DASHBOARD_PASS || "admin123";
const MAX_ATTEMPTS = 5;

interface Message {
  messageId: string;
  conversationId: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  status?: 'sent' | 'delivered' | 'read';
}

interface Conversation {
  id: string;
  usuario: string;
  ultimoMensaje: string;
  timestamp: number;
  unread?: number;
}

export default function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [auth, setAuth] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const socketRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      console.log('📱 Detectando móvil:', mobile, 'Ancho:', window.innerWidth);
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dashboard_auth");
      if (stored === "true") setAuth(true);
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    localStorage.setItem("dashboard_auth", "true");
    
    fetch("/api/conversations")
      .then((res) => res.json())
      .then(setConversations)
      .catch(console.error);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    socketRef.current = io(backendUrl);
    
    socketRef.current.on("new-message", (payload: any) => {
      const conversationId = payload.from === 'Agente' ? payload.to : payload.from;
      const normalizedMsg: Message = {
        messageId: payload.messageId || `msg-${Date.now()}`,
        conversationId: String(conversationId),
        from: payload.from,
        to: payload.to,
        body: payload.body,
        timestamp: payload.timestamp || Date.now(),
        status: 'delivered',
      };
      
      if (selectedRef.current === String(conversationId)) {
        setMessages((prev) => [...prev, normalizedMsg]);
      }
      
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === String(conversationId));
        const isActive = selectedRef.current === String(conversationId);
        
        if (idx !== -1) {
          const conversation = prev[idx];
          const updatedConv = {
            ...conversation,
            ultimoMensaje: normalizedMsg.body,
            timestamp: normalizedMsg.timestamp,
            unread: isActive ? 0 : (conversation.unread || 0) + 1,
          };
          
          const updated = prev.filter((_, i) => i !== idx);
          return [updatedConv, ...updated];
        }
        
        return [
          {
            id: String(conversationId),
            usuario: String(conversationId),
            ultimoMensaje: normalizedMsg.body,
            timestamp: normalizedMsg.timestamp,
            unread: isActive ? 0 : 1,
          },
          ...prev,
        ];
      });
    });

    socketRef.current.on("typing", (payload: any) => {
      const conversationId = String(payload.conversationId || payload.from || payload.id);
      if (conversationId === selectedRef.current) {
        setTyping(true);
        setTimeout(() => setTyping(false), 3000);
      }
    });

    return () => socketRef.current?.disconnect();
  }, [auth]);

  useEffect(() => {
    if (selected && auth) {
      fetch(`/api/messages/${selected}`)
        .then((res) => res.json())
        .then((msgs) => setMessages(msgs.map((m: Message) => ({ ...m, status: 'read' }))))
        .catch(console.error);
      
      setConversations((prev) =>
        prev.map((c) => (c.id === selected ? { ...c, unread: 0 } : c))
      );
    }
  }, [selected, auth]);

  const handleSend = async () => {
    if (!input.trim() || !selected) return;
    const msg: Message = {
      messageId: `msg-${Date.now()}`,
      conversationId: selected,
      from: "Agente",
      to: conversations.find((c) => c.id === selected)?.usuario || "",
      body: input,
      timestamp: Date.now(),
      status: 'sent',
    };
    
    setMessages((prev) => [...prev, msg]);
    socketRef.current?.emit("send-message", msg);
    
    try {
      await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: msg.to,
          message: msg.body,
        }),
      });
      setMessages((prev) =>
        prev.map((m) => (m.timestamp === msg.timestamp ? { ...m, status: 'delivered' } : m))
      );
    } catch (err) {
      console.error("Error enviando mensaje:", err);
    }
    
    setInput("");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();

    if (isToday) return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    if (isYesterday) return 'Ayer';
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
  };

  if (!auth) {
    return (
      <>
        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              box-shadow: 0 8px 24px rgba(37, 211, 102, 0.4), 0 0 0 8px rgba(37, 211, 102, 0.1);
            }
            50% {
              box-shadow: 0 8px 32px rgba(37, 211, 102, 0.6), 0 0 0 12px rgba(37, 211, 102, 0.15);
            }
          }
          
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
        <div style={{ 
          display: "flex", 
          height: "100vh", 
          alignItems: "center", 
          justifyContent: "center", 
          background: "linear-gradient(135deg, #075E54 0%, #128C7E 50%, #25D366 100%)",
          position: "relative",
          overflow: "hidden"
        }}>
        {/* Patrón de fondo decorativo */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          opacity: 0.4,
        }}></div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            if (!user.trim() || !pass.trim()) {
              setError("Usuario y contraseña requeridos");
              setLoading(false);
              return;
            }
            if (attempts >= MAX_ATTEMPTS) {
              setError("Demasiados intentos. Intenta más tarde.");
              setLoading(false);
              return;
            }
            if (user === USER && pass === PASS) {
              setAuth(true);
              setError("");
              setAttempts(0);
              localStorage.setItem("dashboard_auth", "true");
            } else {
              setAttempts((a) => a + 1);
              setError("Credenciales incorrectas");
            }
            setLoading(false);
          }}
          style={{
            background: "#fff",
            padding: "56px 48px",
            borderRadius: 24,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 0 100px rgba(37,211,102,0.2)",
            minWidth: 420,
            maxWidth: 460,
            position: "relative",
            zIndex: 1,
            animation: "slideUp 0.5s ease-out",
          }}
        >
          {/* Logo y título */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ 
              width: 96, 
              height: 96, 
              background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", 
              borderRadius: "50%", 
              margin: "0 auto 24px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(37, 211, 102, 0.4), 0 0 0 8px rgba(37, 211, 102, 0.1)",
              animation: "pulse 2s ease-in-out infinite"
            }}>
              <svg width="56" height="56" fill="white" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <h2 style={{ 
              marginBottom: 8, 
              fontSize: 28, 
              fontWeight: 700, 
              color: "#111",
              letterSpacing: "-0.5px"
            }}>WhatsApp Business</h2>
            <p style={{ 
              color: "#667781", 
              fontSize: 15,
              fontWeight: 400
            }}>Dashboard Profesional</p>
          </div>

          {/* Campos de formulario */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ 
              display: "block", 
              marginBottom: 8, 
              fontSize: 13, 
              fontWeight: 600, 
              color: "#3B4A54",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>Usuario</label>
            <input
              type="text"
              placeholder="Ingresa tu usuario"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              style={{
                width: "100%",
                padding: "16px 18px",
                borderRadius: 12,
                border: error && !user ? "2px solid #EA4335" : "2px solid #E9EDEF",
                fontSize: 15,
                outline: "none",
                transition: "all 0.3s ease",
                backgroundColor: "#F0F2F5",
                fontWeight: 500,
                color: "#111"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#25D366";
                e.target.style.backgroundColor = "#fff";
                e.target.style.boxShadow = "0 0 0 4px rgba(37, 211, 102, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = error && !user ? "#EA4335" : "#E9EDEF";
                e.target.style.backgroundColor = "#F0F2F5";
                e.target.style.boxShadow = "none";
              }}
              autoFocus
              disabled={loading || attempts >= MAX_ATTEMPTS}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ 
              display: "block", 
              marginBottom: 8, 
              fontSize: 13, 
              fontWeight: 600, 
              color: "#3B4A54",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>Contraseña</label>
            <input
              type="password"
              placeholder="Ingresa tu contraseña"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              style={{
                width: "100%",
                padding: "16px 18px",
                borderRadius: 12,
                border: error && !pass ? "2px solid #EA4335" : "2px solid #E9EDEF",
                fontSize: 15,
                outline: "none",
                transition: "all 0.3s ease",
                backgroundColor: "#F0F2F5",
                fontWeight: 500,
                color: "#111"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#25D366";
                e.target.style.backgroundColor = "#fff";
                e.target.style.boxShadow = "0 0 0 4px rgba(37, 211, 102, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = error && !pass ? "#EA4335" : "#E9EDEF";
                e.target.style.backgroundColor = "#F0F2F5";
                e.target.style.boxShadow = "none";
              }}
              disabled={loading || attempts >= MAX_ATTEMPTS}
            />
          </div>

          {/* Mensaje de error */}
          {error && (
            <div style={{ 
              background: "linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)", 
              color: "#C62828", 
              padding: "14px 18px", 
              borderRadius: 12, 
              marginBottom: 20, 
              fontSize: 14, 
              fontWeight: 600,
              borderLeft: "4px solid #EA4335",
              boxShadow: "0 2px 8px rgba(234, 67, 53, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}>
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {error}
            </div>
          )}

          {/* Botón de submit */}
          <button
            type="submit"
            style={{
              width: "100%",
              background: loading || attempts >= MAX_ATTEMPTS 
                ? "linear-gradient(135deg, #A5D6A7 0%, #81C784 100%)" 
                : "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "16px 24px",
              fontWeight: 700,
              fontSize: 16,
              cursor: loading || attempts >= MAX_ATTEMPTS ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: loading || attempts >= MAX_ATTEMPTS 
                ? "none" 
                : "0 4px 12px rgba(37, 211, 102, 0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}
            onMouseEnter={(e) => {
              if (!loading && attempts < MAX_ATTEMPTS) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(37, 211, 102, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = loading || attempts >= MAX_ATTEMPTS 
                ? "none" 
                : "0 4px 12px rgba(37, 211, 102, 0.3)";
            }}
            disabled={loading || attempts >= MAX_ATTEMPTS}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                Verificando...
              </span>
            ) : "Iniciar Sesión"}
          </button>
          {attempts > 0 && attempts < MAX_ATTEMPTS && (
            <div style={{ color: "#8696A0", marginTop: 12, fontSize: 13, textAlign: "center" }}>
              Intentos restantes: {MAX_ATTEMPTS - attempts}
            </div>
          )}
        </form>
      </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        /* Desktop: Default styles */
        .mobile-sidebar {
          width: 420px;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        
        .mobile-chat-area {
          display: flex;
          flex-direction: column;
        }
        
        @media (max-width: 768px) {
          /* Mobile: Single view at a time - WhatsApp Web pattern */
          .mobile-sidebar {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            z-index: 1 !important;
            display: ${selected ? 'none' : 'flex'} !important;
          }
          
          .mobile-chat-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            z-index: 2 !important;
            display: ${selected ? 'flex' : 'none'} !important;
          }
          
          .chat-messages {
            padding: 12px 16px !important;
          }
          
          .chat-footer {
            padding: 8px 12px !important;
          }
          
          .chat-footer button:first-child {
            display: none !important;
          }
          
          .chat-footer input {
            font-size: 16px !important;
          }
          
          .mobile-menu-btn {
            display: flex !important;
          }
          
          .mobile-back-btn {
            display: flex !important;
          }
        }
        
        @media (min-width: 769px) {
          .mobile-menu-btn {
            display: none !important;
          }
          
          .mobile-back-btn {
            display: none !important;
          }
        }
      `}</style>
      <div style={{ display: "flex", height: "100vh", fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif", background: "#111B21", position: "relative" }}>
        <aside 
          className="mobile-sidebar" 
          style={{ 
            background: "#111B21", 
            borderRight: "1px solid #2A3942",
            ...(isMobile ? {
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "100%",
              zIndex: 1,
              display: selected ? "none" : "flex",
              flexDirection: "column"
            } : {
              width: 420,
              display: "flex",
              flexDirection: "column"
            })
          }}
        >
        <header style={{ padding: "16px 20px", background: "#202C33", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2A3942" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 40, height: 40, background: "#25D366", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 16 }}>
              A
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 500, color: "#E9EDEF", margin: 0 }}>Agente Inmobiliario</h2>
          </div>
          <button
            onClick={() => {
              setAuth(false);
              setUser("");
              setPass("");
              setError("");
              setAttempts(0);
              localStorage.removeItem("dashboard_auth");
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#8696A0",
              cursor: "pointer",
              padding: 8,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              transition: "background 0.2s",
            }}
            title="Cerrar sesión"
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 13v-2H7V8l-5 4 5 4v-3z"/>
              <path d="M20 3h-9c-1.103 0-2 .897-2 2v4h2V5h9v14h-9v-4H9v4c0 1.103.897 2 2 2h9c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2z"/>
            </svg>
          </button>
        </header>

        <div style={{ padding: "12px 16px", background: "#202C33" }}>
          <input
            type="text"
            placeholder="Buscar o empezar un chat nuevo"
            style={{
              width: "100%",
              padding: "10px 16px 10px 48px",
              borderRadius: 8,
              border: "none",
              background: "#111B21",
              color: "#E9EDEF",
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", background: "#111B21" }}>
          {conversations.length === 0 ? (
            <div style={{ padding: "32px 24px", textAlign: "center", color: "#8696A0" }}>
              <svg width="64" height="64" fill="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.3, marginBottom: 16 }}>
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
              </svg>
              <p style={{ fontSize: 14 }}>No hay conversaciones</p>
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelected(c.id)}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  background: selected === c.id ? "#2A3942" : "transparent",
                  borderBottom: "1px solid #2A3942",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (selected !== c.id) e.currentTarget.style.background = "#202C33";
                }}
                onMouseLeave={(e) => {
                  if (selected !== c.id) e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ width: 52, height: 52, background: "#6B7C85", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 18, flexShrink: 0 }}>
                  {getInitials(c.usuario)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontWeight: 500, fontSize: 16, color: "#E9EDEF" }}>{c.usuario}</div>
                    <div style={{ fontSize: 12, color: "#8696A0" }}>{formatTime(c.timestamp)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ color: "#8696A0", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.ultimoMensaje}
                    </div>
                    {c.unread && c.unread > 0 && (
                      <div style={{ background: "#25D366", color: "#111B21", borderRadius: "50%", minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, padding: "0 6px" }}>
                        {c.unread}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      <main 
        className="mobile-chat-area" 
        style={{ 
          background: "#0B141A", 
          flexDirection: "column",
          ...(isMobile ? {
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "100%",
            zIndex: 2,
            display: selected ? "flex" : "none"
          } : {
            flex: 1,
            display: "flex",
            position: "relative"
          })
        }}
      >
        {selected ? (
          <>
            <header style={{ padding: "12px 20px", background: "#202C33", borderBottom: "1px solid #2A3942", display: "flex", alignItems: "center", gap: 12 }}>
              {(() => {
                console.log('🔘 Renderizando botón - isMobile:', isMobile, 'selected:', selected);
                return null;
              })()}
              <button 
                onClick={() => {
                  console.log('⬅️ Botón volver presionado');
                  setSelected(null);
                }}
                style={{ 
                  background: "transparent", 
                  border: "none", 
                  color: "#E9EDEF", 
                  cursor: "pointer", 
                  padding: 8,
                  marginRight: 4,
                  display: isMobile ? "flex" : "none",
                  alignItems: "center",
                  justifyContent: "center",
                  WebkitTapHighlightColor: "rgba(255,255,255,0.1)"
                }}
                className="mobile-back-btn"
                title="Volver a conversaciones"
              >
                <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
              </button>
              <div style={{ width: 40, height: 40, background: "#6B7C85", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 16 }}>
                {getInitials(conversations.find((c) => c.id === selected)?.usuario || "")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 16, color: "#E9EDEF" }}>
                  {conversations.find((c) => c.id === selected)?.usuario}
                </div>
                <div style={{ fontSize: 13, color: "#8696A0" }}>
                  {typing ? "escribiendo..." : "En línea"}
                </div>
              </div>
              <button style={{ background: "transparent", border: "none", color: "#8696A0", cursor: "pointer", padding: 8 }}>
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>
            </header>

            <div
              className="chat-messages"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 80px",
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                backgroundAttachment: "fixed",
              }}
            >
              {messages
                .filter((m) => m.conversationId === selected)
                .map((m, i) => (
                  <div
                    key={m.messageId || i}
                    style={{
                      display: "flex",
                      justifyContent: m.from === "Agente" ? "flex-end" : "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        background: m.from === "Agente" ? "#005C4B" : "#202C33",
                        borderRadius: 8,
                        padding: "8px 12px",
                        maxWidth: 540,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                        position: "relative",
                      }}
                    >
                      <div style={{ color: "#E9EDEF", fontSize: 14, lineHeight: "19px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {m.body}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: "#8696A0" }}>
                          {new Date(m.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {m.from === "Agente" && (
                          <svg width="16" height="11" fill="#53BDEB" viewBox="0 0 16 11">
                            <path d="M11.071.653a.75.75 0 10-1.142.972l4.243 4.993L9.93 11.61a.75.75 0 001.142.972l5-5.885a.75.75 0 000-.972l-5-5.072z"/>
                            <path d="M5.071.653a.75.75 0 00-1.142.972l4.243 4.993L3.93 11.61a.75.75 0 101.142.972l5-5.885a.75.75 0 000-.972L5.07.653z"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </div>

            <footer className="chat-footer" style={{ padding: "12px 20px", background: "#202C33", borderTop: "1px solid #2A3942", display: "flex", gap: 8, alignItems: "center" }}>
              <button style={{ background: "transparent", border: "none", color: "#8696A0", cursor: "pointer", padding: 8 }}>
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe un mensaje"
                style={{
                  flex: 1,
                  borderRadius: 8,
                  border: "none",
                  padding: "10px 16px",
                  fontSize: 15,
                  background: "#2A3942",
                  color: "#E9EDEF",
                  outline: "none",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                style={{
                  background: input.trim() ? "#25D366" : "transparent",
                  color: input.trim() ? "#fff" : "#8696A0",
                  border: "none",
                  borderRadius: "50%",
                  width: 48,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: input.trim() ? "pointer" : "default",
                  transition: "all 0.2s",
                }}
                disabled={!input.trim()}
              >
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                </svg>
              </button>
            </footer>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#8696A0", textAlign: "center", padding: 24 }}>
            <div style={{ width: 320, marginBottom: 32 }}>
              <svg viewBox="0 0 303 172" fill="none">
                <path d="M151.5 0C67.9 0 0 67.9 0 151.5S67.9 303 151.5 303 303 235.1 303 151.5 235.1 0 151.5 0z" fill="#42CBA5" fillOpacity=".1"/>
                <circle cx="151.5" cy="151.5" r="120" fill="#42CBA5" fillOpacity=".2"/>
                <circle cx="151.5" cy="151.5" r="90" fill="#42CBA5" fillOpacity=".4"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 300, color: "#E9EDEF", marginBottom: 16 }}>WhatsApp Business Dashboard</h2>
            <p style={{ fontSize: 14, lineHeight: "20px", maxWidth: 480 }}>
              Selecciona una conversación de la lista para ver los mensajes y gestionar las comunicaciones con tus clientes.
            </p>
            <p style={{ fontSize: 13, marginTop: 24, color: "#667781" }}>
              Conectado con Claude AI • MCP Protocol • Google Sheets
            </p>
          </div>
        )}
      </main>
    </div>
    </>
  );
}
