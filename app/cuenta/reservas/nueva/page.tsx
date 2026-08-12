import { redirect } from "next/navigation";
import { requireChatGPTUser } from "../../../chatgpt-auth";
import { AccountHeading } from "../../../../components/account-shell";
import { AccountReservationForm } from "../../../../components/account-reservation-form";
import { accountPetDetail, getAccountContext } from "../../../../lib/account";
import { listServiceTypes } from "../../../../lib/data";

export const dynamic = "force-dynamic";
export default async function NuevaReserva({ searchParams }: { searchParams: Promise<{ pet?: string; service?: string }> }) { const query = await searchParams; return <NuevaReservaAutenticada query={query}/>; }
async function NuevaReservaAutenticada({ query }: { query: { pet?: string; service?: string } }) { const suffix = new URLSearchParams(Object.entries(query).filter((entry): entry is [string,string] => Boolean(entry[1]))).toString(); const user = await requireChatGPTUser(`/cuenta/reservas/nueva${suffix ? `?${suffix}` : ""}`); const context = await getAccountContext(user); if (!context.profile.profile_completed) redirect("/cuenta/completar-perfil"); const [serviceTypes, details] = await Promise.all([listServiceTypes(), Promise.all(context.pets.map((item) => accountPetDetail(user, item.pet.id)))]); const pets = context.pets.map((item, index) => ({ id: item.pet.id, name: item.pet.name, role: item.role, canCreate: item.role === "OWNER" || item.permissions.can_create_reservations, members: ((details[index]?.members ?? []) as Array<Record<string, unknown>>) })); return <div className="container account-container account-container--narrow"><AccountHeading eyebrow="RESERVAS" title="Nueva solicitud"/><AccountReservationForm pets={pets} serviceTypes={serviceTypes as never} initialPetId={query.pet} initialServiceTypeId={query.service}/></div>; }
