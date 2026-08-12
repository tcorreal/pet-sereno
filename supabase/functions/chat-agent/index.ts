import { corsHeaders, handleCors } from "./_shared/cors.ts";
import { addMessage, getHistory, type ChatChannel } from "./_shared/memory.ts";
import { fetchServiceTypes, getAccountContext } from "./_shared/gateway.ts";
import { buildSystemPrompt } from "./_shared/prompt.ts";
import { getChatProvider } from "./_shared/ai/provider.ts";
import { isRateLimited } from "./_shared/rate-limit.ts";
import { runTool, TOOLS } from "./_shared/tools.ts";
import { getAuthUser } from "./_shared/auth.ts";
import type { ChatMessage } from "./_shared/ai/types.ts";

const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOOL_ITERATIONS = 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RESERVATION_NUMBER_RE = /\bR-\d{4,}\b/g;
const HALLUCINATION_BLOCK_MESSAGE =
  "Antes de confirmar, necesito completar el proceso correctamente. ¿Puedes confirmarme una vez más que quieres crear la reserva?";

function reservationNumbersIn(text: string | null | undefined): string[] {
  if (!text) return [];
  return [...text.matchAll(RESERVATION_NUMBER_RE)].map((match) => match[0]);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method === "GET") {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id") ?? "";
    const channel: ChatChannel = url.searchParams.get("channel") === "whatsapp" ? "whatsapp" : "web";
    if (!UUID_RE.test(sessionId)) return jsonResponse({ error: "session_id inválido." }, 400);
    try {
      // Hidrata el widget con la memoria real de la sesión: sessionStorage
      // sobrevive recargas de página, así que el historial del servidor
      // también debe reflejarse ahí — si no, la UI se ve "vacía" pero el
      // agente igual recuerda todo, una inconsistencia confusa para el usuario.
      const history = await getHistory(sessionId, channel, MAX_HISTORY);
      return jsonResponse({ messages: history.filter((m) => m.role === "user" || m.role === "assistant") });
    } catch (error) {
      console.error(error);
      return jsonResponse({ error: "No pudimos cargar el historial." }, 500);
    }
  }

  if (req.method !== "POST") return jsonResponse({ error: "Método no permitido." }, 405);

  let body: { session_id?: string; message?: string; channel?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "JSON inválido." }, 400);
  }

  const sessionId = body.session_id ?? "";
  const message = (body.message ?? "").trim();
  const channel: ChatChannel = body.channel === "whatsapp" ? "whatsapp" : "web";

  if (!UUID_RE.test(sessionId)) return jsonResponse({ error: "session_id inválido." }, 400);
  if (!message) return jsonResponse({ error: "El mensaje no puede estar vacío." }, 400);
  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse({ error: "El mensaje es demasiado largo." }, 400);
  }
  if (isRateLimited(sessionId)) {
    return jsonResponse({ error: "Estás enviando mensajes muy rápido. Intenta de nuevo en un minuto." }, 429);
  }

  try {
    const authUser = getAuthUser(req);

    const [history, serviceTypes, accountContext] = await Promise.all([
      getHistory(sessionId, channel, MAX_HISTORY),
      fetchServiceTypes(),
      authUser ? getAccountContext(authUser).catch(() => null) : Promise.resolve(null),
    ]);

    await addMessage(sessionId, "user", message);

    const messages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(serviceTypes, authUser, accountContext) },
      ...history,
      { role: "user", content: message },
    ];

    // Si la respuesta anterior fue bloqueada por el guard de alucinaciones,
    // el modelo a veces sobre-corrige y en vez de reintentar la llamada a la
    // herramienta, inventa que "no tiene la capacidad" de reservar. Se le
    // recuerda explícitamente que sí tiene la tool disponible.
    const lastMessage = history[history.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.content === HALLUCINATION_BLOCK_MESSAGE) {
      messages.push({
        role: "system",
        content:
          "Recordatorio: sí tienes la herramienta crear_reserva disponible ahora mismo. Si la persona confirma que quiere proceder, llama a crear_reserva en este turno con los datos ya resumidos — no digas que no puedes ni la mandes a reservar por otro medio.",
      });
    }

    // Números de reserva ya legítimos: los que ya aparecían en el historial
    // (reservas reales de antes) más los que las tools de ESTE mensaje
    // realmente crearon. Cualquier otro número que el modelo mencione en su
    // respuesta final es una alucinación — el modelo alguna vez describió
    // una reserva "creada con éxito" con un número inventado sin haber
    // llamado a la tool. No se puede confiar en el texto del modelo solo
    // porque suene convincente.
    const knownReservationNumbers = new Set(history.flatMap((m) => reservationNumbersIn(m.content)));

    const provider = getChatProvider();
    let iterations = 0;
    let allowTools = true;
    let result = await provider.complete(messages, TOOLS);

    while (result.toolCalls?.length && iterations < MAX_TOOL_ITERATIONS) {
      iterations += 1;
      messages.push({ role: "assistant", content: result.content, tool_calls: result.toolCalls });

      // Si alguna llamada de esta vuelta falló, la siguiente vuelta se hace
      // SIN herramientas disponibles: obliga al modelo a responder en texto
      // (p. ej. pedir el documento) en vez de insistir con otra llamada, a
      // veces incluso a una función inventada que no existe.
      let allSucceeded = true;
      for (const toolCall of result.toolCalls) {
        const toolResult = await runTool(authUser, toolCall.function.name, toolCall.function.arguments);
        if (!toolResult.ok) allSucceeded = false;
        if (toolResult.reservationNumber) knownReservationNumbers.add(toolResult.reservationNumber);
        messages.push({ role: "tool", content: toolResult.message, tool_call_id: toolCall.id });
      }

      allowTools = allSucceeded;
      result = await provider.complete(messages, allowTools ? TOOLS : undefined);
    }

    let reply = result.content ?? "Disculpa, no logré procesar eso. ¿Puedes reformular tu mensaje?";

    const mentionedNumbers = reservationNumbersIn(reply);
    const hallucinated = mentionedNumbers.some((n) => !knownReservationNumbers.has(n));
    if (hallucinated) {
      console.error("Bloqueada una confirmación de reserva no respaldada por una tool real:", reply);
      reply = HALLUCINATION_BLOCK_MESSAGE;
    }

    await addMessage(sessionId, "assistant", reply);

    return jsonResponse({ reply });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "No pudimos procesar tu mensaje. Intenta de nuevo en un momento." }, 500);
  }
});
