"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "../lib/client-fetch";

export function InvitationList({ invitations }: { invitations: Array<Record<string, unknown>> }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  if (!invitations.length) return null;
  return <section className="account-panel invitation-panel"><div><span className="eyebrow">INVITACIONES</span><h2>Tienes vínculos pendientes</h2></div>{error && <div className="alert alert--error">{error}</div>}
    <div className="invitation-list">{invitations.map((item) => { const pet = item.pet as Record<string, unknown>; const id = String(item.membership_id); return <article key={id}><span className="pet-avatar">{String(pet.name).slice(0, 1)}</span><div><strong>{String(pet.name)}</strong><small>{item.role === "OWNER" ? "Propietario" : "Responsable"} · Invitación de {String(item.invited_by || "Pet Sereno")}</small></div><button className="button button--primary button--small" disabled={busy === id} onClick={async () => { setBusy(id); setError(""); try { await fetchJson(`/api/account/memberships/${id}/accept`, { method: "POST" }, "No pudimos aceptar la invitación."); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos aceptar la invitación."); } finally { setBusy(""); } }}>{busy === id ? "Aceptando…" : "Aceptar"}</button></article>; })}</div>
  </section>;
}
