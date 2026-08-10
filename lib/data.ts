import { normalizePhone, required, validEmail, type RegistrationInput, type ReservationInput } from "./domain";
import { deliverCustomerNotification, type CustomerNotification } from "./email";
import { supabaseRpc } from "./supabase";

type ServiceStatus = "SCHEDULED" | "CHECKED_IN" | "IN_SERVICE" | "READY_FOR_PICKUP" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";

function colombiaDatetime(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value) ? `${value}-05:00` : value;
}

export function listServiceTypes() {
  return supabaseRpc<Record<string, unknown>[]>("api_list_service_types");
}

export async function registerCustomerAndPet(input: RegistrationInput) {
  const customer = input.customer;
  const pet = input.pet;
  const phone = normalizePhone(required(customer.phone, "El teléfono"));
  const emergencyPhone = customer.emergencyContactPhone
    ? normalizePhone(String(customer.emergencyContactPhone))
    : "";

  return supabaseRpc<{ customerId: string; petId: string; customerMatched: boolean }>(
    "api_register_customer_pet",
    {
      p_input: {
        source: input.source ?? "WEB",
        customer: {
          firstName: required(customer.firstName, "El nombre"),
          lastName: required(customer.lastName, "El apellido"),
          documentType: required(customer.documentType, "El tipo de documento"),
          documentNumber: required(customer.documentNumber, "El documento").replace(/\s/g, ""),
          phone,
          whatsappPhone: customer.whatsappPhone
            ? normalizePhone(String(customer.whatsappPhone))
            : phone,
          email: validEmail(customer.email),
          address: String(customer.address ?? ""),
          city: String(customer.city ?? ""),
          department: String(customer.department ?? ""),
          emergencyContactName: String(customer.emergencyContactName ?? ""),
          emergencyContactPhone: emergencyPhone,
        },
        pet: {
          name: required(pet.name, "El nombre de tu mascota"),
          species: required(pet.species, "La especie"),
          breed: String(pet.breed ?? ""),
          sex: String(pet.sex ?? ""),
          birthDate: String(pet.birthDate ?? ""),
          approximateAge: pet.approximateAge ? Number(pet.approximateAge) : "",
          weight: pet.weight ? Number(pet.weight) : "",
          color: String(pet.color ?? ""),
          photoUrl: String(pet.photoUrl ?? ""),
          notes: String(pet.notes ?? ""),
        },
      },
    },
  );
}

export function findCustomerForReservation(documentNumber: string) {
  return supabaseRpc<Record<string, unknown> | null>("api_find_customer_for_reservation", {
    p_document_number: documentNumber.replace(/\s/g, ""),
  });
}

export async function createReservation(input: ReservationInput) {
  const documentNumber = required(input.documentNumber, "El documento").replace(/\s/g, "");
  if (!input.petIds?.length) throw new Error("Selecciona al menos una mascota.");
  if (!input.startDatetime) throw new Error("Selecciona una fecha y hora de ingreso.");
  if (!input.endDatetime || new Date(input.endDatetime) <= new Date(input.startDatetime)) {
    throw new Error("La salida debe ser posterior al ingreso.");
  }
  return supabaseRpc<{ id: string; reservationNumber: string; status: "PENDING" }>("api_create_reservation", {
    p_input: {
      ...input,
      documentNumber,
      startDatetime: colombiaDatetime(input.startDatetime),
      endDatetime: colombiaDatetime(input.endDatetime),
      source: input.source ?? "WEB",
    },
  });
}

export function dashboardData() {
  return supabaseRpc<{ stats: number[]; services: Record<string, unknown>[] }>("api_dashboard_data");
}

export function listCustomers() {
  return supabaseRpc<Record<string, unknown>[]>("api_list_customers");
}

export function listPets() {
  return supabaseRpc<Record<string, unknown>[]>("api_list_pets");
}

export function listReservations() {
  return supabaseRpc<Record<string, unknown>[]>("api_list_reservations");
}

export function customerDetail(id: string) {
  return supabaseRpc<{
    customer: Record<string, unknown>;
    pets: Record<string, unknown>[];
    reservations: Record<string, unknown>[];
    services: Record<string, unknown>[];
  } | null>("api_customer_detail", { p_customer_id: id });
}

export async function confirmReservation(id: string) {
  return supabaseRpc<{ alreadyConfirmed?: boolean; services?: { id: string; number: string; petId: string }[] }>(
    "api_confirm_reservation",
    { p_reservation_id: id },
  );
}

export async function updateServiceStatus(id: string, status: ServiceStatus, notes?: string) {
  const result = await supabaseRpc<{
    unchanged?: boolean;
    service: Record<string, unknown>;
    notification: CustomerNotification | null;
  }>("api_update_service_status", {
    p_service_id: id,
    p_new_status: status,
    p_notes: notes ?? null,
  });
  if (!result.notification) return { ...result, emailConfigured: true };
  const delivery = await deliverCustomerNotification(result.notification);
  return { ...result, notification: delivery.notification, emailConfigured: delivery.configured };
}

export function petDetail(id: string) {
  return supabaseRpc<{
    pet: Record<string, unknown>;
    customer: Record<string, unknown>;
    service_history: Record<string, unknown>[];
    service_history_by_number: Record<string, Record<string, unknown>>;
  } | null>("api_pet_detail", { p_pet_id: id });
}

export async function retryNotification(id: string) {
  const notification = await supabaseRpc<CustomerNotification | null>("api_get_notification", {
    p_notification_id: id,
  });
  if (!notification) throw new Error("No encontramos esa notificación.");
  return deliverCustomerNotification(notification);
}
