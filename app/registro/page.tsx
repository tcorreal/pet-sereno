import { redirect } from "next/navigation";
import { requireChatGPTUser } from "../chatgpt-auth";
import { PublicShell } from "../../components/site-shell";
import { ProfileForm } from "../../components/profile-form";
import { getAccountContext } from "../../lib/account";

export const dynamic = "force-dynamic";
export default async function Registro(){const user=await requireChatGPTUser("/registro");const context=await getAccountContext(user);if(context.profile.profile_completed)redirect("/cuenta");return <PublicShell><section className="form-page"><div className="container form-page__intro"><span className="eyebrow">BIENVENIDOS AL CLUB</span><h1>Crea tu perfil</h1><p>Tu cuenta ya está protegida. Completa tus datos para comenzar.</p></div><div className="container form-page__body"><ProfileForm profile={context.profile} email={user.email}/></div></section></PublicShell>}
