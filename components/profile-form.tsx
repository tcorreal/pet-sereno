"use client";
import { useEffect, useRef, useState } from "react";
import type { AccountProfile } from "../lib/account";
import { fetchJson } from "../lib/client-fetch";
import { navigateTo } from "../lib/client-navigation";

export function ProfileForm({ profile, email }: { profile: AccountProfile; email: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(profile.photo_url ?? "");
  const temporaryPreview = useRef("");
  const [data, setData] = useState<Record<string, string>>({
    firstName: profile.first_name ?? "", lastName: profile.last_name ?? "", username: profile.username ?? "",
    phone: profile.phone ?? "", documentType: profile.document_type ?? "CC", documentNumber: profile.document_number ?? "",
    photoUrl: profile.photo_url ?? "", address: "", city: "Medellín", department: "Antioquia",
  });
  useEffect(() => () => { if (temporaryPreview.current) URL.revokeObjectURL(temporaryPreview.current); }, []);
  const update = (name: string, value: string) => setData((current) => ({ ...current, [name]: value }));
  return <form className="step-form account-form" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setSaved(false);
    try {
      let photoUrl = data.photoUrl;
      if (photo) {
        const upload = new FormData(); upload.append("photo", photo);
        photoUrl = (await fetchJson<{ photoUrl: string }>("/api/account/profile/photo", { method: "POST", body: upload }, "No pudimos subir la foto.")).photoUrl;
      }
      await fetchJson("/api/account/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...data, photoUrl }) }, "No pudimos guardar tu perfil.");
      setSaved(true); navigateTo("/cuenta");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos guardar tu perfil."); }
    finally { setBusy(false); }
  }}>
    <div className="form-panel__heading"><span className="eyebrow">TU CUENTA</span><h2>Completa tu perfil</h2><p>Estos datos nos permiten identificarte de forma segura y cuidar la comunicación.</p></div>
    {error && <div className="alert alert--error" role="alert">{error}</div>}{saved && <div className="alert alert--success" role="status">Perfil guardado.</div>}
    <div className="form-grid">
      <Field label="Nombre" name="firstName" value={data.firstName} update={update} required/><Field label="Apellidos" name="lastName" value={data.lastName} update={update} required/>
      <Field label="Nombre de usuario" name="username" value={data.username} update={update} required hint="Ej. @oscarmorales"/><Field label="Correo autenticado" name="email" value={email} update={() => {}} type="email" disabled/>
      <Field label="Celular" name="phone" value={data.phone} update={update} type="tel" required hint="Ej. +573001234567"/>
      <label className="field"><span>Tipo de documento</span><select value={data.documentType} onChange={(e) => update("documentType", e.target.value)}><option>CC</option><option>CE</option><option>Pasaporte</option><option>NIT</option></select></label>
      <Field label="Número de documento" name="documentNumber" value={data.documentNumber} update={update} required/>
      <div className="field profile-photo-field"><label htmlFor="profile-photo">Foto de perfil</label><div className="profile-photo-picker"><span className="profile-photo-preview">{photoPreview ? <img src={photoPreview} alt="Vista previa de tu foto de perfil"/> : (data.firstName || email).slice(0, 1).toUpperCase()}</span><span><input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] ?? null; setError(""); if (file && file.size > 5 * 1024 * 1024) { setError("La imagen no puede superar 5 MB."); event.target.value = ""; return; } if (temporaryPreview.current) URL.revokeObjectURL(temporaryPreview.current); temporaryPreview.current = file ? URL.createObjectURL(file) : ""; setPhotoPreview(temporaryPreview.current || data.photoUrl); setPhoto(file); }}/><small>JPG, PNG o WebP · máximo 5 MB.</small></span></div></div>
      <Field label="Dirección" name="address" value={data.address} update={update}/><Field label="Ciudad" name="city" value={data.city} update={update}/><Field label="Departamento" name="department" value={data.department} update={update}/>
    </div>
    <div className="form-actions"><span/><button className="button button--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar y continuar"}</button></div>
  </form>;
}

function Field({ label, name, value, update, type = "text", required = false, hint, disabled = false }: { label: string; name: string; value: string; update: (name: string, value: string) => void; type?: string; required?: boolean; hint?: string; disabled?: boolean }) {
  return <label className="field"><span>{label}{required && <b> *</b>}</span><input name={name} type={type} value={value} onChange={(e) => update(name, e.target.value)} required={required} disabled={disabled}/>{hint && <small>{hint}</small>}</label>;
}
