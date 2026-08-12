import { AppLink as Link } from "../../components/app-link";
import { redirect } from "next/navigation";
import { requireChatGPTUser } from "../chatgpt-auth";
import { AccountHeading } from "../../components/account-shell";
import { InvitationList } from "../../components/invitation-list";
import { StatusBadge } from "../../components/site-shell";
import { getAccountContext } from "../../lib/account";

export default async function Cuenta() {
  const user = await requireChatGPTUser("/cuenta");
  const context = await getAccountContext(user);
  if (!context.profile.profile_completed) redirect("/cuenta/completar-perfil");
  return <div className="container account-container"><AccountHeading eyebrow="TU CLUB" title="Mis mascotas" copy="Todos tus compañeros y los vínculos que cuidas desde un mismo lugar." actions={<><Link className="button button--secondary" href="/cuenta/reservas">Gestionar reservas</Link><Link className="button button--primary" href="/cuenta/mascotas/nueva">+ Agregar mascota</Link></>}/>
    <InvitationList invitations={context.invitations}/>
    {context.pets.length ? <div className="account-pet-grid">{context.pets.map((item) => { const pet = item.pet; const next = item.next_reservation; const canReserve = item.role === "OWNER" || item.permissions.can_create_reservations; return <article className="account-pet-card" key={pet.id}><div className="account-pet-card__visual">{pet.photo_url ? <img src={String(pet.photo_url)} alt={pet.name}/> : <span>{pet.name.slice(0, 1)}</span>}<StatusBadge status={item.role}/></div><div><h2>{pet.name}</h2><p>{pet.species} · {String(pet.breed || "Sin raza indicada")}</p><div className="next-booking"><small>PRÓXIMA RESERVA</small>{next ? <><strong>{new Date(String(next.start_datetime)).toLocaleDateString("es-CO", { dateStyle: "medium" })}</strong><span>{String(next.service_number || next.reservation_number)}</span></> : <span>Sin reservas próximas</span>}</div><div className="card-actions"><Link className="button button--secondary button--small" href={`/cuenta/mascotas/${pet.id}`}>Ver perfil</Link>{canReserve ? <Link className="button button--primary button--small" href={`/cuenta/reservas/nueva?pet=${pet.id}`}>Hacer reserva</Link> : <button className="button button--primary button--small" disabled title="No tienes permiso para reservar">Hacer reserva</button>}</div></div></article>; })}</div> : <div className="empty-state account-panel"><h2>No tienes mascotas vinculadas.</h2><p>Agrega tu primera mascota o acepta una invitación pendiente.</p><Link className="button button--primary" href="/cuenta/mascotas/nueva">+ Agregar mascota</Link></div>}
  </div>;
}
