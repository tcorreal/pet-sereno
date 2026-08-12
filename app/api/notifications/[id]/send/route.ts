import { adminUser } from "../../../../../lib/api-auth";
import { retryNotification } from "../../../../../lib/data";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await adminUser();
  if (user instanceof Response) return user;
  try {
    return Response.json(await retryNotification((await params).id));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No pudimos reenviar el correo." }, { status: 400 });
  }
}
