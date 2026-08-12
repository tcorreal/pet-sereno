"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SESSION_KEY = "ps_chat_session_id";
const MAX_MESSAGE_LENGTH = 2000;

function getSessionId(): string {
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

function functionUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base.replace(/\/$/, "")}/functions/v1/chat-agent` : null;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string>("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionIdRef.current = getSessionId();

    const url = functionUrl();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anonKey) return;

    // sessionStorage sobrevive recargas de página, así que la memoria del
    // agente también sobrevive — se hidrata el widget con esa historia real
    // al montar, para que la vista no se vea "vacía" mientras el agente
    // igual recuerda todo lo anterior.
    fetch(`${url}?session_id=${encodeURIComponent(sessionIdRef.current)}&channel=web`, {
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { messages?: ChatMessage[] } | null) => {
        if (data?.messages?.length) setMessages(data.messages);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const url = functionUrl();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anonKey) {
      setError("El chat no está disponible en este momento.");
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ session_id: sessionIdRef.current, message: text, channel: "web" }),
      });
      const data = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) throw new Error(data.error || "No pudimos responder tu mensaje.");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply! }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-widget__panel" role="dialog" aria-label="Chat de Pet Sereno">
          <div className="chat-widget__header">
            <strong>Asistente Pet Sereno</strong>
            <button type="button" className="chat-widget__close" onClick={() => setOpen(false)} aria-label="Cerrar chat">
              ×
            </button>
          </div>
          <div className="chat-widget__messages" ref={listRef}>
            {messages.length === 0 && (
              <p className="chat-widget__hint">
                Hola, soy el asistente de Pet Sereno. Pregúntame por nuestros servicios, horarios o cómo reservar.
              </p>
            )}
            {messages.map((message, index) => (
              <div key={index} className={`chat-widget__bubble chat-widget__bubble--${message.role}`}>
                {message.content}
              </div>
            ))}
            {loading && (
              <div className="chat-widget__bubble chat-widget__bubble--assistant chat-widget__bubble--loading">
                Escribiendo…
              </div>
            )}
          </div>
          {error && <p className="chat-widget__error">{error}</p>}
          <form className="chat-widget__form" onSubmit={sendMessage}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escribe tu pregunta…"
              maxLength={MAX_MESSAGE_LENGTH}
              aria-label="Mensaje"
            />
            <button type="submit" className="button button--primary button--small" disabled={loading || !input.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        className="chat-widget__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Cerrar chat" : "Abrir chat con Pet Sereno"}
      >
        {open ? "×" : "Chat"}
      </button>
    </div>
  );
}
