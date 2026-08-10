import { getChatGPTUser } from "../../../../chatgpt-auth";
import { updateServiceStatus } from "../../../../../lib/data";

const allowed = new Set(["IN_SERVICE", "CHECKED_OUT"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user && process.env.NODE_ENV === "production") {
    return Response.json({ error: "Necesitas iniciar sesión para continuar." }, { status: 401 });
  }
  try {
    const body = await request.json() as { status?: string; notes?: string };
    if (!body.status || !allowed.has(body.status)) {
      return Response.json({ error: "Ese estado no está permitido desde el panel." }, { status: 400 });
    }
    return Response.json(await updateServiceStatus(
      (await params).id,
      body.status as "IN_SERVICE" | "CHECKED_OUT",
      body.notes,
    ));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No pudimos actualizar el servicio." }, { status: 400 });
  }
}
