import { authRuntime } from "./auth-runtime";

type SupabaseUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };
type TokenResponse = { access_token: string; expires_in?: number; user: SupabaseUser };

export async function passwordSignIn(email: string, password: string) {
  return authRequest<TokenResponse>("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function passwordSignUp(email: string, password: string, fullName: string, redirectTo: string) {
  return authRequest<{ user: SupabaseUser | null; session: TokenResponse | null }>(`/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    body: JSON.stringify({ email, password, data: { full_name: fullName } }),
  });
}

export async function userFromAccessToken(accessToken: string) {
  return authRequest<SupabaseUser>("/auth/v1/user", {
    method: "GET",
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

export function oauthUrl(provider: "google" | "azure", redirectTo: string) {
  const { url } = authRuntime();
  const scopes = provider === "azure" ? "&scopes=email" : "";
  return `${url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}${scopes}`;
}

export function authIdentity(user: SupabaseUser) {
  const metadata = user.user_metadata ?? {};
  const name = String(metadata.full_name ?? metadata.name ?? "").trim() || null;
  if (!user.email) throw new Error("El proveedor no devolvió un correo válido.");
  return { userId: user.id, email: user.email.toLowerCase(), fullName: name };
}

async function authRequest<T>(path: string, init: RequestInit) {
  const runtime = authRuntime();
  const response = await fetch(`${runtime.url}${path}`, {
    ...init,
    headers: { apikey: runtime.publishableKey, "content-type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => ({})) as T & { msg?: string; error_description?: string; error?: string };
  if (!response.ok) throw new Error(body.msg ?? body.error_description ?? body.error ?? "No pudimos completar la autenticación.");
  return body;
}
