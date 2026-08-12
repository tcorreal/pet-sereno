import { authenticatedUser, apiError } from "../../../../../../lib/api-auth";
import { updateMemberPermissions } from "../../../../../../lib/account";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticatedUser();
  if (user instanceof Response) return user;
  try {
    return Response.json(await updateMemberPermissions(user, (await params).id, await request.json()));
  } catch (error) {
    return apiError(error, "No pudimos actualizar los permisos.");
  }
}
