import { AppLink as Link } from "../../../../components/app-link";
import { notFound } from "next/navigation";
import { AdminHeader, StatusBadge } from "../../../../components/admin-shell";
import { customerDetail } from "../../../../lib/data";

export const dynamic = "force-dynamic";

export default async function Cliente({ params }: { params: Promise<{ id: string }> }) {
  const data = await customerDetail((await params).id);
  if (!data) notFound();
  const customer = data.customer;
  return <><AdminHeader eyebrow="DETALLE DE CLIENTE" title={`${customer.first_name} ${customer.last_name}`} copy={`Cliente desde ${new Date(String(customer.created_at)).toLocaleDateString("es-CO")}`} action={<Link href="/admin/clientes" className="button button--secondary">Volver</Link>}/>
    <div className="detail-grid">
      <section className="detail-card"><span className="eyebrow">DATOS DE CONTACTO</span><h2>{String(customer.first_name)} {String(customer.last_name)}</h2><dl><div><dt>Documento</dt><dd>{String(customer.document_type)} {String(customer.document_number)}</dd></div><div><dt>Teléfono</dt><dd>{String(customer.phone)}</dd></div><div><dt>Correo</dt><dd>{String(customer.email)}</dd></div><div><dt>Ciudad</dt><dd>{String(customer.city || "Sin indicar")}</dd></div></dl></section>
      <section className="detail-card"><span className="eyebrow">MASCOTAS</span><div className="mini-pet-grid">{data.pets.map((pet) => <Link href={`/admin/mascotas/${pet.id}`} key={String(pet.id)}><span className="pet-avatar">{String(pet.name).slice(0,1)}</span><strong>{String(pet.name)}</strong><small>{String(pet.species)} · {String(pet.breed || "Sin raza")} · {String(pet.service_count ?? 0)} servicios</small></Link>)}</div></section>
    </div>
    <section className="admin-section"><div className="admin-section__heading"><h2>Reservas e historial</h2></div><div className="schedule-list">{data.reservations.length ? data.reservations.map((reservation) => <article key={String(reservation.id)}><code>{String(reservation.reservation_number)}</code><div className="schedule-main"><strong>{String(reservation.service_type)}</strong><small>{new Date(String(reservation.start_datetime)).toLocaleString("es-CO")}</small></div><StatusBadge status={String(reservation.status)}/></article>) : <div className="empty-state">Todavía no hay reservas para esta familia.</div>}</div></section>
  </>;
}
