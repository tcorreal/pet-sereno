"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "../lib/client-fetch";

type PetOption = { id: string; name: string; role: string; canCreate: boolean; members: Array<Record<string, unknown>> };
type ServiceType = { id: string; name: string; short_description: string };

export function AccountReservationForm({ pets, serviceTypes, initialPetId = "" }: { pets: PetOption[]; serviceTypes: ServiceType[]; initialPetId?: string }) {
  const router = useRouter();
  const initial = pets.find((pet) => pet.id === initialPetId && pet.canCreate)?.id ?? pets.find((pet) => pet.canCreate)?.id ?? "";
  const [data, setData] = useState({ petId: initial, serviceTypeId: serviceTypes[0]?.id ?? "", startDatetime: "", endDatetime: "", notes: "" });
  const [dropoff, setDropoff] = useState<string[]>([]); const [pickup, setPickup] = useState<string[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const selectedPet = useMemo(() => pets.find((pet) => pet.id === data.petId), [pets, data.petId]);
  const eligibleDropoff = selectedPet?.members.filter((m) => m.status === "ACTIVE" && (m.role === "OWNER" || m.can_dropoff)) ?? [];
  const eligiblePickup = selectedPet?.members.filter((m) => m.status === "ACTIVE" && (m.role === "OWNER" || m.can_pickup)) ?? [];
  function toggle(values: string[], setValues: (value: string[]) => void, id: string) { setValues(values.includes(id) ? values.filter((item) => item !== id) : [...values, id]); }
  if (!pets.some((pet) => pet.canCreate)) return <div className="empty-state account-panel">No tienes mascotas con permiso para crear reservas.</div>;
  return <form className="reservation-card account-form" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await fetchJson<{ id: string }>("/api/account/reservations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...data, dropoffProfileIds: dropoff, pickupProfileIds: pickup }) }, "No pudimos crear la reserva.");
      router.push(`/cuenta/reservas?created=${result.id}`); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos crear la reserva."); }
    finally { setBusy(false); }
  }}>
    <div className="form-panel__heading"><span className="eyebrow">NUEVA RESERVA</span><h2>Preparemos su próxima aventura</h2><p>La solicitud quedará pendiente de confirmación por el equipo Pet Sereno.</p></div>
    {error && <div className="alert alert--error">{error}</div>}
    <div className="form-grid">
      <label className="field"><span>Mascota</span><select value={data.petId} onChange={(e) => { setData((current) => ({ ...current, petId: e.target.value })); setDropoff([]); setPickup([]); }}>{pets.filter((pet) => pet.canCreate).map((pet) => <option key={pet.id} value={pet.id}>{pet.name} · {pet.role === "OWNER" ? "Propietario" : "Responsable"}</option>)}</select></label>
      <label className="field"><span>Servicio</span><select value={data.serviceTypeId} onChange={(e) => setData((current) => ({ ...current, serviceTypeId: e.target.value }))}>{serviceTypes.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
      <label className="field"><span>Ingreso</span><input type="datetime-local" value={data.startDatetime} onChange={(e) => setData((current) => ({ ...current, startDatetime: e.target.value }))} required/></label>
      <label className="field"><span>Salida estimada</span><input type="datetime-local" value={data.endDatetime} onChange={(e) => setData((current) => ({ ...current, endDatetime: e.target.value }))} required/></label>
      <label className="field field--full"><span>Observaciones</span><textarea value={data.notes} onChange={(e) => setData((current) => ({ ...current, notes: e.target.value }))}/></label>
    </div>
    <div className="authorization-grid"><AuthorizedPeople title="Personas que pueden entregar" members={eligibleDropoff} selected={dropoff} onToggle={(id) => toggle(dropoff, setDropoff, id)}/><AuthorizedPeople title="Personas que pueden recoger" members={eligiblePickup} selected={pickup} onToggle={(id) => toggle(pickup, setPickup, id)}/></div>
    <p className="privacy-note">Si no eliges a nadie y tú tienes el permiso correspondiente, quedarás autorizado automáticamente.</p>
    <div className="form-actions"><button type="button" className="button button--tertiary" onClick={() => router.back()}>Volver</button><button className="button button--primary" disabled={busy}>{busy ? "Creando solicitud…" : "Solicitar reserva"}</button></div>
  </form>;
}

function AuthorizedPeople({ title, members, selected, onToggle }: { title: string; members: Array<Record<string, unknown>>; selected: string[]; onToggle: (id: string) => void }) {
  return <fieldset><legend>{title}</legend>{members.length ? members.map((member) => { const profile = member.profile as Record<string, unknown>; const id = String(profile.id); return <label key={id}><input type="checkbox" checked={selected.includes(id)} onChange={() => onToggle(id)}/><span>{String(profile.first_name)} {String(profile.last_name)}<small>{member.role === "OWNER" ? "Propietario" : "Responsable"}</small></span></label>; }) : <p className="muted">No hay personas disponibles.</p>}</fieldset>;
}
