import { AUTH_COOKIE } from "../../../../lib/auth-session";

export async function GET(request: Request) {
  const response = Response.redirect(new URL("/", request.url));
  response.headers.append("set-cookie", `${AUTH_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  return response;
}

