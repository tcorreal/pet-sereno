type Json = Record<string, unknown>;
type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
type ServiceStatus = "SCHEDULED" | "CHECKED_IN" | "IN_SERVICE" | "READY_FOR_PICKUP" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
type NotificationStatus = "PENDING" | "SENDING" | "SENT" | "FAILED";

type Customer = Json & {
  id: string; first_name: string; last_name: string; document_type: string; document_number: string;
  phone: string; whatsapp_phone: string; email: string; source: string; status: string; created_at: string;
};
type Pet = Json & {
  id: string; customer_id: string; name: string; species: string; breed: string; sex: string;
  approximate_age: number | null; weight: number | null; color: string; status: string; created_at: string;
};
type ServiceType = { id: string; name: string; short_description: string; price_reference: string; active: boolean };
type Reservation = {
  id: string; reservation_number: string; customer_id: string; service_type_id: string; pet_ids: string[];
  start_datetime: string; end_datetime: string; status: ReservationStatus; source: string; notes: string; created_at: string;
};
type Service = {
  id: string; service_number: string; reservation_id: string; customer_id: string; pet_id: string;
  service_type_id: string; scheduled_entry_at: string; scheduled_exit_at: string; status: ServiceStatus;
  notes: string; actual_entry_at: string | null; actual_exit_at: string | null; created_at: string;
};
type History = { id: string; service_id: string; old_status: ServiceStatus | null; new_status: ServiceStatus; notes: string; created_at: string };
type Notification = {
  id: string; customer_id: string; pet_id: string; service_id: string; channel: "EMAIL";
  event: "SERVICE_ACTIVATED" | "SERVICE_CLOSED"; recipient: string; subject: string; body_text: string;
  status: NotificationStatus; attempt_count: number; provider_message_id: string | null; last_error: string | null; created_at: string;
};
type DemoStore = {
  customers: Customer[]; pets: Pet[]; serviceTypes: ServiceType[]; reservations: Reservation[];
  services: Service[]; history: History[]; notifications: Notification[]; reservationSequence: number; serviceSequence: number;
};

const CUSTOMER_ID = "10000000-0000-4000-8000-000000000001";
const BRUNO_ID = "20000000-0000-4000-8000-000000000001";
const LUNA_ID = "20000000-0000-4000-8000-000000000002";
const DAYCARE_ID = "30000000-0000-4000-8000-000000000001";
const HOTEL_ID = "30000000-0000-4000-8000-000000000002";
const CARE_ID = "30000000-0000-4000-8000-000000000003";

function iso(offsetHours = 0) { return new Date(Date.now() + offsetHours * 3_600_000).toISOString(); }
function id() { return crypto.randomUUID(); }

