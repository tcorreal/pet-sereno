import type { ChatTool } from "./ai/types.ts";
import { createReservation, fetchServiceTypes, findCustomerForReservation } from "./gateway.ts";
import { getVerifiedDocument, setVerifiedDocument } from "./memory.ts";

export const TOOLS: ChatTool[] = [
  {
    type: "function",
    function: {
      name: "verificar_identidad",
      description:
        "Verifica la identidad de la persona por su número de documento antes de poder reservar. Solo llamar cuando el usuario ya escribió su número de documento real en un mensaje anterior — nunca con un valor inventado. Devuelve su nombre y sus mascotas registradas si existe.",
      parameters: {
        type: "object",
        properties: {
          numero_documento: { type: "string", description: "Número de documento de identidad, solo dígitos, tal como lo escribió el usuario" },
        },
        required: ["numero_documento"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crear_reserva",
      description:
        "Crea una solicitud de reserva (queda pendiente de confirmación del equipo). Solo funciona si la identidad ya fue verificada en esta conversación con verificar_identidad, y solo debe llamarse después de que el usuario confirmó explícitamente el resumen de la reserva.",
      parameters: {
        type: "object",
        properties: {
          mascotas: {
            type: "array",
            items: { type: "string" },
            description: "Nombres de las mascotas a reservar, tal como los devolvió verificar_identidad",
          },
          servicio: { type: "string", description: "Nombre exacto del servicio, tal como aparece en la lista de servicios" },
          fecha_inicio: { type: "string", description: "Fecha y hora de ingreso, formato YYYY-MM-DDTHH:mm" },
          fecha_fin: { type: "string", description: "Fecha y hora de salida, formato YYYY-MM-DDTHH:mm" },
          notas: { type: "string", description: "Nota breve opcional para el equipo" },
        },
        required: ["mascotas", "servicio", "fecha_inicio", "fecha_fin"],
      },
    },
  },
];

export type ToolResult = { ok: boolean; message: string; reservationNumber?: string };

// Mismo criterio que lib/data.ts:colombiaDatetime — agrega el offset de
// Colombia si el modelo devolvió una fecha/hora sin zona horaria.
function colombiaDatetime(value: string): string {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value) ? `${value}-05:00` : value;
}

// El modelo a veces "alucina" un argumento placeholder (ej. "numero de
// documento de la persona") en vez de pedirlo cuando el usuario todavía no
// lo dio. Se valida el formato antes de gastar una llamada RPC, y se le
// devuelve al modelo una instrucción clara de qué hacer en ese caso. Cuando
// esto falla (ok:false), el orquestador (index.ts) fuerza la siguiente
// vuelta SIN herramientas disponibles, para que el modelo esté obligado a
// responder en texto en vez de insistir con otra llamada (incluso a una
// función inventada).
const DOCUMENT_RE = /^\d{5,15}$/;

async function verificarIdentidad(sessionId: string, args: { numero_documento?: string }): Promise<ToolResult> {
  const documento = String(args.numero_documento ?? "").replace(/\s/g, "");
  if (!DOCUMENT_RE.test(documento)) {
    return {
      ok: false,
      message:
        "Ese no es un número de documento válido (debe ser solo dígitos). No lo intentes adivinar: pregúntale a la persona su número de documento en un mensaje de texto normal y espera su respuesta.",
    };
  }

  const customer = await findCustomerForReservation(documento);
  if (!customer) {
    return {
      ok: false,
      message: "No encontramos ningún cliente con ese documento. Sugiere registrarse primero en la página /registro.",
    };
  }

  await setVerifiedDocument(sessionId, documento);

  const pets = customer.pets.map((pet) => `${pet.name} (${pet.species})`).join(", ") || "sin mascotas registradas todavía";
  return {
    ok: true,
    message: `Identidad verificada. Cliente: ${customer.first_name} ${customer.last_name}. Mascotas registradas: ${pets}.`,
  };
}

async function crearReserva(
  sessionId: string,
  args: { mascotas?: string[]; servicio?: string; fecha_inicio?: string; fecha_fin?: string; notas?: string },
): Promise<ToolResult> {
  const verifiedDocument = await getVerifiedDocument(sessionId);
  if (!verifiedDocument) {
    return {
      ok: false,
      message: "No se puede reservar: la identidad todavía no fue verificada en esta conversación. Usa primero verificar_identidad.",
    };
  }

  const customer = await findCustomerForReservation(verifiedDocument);
  if (!customer) return { ok: false, message: "No pudimos confirmar el cliente verificado. Pide el número de documento de nuevo." };

  const requestedPetNames = (args.mascotas ?? []).map((name) => name.trim().toLowerCase());
  if (!requestedPetNames.length) return { ok: false, message: "Falta indicar al menos una mascota." };
  const petIds: string[] = [];
  for (const name of requestedPetNames) {
    const match = customer.pets.find((pet) => pet.name.trim().toLowerCase() === name);
    if (!match) {
      const valid = customer.pets.map((pet) => pet.name).join(", ") || "ninguna mascota registrada";
      return { ok: false, message: `No encontramos una mascota llamada "${name}" para este cliente. Mascotas válidas: ${valid}.` };
    }
    petIds.push(match.id);
  }

  const serviceTypes = await fetchServiceTypes();
  const serviceName = (args.servicio ?? "").trim().toLowerCase();
  const service = serviceTypes.find((type) => type.name.trim().toLowerCase() === serviceName);
  if (!service) {
    const valid = serviceTypes.map((type) => type.name).join(", ") || "sin servicios disponibles";
    return { ok: false, message: `No encontramos el servicio "${args.servicio}". Servicios válidos: ${valid}.` };
  }

  const start = colombiaDatetime(String(args.fecha_inicio ?? ""));
  const end = colombiaDatetime(String(args.fecha_fin ?? ""));
  if (!start || !end) return { ok: false, message: "Faltan la fecha de ingreso o de salida." };
  if (new Date(end) <= new Date(start)) return { ok: false, message: "La fecha de salida debe ser posterior a la de ingreso." };

  try {
    const result = await createReservation({
      documentNumber: verifiedDocument,
      petIds,
      serviceTypeId: service.id,
      startDatetime: start,
      endDatetime: end,
      notes: args.notas ?? "",
    });
    return {
      ok: true,
      message: `Reserva creada con éxito, número ${result.reservationNumber}, en estado pendiente de confirmación del equipo.`,
      reservationNumber: result.reservationNumber,
    };
  } catch (error) {
    return { ok: false, message: `No pudimos crear la reserva: ${error instanceof Error ? error.message : "error desconocido"}.` };
  }
}

export async function runTool(sessionId: string, name: string, rawArgs: string): Promise<ToolResult> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(rawArgs || "{}");
  } catch {
    return { ok: false, message: "Los argumentos de la herramienta no son un JSON válido." };
  }

  switch (name) {
    case "verificar_identidad":
      return verificarIdentidad(sessionId, args);
    case "crear_reserva":
      return crearReserva(sessionId, args);
    default:
      return { ok: false, message: `Herramienta desconocida: ${name}. No existe — no la vuelvas a llamar.` };
  }
}
