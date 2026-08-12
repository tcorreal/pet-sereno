import { AuthCallback } from "../../../components/auth-callback";
import { PublicShell } from "../../../components/public-shell";

export const dynamic = "force-dynamic";
export default function Callback() { return <PublicShell><section className="auth-page"><div className="container auth-page__inner"><AuthCallback/></div></section></PublicShell>; }

