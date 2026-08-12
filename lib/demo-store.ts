type Json = Record<string, unknown>;
type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
type ServiceStatus = "SCHEDULED" | "CHECKED_IN" | "IN_SERVICE" | "READY_FOR_PICKUP" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
type NotificationStatus = "PENDING" | "SENDING" | "SENT" | "FAILED";
type MembershipRole = "OWNER" | "RESPONSIBLE";
type MembershipStatus = "PENDING" | "ACTIVE" | "REVOKED";
type OperationType = "DROPOFF" | "PICKUP";

type Customer = Json & {
  id: string; first_name: string; last_name: string; document_type: string; document_number: string;
  phone: string; whatsapp_phone: string; email: string; source: string; status: string; created_at: string;
};
type Pet = Json & {
  id: string; customer_id: string; name: string; species: string; breed: string; sex: string;
  approximate_age: number | null; weight: number | null; color: string; status: string; created_at: string;
  photo_url: string | null; birth_date: string | null;
};
type ServiceType = { id: string; name: string; short_description: string; price_reference: string; active: boolean };
type Reservation = {
  id: string; reservation_number: string; customer_id: string; service_type_id: string; pet_ids: string[];
  pet_id: string | null; start_datetime: string; end_datetime: string; status: ReservationStatus; source: string;
  notes: string; created_at: string; created_by_profile_id: string | null; created_by_membership_role: MembershipRole | null;
  cancelled_at: string | null; cancellation_reason: string | null; cancelled_by_profile_id: string | null;
};
type Service = {
  id: string; service_number: string; reservation_id: string; customer_id: string; pet_id: string;
  service_type_id: string; scheduled_entry_at: string; scheduled_exit_at: string; status: ServiceStatus;
  notes: string; actual_entry_at: string | null; actual_exit_at: string | null; created_at: string;
};
type History = { id: string; service_id: string; old_status: ServiceStatus | null; new_status: ServiceStatus; notes: string; created_at: string };
type Notification = {
  id: string; customer_id: string; pet_id: string; service_id: string; channel: "EMAIL";
  event: "SERVICE_ACTIVATED" | "SERVICE_CLOSED" | "RESERVATION_CONFIRMED"; recipient: string; subject: string; body_text: string;
  status: NotificationStatus; attempt_count: number; provider_message_id: string | null; last_error: string | null; created_at: string;
};
type Profile = Json & {
  id: string; auth_subject: string; customer_id: string | null; first_name: string | null; last_name: string | null;
  email: string; phone: string | null; document_type: string | null; document_number: string | null;
  username: string | null; user_code: string; photo_url: string | null; profile_completed: boolean;
  created_at: string; updated_at: string;
};
type Membership = {
  id: string; pet_id: string; profile_id: string; role: MembershipRole; status: MembershipStatus;
  can_create_reservations: boolean; can_cancel_reservations: boolean; can_dropoff: boolean; can_pickup: boolean;
  created_by: string; created_at: string; updated_at: string; accepted_at: string | null; revoked_at: string | null;
};
type AuthorizedPerson = { id: string; reservation_id: string; profile_id: string; authorization_type: OperationType; authorized_by_profile_id: string; created_at: string };
type AccessCode = { id: string; reservation_id: string; profile_id: string; operation: OperationType; code: string; used_at: string | null; expires_at: string; created_at: string };
type PermissionAudit = { id: string; pet_id: string; membership_id: string; responsible_profile_id: string; permission_name: string; old_value: boolean; new_value: boolean; changed_by_profile_id: string; created_at: string };
type ReservationOperation = { id: string; reservation_id: string; pet_id: string; operation: OperationType; person_profile_id: string; employee_auth_subject: string; validation_method: string; notes: string | null; occurred_at: string };

type DemoStore = {
  customers: Customer[]; pets: Pet[]; serviceTypes: ServiceType[]; reservations: Reservation[];
  services: Service[]; history: History[]; notifications: Notification[]; reservationSequence: number; serviceSequence: number;
  profiles: Profile[]; memberships: Membership[]; authorizedPeople: AuthorizedPerson[]; accessCodes: AccessCode[];
  permissionAudit: PermissionAudit[]; operations: ReservationOperation[]; userCodeSequence: number;
};

