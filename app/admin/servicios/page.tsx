import { AppLink as Link } from "../../../components/app-link";
import { AdminHeader, DataTable, StatusBadge } from "../../../components/admin-shell";
import { ServiceStatusActions } from "../../../components/service-status-actions";
import { dashboardData } from "../../../lib/data";

export const dynamic = "force-dynamic";

export default async function Servicios() {
  const { services } = await dashboardData();
  return <><AdminHeader eyebrow="OPERACIÓN" title="Servicios" copy="Activa y cierra cada experiencia. Pet Sereno conserva el historial y prepara el correo para la familia."/>
    <div className="toolbar"><label className="search-field">⌕ <input placeholder="Buscar PS-… o mascota" aria-label="Buscar servicios"/></label><select aria-label="Filtrar por estado"><option>Todos los estados</option><option>En servicio</option><option>Programados</option><option>Finalizados</option></select></div>
    <DataTable columns={["N.º de servicio","Mascota","Familia","Experiencia","Programación","Estado","Gestión"]}>
      {services.map((service) => <tr key={String(service.id)}>
        <td><code className="service-code">{String(service.service_number)}</code></td>
        <td><Link href={`/admin/mascotas/${service.pet_id}`}><strong>{String(service.pet_name)}</strong></Link></td>
        <td><strong>{String(service.customer_name)}</strong><small>{String(service.customer_email)}</small></td>
        <td>{String(service.service_type)}</td>
        <td>{new Date(String(service.scheduled_entry_at)).toLocaleString("es-CO",{dateStyle:"medium",timeStyle:"short"})}<small>Salida {new Date(String(service.scheduled_exit_at)).toLocaleTimeString("es-CO",{hour:"numeric",minute:"2-digit"})}</small></td>
        <td><StatusBadge status={String(service.status)}/></td>
        <td><ServiceStatusActions serviceId={String(service.id)} status={String(service.status)} notificationId={service.notification_id ? String(service.notification_id) : null} notificationStatus={service.notification_status ? String(service.notification_status) : null}/></td>
      </tr>)}
    </DataTable>
  </>;
}
