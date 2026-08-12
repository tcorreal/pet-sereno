import { authenticatedUser, apiError } from "../../../../../../lib/api-auth";
import { invitePetMember } from "../../../../../../lib/account";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticatedUser();
  if (user instanceof Response) return user;
  try {
    return Response.json(await invitePetMember(user, (await params).id, await request.json()), { status: 201 });
  } catch (error) {
    return apiError(error, "No pudimos enviar la invitación.");
  }
}
