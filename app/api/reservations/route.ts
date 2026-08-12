import { createReservation } from "../../../lib/data";
import { adminUser } from "../../../lib/api-auth";
export async function POST(request:Request){const user=await adminUser();if(user instanceof Response)return user;try{return Response.json(await createReservation(await request.json()),{status:201});}catch(error){return Response.json({error:error instanceof Error?error.message:"No pudimos crear la reserva."},{status:400});}}
