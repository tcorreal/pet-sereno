import { requireChatGPTUser } from "../chatgpt-auth";
import { AccountShell } from "../../components/account-shell";

export const dynamic = "force-dynamic";

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const user = await requireChatGPTUser("/cuenta");
  return <AccountShell user={user}>{children}</AccountShell>;
}
