import { getChatGPTUser,requireChatGPTUser } from "../chatgpt-auth"; import { AdminShell } from "../../components/admin-shell";
export const dynamic="force-dynamic";
export default async function Layout({children}:{children:React.ReactNode}){let user=await getChatGPTUser();if(!user&&process.env.NODE_ENV==="production")user=await requireChatGPTUser("/admin");return <AdminShell user={user?.displayName??"Equipo Pet Sereno"}>{children}</AdminShell>}
