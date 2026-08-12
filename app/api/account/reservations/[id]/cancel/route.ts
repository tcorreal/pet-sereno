import { authenticatedUser, apiError } from "../../../../../../lib/api-auth";
import { cancelAccountReservation } from "../../../../../../lib/account";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticatedUser();
  if (user instanceof Response) return user;
  try {
    const body = await request.json().catch(() => ({})) as { reason?: string };
    return Response.json(await cancelAccountReservation(user, (await params).id, body.reason));
  } catch (error) {
    return apiError(error, "No pudimos cancelar la reserva.");
  }
}
