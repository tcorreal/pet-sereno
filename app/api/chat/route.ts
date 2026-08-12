import { env } from "cloudflare:workers";
import { getChatGPTUser, type ChatGPTUser } from "../../chatgpt-auth";

// El chat-agent es una Supabase Edge Function aparte (fuera de Cloudflare a
// propósito) que el widget ya no llama directo desde el navegador. La razón
// es que la sesión de login vive en una cookie httpOnly de este mismo sitio
// (lib/auth-session.ts) — invisible para el JS del widget y, aunque no lo
// fuera, un fetch cross-origin a *.supabase.co nunca la llevaría puesta. Esta
// ruta sí corre en el mismo origen que la cookie, así que puede leerla
// server-side y reenviar la identidad ya verificada a la Edge Function por
// headers de confianza, protegidos con el mismo app token que ya usan las
// RPC api_* (private.assert_app_token). Sin ese token, la Edge Function
// ignora los headers de identidad — así un cliente no puede falsificarlos.
type RuntimeEnv = { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string; SUPABASE_APP_TOKEN?: string };

function runtimeValue(key: keyof RuntimeEnv): string | null {
  const workerValue = (env as unknown as RuntimeEnv)[key];
  const nodeValue = typeof process !== "undefined" ? process.env[key] : undefined;
  return workerValue ?? nodeValue ?? null;
}

function edgeFunctionUrl(): string | null {
  const base = runtimeValue("SUPABASE_URL");
  return base ? `${base.replace(/\/$/, "")}/functions/v1/chat-agent` : null;
}

function forwardHeaders(user: ChatGPTUser | null): Record<string, string> {
  const appToken = runtimeValue("SUPABASE_APP_TOKEN");
  const headers: Record<string, string> = {};
  if (appToken) headers["x-ps-app-token"] = appToken;
  if (!user) return headers;

  headers["x-ps-user-id"] = user.userId;
  headers["x-ps-user-email"] = user.email;
  if (user.fullName) {
    headers["x-ps-user-full-name"] = encodeURIComponent(user.fullName);
    headers["x-ps-user-full-name-encoding"] = "percent-encoded-utf-8";
  }
  return headers;
}

function unavailable(): Response {
  return Response.json({ error: "El chat no está disponible en este momento." }, { status: 503 });
}

export async function GET(request: Request) {
  const url = edgeFunctionUrl();
  const publishableKey = runtimeValue("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !publishableKey) return unavailable();

  const user = await getChatGPTUser();
  const { search } = new URL(request.url);
  const response = await fetch(`${url}${search}`, {
    headers: { apikey: publishableKey, authorization: `Bearer ${publishableKey}`, ...forwardHeaders(user) },
  });
  return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json" } });
}

export async function POST(request: Request) {
  const url = edgeFunctionUrl();
  const publishableKey = runtimeValue("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !publishableKey) return unavailable();

  const user = await getChatGPTUser();
  const body = await request.text();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
      ...forwardHeaders(user),
    },
    body,
  });
  return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json" } });
}
