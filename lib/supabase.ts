import { env } from "cloudflare:workers";
import { demoRpc } from "./demo-store";

type RuntimeEnv = {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_APP_TOKEN?: string;
  LOCAL_DEMO_MODE?: string;
};

function runtimeValue(key: keyof RuntimeEnv) {
  const workerValue = (env as unknown as RuntimeEnv)[key];
  const nodeValue = typeof process !== "undefined" ? process.env[key] : undefined;
  const value = workerValue ?? nodeValue;
  if (!value) throw new Error("La conexión con la base de datos no está disponible en este momento.");
  return value;
}

export async function supabaseRpc<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  const demoMode = (env as unknown as RuntimeEnv).LOCAL_DEMO_MODE
    ?? (typeof process !== "undefined" ? process.env.LOCAL_DEMO_MODE : undefined);
  if (demoMode === "true") return demoRpc<T>(name, params);
  const url = runtimeValue("SUPABASE_URL");
  const publishableKey = runtimeValue("SUPABASE_PUBLISHABLE_KEY");
  const appToken = runtimeValue("SUPABASE_APP_TOKEN");
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
      "x-pet-sereno-token": appToken,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ p_app_token: appToken, ...params }),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string; details?: string };
    throw new Error(error.message || error.details || "Supabase no pudo completar la operación.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
