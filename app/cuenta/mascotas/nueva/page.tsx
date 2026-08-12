import { redirect } from "next/navigation";
import { requireChatGPTUser } from "../../../chatgpt-auth";
import { AccountHeading } from "../../../../components/account-shell";
import { AccountPetForm } from "../../../../components/account-pet-form";
import { getAccountContext } from "../../../../lib/account";

export default async function NuevaMascota() { const user = await requireChatGPTUser("/cuenta/mascotas/nueva"); const context = await getAccountContext(user); if (!context.profile.profile_completed) redirect("/cuenta/completar-perfil"); return <div className="container account-container account-container--narrow"><AccountHeading eyebrow="MIS MASCOTAS" title="Agregar mascota"/><AccountPetForm/></div>; }
