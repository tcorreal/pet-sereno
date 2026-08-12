import { AppLink as Link } from "./app-link";
import { chatGPTSignOutPath, type ChatGPTUser } from "../app/chatgpt-auth";
import { ChatWidget } from "./chat-widget";
import { Logo } from "./site-shell";

export function AccountShell({ children, user }: { children: React.ReactNode; user: ChatGPTUser }) {
  return <div className="account-shell">
    <header className="account-header"><div className="container account-header__inner">
      <Logo/>
      <nav aria-label="Navegación de la cuenta">
        <Link href="/cuenta">Mis mascotas</Link>
        <Link href="/cuenta/reservas">Reservas</Link>
      </nav>
      <details className="account-user"><summary><span>{user.displayName.slice(0, 1).toUpperCase()}</span><strong>{user.displayName}</strong></summary><div><Link href="/cuenta/perfil">Mi perfil</Link><Link href={chatGPTSignOutPath("/")}>Cerrar sesión</Link></div></details>
    </div></header>
    <main className="account-main">{children}</main>
    <ChatWidget/>
  </div>;
}

export function AccountHeading({ eyebrow, title, copy, actions }: { eyebrow?: string; title: string; copy?: string; actions?: React.ReactNode }) {
  return <header className="account-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{copy && <p>{copy}</p>}</div>{actions && <div className="account-heading__actions">{actions}</div>}</header>;
}
