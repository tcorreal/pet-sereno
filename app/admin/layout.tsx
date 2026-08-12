import { requireAdminUser } from "../chatgpt-auth"; import { AdminShell } from "../../components/admin-shell";
export const dynamic="force-dynamic";
export default async function Layout({children}:{children:React.ReactNode}){const user=await requireAdminUser("/admin");return <AdminShell user={user.displayName}>{children}</AdminShell>}
