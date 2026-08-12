"use client";
import { useState } from "react";
import { fetchJson } from "../lib/client-fetch";
import { refreshPage } from "../lib/client-navigation";
import { StatusBadge } from "./site-shell";

export function AccountReservationCard({ reservation }: { reservation: Record<string, unknown> }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [code, setCode] = useState<{ value: string; operation: string; expiresAt: string } | null>(null);
  const status = String(reservation.status);
  async function cancel() { const reason = window.prompt("Motivo de cancelación (opcional)") ?? ""; setBusy(true); setError(""); try { await fetchJson(`/api/account/reservations/${reservation.id}/cancel`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) }, "No pudimos cancelar la reserva."); refreshPage(); } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos cancelar la reserva."); } finally { setBusy(false); } }
  async function generate(operation: "DROPOFF" | "PICKUP") { setBusy(true); setError(""); try { const result = await fetchJson<{ code: string; operation: string; expiresAt: string }>(`/api/account/reservations/${reservation.id}/codes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation }) }, "No pudimos generar el código."); setCode({ value: result.code, operation: result.operation, expiresAt: result.expiresAt }); } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos generar el código."); } finally { setBusy(false); } }
  return <article className="reservation-item"><div className="reservation-item__top"><div><code>{String(reservation.service_number || reservation.reservation_number)}</code><h3>{String(reservation.pet_name)}</h3><p>{String(reservation.service_type)}</p></div><StatusBadge status={status}/></div>
    <dl><div><dt>Ingreso</dt><dd>{new Date(String(reservation.start_datetime)).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</dd></div><div><dt>Salida</dt><dd>{new Date(String(reservation.end_datetime)).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</dd></div><div><dt>Reservó</dt><dd>{String(reservation.created_by || "Registro anterior")}</dd></div></dl>
    <div className="reservation-actions">{Boolean(reservation.can_cancel) && <button className="button button--secondary button--small" disabled={busy} onClick={() => void cancel()}>Cancelar reserva</button>}{Boolean(reservation.can_dropoff) && status === "SCHEDULED" && <button className="button button--primary button--small" disabled={busy} onClick={() => void generate("DROPOFF")}>Código de entrega</button>}{Boolean(reservation.can_pickup) && status === "READY_FOR_PICKUP" && <button className="button button--primary button--small" disabled={busy} onClick={() => void generate("PICKUP")}>Código de recogida</button>}</div>
    {code && <div className="temporary-code" role="status"><span>{code.operation === "DROPOFF" ? "ENTREGA" : "RECOGIDA"}</span><strong>{code.value}</strong><small>Válido hasta {new Date(code.expiresAt).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}. Un solo uso.</small></div>}{error && <div className="alert alert--error">{error}</div>}
  </article>;
}
