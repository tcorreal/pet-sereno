import { getChatGPTUser } from "../../../../chatgpt-auth";
import { retryNotification } from "../../../../../lib/data";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user && process.env.NODE_ENV === "production") {
    return Response.json({ error: "Necesitas iniciar sesión para continuar." }, { status: 401 });
  }
  try {
    return Response.json(await retryNotification((await params).id));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No pudimos reenviar el correo." }, { status: 400 });
  }
}
