import { authIdentity, passwordSignIn, passwordSignUp } from "../../../../lib/auth-api";
import { createSessionValue, sessionCookie } from "../../../../lib/auth-session";

export async function POST(request: Request) {
  try {
    const input = await request.json() as { action?: string; email?: string; password?: string; fullName?: string };
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Escribe un correo válido.");
    if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");

    let identity;
    let pendingConfirmation = false;
    if (input.action === "signup") {
      const fullName = String(input.fullName ?? "").trim();
      if (fullName.length < 3) throw new Error("Escribe tu nombre completo.");
      const result = await passwordSignUp(email, password, fullName, `${new URL(request.url).origin}/auth/callback`);
      pendingConfirmation = !result.session;
      identity = result.session ? authIdentity(result.session.user) : null;
    } else {
      identity = authIdentity((await passwordSignIn(email, password)).user);
    }

    const response = Response.json({ ok: true, pendingConfirmation });
    if (identity) response.headers.append("set-cookie", serializeCookie(sessionCookie(await createSessionValue(identity), new URL(request.url).protocol === "https:")));
    return response;
  } catch (error) {
    return Response.json({ error: error instanceof Error ? friendly(error.message) : "No pudimos completar la autenticación." }, { status: 400 });
  }
}

function friendly(message: string) {
  if (/invalid login credentials/i.test(message)) return "Correo o contraseña incorrectos.";
  if (/user already registered/i.test(message)) return "Ese correo ya está registrado. Inicia sesión.";
  return message;
}

function serializeCookie(cookie: ReturnType<typeof sessionCookie>) {
  return `${cookie.name}=${cookie.value}; Path=/; Max-Age=${cookie.maxAge}; HttpOnly; SameSite=Lax${cookie.secure ? "; Secure" : ""}`;
}

