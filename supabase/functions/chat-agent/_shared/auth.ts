export type AuthUser = { userId: string; email: string; fullName: string | null };

const APP_TOKEN_HEADER = "x-ps-app-token";
const USER_ID_HEADER = "x-ps-user-id";
const USER_EMAIL_HEADER = "x-ps-user-email";
const USER_FULL_NAME_HEADER = "x-ps-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER = "x-ps-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";

// El navegador nunca le pega directo a esta función para pedidos con
// identidad: el widget llama a /api/chat en el propio sitio de Next.js
// (mismo origen que la cookie httpOnly de sesión), y ese endpoint reenvía acá
// server-to-server con estos headers, firmados con el mismo app token que ya
// protege las RPC api_* (private.assert_app_token). Sin ese token no se
// confía en los headers de identidad, así que un cliente no puede
// falsificarlos.
export function getAuthUser(req: Request): AuthUser | null {
  const expectedToken = Deno.env.get("PET_SERENO_APP_TOKEN");
  const providedToken = req.headers.get(APP_TOKEN_HEADER);
  if (!expectedToken || !providedToken || providedToken !== expectedToken) return null;

  const userId = req.headers.get(USER_ID_HEADER);
  const email = req.headers.get(USER_EMAIL_HEADER);
  if (!userId || !email) return null;

  const encodedFullName = req.headers.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName && req.headers.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return { userId, email, fullName };
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
