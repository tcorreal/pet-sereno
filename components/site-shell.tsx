import Link from "next/link";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`logo ${inverse ? "logo--inverse" : ""}`} aria-label="Pet Sereno, inicio"><span className="logo__mark">PS</span><span><strong>PET SERENO</strong><small>CLUB DE MASCOTAS</small></span></Link>;
}

export function SiteHeader() {
  return <header className="site-header"><div className="container site-header__inner"><Logo/><nav aria-label="Navegación principal"><Link href="/#servicios">Servicios</Link><Link href="/registro">Registro</Link><Link href="/contacto">Contacto</Link></nav><Link className="button button--primary button--small" href="/reservar">Reservar</Link></div></header>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div className="container footer-grid"><div><Logo inverse/><p>Libertad para ellos. Tranquilidad para ti.</p></div><div><strong>Explora</strong><Link href="/#servicios">Servicios</Link><Link href="/registro">Registrar mi mascota</Link><Link href="/reservar">Solicitar reserva</Link></div><div><strong>Pet Sereno</strong><p>Medellín, Antioquia</p><a href="mailto:hola@petsereno.co">hola@petsereno.co</a><Link href="/admin">Acceso administrativo</Link></div></div><div className="container footer-bottom">© 2026 Pet Sereno · Cuidado que se siente</div></footer>;
}

export function PublicShell({ children }: { children: React.ReactNode }) { return <><SiteHeader/><main>{children}</main><SiteFooter/></>; }

export function SectionHeader({ eyebrow, title, copy }: { eyebrow?: string; title: string; copy?: string }) {
  return <div className="section-header">{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{copy && <p>{copy}</p>}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { ACTIVE:"Activo",PENDING:"Pendiente",CONFIRMED:"Confirmada",COMPLETED:"Completada",SCHEDULED:"Programado",CHECKED_IN:"Ingresó",IN_SERVICE:"En servicio",READY_FOR_PICKUP:"Listo para salir",CHECKED_OUT:"Finalizado",CANCELLED:"Cancelado",SENDING:"Enviando",SENT:"Enviado",FAILED:"Requiere reintento",WEB:"Web",ADMIN:"Administración" };
  return <span className={`badge badge--${status.toLowerCase()}`}>{labels[status] ?? status.replaceAll("_"," ")}</span>;
}
