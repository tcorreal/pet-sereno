import { AUTH_COOKIE } from "../../../../lib/auth-session";

// Response.redirect() devuelve una respuesta inmutable en este runtime — no
// se le puede agregar el header set-cookie después de construida (tira
// "Can't modify immutable headers" y la ruta responde 500). Hay que armar
// los headers completos antes de crear la Response.
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("return_to") ?? "/";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  const headers = new Headers({ location: new URL(returnTo, request.url).toString() });
  headers.append("set-cookie", `${AUTH_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  return new Response(null, { status: 302, headers });
}

