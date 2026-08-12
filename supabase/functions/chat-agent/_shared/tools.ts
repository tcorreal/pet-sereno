import type { ChatTool } from "./ai/types.ts";
import type { AuthUser } from "./auth.ts";
import { createAccountReservation, fetchServiceTypes, getAccountContext } from "./gateway.ts";

export const TOOLS: ChatTool[] = [
  {
    type: "function",
    function: {
      name: "crear_reserva",
      description:
        "Crea una solicitud de reserva (queda pendiente de confirmación del equipo) para una mascota ya registrada en la cuenta de la persona que inició sesión. Solo debe llamarse después de que la persona confirmó explícitamente el resumen de la reserva.",
      parameters: {
        type: "object",
        properties: {
          mascota: { type: "string", description: "Nombre de la mascota a reservar, tal como aparece registrada en la cuenta" },
          servicio: { type: "string", description: "Nombre exacto del servicio, tal como aparece en la lista de servicios" },
          fecha_inicio: { type: "string", description: "Fecha y hora de ingreso, formato YYYY-MM-DDTHH:mm" },
          fecha_fin: { type: "string", description: "Fecha y hora de salida, formato YYYY-MM-DDTHH:mm" },
          notas: { type: "string", description: "Nota breve opcional para el equipo" },
        },
        required: ["mascota", "servicio", "fecha_inicio", "fecha_fin"],
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

async function crearReserva(
  authUser: AuthUser | null,
  args: { mascota?: string; servicio?: string; fecha_inicio?: string; fecha_fin?: string; notas?: string },
): Promise<ToolResult> {
  if (!authUser) {
    return {
      ok: false,
      message: "No se puede reservar: la persona no inició sesión. Dile que inicie sesión en /cuenta o /inicio antes de reservar — ya no se usa número de documento para esto.",
    };
  }

  const context = await getAccountContext(authUser).catch(() => null);
  if (!context) return { ok: false, message: "No pudimos confirmar la cuenta en este momento. Pide que reintente en un momento." };
  if (!context.profile.profile_completed) {
    return {
      ok: false,
      message: "Antes de reservar, la persona debe completar su perfil (nombre, documento, teléfono) en /cuenta/completar-perfil.",
    };
  }

  const requestedPetName = String(args.mascota ?? "").trim().toLowerCase();
  if (!requestedPetName) return { ok: false, message: "Falta indicar la mascota." };
  const match = context.pets.find((p) => p.pet.name.trim().toLowerCase() === requestedPetName);
  if (!match) {
    const valid = context.pets.map((p) => p.pet.name).join(", ") || "ninguna mascota registrada todavía";
    return {
      ok: false,
      message: `No encontramos una mascota llamada "${args.mascota}" en la cuenta. Mascotas disponibles: ${valid}. Si falta alguna, se agrega en /cuenta/mascotas/nueva.`,
    };
  }
  if (match.role !== "OWNER" && !match.permissions.can_create_reservations) {
    return {
      ok: false,
      message: `La persona no tiene permiso para crear reservas para ${match.pet.name}. Solo el propietario u otro responsable autorizado puede.`,
    };
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
  if (new Date(start) <= new Date()) {
    const nowText = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "long", timeStyle: "short" }).format(new Date());
    return { ok: false, message: `La reserva debe ser para una fecha futura. Ahora mismo en Colombia son: ${nowText}. Pide una fecha posterior a esa, no asumas ni inventes qué día es hoy.` };
  }

  try {
    const result = await createAccountReservation(authUser, {
      petId: match.pet.id,
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

export async function runTool(authUser: AuthUser | null, name: string, rawArgs: string): Promise<ToolResult> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(rawArgs || "{}");
  } catch {
    return { ok: false, message: "Los argumentos de la herramienta no son un JSON válido." };
  }

  switch (name) {
    case "crear_reserva":
      return crearReserva(authUser, args);
    default:
      return { ok: false, message: `Herramienta desconocida: ${name}. No existe — no la vuelvas a llamar.` };
  }
}
