import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { ChatMessage } from "./ai/types.ts";

// La Edge Function corre dentro de la infraestructura de Supabase y usa la
// service_role key (provista automáticamente por el runtime) para leer y
// escribir directo en las tablas de memoria: es su propio límite de
// confianza, a diferencia del Worker de Next.js (lib/supabase.ts) que solo
// tiene la publishable key y por eso pasa por el gateway RPC api_* + app token.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

export type ChatChannel = "web" | "whatsapp";

export async function getHistory(
  sessionId: string,
  channel: ChatChannel,
  limit: number,
): Promise<ChatMessage[]> {
  await supabase
    .from("chat_sessions")
    .upsert({ id: sessionId, channel }, { onConflict: "id", ignoreDuplicates: true });

  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as ChatMessage[]).reverse();
}

export async function addMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  const { error: insertError } = await supabase
    .from("chat_messages")
    .insert({ session_id: sessionId, role, content });
  if (insertError) throw insertError;

  const { error: touchError } = await supabase
    .from("chat_sessions")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (touchError) throw touchError;
}
