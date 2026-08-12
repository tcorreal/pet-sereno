import { env } from "cloudflare:workers";

type StoredObject = {
  body: BodyInit;
  size: number;
  writeHttpMetadata(headers: Headers): void;
};

type MediaBucket = {
  get(key: string): Promise<StoredObject | null>;
  put(key: string, value: ReadableStream, options: { httpMetadata: { contentType: string }; customMetadata: Record<string, string> }): Promise<unknown>;
};

export function profileMediaBucket() {
  const bucket = (env as unknown as { MEDIA?: MediaBucket }).MEDIA;
  if (!bucket) throw new Error("El almacenamiento de imágenes no está disponible.");
  return bucket;
}

export async function profilePhotoKey(authSubject: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(authSubject));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
