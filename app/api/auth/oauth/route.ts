import { oauthUrl } from "../../../../lib/auth-api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  if (provider !== "google" && provider !== "azure") return Response.json({ error: "Proveedor inválido." }, { status: 400 });
  return Response.redirect(oauthUrl(provider, `${url.origin}/auth/callback`));
}

