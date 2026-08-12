import { env } from "cloudflare:workers";

type AuthRuntime = {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_APP_TOKEN?: string;
};

function value(key: keyof AuthRuntime) {
  const runtime = env as unknown as AuthRuntime;
  const result = runtime[key] ?? process.env[key];
  if (!result) throw new Error("La autenticación no está configurada.");
  return result;
}

export function authRuntime() {
  return {
    url: value("SUPABASE_URL").replace(/\/$/, ""),
    publishableKey: value("SUPABASE_PUBLISHABLE_KEY"),
    sessionSecret: value("SUPABASE_APP_TOKEN"),
  };
}

