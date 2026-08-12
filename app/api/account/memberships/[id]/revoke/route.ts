import { authenticatedUser, apiError } from "../../../../../../lib/api-auth";
import { revokePetMember } from "../../../../../../lib/account";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticatedUser();
  if (user instanceof Response) return user;
  try {
    return Response.json(await revokePetMember(user, (await params).id));
  } catch (error) {
    return apiError(error, "No pudimos revocar la relación.");
  }
}
