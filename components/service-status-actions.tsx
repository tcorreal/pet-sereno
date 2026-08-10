"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "../lib/client-fetch";

type Props = {
  serviceId: string;
  status: string;
  notificationId?: string | null;
  notificationStatus?: string | null;
};

const emailLabels: Record<string, string> = {
  PENDING: "Correo pendiente",
  SENDING: "Enviando correo",
  SENT: "Correo enviado",
  FAILED: "Correo por reintentar",
};

export function ServiceStatusActions({ serviceId, status, notificationId, notificationStatus }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [emailStatus, setEmailStatus] = useState(notificationStatus ?? "");
  const [emailId, setEmailId] = useState(notificationId ?? "");
  const nextStatus = ["SCHEDULED", "CHECKED_IN"].includes(status)
    ? "IN_SERVICE"
    : ["IN_SERVICE", "READY_FOR_PICKUP"].includes(status) ? "CHECKED_OUT" : null;

  async function changeStatus() {
    if (!nextStatus) return;
    if (nextStatus === "CHECKED_OUT" && !window.confirm("¿Confirmas que este servicio ya finalizó?")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = await fetchJson<{notification?:{status?:string;id?:string};emailConfigured?:boolean}>(`/api/services/${serviceId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      }, "No pudimos actualizar el servicio.");
      setEmailStatus(body.notification?.status ?? "");
      setEmailId(body.notification?.id ?? "");
      setMessage(body.emailConfigured === false
        ? "Estado guardado. Falta conectar el proveedor de correo."
        : "Estado y notificación actualizados.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos actualizar el servicio.");
    } finally {
      setBusy(false);
    }
  }

  async function retryEmail() {
    if (!emailId) return;
    setBusy(true);
    setError("");
    try {
      const body = await fetchJson<{notification?:{status?:string};configured?:boolean}>(`/api/notifications/${emailId}/send`, { method: "POST" }, "No pudimos reenviar el correo.");
      setEmailStatus(body.notification?.status ?? emailStatus);
      setMessage(body.configured === false ? "Falta conectar el proveedor de correo." : "Reintento completado.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos reenviar el correo.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="service-actions">
    {nextStatus && <button
      className={`button button--small ${nextStatus === "IN_SERVICE" ? "button--primary" : "button--secondary"}`}
      type="button"
      disabled={busy}
      onClick={changeStatus}
    >
      {busy ? "Guardando…" : nextStatus === "IN_SERVICE" ? "Activar servicio" : "Cerrar servicio"}
    </button>}
    {emailStatus && <span className={`badge badge--${emailStatus.toLowerCase()}`}>
      {emailLabels[emailStatus] ?? emailStatus}
    </span>}
    {emailId && ["PENDING", "FAILED"].includes(emailStatus) && <button type="button" className="text-action" disabled={busy} onClick={retryEmail}>Reintentar correo</button>}
    {message && <small className="inline-success">{message}</small>}
    {error && <small className="inline-error">{error}</small>}
  </div>;
}
