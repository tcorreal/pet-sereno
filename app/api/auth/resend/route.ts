import { resendSignupConfirmation } from "../../../../lib/auth-api";

export async function POST(request: Request) {
  try {
    const input = await request.json() as { email?: string };
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Escribe un correo válido.");

    await resendSignupConfirmation(email, `${new URL(request.url).origin}/auth/callback`);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No pudimos reenviar el correo." }, { status: 400 });
  }
}
