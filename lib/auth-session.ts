import { cookies } from "next/headers";
import { authRuntime } from "./auth-runtime";

export const AUTH_COOKIE = "pet_sereno_session";

export type AuthSession = {
  userId: string;
  email: string;
  fullName: string | null;
  expiresAt: number;
};

function encode(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decode(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signature(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authRuntime().sessionSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

function equal(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function createSessionValue(input: Omit<AuthSession, "expiresAt">) {
  const session: AuthSession = { ...input, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 };
  const payload = encode(JSON.stringify(session));
  return `${payload}.${encode(await signature(payload))}`;
}

export async function readAuthSession(): Promise<AuthSession | null> {
  const value = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!value) return null;
  const [payload, provided] = value.split(".");
  if (!payload || !provided || !equal(await signature(payload), decode(provided))) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(decode(payload))) as AuthSession;
    return session.expiresAt > Date.now() && session.userId && session.email ? session : null;
  } catch {
    return null;
  }
}

export function sessionCookie(value: string, secure: boolean) {
  return {
    name: AUTH_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  };
}