const CUSTOMER_ID = "10000000-0000-4000-8000-000000000001";
const BRUNO_ID = "20000000-0000-4000-8000-000000000001";
const LUNA_ID = "20000000-0000-4000-8000-000000000002";
const DAYCARE_ID = "30000000-0000-4000-8000-000000000001";
const HOTEL_ID = "30000000-0000-4000-8000-000000000002";
const CARE_ID = "30000000-0000-4000-8000-000000000003";
const DEMO_PROFILE_ID = "60000000-0000-4000-8000-000000000001";
// Coincide con LOCAL_TEST_USER_ID/EMAIL de .env.example: si se activa
// LOCAL_TEST_AUTH junto con LOCAL_DEMO_MODE, /cuenta ya muestra una familia
// con mascotas y reservas reales sin ningún paso extra.
const DEMO_AUTH_SUBJECT = "local-pet-sereno-test-user";
const DEMO_AUTH_EMAIL = "pruebas.local@petsereno.test";

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
    { id: BRUNO_ID, customer_id: CUSTOMER_ID, name: "Bruno", species: "Perro", breed: "Mestizo", sex: "Macho", approximate_age: 4, weight: 18, color: "Café", status: "ACTIVE", created_at: iso(-700), notes: "Le encantan los paseos.", photo_url: null, birth_date: null },
    { id: LUNA_ID, customer_id: CUSTOMER_ID, name: "Luna", species: "Perro", breed: "Criolla", sex: "Hembra", approximate_age: 3, weight: 14, color: "Blanco", status: "ACTIVE", created_at: iso(-680), notes: "Es tranquila y sociable.", photo_url: null, birth_date: null },
  ];
  const serviceTypes: ServiceType[] = [
    { id: DAYCARE_ID, name: "Guardería de día", short_description: "Juego, exploración y descanso durante el día.", price_reference: "Valor según jornada", active: true },
    { id: HOTEL_ID, name: "Hospedaje sereno", short_description: "Una noche acompañada y tranquila.", price_reference: "Valor por noche", active: true },
    { id: CARE_ID, name: "Cuidado personalizado", short_description: "Acompañamiento adaptado a su ritmo.", price_reference: "Valor según necesidad", active: true },
  ];
  const pending: Reservation = {
    id: "40000000-0000-4000-8000-000000000001", reservation_number: "R-DEMO-0001", customer_id: CUSTOMER_ID,
    service_type_id: DAYCARE_ID, pet_ids: [BRUNO_ID], pet_id: BRUNO_ID, start_datetime: iso(24), end_datetime: iso(32),
    status: "PENDING", source: "WEB", notes: "Reserva lista para probar el botón Confirmar.", created_at: iso(-2),
    created_by_profile_id: DEMO_PROFILE_ID, created_by_membership_role: "OWNER", cancelled_at: null, cancellation_reason: null, cancelled_by_profile_id: null,
  };
  const confirmed: Reservation = {
    id: "40000000-0000-4000-8000-000000000002", reservation_number: "R-DEMO-0002", customer_id: CUSTOMER_ID,
    service_type_id: HOTEL_ID, pet_ids: [LUNA_ID], pet_id: LUNA_ID, start_datetime: iso(48), end_datetime: iso(72),
    status: "CONFIRMED", source: "ADMIN", notes: "Servicio listo para activar.", created_at: iso(-24),
    created_by_profile_id: DEMO_PROFILE_ID, created_by_membership_role: "OWNER", cancelled_at: null, cancellation_reason: null, cancelled_by_profile_id: null,
  };
  const service: Service = {
    id: "50000000-0000-4000-8000-000000000001", service_number: "PS-DEMO-0001", reservation_id: confirmed.id,
    customer_id: CUSTOMER_ID, pet_id: LUNA_ID, service_type_id: HOTEL_ID, scheduled_entry_at: confirmed.start_datetime,
    scheduled_exit_at: confirmed.end_datetime, status: "SCHEDULED", notes: confirmed.notes, actual_entry_at: null,
    actual_exit_at: null, created_at: iso(-23),
  };
  const profile: Profile = {
    id: DEMO_PROFILE_ID, auth_subject: DEMO_AUTH_SUBJECT, customer_id: CUSTOMER_ID, first_name: "Familia", last_name: "Demo",
    email: DEMO_AUTH_EMAIL, phone: customer.phone, document_type: customer.document_type, document_number: customer.document_number,
    username: "familia_demo", user_code: "USR-000001", photo_url: null, profile_completed: true, created_at: iso(-720), updated_at: iso(-720),
  };
  const memberships: Membership[] = pets.map((animal) => ({
    id: id(), pet_id: animal.id, profile_id: DEMO_PROFILE_ID, role: "OWNER", status: "ACTIVE",
    can_create_reservations: true, can_cancel_reservations: true, can_dropoff: true, can_pickup: true,
    created_by: DEMO_PROFILE_ID, created_at: iso(-700), updated_at: iso(-700), accepted_at: iso(-700), revoked_at: null,
  }));
  return {
    customers: [customer], pets, serviceTypes, reservations: [pending, confirmed], services: [service],
    history: [{ id: id(), service_id: service.id, old_status: null, new_status: "SCHEDULED", notes: "Servicio creado al confirmar la reserva.", created_at: service.created_at }],
    notifications: [], reservationSequence: 3, serviceSequence: 2,
    profiles: [profile], memberships, authorizedPeople: [], accessCodes: [], permissionAudit: [], operations: [], userCodeSequence: 2,
  };
}

const demoGlobal = globalThis as typeof globalThis & { __petSerenoDemoStore?: DemoStore };
let store: DemoStore;

function demoStore() {
  return demoGlobal.__petSerenoDemoStore ??= seed();
}

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
  const animal: Pet = { id: id(), customer_id: customer.id, name: String(petInput.name), species: String(petInput.species), breed: String(petInput.breed || ""), sex: String(petInput.sex || ""), approximate_age: petInput.approximateAge ? Number(petInput.approximateAge) : null, weight: petInput.weight ? Number(petInput.weight) : null, color: String(petInput.color || ""), status: "ACTIVE", created_at: iso(), notes: String(petInput.notes || ""), photo_url: null, birth_date: null };
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
  const reservation: Reservation = { id: id(), reservation_number: `R-DEMO-${String(store.reservationSequence++).padStart(4, "0")}`, customer_id: customer.id, service_type_id: String(input.serviceTypeId), pet_ids: petIds, pet_id: petIds.length === 1 ? petIds[0] : null, start_datetime: String(input.startDatetime), end_datetime: String(input.endDatetime), status: "PENDING", source: String(input.source || "WEB"), notes: String(input.notes || ""), created_at: iso(), created_by_profile_id: null, created_by_membership_role: null, cancelled_at: null, cancellation_reason: null, cancelled_by_profile_id: null };
  store.reservations.unshift(reservation);
  return { id: reservation.id, reservationNumber: reservation.reservation_number, status: "PENDING" };
}

