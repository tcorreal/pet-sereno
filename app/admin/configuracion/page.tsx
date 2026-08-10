import { AdminHeader } from "../../../components/admin-shell";
import { emailDeliveryConfigured } from "../../../lib/email";

export const dynamic = "force-dynamic";

export default function Configuracion() {
  const emailReady = emailDeliveryConfigured();
  return <><AdminHeader eyebrow="SISTEMA" title="Configuración" copy="Conexiones y preferencias operativas de Pet Sereno."/>
    <div className="settings-grid">
      <article className="detail-card"><span className="eyebrow">CORREO TRANSACCIONAL</span><h2>Avisos a las familias</h2><p>Al activar o cerrar un servicio, el sistema crea un correo, conserva sus intentos y permite reintentar sin duplicar mensajes.</p><span className={`badge badge--${emailReady ? "sent" : "pending"}`}>{emailReady ? "Proveedor conectado" : "Pendiente de conectar proveedor"}</span></article>
      <article className="detail-card"><span className="eyebrow">BASE DE DATOS</span><h2>Historial centralizado</h2><p>Clientes, mascotas, reservas, servicios, cambios de estado y notificaciones viven en Supabase. Cada mascota tiene su propio historial consultable.</p><span className="badge badge--active">Supabase activo</span></article>
    </div>
  </>;
}
