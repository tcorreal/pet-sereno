import { getChatGPTUser, type ChatGPTUser } from "../app/chatgpt-auth";

export async function authenticatedUser(): Promise<ChatGPTUser | Response> {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Necesitas iniciar sesión para continuar." }, { status: 401 });
  return user;
}

export function apiError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const forbidden = /autorizaci[oó]n|propietario|identidad autenticada/i.test(message);
  return Response.json({ error: message }, { status: forbidden ? 403 : 400 });
}
