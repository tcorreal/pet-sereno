// Salvaguarda simple contra abuso, por session_id. No es robusta entre
// instancias/isolates de la función, pero frena el caso simple de un mismo
// visitante mandando ráfagas de mensajes. Para límites serios de tráfico,
// usar las reglas de rate limiting del proyecto de Supabase o de Cloudflare.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;

const hits = new Map<string, number[]>();

export function isRateLimited(sessionId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(sessionId) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  recent.push(now);
  hits.set(sessionId, recent);
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}
