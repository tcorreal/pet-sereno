import { redirect } from "next/navigation";
export const dynamic="force-dynamic";
export default async function Reservar({searchParams}:{searchParams:Promise<{service?:string}>}){const params=await searchParams;const query=params.service?`?service=${encodeURIComponent(params.service)}`:"";redirect(`/cuenta/reservas/nueva${query}`)}
