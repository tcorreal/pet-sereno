import { authenticatedUser, apiError } from "../../../../../lib/api-auth";
import { profileMediaBucket, profilePhotoKey } from "../../../../../lib/profile-media";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSize = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (user instanceof Response) return user;
  try {
    const form = await request.formData();
    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size === 0) throw new Error("Selecciona una imagen.");
    if (!allowedTypes.has(photo.type)) throw new Error("Usa una imagen JPG, PNG o WebP.");
    if (photo.size > maxSize) throw new Error("La imagen no puede superar 5 MB.");
    const key = await profilePhotoKey(user.userId);
    await profileMediaBucket().put(key, photo.stream(), { httpMetadata: { contentType: photo.type }, customMetadata: { owner: user.userId } });
    return Response.json({ photoUrl: `/api/media/profile/${key}?v=${Date.now()}` }, { status: 201 });
  } catch (error) {
    return apiError(error, "No pudimos subir la foto.");
  }
}