function makeReservationConfirmedNotification(reservation: Reservation, petId: string): Notification {
  const customer = store.customers.find((item) => item.id === reservation.customer_id)!;
  const type = serviceType(reservation.service_type_id);
  const animal = pet(petId);
  return {
    id: id(), customer_id: customer.id, pet_id: petId, service_id: "", channel: "EMAIL", event: "RESERVATION_CONFIRMED",
    recipient: customer.email, subject: "Tu reserva en Pet Sereno quedó confirmada",
    body_text: `Hola ${customer.first_name},\n\nConfirmamos la reserva ${reservation.reservation_number} para ${animal?.name ?? "tu mascota"} (${type?.name ?? "servicio"}).\n\nCon cariño,\nPet Sereno — Club de Mascotas`,
    status: "PENDING", attempt_count: 0, provider_message_id: null, last_error: null, created_at: iso(),
  };
}

function confirmReservation(reservationId: string) {
  const reservation = store.reservations.find((item) => item.id === reservationId);
  if (!reservation) throw new Error("No encontramos esa reserva.");
  if (reservation.status === "CONFIRMED") return { alreadyConfirmed: true };
  if (reservation.status !== "PENDING") throw new Error("Esta reserva no puede confirmarse en su estado actual.");
  reservation.status = "CONFIRMED";
  const notifications: Notification[] = [];
  const services = reservation.pet_ids.map((petId) => {
    const service: Service = { id: id(), service_number: `PS-DEMO-${String(store.serviceSequence++).padStart(4, "0")}`, reservation_id: reservation.id, customer_id: reservation.customer_id, pet_id: petId, service_type_id: reservation.service_type_id, scheduled_entry_at: reservation.start_datetime, scheduled_exit_at: reservation.end_datetime, status: "SCHEDULED", notes: reservation.notes, actual_entry_at: null, actual_exit_at: null, created_at: iso() };
    store.services.unshift(service); store.history.push({ id: id(), service_id: service.id, old_status: null, new_status: "SCHEDULED", notes: "Servicio creado al confirmar la reserva.", created_at: service.created_at });
    const notification = makeReservationConfirmedNotification(reservation, petId);
    notification.service_id = service.id;
    store.notifications.push(notification);
    notifications.push(notification);
    return { id: service.id, number: service.service_number, petId };
  });
  // Autorización por defecto de entrega/recogida para quien creó la reserva
  // (mismo criterio que api_create_account_reservation en producción).
  if (reservation.pet_id && reservation.created_by_profile_id) {
    for (const operation of ["DROPOFF", "PICKUP"] as OperationType[]) {
      if (hasOperationPermission(reservation.created_by_profile_id, reservation.pet_id, operation)) {
        store.authorizedPeople.push({ id: id(), reservation_id: reservation.id, profile_id: reservation.created_by_profile_id, authorization_type: operation, authorized_by_profile_id: reservation.created_by_profile_id, created_at: iso() });
      }
    }
  }
  return { services, notifications };
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

// ---- Sistema de cuentas: perfiles, membresías por mascota y reservas propias ----

function nextUserCode() { return `USR-${String(++store.userCodeSequence).padStart(6, "0")}`; }

function profileForSubject(authSubject: string): Profile {
  const profile = store.profiles.find((item) => item.auth_subject === authSubject);
  if (!profile) throw new Error("Completa primero tu perfil.");
  return profile;
}

function activeMembership(authSubject: string, petId: string): Membership {
  const profile = store.profiles.find((item) => item.auth_subject === authSubject);
  const membership = profile && store.memberships.find((item) => item.profile_id === profile.id && item.pet_id === petId && item.status === "ACTIVE");
  if (!membership) throw new Error("No tienes autorización para realizar esta acción.");
  return membership;
}

function assertOwner(authSubject: string, petId: string): Membership {
  const membership = activeMembership(authSubject, petId);
  if (membership.role !== "OWNER") throw new Error("Solo un propietario puede realizar esta acción.");
  return membership;
}

function hasOperationPermission(profileId: string, petId: string, operation: OperationType): boolean {
  const membership = store.memberships.find((item) => item.profile_id === profileId && item.pet_id === petId && item.status === "ACTIVE");
  if (!membership) return false;
  if (membership.role === "OWNER") return true;
  return operation === "DROPOFF" ? membership.can_dropoff : membership.can_pickup;
}

function membershipPetRow(membership: Membership) {
  const animal = pet(membership.pet_id)!;
  const nextReservation = store.reservations
    .filter((item) => item.pet_id === membership.pet_id && ["PENDING", "CONFIRMED"].includes(item.status) && item.end_datetime >= iso())
    .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))[0];
  const service = nextReservation ? store.services.find((item) => item.reservation_id === nextReservation.id && item.pet_id === membership.pet_id) : undefined;
  return {
    membership_id: membership.id, role: membership.role,
    permissions: { can_create_reservations: membership.can_create_reservations, can_cancel_reservations: membership.can_cancel_reservations, can_dropoff: membership.can_dropoff, can_pickup: membership.can_pickup },
    pet: animal,
    next_reservation: nextReservation ? { id: nextReservation.id, reservation_number: nextReservation.reservation_number, start_datetime: nextReservation.start_datetime, status: service?.status ?? nextReservation.status, service_number: service?.service_number ?? null } : null,
  };
}

