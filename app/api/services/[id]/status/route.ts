import { adminUser } from "../../../../../lib/api-auth";
import { updateServiceStatus } from "../../../../../lib/data";

const allowed = new Set(["IN_SERVICE", "READY_FOR_PICKUP"]);
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await adminUser(); if (user instanceof Response) return user;
  try { const body = await request.json() as { status?: string; notes?: string }; if (!body.status || !allowed.has(body.status)) return Response.json({ error: "Ese estado no está permitido desde el panel." }, { status: 400 }); return Response.json(await updateServiceStatus((await params).id, body.status as "IN_SERVICE" | "READY_FOR_PICKUP", body.notes)); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No pudimos actualizar el servicio." }, { status: 400 }); }
}