function seed(): DemoStore {
  const customer: Customer = {
    id: CUSTOMER_ID, first_name: "Familia", last_name: "Demo", document_type: "CC", document_number: "1000000001",
    phone: "+573001234567", whatsapp_phone: "+573001234567", email: "demo@petsereno.test", source: "WEB",
    status: "ACTIVE", created_at: iso(-720), address: "", city: "Medellín", department: "Antioquia",
    emergency_contact_name: "", emergency_contact_phone: "",
  };
  const pets: Pet[] = [
    { id: BRUNO_ID, customer_id: CUSTOMER_ID, name: "Bruno", species: "Perro", breed: "Mestizo", sex: "Macho", approximate_age: 4, weight: 18, color: "Café", status: "ACTIVE", created_at: iso(-700), notes: "Le encantan los paseos." },
    { id: LUNA_ID, customer_id: CUSTOMER_ID, name: "Luna", species: "Perro", breed: "Criolla", sex: "Hembra", approximate_age: 3, weight: 14, color: "Blanco", status: "ACTIVE", created_at: iso(-680), notes: "Es tranquila y sociable." },
  ];
  const serviceTypes: ServiceType[] = [
    { id: DAYCARE_ID, name: "Guardería de día", short_description: "Juego, exploración y descanso durante el día.", price_reference: "Valor según jornada", active: true },
    { id: HOTEL_ID, name: "Hospedaje sereno", short_description: "Una noche acompañada y tranquila.", price_reference: "Valor por noche", active: true },
    { id: CARE_ID, name: "Cuidado personalizado", short_description: "Acompañamiento adaptado a su ritmo.", price_reference: "Valor según necesidad", active: true },
  ];
  const pending: Reservation = {
    id: "40000000-0000-4000-8000-000000000001", reservation_number: "R-DEMO-0001", customer_id: CUSTOMER_ID,
    service_type_id: DAYCARE_ID, pet_ids: [BRUNO_ID], start_datetime: iso(24), end_datetime: iso(32),
    status: "PENDING", source: "WEB", notes: "Reserva lista para probar el botón Confirmar.", created_at: iso(-2),
  };
  const confirmed: Reservation = {
    id: "40000000-0000-4000-8000-000000000002", reservation_number: "R-DEMO-0002", customer_id: CUSTOMER_ID,
    service_type_id: HOTEL_ID, pet_ids: [LUNA_ID], start_datetime: iso(48), end_datetime: iso(72),
    status: "CONFIRMED", source: "ADMIN", notes: "Servicio listo para activar.", created_at: iso(-24),
  };
  const service: Service = {
    id: "50000000-0000-4000-8000-000000000001", service_number: "PS-DEMO-0001", reservation_id: confirmed.id,
    customer_id: CUSTOMER_ID, pet_id: LUNA_ID, service_type_id: HOTEL_ID, scheduled_entry_at: confirmed.start_datetime,
    scheduled_exit_at: confirmed.end_datetime, status: "SCHEDULED", notes: confirmed.notes, actual_entry_at: null,
    actual_exit_at: null, created_at: iso(-23),
  };
  return {
    customers: [customer], pets, serviceTypes, reservations: [pending, confirmed], services: [service],
    history: [{ id: id(), service_id: service.id, old_status: null, new_status: "SCHEDULED", notes: "Servicio creado al confirmar la reserva.", created_at: service.created_at }],
    notifications: [], reservationSequence: 3, serviceSequence: 2,
  };
}

const demoGlobal = globalThis as typeof globalThis & { __petSerenoDemoStore?: DemoStore };
const store = demoGlobal.__petSerenoDemoStore ??= seed();

function customerName(customerId: string) {
  const customer = store.customers.find((item) => item.id === customerId);
  return customer ? `${customer.first_name} ${customer.last_name}` : "";
}
function serviceType(serviceTypeId: string) { return store.serviceTypes.find((item) => item.id === serviceTypeId); }
function pet(petId: string) { return store.pets.find((item) => item.id === petId); }
function notificationFor(serviceId: string) {
  return store.notifications.filter((item) => item.service_id === serviceId).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}
function serviceRow(service: Service) {
  const animal = pet(service.pet_id); const customer = store.customers.find((item) => item.id === service.customer_id); const type = serviceType(service.service_type_id); const notification = notificationFor(service.id);
  return { ...service, pet_name: animal?.name ?? "", customer_name: customerName(service.customer_id), customer_email: customer?.email ?? "", service_type: type?.name ?? "", notification_id: notification?.id ?? null, notification_status: notification?.status ?? null };
}
function reservationRow(reservation: Reservation) {
  return { ...reservation, customer_name: customerName(reservation.customer_id), pet_names: reservation.pet_ids.map((petId) => pet(petId)?.name).filter(Boolean).join(", "), service_type: serviceType(reservation.service_type_id)?.name ?? "" };
}

function register(input: Json) {
  const customerInput = input.customer as Json; const petInput = input.pet as Json;
  let customer = store.customers.find((item) => item.document_number === String(customerInput.documentNumber) || item.email.toLowerCase() === String(customerInput.email).toLowerCase());
  const matched = Boolean(customer);
  if (!customer) {
    customer = { id: id(), first_name: String(customerInput.firstName), last_name: String(customerInput.lastName), document_type: String(customerInput.documentType), document_number: String(customerInput.documentNumber), phone: String(customerInput.phone), whatsapp_phone: String(customerInput.whatsappPhone || customerInput.phone), email: String(customerInput.email).toLowerCase(), source: String(input.source || "WEB"), status: "ACTIVE", created_at: iso(), address: String(customerInput.address || ""), city: String(customerInput.city || ""), department: String(customerInput.department || ""), emergency_contact_name: String(customerInput.emergencyContactName || ""), emergency_contact_phone: String(customerInput.emergencyContactPhone || "") };
    store.customers.unshift(customer);
  }
  if (store.pets.some((item) => item.customer_id === customer.id && item.name.toLowerCase() === String(petInput.name).toLowerCase())) throw new Error("Esta mascota ya parece estar registrada.");
  const animal: Pet = { id: id(), customer_id: customer.id, name: String(petInput.name), species: String(petInput.species), breed: String(petInput.breed || ""), sex: String(petInput.sex || ""), approximate_age: petInput.approximateAge ? Number(petInput.approximateAge) : null, weight: petInput.weight ? Number(petInput.weight) : null, color: String(petInput.color || ""), status: "ACTIVE", created_at: iso(), notes: String(petInput.notes || "") };
  store.pets.unshift(animal);
  return { customerId: customer.id, petId: animal.id, customerMatched: matched };
}

