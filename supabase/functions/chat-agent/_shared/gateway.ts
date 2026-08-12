// Gateway hacia las funciones RPC api_* que ya expone el proyecto (las mismas
// que usa lib/supabase.ts en el Worker de Next.js), para reutilizar lógica de
// negocio ya probada en vez de tocar tablas directamente y adivinar su forma.
//
// Nombres de secret con prefijo PET_SERENO_ porque Supabase reserva el
// prefijo SUPABASE_ para sus propias variables inyectadas (no se puede usar
// en `supabase secrets set`). SUPABASE_URL sí es una de esas auto-inyectadas.
async function callRpc<T>(name: string, params: Record<string, unknown> = {}): Promise<T | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("PET_SERENO_PUBLISHABLE_KEY");
  const appToken = Deno.env.get("PET_SERENO_APP_TOKEN");
  if (!url || !publishableKey || !appToken) return null;

  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
      "x-pet-sereno-token": appToken,
      "content-type": "application/json",
    },
    body: JSON.stringify({ p_app_token: appToken, ...params }),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({} as { message?: string }));
    throw new Error(detail.message || `${name} respondió ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json() as Promise<T>;
}

export type ServiceTypeInfo = { id: string; name: string; short_description?: string };

// Si los secrets no están configurados o la llamada falla, se degrada a una
// lista vacía y el prompt usa una descripción genérica (ver _shared/prompt.ts).
export async function fetchServiceTypes(): Promise<ServiceTypeInfo[]> {
  try {
    const data = await callRpc<ServiceTypeInfo[]>("api_list_service_types");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export type ReservationPet = { id: string; name: string; species: string };
export type ReservationCustomer = {
  first_name: string;
  last_name: string;
  pets: ReservationPet[];
};

export async function findCustomerForReservation(documentNumber: string): Promise<ReservationCustomer | null> {
  return callRpc<ReservationCustomer>("api_find_customer_for_reservation", {
    p_document_number: documentNumber.replace(/\s/g, ""),
  });
}

export type CreateReservationInput = {
  documentNumber: string;
  petIds: string[];
  serviceTypeId: string;
  startDatetime: string;
  endDatetime: string;
  notes?: string;
};

export async function createReservation(
  input: CreateReservationInput,
): Promise<{ id: string; reservationNumber: string; status: "PENDING" }> {
  const result = await callRpc<{ id: string; reservationNumber: string; status: "PENDING" }>(
    "api_create_reservation",
    { p_input: { ...input, source: "WEB" } },
  );
  if (!result) throw new Error("No pudimos crear la reserva.");
  return result;
}
