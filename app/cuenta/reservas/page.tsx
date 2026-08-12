import Link from "next/link";
import { redirect } from "next/navigation";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { AccountHeading } from "../../../components/account-shell";
import { AccountReservationCard } from "../../../components/account-reservation-card";
import { getAccountContext, listAccountReservations } from "../../../lib/account";

const cancelled = new Set(["CANCELLED", "NO_SHOW"]); const past = new Set(["CHECKED_OUT", "COMPLETED"]);
export default async function ReservasCuenta() { const user = await requireChatGPTUser("/cuenta/reservas"); const [context, reservations] = await Promise.all([getAccountContext(user), listAccountReservations(user)]); if (!context.profile.profile_completed) redirect("/registro"); const groups = [{ title: "PRÓXIMAS", rows: reservations.filter((row) => !cancelled.has(String(row.status)) && !past.has(String(row.status))) }, { title: "PASADAS", rows: reservations.filter((row) => past.has(String(row.status))) }, { title: "CANCELADAS", rows: reservations.filter((row) => cancelled.has(String(row.status))) }]; return <div className="container account-container"><AccountHeading eyebrow="TU AGENDA" title="Gestionar reservas" copy="Consulta el estado y realiza únicamente las acciones que tienes autorizadas." actions={<Link className="button button--primary" href="/cuenta/reservas/nueva">+ Nueva reserva</Link>}/>{groups.map((group) => <section className="reservation-group" key={group.title}><h2>{group.title}</h2>{group.rows.length ? <div className="reservation-list">{group.rows.map((row) => <AccountReservationCard key={String(row.id)} reservation={row}/>)}</div> : <div className="empty-state account-panel">No hay reservas en esta sección.</div>}</section>)}</div>; }