function accountContext(authSubject: string, email: string, fullName: string | null) {
  const normalizedEmail = email.toLowerCase().trim();
  if (!authSubject.trim() || !normalizedEmail) throw new Error("Necesitas iniciar sesión para continuar.");
  let profile = store.profiles.find((item) => item.auth_subject === authSubject);
  if (!profile) {
    const matchedCustomer = store.customers.find((item) => item.email.toLowerCase() === normalizedEmail);
    const [givenName, ...rest] = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
    profile = {
      id: id(), auth_subject: authSubject, customer_id: matchedCustomer?.id ?? null, first_name: givenName ?? null,
      last_name: rest.join(" ") || null, email: normalizedEmail, phone: null, document_type: null, document_number: null,
      username: null, user_code: nextUserCode(), photo_url: null, profile_completed: false, created_at: iso(), updated_at: iso(),
    };
    store.profiles.push(profile);
  } else if (profile.email !== normalizedEmail) {
    profile.email = normalizedEmail; profile.updated_at = iso();
  }
  const pets = store.memberships.filter((item) => item.profile_id === profile!.id && item.status === "ACTIVE")
    .sort((a, b) => pet(a.pet_id)!.name.localeCompare(pet(b.pet_id)!.name)).map(membershipPetRow);
  const invitations = store.memberships.filter((item) => item.profile_id === profile!.id && item.status === "PENDING")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((membership) => {
      const animal = pet(membership.pet_id)!; const inviter = store.profiles.find((item) => item.id === membership.created_by);
      return { membership_id: membership.id, role: membership.role, created_at: membership.created_at, pet: { id: animal.id, name: animal.name, species: animal.species, breed: animal.breed }, invited_by: inviter ? `${inviter.first_name ?? ""} ${inviter.last_name ?? ""}`.trim() : "" };
    });
  return { profile, pets, invitations };
}

function updateProfile(authSubject: string, email: string, input: Json) {
  const profile = profileForSubject(authSubject);
  if (profile.email !== email.toLowerCase().trim()) throw new Error("La identidad autenticada no coincide con el perfil.");
  const username = String(input.username ?? "").trim().toLowerCase();
  const documentNumber = String(input.documentNumber ?? "").replace(/\s+/g, "");
  const phone = String(input.phone ?? "").trim();
  if (!String(input.firstName ?? "").trim() || !String(input.lastName ?? "").trim() || !/^[a-z0-9._-]{3,30}$/.test(username) || !documentNumber || !/^\+[0-9]{7,15}$/.test(phone)) {
    throw new Error("Completa correctamente todos los campos obligatorios.");
  }
  if (store.profiles.some((item) => item.id !== profile.id && (item.username ?? "").toLowerCase() === username)) {
    throw new Error("Ese nombre de usuario ya está en uso.");
  }
  let customer = store.customers.find((item) => item.document_number === documentNumber);
  if (customer && customer.id !== profile.customer_id && customer.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error("Ese documento ya está asociado a otra cuenta.");
  }
  if (!customer) {
    customer = { id: id(), first_name: String(input.firstName).trim(), last_name: String(input.lastName).trim(), document_type: String(input.documentType ?? "").trim(), document_number: documentNumber, phone, whatsapp_phone: phone, email: email.toLowerCase().trim(), source: "WEB", status: "ACTIVE", created_at: iso(), address: String(input.address ?? ""), city: String(input.city ?? ""), department: String(input.department ?? ""), emergency_contact_name: "", emergency_contact_phone: "" };
    store.customers.unshift(customer);
  } else {
    Object.assign(customer, { first_name: String(input.firstName).trim(), last_name: String(input.lastName).trim(), document_type: String(input.documentType ?? "").trim(), phone, whatsapp_phone: phone, email: email.toLowerCase().trim(), address: String(input.address ?? ""), city: String(input.city ?? ""), department: String(input.department ?? "") });
  }
  Object.assign(profile, { customer_id: customer.id, first_name: String(input.firstName).trim(), last_name: String(input.lastName).trim(), phone, document_type: String(input.documentType ?? "").trim(), document_number: documentNumber, username, photo_url: String(input.photoUrl ?? "") || null, profile_completed: true, updated_at: iso() });
  return profile;
}

function createAccountPet(authSubject: string, input: Json) {
  const profile = profileForSubject(authSubject);
  if (!profile.profile_completed || !profile.customer_id) throw new Error("Completa primero tu perfil.");
  if (!String(input.name ?? "").trim() || !String(input.species ?? "").trim()) throw new Error("El nombre y la especie son obligatorios.");
  const animal: Pet = { id: id(), customer_id: profile.customer_id, name: String(input.name).trim(), species: String(input.species).trim(), breed: String(input.breed ?? "").trim() || "", sex: String(input.sex ?? "").trim() || "", approximate_age: input.approximateAge ? Number(input.approximateAge) : null, weight: input.weight ? Number(input.weight) : null, color: String(input.color ?? "").trim() || "", status: "ACTIVE", created_at: iso(), notes: String(input.notes ?? "").trim() || "", photo_url: String(input.photoUrl ?? "").trim() || null, birth_date: input.birthDate ? String(input.birthDate) : null };
  store.pets.unshift(animal);
  const membership: Membership = { id: id(), pet_id: animal.id, profile_id: profile.id, role: "OWNER", status: "ACTIVE", can_create_reservations: true, can_cancel_reservations: true, can_dropoff: true, can_pickup: true, created_by: profile.id, created_at: iso(), updated_at: iso(), accepted_at: iso(), revoked_at: null };
  store.memberships.push(membership);
  return { pet: animal, membership };
}

