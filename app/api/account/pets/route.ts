import { authenticatedUser, apiError } from "../../../../lib/api-auth";
import { createAccountPet } from "../../../../lib/account";

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (user instanceof Response) return user;
  try {
    return Response.json(await createAccountPet(user, await request.json()), { status: 201 });
  } catch (error) {
    return apiError(error, "No pudimos registrar la mascota.");
  }
}
