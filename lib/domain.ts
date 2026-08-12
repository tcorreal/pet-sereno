export const CUSTOMER_SOURCES = ["ADMIN", "WEB", "WHATSAPP", "API", "IMPORT"] as const;
export const RESERVATION_STATUSES = ["DRAFT", "PENDING", "CONFIRMED", "CANCELLED", "NO_SHOW", "COMPLETED"] as const;
export const SERVICE_STATUSES = ["SCHEDULED", "CHECKED_IN", "IN_SERVICE", "READY_FOR_PICKUP", "CHECKED_OUT", "CANCELLED", "NO_SHOW"] as const;
export const NOTIFICATION_STATUSES = ["PENDING", "SENDING", "SENT", "FAILED"] as const;
export const NOTIFICATION_EVENTS = ["SERVICE_ACTIVATED", "SERVICE_CLOSED", "RESERVATION_CONFIRMED"] as const;

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) throw new Error("No encontramos un teléfono válido.");
  return `+${digits}`;
}

export function required(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} es obligatorio.`);
  return text;
}

export function validEmail(value: unknown) {
  const email = required(value, "El correo").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Escribe un correo electrónico válido.");
  return email;
}

export function serviceNumber(date = new Date(), sequence = 1) {
  const stamp = date.toISOString().slice(2, 10).replaceAll("-", "");
  return `PS-${stamp}-${String(sequence).padStart(4, "0")}`;
}

export function reservationNumber(sequence = 1) {
  return `R-${String(sequence).padStart(6, "0")}`;
}

export type RegistrationInput = {
  customer: Record<string, unknown>;
  pet: Record<string, unknown>;
  source?: "WEB" | "ADMIN";
};

export type ReservationInput = {
  documentNumber: string;
  petIds: string[];
  serviceTypeId: string;
  startDatetime: string;
  endDatetime: string;
  notes?: string;
  source?: "WEB" | "ADMIN";
};
