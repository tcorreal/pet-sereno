"use client";
import { useEffect, useState } from "react";
import { fetchJson } from "../lib/client-fetch";
import { navigateTo } from "../lib/client-navigation";

export function AuthCallback() {
  const [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const providerError = params.get("error_description");
    if (providerError || !accessToken) {
      queueMicrotask(() => setError(providerError ?? "No recibimos la autorización del proveedor."));
      return;
    }
    void fetchJson("/api/auth/oauth/callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessToken }),
    }, "No pudimos iniciar sesión.").then(() => navigateTo("/cuenta")).catch((caught) => setError(caught instanceof Error ? caught.message : "No pudimos iniciar sesión."));
  }, []);
  return <div className="auth-callback"><span className="eyebrow">ACCESO SEGURO</span><h1>{error ? "No pudimos ingresar" : "Comprobando tu cuenta…"}</h1>{error && <><p>{error}</p><a className="button button--primary" href="/inicio">Volver a inicio</a></>}</div>;
}
