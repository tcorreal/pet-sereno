import { authenticatedUser, apiError } from "../../../../../../lib/api-auth";
import { generateReservationCode } from "../../../../../../lib/account";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticatedUser();
  if (user instanceof Response) return user;
  try {
    const body = await request.json() as { operation?: "DROPOFF" | "PICKUP" };
    if (!body.operation || !["DROPOFF", "PICKUP"].includes(body.operation)) {
      return Response.json({ error: "Selecciona una operación válida." }, { status: 400 });
    }
    return Response.json(await generateReservationCode(user, (await params).id, body.operation));
  } catch (error) {
    return apiError(error, "No pudimos generar el código.");
  }
}
