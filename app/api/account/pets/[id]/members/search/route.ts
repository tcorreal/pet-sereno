import { authenticatedUser, apiError } from "../../../../../../../lib/api-auth";
import { searchProfiles } from "../../../../../../../lib/account";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticatedUser();
  if (user instanceof Response) return user;
  try {
    const query = new URL(request.url).searchParams.get("q") ?? "";
    return Response.json(await searchProfiles(user, (await params).id, query));
  } catch (error) {
    return apiError(error, "No pudimos buscar esa cuenta.");
  }
}
