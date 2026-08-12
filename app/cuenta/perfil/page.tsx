import { requireChatGPTUser } from "../../chatgpt-auth";
import { AccountHeading } from "../../../components/account-shell";
import { ProfileForm } from "../../../components/profile-form";
import { getAccountContext } from "../../../lib/account";

export default async function Perfil() { const user = await requireChatGPTUser("/cuenta/perfil"); const context = await getAccountContext(user); return <div className="container account-container account-container--narrow"><AccountHeading eyebrow="CUENTA" title="Mi perfil" copy={`Código interno ${context.profile.user_code}`}/><ProfileForm profile={context.profile} email={user.email}/></div>; }