function accountPetDetail(authSubject: string, petId: string) {
  const actor = activeMembership(authSubject, petId);
  const animal = pet(petId)!;
  const members = store.memberships.filter((item) => item.pet_id === petId && ["PENDING", "ACTIVE"].includes(item.status))
    .sort((a, b) => (a.role === b.role ? a.created_at.localeCompare(b.created_at) : a.role === "OWNER" ? -1 : 1))
    .map((membership) => {
      const profile = store.profiles.find((item) => item.id === membership.profile_id)!;
      return { membership_id: membership.id, role: membership.role, status: membership.status, can_create_reservations: membership.can_create_reservations, can_cancel_reservations: membership.can_cancel_reservations, can_dropoff: membership.can_dropoff, can_pickup: membership.can_pickup, profile: { id: profile.id, first_name: profile.first_name, last_name: profile.last_name, username: profile.username, user_code: profile.user_code, photo_url: profile.photo_url } };
    });
  const services = store.services.filter((item) => item.pet_id === petId).sort((a, b) => b.scheduled_entry_at.localeCompare(a.scheduled_entry_at))
    .map((service) => ({ id: service.id, service_number: service.service_number, status: service.status, scheduled_entry_at: service.scheduled_entry_at, scheduled_exit_at: service.scheduled_exit_at, service_type: serviceType(service.service_type_id)?.name ?? "" }));
  return { pet: animal, membership: actor, members, services };
}

function searchProfiles(authSubject: string, petId: string, query: string) {
  const actor = assertOwner(authSubject, petId);
  const q = query.trim().toLowerCase();
  if (q.length < 3) throw new Error("Escribe al menos 3 caracteres.");
  const digits = query.replace(/\s+/g, "");
  return store.profiles.filter((profile) => profile.profile_completed && profile.id !== actor.profile_id
    && ((profile.username ?? "").toLowerCase() === q || profile.email.toLowerCase() === q || (profile.user_code ?? "").toUpperCase() === query.trim().toUpperCase() || (profile.phone ?? "").replace(/\s+/g, "") === digits))
    .slice(0, 10)
    .map((profile) => ({ id: profile.id, name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(), username: profile.username, user_code: profile.user_code, email_hint: profile.email.replace(/(^.).*(@.*$)/, "$1***$2"), phone_hint: profile.phone ? `***${profile.phone.slice(-4)}` : null }));
}

function invitePetMember(authSubject: string, petId: string, targetProfileId: string, role: string, permissions: Json) {
  const actor = assertOwner(authSubject, petId);
  const normalizedRole = role.toUpperCase() as MembershipRole;
  if (!["OWNER", "RESPONSIBLE"].includes(normalizedRole)) throw new Error("El tipo de relación no es válido.");
  const target = store.profiles.find((item) => item.id === targetProfileId && item.profile_completed);
  if (!target) throw new Error("No encontramos una cuenta activa para invitar.");
  if (store.memberships.some((item) => item.pet_id === petId && item.profile_id === targetProfileId && item.status !== "REVOKED")) {
    throw new Error("Esa persona ya está vinculada o tiene una invitación pendiente.");
  }
  const full = normalizedRole === "OWNER";
  const membership: Membership = {
    id: id(), pet_id: petId, profile_id: targetProfileId, role: normalizedRole, status: "PENDING",
    can_create_reservations: full || Boolean(permissions.can_create_reservations), can_cancel_reservations: full || Boolean(permissions.can_cancel_reservations),
    can_dropoff: full || Boolean(permissions.can_dropoff), can_pickup: full || Boolean(permissions.can_pickup),
    created_by: actor.profile_id, created_at: iso(), updated_at: iso(), accepted_at: null, revoked_at: null,
  };
  store.memberships.push(membership);
  return membership;
}

function acceptInvitation(authSubject: string, membershipId: string) {
  const profile = profileForSubject(authSubject);
  const membership = store.memberships.find((item) => item.id === membershipId && item.profile_id === profile.id && item.status === "PENDING");
  if (!membership) throw new Error("La invitación no existe o ya no está disponible.");
  membership.status = "ACTIVE"; membership.accepted_at = iso(); membership.revoked_at = null; membership.updated_at = iso();
  return membership;
}

function updateMemberPermissions(authSubject: string, membershipId: string, permissions: Json) {
  const target = store.memberships.find((item) => item.id === membershipId && ["PENDING", "ACTIVE"].includes(item.status));
  if (!target || target.role !== "RESPONSIBLE") throw new Error("Solo se pueden editar permisos de responsables.");
  const actor = assertOwner(authSubject, target.pet_id);
  const keys: Array<keyof Pick<Membership, "can_create_reservations" | "can_cancel_reservations" | "can_dropoff" | "can_pickup">> = ["can_create_reservations", "can_cancel_reservations", "can_dropoff", "can_pickup"];
  for (const key of keys) {
    const provided = permissions[key];
    const newValue = typeof provided === "boolean" ? provided : target[key];
    if (target[key] !== newValue) {
      store.permissionAudit.push({ id: id(), pet_id: target.pet_id, membership_id: target.id, responsible_profile_id: target.profile_id, permission_name: key, old_value: target[key], new_value: newValue, changed_by_profile_id: actor.profile_id, created_at: iso() });
      target[key] = newValue;
    }
  }
  target.updated_at = iso();
  return target;
}

