import { authenticatedUser, apiError } from "../../../../lib/api-auth";
import { createAccountReservation } from "../../../../lib/account";

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (user instanceof Response) return user;
  try {
    return Response.json(await createAccountReservation(user, await request.json()), { status: 201 });
  } catch (error) {
    return apiError(error, "No pudimos crear la reserva.");
  }
}