function findCustomer(documentNumber: string) {
  const customer = store.customers.find((item) => item.document_number === documentNumber);
  if (!customer) return null;
  return { ...customer, pets: store.pets.filter((item) => item.customer_id === customer.id && item.status === "ACTIVE") };
}

function createReservation(input: Json) {
  const customer = store.customers.find((item) => item.document_number === String(input.documentNumber));
  if (!customer) throw new Error("No encontramos un registro con ese documento. Registra primero a tu mascota.");
  const petIds = input.petIds as string[];
  if (!petIds?.length) throw new Error("Selecciona al menos una mascota.");
  if (petIds.some((petId) => !store.pets.some((item) => item.id === petId && item.customer_id === customer.id))) throw new Error("Una de las mascotas seleccionadas no pertenece a este cliente.");
  const reservation: Reservation = { id: id(), reservation_number: `R-DEMO-${String(store.reservationSequence++).padStart(4, "0")}`, customer_id: customer.id, service_type_id: String(input.serviceTypeId), pet_ids: petIds, start_datetime: String(input.startDatetime), end_datetime: String(input.endDatetime), status: "PENDING", source: String(input.source || "WEB"), notes: String(input.notes || ""), created_at: iso() };
  store.reservations.unshift(reservation);
  return { id: reservation.id, reservationNumber: reservation.reservation_number, status: "PENDING" };
}

function confirmReservation(reservationId: string) {
  const reservation = store.reservations.find((item) => item.id === reservationId);
  if (!reservation) throw new Error("No encontramos esa reserva.");
  if (reservation.status === "CONFIRMED") return { alreadyConfirmed: true };
  if (reservation.status !== "PENDING") throw new Error("Esta reserva no puede confirmarse en su estado actual.");
  reservation.status = "CONFIRMED";
  const services = reservation.pet_ids.map((petId) => {
    const service: Service = { id: id(), service_number: `PS-DEMO-${String(store.serviceSequence++).padStart(4, "0")}`, reservation_id: reservation.id, customer_id: reservation.customer_id, pet_id: petId, service_type_id: reservation.service_type_id, scheduled_entry_at: reservation.start_datetime, scheduled_exit_at: reservation.end_datetime, status: "SCHEDULED", notes: reservation.notes, actual_entry_at: null, actual_exit_at: null, created_at: iso() };
    store.services.unshift(service); store.history.push({ id: id(), service_id: service.id, old_status: null, new_status: "SCHEDULED", notes: "Servicio creado al confirmar la reserva.", created_at: service.created_at });
    return { id: service.id, number: service.service_number, petId };
  });
  return { services };
}

function updateStatus(serviceId: string, newStatus: ServiceStatus, notes = "") {
  const service = store.services.find((item) => item.id === serviceId);
  if (!service) throw new Error("No encontramos ese servicio.");
  if (service.status === newStatus) return { unchanged: true, service, notification: notificationFor(service.id) ?? null };
  const allowed = (service.status === "SCHEDULED" && newStatus === "IN_SERVICE") || (service.status === "CHECKED_IN" && newStatus === "IN_SERVICE") || (service.status === "IN_SERVICE" && newStatus === "CHECKED_OUT") || (service.status === "READY_FOR_PICKUP" && newStatus === "CHECKED_OUT");
  if (!allowed) throw new Error("Ese cambio de estado no está permitido.");
  const oldStatus = service.status; service.status = newStatus;
  if (newStatus === "IN_SERVICE" && !service.actual_entry_at) service.actual_entry_at = iso();
  if (newStatus === "CHECKED_OUT" && !service.actual_exit_at) service.actual_exit_at = iso();
  store.history.push({ id: id(), service_id: service.id, old_status: oldStatus, new_status: newStatus, notes, created_at: iso() });
  const customer = store.customers.find((item) => item.id === service.customer_id)!; const animal = pet(service.pet_id)!;
  const event = newStatus === "IN_SERVICE" ? "SERVICE_ACTIVATED" : "SERVICE_CLOSED";
  let notification = store.notifications.find((item) => item.service_id === service.id && item.event === event);
  if (!notification) {
    notification = { id: id(), customer_id: customer.id, pet_id: animal.id, service_id: service.id, channel: "EMAIL", event, recipient: customer.email, subject: newStatus === "IN_SERVICE" ? `${animal.name} ya está disfrutando su experiencia en Pet Sereno` : `La experiencia de ${animal.name} ha finalizado`, body_text: newStatus === "IN_SERVICE" ? `El servicio ${service.service_number} de ${animal.name} ha comenzado.` : `El servicio ${service.service_number} de ${animal.name} ha finalizado.`, status: "PENDING", attempt_count: 0, provider_message_id: null, last_error: null, created_at: iso() };
    store.notifications.push(notification);
  }
  return { service, notification };
}

