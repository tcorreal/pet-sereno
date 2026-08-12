import { AppLink as Link } from "../../../../components/app-link";
import { notFound } from "next/navigation";
import { AdminHeader, StatusBadge } from "../../../../components/admin-shell";
import { petDetail } from "../../../../lib/data";

export const dynamic = "force-dynamic";

export default async function Mascota({ params }: { params: Promise<{ id: string }> }) {
  const data = await petDetail((await params).id);
  if (!data) notFound();
  const pet = data.pet;
  const customer = data.customer;
  return <><AdminHeader eyebrow="PERFIL DE MASCOTA" title={String(pet.name)} copy={`${String(pet.species)} · ${String(pet.breed || "Sin raza indicada")}`} action={<Link href="/admin/mascotas" className="button button--secondary">Volver</Link>}/>
    <div className="detail-grid">
      <section className="detail-card"><span className="eyebrow">IDENTIDAD</span><h2>{String(pet.name)}</h2><dl>
        <div><dt>Estado</dt><dd><StatusBadge status={String(pet.status)}/></dd></div><div><dt>Sexo</dt><dd>{String(pet.sex || "Sin indicar")}</dd></div><div><dt>Edad</dt><dd>{pet.approximate_age ? `${pet.approximate_age} años` : "Sin indicar"}</dd></div><div><dt>Peso</dt><dd>{pet.weight ? `${pet.weight} kg` : "Sin indicar"}</dd></div><div><dt>Color</dt><dd>{String(pet.color || "Sin indicar")}</dd></div>
      </dl></section>
      <section className="detail-card"><span className="eyebrow">FAMILIA</span><h2>{String(customer.first_name)} {String(customer.last_name)}</h2><dl><div><dt>Correo</dt><dd>{String(customer.email)}</dd></div><div><dt>Teléfono</dt><dd>{String(customer.phone)}</dd></div></dl><Link className="text-link" href={`/admin/clientes/${customer.id}`}>Ver perfil del cliente →</Link></section>
    </div>
    <section className="admin-section">
      <div className="admin-section__heading"><div><span className="eyebrow">DICCIONARIO DE SERVICIOS</span><h2>Historial de {String(pet.name)}</h2></div><span className="count-pill">{data.service_history.length}</span></div>
      <div className="service-history">{data.service_history.length ? data.service_history.map((service) => {
        const history = (service.status_history ?? []) as Record<string, unknown>[];
        const notifications = (service.notifications ?? []) as Record<string, unknown>[];
        return <article key={String(service.id)} className="service-history__item">
          <div className="service-history__summary"><div><code>{String(service.service_number)}</code><strong>{String(service.service_type)}</strong><small>Reserva {String(service.reservation_number)}</small></div><StatusBadge status={String(service.status)}/></div>
          <div className="service-history__dates"><span>Ingreso <strong>{new Date(String(service.scheduled_entry_at)).toLocaleString("es-CO",{dateStyle:"medium",timeStyle:"short"})}</strong></span><span>Salida <strong>{new Date(String(service.scheduled_exit_at)).toLocaleString("es-CO",{dateStyle:"medium",timeStyle:"short"})}</strong></span></div>
          <ol className="status-timeline">{history.map((item) => <li key={String(item.id)}><span></span><div><StatusBadge status={String(item.new_status)}/><small>{new Date(String(item.created_at)).toLocaleString("es-CO",{dateStyle:"medium",timeStyle:"short"})}</small>{Boolean(item.notes) && <p>{String(item.notes)}</p>}</div></li>)}</ol>
          {notifications.length > 0 && <div className="notification-row"><strong>Correos a la familia</strong>{notifications.map((item) => <span key={String(item.id)}><StatusBadge status={String(item.status)}/> {String(item.event) === "SERVICE_ACTIVATED" ? "Inicio del servicio" : "Cierre del servicio"}</span>)}</div>}
        </article>;
      }) : <div className="empty-state">Esta mascota todavía no tiene servicios registrados.</div>}</div>
    </section>
  </>;
}
