import { authenticatedUser, apiError } from "../../../../lib/api-auth";
import { updateAccountProfile } from "../../../../lib/account";

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (user instanceof Response) return user;
  try {
    return Response.json(await updateAccountProfile(user, await request.json()));
  } catch (error) {
    return apiError(error, "No pudimos guardar tu perfil.");
  }
}
