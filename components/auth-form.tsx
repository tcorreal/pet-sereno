"use client";
import { useState } from "react";
import { fetchJson } from "../lib/client-fetch";
import { navigateTo } from "../lib/client-navigation";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [data, setData] = useState({ fullName: "", email: "", password: "" });
  const registering = mode === "signup";
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await fetchJson<{ pendingConfirmation: boolean }>("/api/auth/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...data, action: registering ? "signup" : "signin" }) }, registering ? "No pudimos crear tu cuenta." : "No pudimos iniciar sesión.");
      if (result.pendingConfirmation) setMessage("Revisa tu correo y confirma la cuenta para continuar."); else navigateTo("/cuenta");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos continuar."); } finally { setBusy(false); }
  }
  return <div className="auth-card"><div className="form-panel__heading"><span className="eyebrow">{registering ? "PRIMERA VEZ" : "BIENVENIDO DE NUEVO"}</span><h1>{registering ? "Crea tu cuenta" : "Inicia sesión"}</h1><p>{registering ? "Después completarás tu perfil y registrarás tus mascotas." : "Entra a tus mascotas, reservas e historial."}</p></div>
    <div className="social-auth"><a className="button button--secondary" href="/api/auth/oauth?provider=google">Continuar con Google</a><a className="button button--secondary" href="/api/auth/oauth?provider=azure">Continuar con Outlook</a></div><div className="auth-divider"><span>o continúa con correo</span></div>
    <form onSubmit={submit}>{registering && <label className="field"><span>Nombre completo</span><input value={data.fullName} onChange={(e) => setData((current) => ({ ...current, fullName: e.target.value }))} required autoComplete="name"/></label>}<label className="field"><span>Correo electrónico</span><input type="email" value={data.email} onChange={(e) => setData((current) => ({ ...current, email: e.target.value }))} required autoComplete="email"/></label><label className="field"><span>Contraseña</span><input type="password" minLength={8} value={data.password} onChange={(e) => setData((current) => ({ ...current, password: e.target.value }))} required autoComplete={registering ? "new-password" : "current-password"}/><small>Mínimo 8 caracteres.</small></label>{error && <div className="alert alert--error">{error}</div>}{message && <div className="alert alert--success">{message}</div>}<button className="button button--primary auth-submit" disabled={busy}>{busy ? "Procesando…" : registering ? "Crear cuenta" : "Ingresar"}</button></form>
    <p className="auth-switch">{registering ? <>¿Ya tienes una cuenta? <a href="/inicio">Inicia sesión</a></> : <>¿Es tu primera vez? <a href="/registro">Regístrate</a></>}</p>
  </div>;
}

