import { AuthForm } from "../../components/auth-form";
import { PublicShell } from "../../components/public-shell";

export const dynamic = "force-dynamic";
export default function Registro(){return <PublicShell><section className="auth-page"><div className="container auth-page__inner"><AuthForm mode="signup"/></div></section></PublicShell>}
