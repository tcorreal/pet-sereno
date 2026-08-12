import { registerCustomerAndPet } from "../../../lib/data";
export async function POST(request:Request){try{const body=await request.json();const result=await registerCustomerAndPet(body);return Response.json(result,{status:201});}catch(error){return Response.json({error:error instanceof Error?error.message:"No pudimos completar el registro."},{status:400});}}
