import { authIdentity, userFromAccessToken } from "../../../../../lib/auth-api";
import { createSessionValue, sessionCookie } from "../../../../../lib/auth-session";

export async function POST(request: Request) {
  try {
    const { accessToken } = await request.json() as { accessToken?: string };
    if (!accessToken) throw new Error("No recibimos la autorización del proveedor.");
    const identity = authIdentity(await userFromAccessToken(accessToken));
    const cookie = sessionCookie(await createSessionValue(identity), new URL(request.url).protocol === "https:");
    const response = Response.json({ ok: true });
    response.headers.append("set-cookie", `${cookie.name}=${cookie.value}; Path=/; Max-Age=${cookie.maxAge}; HttpOnly; SameSite=Lax${cookie.secure ? "; Secure" : ""}`);
    return response;
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No pudimos iniciar sesión." }, { status: 400 });
  }
}

