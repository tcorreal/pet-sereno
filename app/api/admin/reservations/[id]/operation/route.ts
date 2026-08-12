import { adminUser, apiError } from "../../../../../../lib/api-auth";
import { completeReservationOperation } from "../../../../../../lib/account";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await adminUser();
  if (user instanceof Response) return user;
  try {
    const body = await request.json() as { operation?: "DROPOFF" | "PICKUP"; code?: string; notes?: string };
    if (!body.operation || !body.code) return Response.json({ error: "Escribe el código temporal." }, { status: 400 });
    return Response.json(await completeReservationOperation(user, (await params).id, body.operation, body.code, body.notes));
  } catch (error) {
    return apiError(error, "No pudimos validar la operación.");
  }
}
