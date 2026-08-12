import { AppLink as Link } from "./app-link";
import { ChatWidget } from "./chat-widget";
import { Logo, SiteFooter } from "./site-shell";
import { getChatGPTUser } from "../app/chatgpt-auth";

// Separado de site-shell.tsx a propósito: este archivo importa
// app/chatgpt-auth.ts (server-only, usa cloudflare:workers) para saber si
// hay sesión iniciada. Si ese import viviera en site-shell.tsx, cualquier
// componente cliente que importe de ahí algo tan inocente como StatusBadge
// (ej. account-reservation-card.tsx) arrastraría chatgpt-auth.ts al bundle
// del navegador y el build fallaría (cloudflare:workers no existe ahí).
async function SiteHeader() {
  const user = await getChatGPTUser();
  return <header className="site-header"><div className="container site-header__inner"><Logo/><nav aria-label="Navegación principal">
    {user
      ? <Link className="button button--primary button--small" href="/cuenta">Mi cuenta</Link>
      : <><Link className="button button--secondary button--small" href="/inicio">Inicio</Link><Link className="button button--primary button--small" href="/registro">Registro</Link></>}
  </nav></div></header>;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <><SiteHeader/><main>{children}</main><SiteFooter/><ChatWidget/></>;
}
