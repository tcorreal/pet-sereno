"use client";
import { useState } from "react";
import { fetchJson } from "../lib/client-fetch";
import { refreshPage } from "../lib/client-navigation";

export function AdminOperationForm({ reservationId, operation }: { reservationId: string; operation: "DROPOFF" | "PICKUP" }) {
  const [code, setCode] = useState(""); const [notes, setNotes] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  return <form className="operation-form" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); setMessage(""); try { await fetchJson(`/api/admin/reservations/${reservationId}/operation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation, code, notes }) }, "No pudimos validar el código."); setCode(""); setMessage(operation === "DROPOFF" ? "Ingreso registrado." : "Salida registrada."); refreshPage(); } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos validar el código."); } finally { setBusy(false); } }}>
    <h3>{operation === "DROPOFF" ? "Registrar ingreso" : "Registrar salida"}</h3><label className="field"><span>Código temporal</span><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength={8} autoComplete="one-time-code"/></label><label className="field"><span>Nota operativa</span><input value={notes} onChange={(e) => setNotes(e.target.value)}/></label><button className="button button--primary button--small" disabled={busy || code.length < 8}>{busy ? "Validando…" : "Validar y confirmar"}</button>{message && <small className="inline-success">{message}</small>}{error && <small className="inline-error">{error}</small>}
  </form>;
}