function revokePetMember(authSubject: string, membershipId: string) {
  const target = store.memberships.find((item) => item.id === membershipId && ["PENDING", "ACTIVE"].includes(item.status));
  if (!target) throw new Error("La relación ya no está activa.");
  const actor = assertOwner(authSubject, target.pet_id);
  if (target.id === actor.id) throw new Error("No puedes revocar tu propia relación de propietario.");
  if (target.role === "OWNER" && target.status === "ACTIVE" && store.memberships.filter((item) => item.pet_id === target.pet_id && item.role === "OWNER" && item.status === "ACTIVE").length <= 1) {
    throw new Error("La mascota debe conservar al menos un propietario.");
  }
  target.status = "REVOKED"; target.revoked_at = iso(); target.updated_at = iso();
  return target;
}

function createAccountReservation(authSubject: string, input: Json) {
  const membership = activeMembership(authSubject, String(input.petId));
  if (membership.role !== "OWNER" && !membership.can_create_reservations) throw new Error("No tienes autorización para realizar esta acción.");
  const start = String(input.startDatetime); const end = String(input.endDatetime);
  if (new Date(start) < new Date() || new Date(end) <= new Date(start)) throw new Error("La fecha de salida debe ser posterior al ingreso y la reserva debe ser futura.");
  const type = store.serviceTypes.find((item) => item.id === input.serviceTypeId && item.active);
  if (!type) throw new Error("El servicio seleccionado no está disponible.");
  const animal = store.pets.find((item) => item.id === membership.pet_id && item.status === "ACTIVE");
  if (!animal) throw new Error("La mascota no está disponible.");

  const reservation: Reservation = {
    id: id(), reservation_number: `R-DEMO-${String(store.reservationSequence++).padStart(4, "0")}`, customer_id: animal.customer_id,
    service_type_id: type.id, pet_ids: [animal.id], pet_id: animal.id, start_datetime: start, end_datetime: end, status: "PENDING",
    source: "WEB", notes: String(input.notes ?? "").trim() || "", created_at: iso(),
    created_by_profile_id: membership.profile_id, created_by_membership_role: membership.role,
    cancelled_at: null, cancellation_reason: null, cancelled_by_profile_id: null,
  };
  store.reservations.unshift(reservation);

  const dropoffIds = Array.isArray(input.dropoffProfileIds) ? input.dropoffProfileIds as string[] : [];
  const pickupIds = Array.isArray(input.pickupProfileIds) ? input.pickupProfileIds as string[] : [];
  for (const profileId of dropoffIds) {
    if (!hasOperationPermission(profileId, animal.id, "DROPOFF")) throw new Error("Una persona seleccionada no está autorizada para entregar la mascota.");
    store.authorizedPeople.push({ id: id(), reservation_id: reservation.id, profile_id: profileId, authorization_type: "DROPOFF", authorized_by_profile_id: membership.profile_id, created_at: iso() });
  }
  for (const profileId of pickupIds) {
    if (!hasOperationPermission(profileId, animal.id, "PICKUP")) throw new Error("Una persona seleccionada no está autorizada para recoger la mascota.");
    store.authorizedPeople.push({ id: id(), reservation_id: reservation.id, profile_id: profileId, authorization_type: "PICKUP", authorized_by_profile_id: membership.profile_id, created_at: iso() });
  }
  if (!dropoffIds.length && hasOperationPermission(membership.profile_id, animal.id, "DROPOFF")) {
    store.authorizedPeople.push({ id: id(), reservation_id: reservation.id, profile_id: membership.profile_id, authorization_type: "DROPOFF", authorized_by_profile_id: membership.profile_id, created_at: iso() });
  }
  if (!pickupIds.length && hasOperationPermission(membership.profile_id, animal.id, "PICKUP")) {
    store.authorizedPeople.push({ id: id(), reservation_id: reservation.id, profile_id: membership.profile_id, authorization_type: "PICKUP", authorized_by_profile_id: membership.profile_id, created_at: iso() });
  }
  return { id: reservation.id, reservationNumber: reservation.reservation_number, status: reservation.status };
}

function accountReservations(authSubject: string) {
  const profile = profileForSubject(authSubject);
  const petIds = new Set(store.memberships.filter((item) => item.profile_id === profile.id && item.status === "ACTIVE").map((item) => item.pet_id));
  return store.reservations.filter((item) => item.pet_id && petIds.has(item.pet_id))
    .sort((a, b) => b.start_datetime.localeCompare(a.start_datetime))
    .map((reservation) => {
      const membership = store.memberships.find((item) => item.pet_id === reservation.pet_id && item.profile_id === profile.id && item.status === "ACTIVE")!;
      const service = store.services.find((item) => item.reservation_id === reservation.id);
      const creator = store.profiles.find((item) => item.id === reservation.created_by_profile_id);
      const canDropoff = (membership.role === "OWNER" || membership.can_dropoff) && store.authorizedPeople.some((item) => item.reservation_id === reservation.id && item.profile_id === profile.id && item.authorization_type === "DROPOFF");
      const canPickup = (membership.role === "OWNER" || membership.can_pickup) && store.authorizedPeople.some((item) => item.reservation_id === reservation.id && item.profile_id === profile.id && item.authorization_type === "PICKUP");
      return {
        id: reservation.id, reservation_number: reservation.reservation_number, pet_id: reservation.pet_id, pet_name: pet(reservation.pet_id!)?.name ?? "",
        service_type: serviceType(reservation.service_type_id)?.name ?? "", start_datetime: reservation.start_datetime, end_datetime: reservation.end_datetime,
        reservation_status: reservation.status, status: service?.status ?? reservation.status, service_id: service?.id ?? null, service_number: service?.service_number ?? null,
        notes: reservation.notes, created_by: creator ? `${creator.first_name ?? ""} ${creator.last_name ?? ""}`.trim() : "",
        can_cancel: ["PENDING", "CONFIRMED"].includes(reservation.status) && (service?.status ?? "SCHEDULED") === "SCHEDULED" && (membership.role === "OWNER" || membership.can_cancel_reservations),
        can_dropoff: canDropoff, can_pickup: canPickup,
      };
    });
}

