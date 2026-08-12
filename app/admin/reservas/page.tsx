import { AppLink as Link } from "../../../components/app-link";
import { AdminHeader, DataTable, StatusBadge } from "../../../components/admin-shell";
import { ConfirmButton } from "../../../components/confirm-button";
import { listReservations } from "../../../lib/data";

export const dynamic = "force-dynamic";
export default async function Reservas() {
  const rows = await listReservations();
  return <><AdminHeader eyebrow="SOLICITUDES" title="Reservas" copy="La reserva es la fuente de verdad; el calendario es su vista operativa."/>
    <form className="toolbar"><label className="search-field">⌕ <input name="q" placeholder="Buscar reserva, cliente o mascota"/></label><select name="status"><option value="">Todos los estados</option><option value="PENDING">Pendientes</option><option value="CONFIRMED">Confirmadas</option><option value="CANCELLED">Canceladas</option></select><input className="toolbar-date" type="date" name="date" aria-label="Filtrar por fecha"/><button className="button button--secondary button--small">Filtrar</button></form>
    <DataTable columns={["Reserva", "Familia y mascotas", "Servicio", "Ingreso / salida", "Estado", "Acción"]}>{rows.map((r) => <tr key={String(r.id)}><td><code>{String(r.reservation_number)}</code><small>{String(r.source)}</small></td><td><strong>{String(r.customer_name)}</strong><small>{String(r.pet_names)}</small></td><td>{String(r.service_type)}</td><td>{new Date(String(r.start_datetime)).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}<small>hasta {new Date(String(r.end_datetime)).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</small></td><td><StatusBadge status={String(r.status)}/></td><td><div className="table-actions"><Link className="text-link" href={`/admin/reservas/${r.id}`}>Ver detalle →</Link>{r.status === "PENDING" && <ConfirmButton id={String(r.id)}/>}</div></td></tr>)}</DataTable>
  </>;
}
