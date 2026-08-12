"use client";
import { useState } from "react";
import { fetchJson } from "../lib/client-fetch";
import { goBack, navigateTo } from "../lib/client-navigation";

export function AccountPetForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Record<string, string>>({ species: "Perro", sex: "" });
  const update = (name: string, value: string) => setData((current) => ({ ...current, [name]: value }));
  return <form className="step-form account-form" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await fetchJson("/api/account/pets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }, "No pudimos registrar la mascota.");
      navigateTo("/cuenta");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos registrar la mascota."); }
    finally { setBusy(false); }
  }}>
    <div className="form-panel__heading"><span className="eyebrow">NUEVA MASCOTA</span><h2>Cuéntanos sobre tu compañero</h2><p>Al guardar quedarás vinculado automáticamente como propietario.</p></div>
    {error && <div className="alert alert--error" role="alert">{error}</div>}
    <div className="form-grid">
      <Field label="Nombre" name="name" value={data.name} update={update} required/>
      <label className="field"><span>Especie</span><select value={data.species} onChange={(e) => update("species", e.target.value)}><option>Perro</option><option>Gato</option><option>Otra</option></select></label>
      <Field label="Raza" name="breed" value={data.breed} update={update}/>
      <label className="field"><span>Sexo</span><select value={data.sex} onChange={(e) => update("sex", e.target.value)}><option value="">Sin indicar</option><option>Macho</option><option>Hembra</option></select></label>
      <Field label="Fecha de nacimiento" name="birthDate" value={data.birthDate} update={update} type="date"/>
      <Field label="Edad aproximada" name="approximateAge" value={data.approximateAge} update={update} type="number"/>
      <Field label="Peso (kg)" name="weight" value={data.weight} update={update} type="number"/>
      <Field label="Color" name="color" value={data.color} update={update}/><Field label="Foto (URL)" name="photoUrl" value={data.photoUrl} update={update}/>
      <label className="field field--full"><span>Notas</span><textarea value={data.notes ?? ""} onChange={(e) => update("notes", e.target.value)}/></label>
    </div><div className="form-actions"><button type="button" className="button button--tertiary" onClick={() => goBack("/cuenta")}>Volver</button><button className="button button--primary" disabled={busy}>{busy ? "Guardando…" : "Agregar mascota"}</button></div>
  </form>;
}

function Field({ label, name, value = "", update, type = "text", required = false }: { label: string; name: string; value?: string; update: (name: string, value: string) => void; type?: string; required?: boolean }) {
  return <label className="field"><span>{label}{required && <b> *</b>}</span><input name={name} type={type} value={value} onChange={(e) => update(name, e.target.value)} required={required} min={type === "number" ? "0" : undefined}/></label>;
}
