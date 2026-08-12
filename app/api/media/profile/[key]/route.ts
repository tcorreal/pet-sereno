import { profileMediaBucket } from "../../../../../lib/profile-media";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[a-f0-9]{64}$/.test(key)) return new Response("Imagen no válida.", { status: 400 });
  const object = await profileMediaBucket().get(key);
  if (!object) return new Response("Imagen no encontrada.", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-length", String(object.size));
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("content-disposition", "inline");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
