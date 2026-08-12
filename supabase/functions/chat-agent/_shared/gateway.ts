import type { AuthUser } from "./auth.ts";

// Gateway hacia las funciones RPC api_* que ya expone el proyecto (las mismas
// que usa lib/account.ts en el Worker de Next.js), para reutilizar lógica de
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

export type AccountPetInfo = {
  membership_id: string;
  role: "OWNER" | "RESPONSIBLE";
  permissions: {
    can_create_reservations: boolean;
    can_cancel_reservations: boolean;
    can_dropoff: boolean;
    can_pickup: boolean;
  };
  pet: { id: string; name: string; species: string };
};

export type AccountContext = {
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profile_completed: boolean;
  };
  pets: AccountPetInfo[];
};

// api_account_context también crea el perfil la primera vez que alguien
// inicia sesión (o lo re-vincula por email si cambió de proveedor de login),
// así que hay que llamarla antes que cualquier otra RPC de cuenta.
export async function getAccountContext(authUser: AuthUser): Promise<AccountContext | null> {
  return callRpc<AccountContext>("api_account_context", {
    p_auth_subject: authUser.userId,
    p_email: authUser.email.toLowerCase(),
    p_full_name: authUser.fullName,
  });
}

export type CreateAccountReservationInput = {
  petId: string;
  serviceTypeId: string;
  startDatetime: string;
  endDatetime: string;
  notes?: string;
};

export async function createAccountReservation(
  authUser: AuthUser,
  input: CreateAccountReservationInput,
): Promise<{ id: string; reservationNumber: string; status: string }> {
  const result = await callRpc<{ id: string; reservationNumber: string; status: string }>(
    "api_create_account_reservation",
    { p_auth_subject: authUser.userId, p_input: input },
  );
  if (!result) throw new Error("No pudimos crear la reserva.");
  return result;
}
