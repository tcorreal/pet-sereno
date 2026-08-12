import type { ChatProvider } from "./types.ts";
import { NvidiaProvider } from "./providers/nvidia.ts";

// Agnóstico de proveedor: AI_PROVIDER selecciona la implementación.
// Agregar otro proveedor es un archivo nuevo en ./providers + un case aquí.
export function getChatProvider(): ChatProvider {
  const provider = (Deno.env.get("AI_PROVIDER") || "nvidia").toLowerCase();
  switch (provider) {
    case "nvidia":
      return new NvidiaProvider();
    default:
      throw new Error(`Proveedor de IA no soportado: ${provider}`);
  }
}
