import { redirect } from "next/navigation";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { AccountHeading } from "../../../components/account-shell";
import { ProfileForm } from "../../../components/profile-form";
import { getAccountContext } from "../../../lib/account";

export const dynamic = "force-dynamic";
export default async function CompletarPerfil(){const user=await requireChatGPTUser("/cuenta/completar-perfil");const context=await getAccountContext(user);if(context.profile.profile_completed)redirect("/cuenta");return <div className="container account-container account-container--narrow"><AccountHeading eyebrow="BIENVENIDOS AL CLUB" title="Completa tu perfil" copy="Solo necesitamos estos datos una vez para comenzar."/><ProfileForm profile={context.profile} email={user.email}/></div>}
