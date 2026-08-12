"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "../lib/client-fetch";

type Member = Record<string, unknown> & { membership_id: string; role: string; status: string; profile: Record<string, unknown> };
const permissionLabels: Array<[string, string]> = [["can_create_reservations", "Hacer reservas"], ["can_cancel_reservations", "Cancelar reservas"], ["can_dropoff", "Entregar mascota"], ["can_pickup", "Recoger mascota"]];

export function MembershipManager({ petId, members, canManage }: { petId: string; members: Member[]; canManage: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState(""); const [results, setResults] = useState<Array<Record<string, unknown>>>([]);
  const [role, setRole] = useState("RESPONSIBLE"); const [selected, setSelected] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({ can_create_reservations: false, can_cancel_reservations: false, can_dropoff: true, can_pickup: true });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  async function search() { setBusy(true); setError(""); try { setResults(await fetchJson(`/api/account/pets/${petId}/members/search?q=${encodeURIComponent(query)}`, {}, "No pudimos buscar esa cuenta.")); } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos buscar esa cuenta."); } finally { setBusy(false); } }
  async function invite() { if (!selected) return; setBusy(true); setError(""); setMessage(""); try { await fetchJson(`/api/account/pets/${petId}/members`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: selected, role, permissions }) }, "No pudimos enviar la invitación."); setMessage("Invitación enviada."); setResults([]); setSelected(""); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos enviar la invitación."); } finally { setBusy(false); } }
  return <section className="account-panel linked-people"><div className="account-section-heading"><div><span className="eyebrow">PERSONAS VINCULADAS</span><h2>Propietarios y responsables</h2></div></div>
    {error && <div className="alert alert--error">{error}</div>}{message && <div className="alert alert--success">{message}</div>}
    <div className="member-columns"><MemberGroup title="PROPIETARIOS" members={members.filter((m) => m.role === "OWNER")} canManage={canManage} routerRefresh={() => router.refresh()}/><MemberGroup title="RESPONSABLES" members={members.filter((m) => m.role === "RESPONSIBLE")} canManage={canManage} routerRefresh={() => router.refresh()}/></div>
    {canManage && <div className="member-invite"><h3>Invitar una persona</h3><p>Busca por username, email, teléfono o código interno. Los datos de contacto se muestran parcialmente.</p><div className="member-search"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="@usuario o correo exacto"/><button className="button button--secondary button--small" type="button" disabled={busy || query.trim().length < 3} onClick={() => void search()}>Buscar</button></div>
      {results.length > 0 && <div className="search-results">{results.map((result) => <label key={String(result.id)}><input aria-label={`Seleccionar a ${String(result.name)}`} type="radio" name="profile" value={String(result.id)} checked={selected === String(result.id)} onChange={() => setSelected(String(result.id))}/><span><strong>{String(result.name)}</strong><small>@{String(result.username)} · {String(result.email_hint || result.phone_hint)}</small></span></label>)}</div>}
      <div className="invite-options"><label className="field"><span>Relación</span><select value={role} onChange={(e) => setRole(e.target.value)}><option value="RESPONSIBLE">Responsable</option><option value="OWNER">Propietario</option></select></label>{role === "RESPONSIBLE" && <fieldset><legend>Permisos iniciales</legend>{permissionLabels.map(([key, label]) => <label key={key}><input type="checkbox" checked={permissions[key]} onChange={(e) => setPermissions((current) => ({ ...current, [key]: e.target.checked }))}/>{label}</label>)}</fieldset>}</div>
      <button type="button" className="button button--primary" disabled={busy || !selected} onClick={() => void invite()}>{busy ? "Enviando…" : "Enviar invitación"}</button>
    </div>}
  </section>;
}

function MemberGroup({ title, members, canManage, routerRefresh }: { title: string; members: Member[]; canManage: boolean; routerRefresh: () => void }) {
  return <div><h3>{title}</h3>{members.length ? members.map((member) => <MemberRow key={member.membership_id} member={member} canManage={canManage} routerRefresh={routerRefresh}/>) : <p className="muted">Ninguno.</p>}</div>;
}

function MemberRow({ member, canManage, routerRefresh }: { member: Member; canManage: boolean; routerRefresh: () => void }) {
  const profile = member.profile; const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [values, setValues] = useState<Record<string, boolean>>(() => Object.fromEntries(permissionLabels.map(([key]) => [key, Boolean(member[key])])));
  async function save() { setBusy(true); setError(""); try { await fetchJson(`/api/account/memberships/${member.membership_id}/permissions`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(values) }, "No pudimos actualizar los permisos."); setOpen(false); routerRefresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos actualizar los permisos."); } finally { setBusy(false); } }
  async function revoke() { if (!window.confirm("¿Quieres revocar este vínculo?")) return; setBusy(true); setError(""); try { await fetchJson(`/api/account/memberships/${member.membership_id}/revoke`, { method: "POST" }, "No pudimos revocar la relación."); routerRefresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos revocar la relación."); } finally { setBusy(false); } }
  return <article className="member-row"><span className="account-avatar">{String(profile.first_name || profile.username || "P").slice(0, 1)}</span><div className="member-row__main"><strong>{String(profile.first_name || "")} {String(profile.last_name || "")}</strong><small>@{String(profile.username || profile.user_code)} · {member.status === "PENDING" ? "Invitación pendiente" : member.role === "OWNER" ? "Propietario" : "Responsable"}</small>{error && <small className="inline-error">{error}</small>}</div>{canManage && member.role === "RESPONSIBLE" && <button className="text-action" onClick={() => setOpen(!open)}>Editar permisos</button>}{canManage && <button className="text-action text-action--danger" disabled={busy} onClick={() => void revoke()}>Revocar</button>}
    {open && <div className="permission-editor">{permissionLabels.map(([key, label]) => <label key={key}><input type="checkbox" checked={values[key]} onChange={(e) => setValues((current) => ({ ...current, [key]: e.target.checked }))}/>{label}</label>)}<button className="button button--primary button--small" disabled={busy} onClick={() => void save()}>{busy ? "Guardando…" : "Guardar cambios"}</button></div>}
  </article>;
}