function cancelAccountReservation(authSubject: string, reservationId: string, reason: string | null) {
  const profile = profileForSubject(authSubject);
  const reservation = store.reservations.find((item) => item.id === reservationId);
  if (!reservation || !reservation.pet_id) throw new Error("No encontramos esa reserva.");
  const membership = activeMembership(authSubject, reservation.pet_id);
  if (membership.role !== "OWNER" && !membership.can_cancel_reservations) throw new Error("No tienes autorización para realizar esta acción.");
  const service = store.services.find((item) => item.reservation_id === reservation.id && item.pet_id === reservation.pet_id);
  if (!["PENDING", "CONFIRMED"].includes(reservation.status) || (service?.status ?? "SCHEDULED") !== "SCHEDULED") {
    throw new Error("Esta reserva ya no puede cancelarse.");
  }
  reservation.status = "CANCELLED"; reservation.cancelled_by_profile_id = profile.id; reservation.cancelled_at = iso();
  reservation.cancellation_reason = (reason ?? "").trim() || "Cancelada por el cliente";
  if (service && service.status === "SCHEDULED") { service.status = "CANCELLED"; service.notes = [service.notes, "Reserva cancelada por el cliente"].filter(Boolean).join("\n"); }
  for (const code of store.accessCodes) if (code.reservation_id === reservation.id && !code.used_at) code.used_at = iso();
  return reservation;
}

function generateReservationCode(authSubject: string, reservationId: string, operation: string) {
  const profile = profileForSubject(authSubject);
  const operationName = operation.toUpperCase() as OperationType;
  if (!["DROPOFF", "PICKUP"].includes(operationName)) throw new Error("La operación no es válida.");
  const reservation = store.reservations.find((item) => item.id === reservationId);
  if (!reservation || !reservation.pet_id) throw new Error("No encontramos esa reserva.");
  const authorized = hasOperationPermission(profile.id, reservation.pet_id, operationName) && store.authorizedPeople.some((item) => item.reservation_id === reservation.id && item.profile_id === profile.id && item.authorization_type === operationName);
  if (!authorized) throw new Error("No tienes autorización para realizar esta acción.");
  const service = store.services.find((item) => item.reservation_id === reservation.id && item.pet_id === reservation.pet_id);
  if (operationName === "DROPOFF" && service?.status !== "SCHEDULED") throw new Error("La reserva no está lista para registrar el ingreso.");
  if (operationName === "PICKUP" && service?.status !== "READY_FOR_PICKUP") throw new Error("La mascota todavía no está lista para salir.");
  for (const code of store.accessCodes) if (code.reservation_id === reservation.id && code.profile_id === profile.id && code.operation === operationName && !code.used_at) code.used_at = iso();
  const plainCode = Array.from(crypto.getRandomValues(new Uint8Array(4))).map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  const record: AccessCode = { id: id(), reservation_id: reservation.id, profile_id: profile.id, operation: operationName, code: plainCode, used_at: null, expires_at: iso(10 / 60), created_at: iso() };
  store.accessCodes.push(record);
  return { code: plainCode, operation: operationName, expiresAt: record.expires_at, expiresInMinutes: 10 };
}

function adminReservationDetail(reservationId: string) {
  const reservation = store.reservations.find((item) => item.id === reservationId);
  if (!reservation) return null;
  const customer = store.customers.find((item) => item.id === reservation.customer_id);
  const service = store.services.find((item) => item.reservation_id === reservation.id && (!reservation.pet_id || item.pet_id === reservation.pet_id));
  const creator = store.profiles.find((item) => item.id === reservation.created_by_profile_id);
  const members = reservation.pet_id ? store.memberships.filter((item) => item.pet_id === reservation.pet_id && item.status === "ACTIVE").map((membership) => {
    const profile = store.profiles.find((item) => item.id === membership.profile_id)!;
    return { profile_id: profile.id, name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(), username: profile.username, role: membership.role, status: membership.status };
  }) : [];
  const authorizedPeople = store.authorizedPeople.filter((item) => item.reservation_id === reservation.id).map((entry) => {
    const profile = store.profiles.find((item) => item.id === entry.profile_id)!;
    return { profile_id: profile.id, name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(), username: profile.username, authorization_type: entry.authorization_type };
  });
  return {
    reservation, pet: reservation.pet_id ? pet(reservation.pet_id) : null,
    customer: customer ? { id: customer.id, first_name: customer.first_name, last_name: customer.last_name, email: customer.email, phone: customer.phone } : null,
    service_type: serviceType(reservation.service_type_id) ?? null, service: service ?? null,
    created_by: creator ? { id: creator.id, name: `${creator.first_name ?? ""} ${creator.last_name ?? ""}`.trim(), username: creator.username } : null,
    members, authorized_people: authorizedPeople,
    history: store.history.filter((item) => service && item.service_id === service.id),
    operations: store.operations.filter((item) => item.reservation_id === reservation.id),
  };
}

