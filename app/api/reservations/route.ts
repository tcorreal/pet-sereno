import { createReservation } from "../../../lib/data";
export async function POST(request:Request){try{return Response.json(await createReservation(await request.json()),{status:201});}catch(error){return Response.json({error:error instanceof Error?error.message:"No pudimos crear la reserva."},{status:400});}}
