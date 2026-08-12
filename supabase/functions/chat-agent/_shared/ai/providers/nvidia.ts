import type { ChatCompletionResult, ChatMessage, ChatProvider, ChatTool } from "../types.ts";

// Mismo endpoint OpenAI-compatible que usa muracami-bot
// (C:\Users\samue\Desktop\muracami\muracamibot\muracami-bot\src\agent.py).
// Historial de modelos probados: mistralai/mistral-medium-3.5-128b (original
// de la referencia) fue retirado por NVIDIA el 2026-08-07 (410 Gone).
// meta/llama-3.3-70b-instruct agotaba el límite de cómputo de la Edge
// Function (WORKER_RESOURCE_LIMIT). meta/llama-3.1-8b-instruct era rápido
// pero llamaba a las tools de forma indisciplinada (inventaba argumentos o
// hasta nombres de función cuando al usuario le faltaba dar el documento).
// nvidia/nvidia-nemotron-nano-9b-v2 era confiable pero lento (razonamiento
// largo, ~200 tokens/turno). mistralai/mistral-nemotron era rápido pero
// inconsistente (en una repetición idéntica alucinó un marcador de texto en
// vez de llamar la tool de verdad). deepseek-ai/deepseek-v4-flash-0731 salió
// consistente en 5/5 pruebas repetidas (pide el documento en texto cuando
// falta, llama la tool correctamente cuando ya lo tiene) y es rápido
// (~50 tokens/turno). Se puede sobreescribir con el secret NVIDIA_MODEL sin
// tocar código.
const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-ai/deepseek-v4-flash-0731";
const MAX_TOKENS = 512;

export class NvidiaProvider implements ChatProvider {
  async complete(messages: ChatMessage[], tools?: ChatTool[]): Promise<ChatCompletionResult> {
    const apiKey = Deno.env.get("NVIDIA_API_KEY");
    if (!apiKey) throw new Error("Falta configurar el secret NVIDIA_API_KEY en la función.");
    const model = Deno.env.get("NVIDIA_MODEL") || DEFAULT_MODEL;

    const body: Record<string, unknown> = { model, max_tokens: MAX_TOKENS, messages };
    if (tools?.length) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const response = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`NVIDIA API respondió ${response.status}: ${text}`);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;
    if (!message) throw new Error("NVIDIA API no devolvió un mensaje.");
    return { content: message.content ?? null, toolCalls: message.tool_calls };
  }
}