function completeReservationOperation(adminAuthSubject: string, reservationId: string, operation: string, code: string, notes: string | null) {
  const operationName = operation.toUpperCase() as OperationType;
  if (!adminAuthSubject.trim()) throw new Error("Necesitas iniciar sesión para continuar.");
  if (!["DROPOFF", "PICKUP"].includes(operationName)) throw new Error("La operación no es válida.");
  const accessCode = store.accessCodes.filter((item) => item.reservation_id === reservationId && item.operation === operationName && item.code === code.trim().toUpperCase()).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (!accessCode) throw new Error("El código no es válido.");
  if (accessCode.used_at) throw new Error("El código ya fue utilizado.");
  if (new Date(accessCode.expires_at) <= new Date()) throw new Error("El código ha expirado.");
  const reservation = store.reservations.find((item) => item.id === reservationId && item.pet_id);
  if (!reservation || !reservation.pet_id || !hasOperationPermission(accessCode.profile_id, reservation.pet_id, operationName)
    || !store.authorizedPeople.some((item) => item.reservation_id === reservation.id && item.profile_id === accessCode.profile_id && item.authorization_type === operationName)) {
    throw new Error("La persona ya no está autorizada para esta operación.");
  }
  const service = store.services.find((item) => item.reservation_id === reservation.id && item.pet_id === reservation.pet_id);
  if (!service) throw new Error("No encontramos el servicio de esta reserva.");
  if (operationName === "DROPOFF" && service.status !== "SCHEDULED") throw new Error("El ingreso no se puede registrar en el estado actual.");
  if (operationName === "PICKUP" && service.status !== "READY_FOR_PICKUP") throw new Error("La salida no se puede registrar en el estado actual.");

  const trimmedNotes = (notes ?? "").trim();
  if (operationName === "DROPOFF") {
    service.status = "CHECKED_IN"; service.actual_entry_at = iso(); service.notes = [service.notes, trimmedNotes].filter(Boolean).join("\n");
  } else {
    service.status = "CHECKED_OUT"; service.actual_exit_at = iso(); service.notes = [service.notes, trimmedNotes].filter(Boolean).join("\n");
    reservation.status = "COMPLETED";
  }
  accessCode.used_at = iso();
  const record: ReservationOperation = { id: id(), reservation_id: reservation.id, pet_id: reservation.pet_id, operation: operationName, person_profile_id: accessCode.profile_id, employee_auth_subject: adminAuthSubject, validation_method: "TEMPORARY_CODE", notes: trimmedNotes || null, occurred_at: iso() };
  store.operations.push(record);
  return { reservationId: reservation.id, service, operation: operationName, validatedProfileId: accessCode.profile_id };
}

export async function demoRpc<T>(name: string, params: Json = {}): Promise<T> {
  store = demoStore();
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
    case "api_account_context": result = accountContext(String(params.p_auth_subject), String(params.p_email), params.p_full_name ? String(params.p_full_name) : null); break;
    case "api_update_profile": result = updateProfile(String(params.p_auth_subject), String(params.p_email), params.p_input as Json); break;
    case "api_create_account_pet": result = createAccountPet(String(params.p_auth_subject), params.p_input as Json); break;
    case "api_account_pet_detail": result = accountPetDetail(String(params.p_auth_subject), String(params.p_pet_id)); break;
    case "api_search_profiles": result = searchProfiles(String(params.p_auth_subject), String(params.p_pet_id), String(params.p_query)); break;
    case "api_invite_pet_member": result = invitePetMember(String(params.p_auth_subject), String(params.p_pet_id), String(params.p_target_profile_id), String(params.p_role), (params.p_permissions as Json) ?? {}); break;
    case "api_accept_pet_invitation": result = acceptInvitation(String(params.p_auth_subject), String(params.p_membership_id)); break;
    case "api_update_member_permissions": result = updateMemberPermissions(String(params.p_auth_subject), String(params.p_membership_id), params.p_permissions as Json); break;
    case "api_revoke_pet_member": result = revokePetMember(String(params.p_auth_subject), String(params.p_membership_id)); break;
    case "api_create_account_reservation": result = createAccountReservation(String(params.p_auth_subject), params.p_input as Json); break;
    case "api_account_reservations": result = accountReservations(String(params.p_auth_subject)); break;
    case "api_cancel_account_reservation": result = cancelAccountReservation(String(params.p_auth_subject), String(params.p_reservation_id), params.p_reason ? String(params.p_reason) : null); break;
    case "api_generate_reservation_code": result = generateReservationCode(String(params.p_auth_subject), String(params.p_reservation_id), String(params.p_operation)); break;
    case "api_admin_reservation_detail": result = adminReservationDetail(String(params.p_reservation_id)); break;
    case "api_admin_complete_reservation_operation": result = completeReservationOperation(String(params.p_admin_auth_subject), String(params.p_reservation_id), String(params.p_operation), String(params.p_code), params.p_notes ? String(params.p_notes) : null); break;
    default: throw new Error(`La demostración local no implementa ${name}.`);
  }
  return result as T;
}