function customerDetail(customerId: string) {
  const customer = store.customers.find((item) => item.id === customerId); if (!customer) return null;
  return { customer, pets: store.pets.filter((item) => item.customer_id === customerId), reservations: store.reservations.filter((item) => item.customer_id === customerId).map(reservationRow), services: store.services.filter((item) => item.customer_id === customerId).map(serviceRow) };
}

function petDetail(petId: string) {
  const animal = pet(petId); if (!animal) return null; const customer = store.customers.find((item) => item.id === animal.customer_id)!;
  const history = store.services.filter((item) => item.pet_id === petId).map((service) => {
    const reservation = store.reservations.find((item) => item.id === service.reservation_id)!;
    return { ...service, service_type: serviceType(service.service_type_id)?.name ?? "", reservation_number: reservation.reservation_number, status_history: store.history.filter((item) => item.service_id === service.id).sort((a, b) => a.created_at.localeCompare(b.created_at)), notifications: store.notifications.filter((item) => item.service_id === service.id) };
  });
  return { pet: animal, customer, service_history: history, service_history_by_number: Object.fromEntries(history.map((service) => [service.service_number, service])) };
}

export async function demoRpc<T>(name: string, params: Json = {}): Promise<T> {
  let result: unknown;
  switch (name) {
    case "api_list_service_types": result = store.serviceTypes.filter((item) => item.active); break;
    case "api_register_customer_pet": result = register(params.p_input as Json); break;
    case "api_find_customer_for_reservation": result = findCustomer(String(params.p_document_number)); break;
    case "api_create_reservation": result = createReservation(params.p_input as Json); break;
    case "api_list_customers": result = store.customers.map((customer) => ({ ...customer, pet_count: store.pets.filter((item) => item.customer_id === customer.id).length })); break;
    case "api_list_pets": result = store.pets.map((animal) => ({ ...animal, owner_name: customerName(animal.customer_id), service_count: store.services.filter((item) => item.pet_id === animal.id).length })); break;
    case "api_list_reservations": result = store.reservations.map(reservationRow); break;
    case "api_dashboard_data": result = { stats: [store.services.length, store.services.filter((item) => ["CHECKED_IN", "IN_SERVICE"].includes(item.status)).length, store.reservations.filter((item) => item.status === "PENDING").length, store.customers.filter((item) => item.status === "ACTIVE").length], services: store.services.map(serviceRow) }; break;
    case "api_customer_detail": result = customerDetail(String(params.p_customer_id)); break;
    case "api_confirm_reservation": result = confirmReservation(String(params.p_reservation_id)); break;
    case "api_update_service_status": result = updateStatus(String(params.p_service_id), String(params.p_new_status) as ServiceStatus, String(params.p_notes || "")); break;
    case "api_pet_detail": result = petDetail(String(params.p_pet_id)); break;
    case "api_get_notification": result = store.notifications.find((item) => item.id === String(params.p_notification_id)) ?? null; break;
    case "api_mark_notification": {
      const notification = store.notifications.find((item) => item.id === String(params.p_notification_id)); if (!notification) throw new Error("No encontramos esa notificación."); notification.status = String(params.p_status) as NotificationStatus; notification.attempt_count += 1; notification.provider_message_id = params.p_provider_message_id ? String(params.p_provider_message_id) : null; notification.last_error = params.p_error ? String(params.p_error) : null; result = notification; break;
    }
    default: throw new Error(`La demostración local no implementa ${name}.`);
  }
  return result as T;
}
