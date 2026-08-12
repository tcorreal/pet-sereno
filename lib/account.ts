import type { ChatGPTUser } from "../app/chatgpt-auth";
import { normalizePhone, required } from "./domain";
import { supabaseRpc } from "./supabase";

export type AccountProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  document_type: string | null;
  document_number: string | null;
  username: string | null;
  user_code: string;
  photo_url: string | null;
  profile_completed: boolean;
};

export type MembershipPermissions = {
  can_create_reservations: boolean;
  can_cancel_reservations: boolean;
  can_dropoff: boolean;
  can_pickup: boolean;
};

export type AccountPet = {
  membership_id: string;
  role: "OWNER" | "RESPONSIBLE";
  permissions: MembershipPermissions;
  pet: Record<string, unknown> & { id: string; name: string; species: string; breed?: string | null; photo_url?: string | null };
  next_reservation: Record<string, unknown> | null;
};

export type AccountContext = {
  profile: AccountProfile;
  pets: AccountPet[];
  invitations: Array<Record<string, unknown>>;
};

function identity(user: ChatGPTUser) {
  return {
    p_auth_subject: user.userId,
    p_email: user.email.toLowerCase(),
    p_full_name: user.fullName,
  };
}

export function getAccountContext(user: ChatGPTUser) {
  return supabaseRpc<AccountContext>("api_account_context", identity(user));
}

export function updateAccountProfile(user: ChatGPTUser, input: Record<string, unknown>) {
  const phone = normalizePhone(required(input.phone, "El teléfono"));
  return supabaseRpc<AccountProfile>("api_update_profile", {
    p_auth_subject: user.userId,
    p_email: user.email.toLowerCase(),
    p_input: {
      firstName: required(input.firstName, "El nombre"),
      lastName: required(input.lastName, "El apellido"),
      username: required(input.username, "El nombre de usuario").toLowerCase().replace(/^@/, ""),
      phone,
      documentType: required(input.documentType, "El tipo de documento"),
      documentNumber: required(input.documentNumber, "El documento").replace(/\s/g, ""),
      photoUrl: String(input.photoUrl ?? ""),
      address: String(input.address ?? ""),
      city: String(input.city ?? ""),
      department: String(input.department ?? ""),
    },
  });
}

export function createAccountPet(user: ChatGPTUser, input: Record<string, unknown>) {
  return supabaseRpc<Record<string, unknown>>("api_create_account_pet", {
    p_auth_subject: user.userId,
    p_input: input,
  });
}

export function accountPetDetail(user: ChatGPTUser, petId: string) {
  return supabaseRpc<Record<string, unknown> | null>("api_account_pet_detail", {
    p_auth_subject: user.userId,
    p_pet_id: petId,
  });
}

export function searchProfiles(user: ChatGPTUser, petId: string, query: string) {
  return supabaseRpc<Array<Record<string, unknown>>>("api_search_profiles", {
    p_auth_subject: user.userId,
    p_pet_id: petId,
    p_query: query,
  });
}

export function invitePetMember(user: ChatGPTUser, petId: string, input: Record<string, unknown>) {
  return supabaseRpc<Record<string, unknown>>("api_invite_pet_member", {
    p_auth_subject: user.userId,
    p_pet_id: petId,
    p_target_profile_id: String(input.profileId),
    p_role: String(input.role),
    p_permissions: input.permissions ?? {},
  });
}

export function acceptInvitation(user: ChatGPTUser, membershipId: string) {
  return supabaseRpc<Record<string, unknown>>("api_accept_pet_invitation", {
    p_auth_subject: user.userId,
    p_membership_id: membershipId,
  });
}

export function updateMemberPermissions(user: ChatGPTUser, membershipId: string, permissions: Record<string, unknown>) {
  return supabaseRpc<Record<string, unknown>>("api_update_member_permissions", {
    p_auth_subject: user.userId,
    p_membership_id: membershipId,
    p_permissions: permissions,
  });
}

export function revokePetMember(user: ChatGPTUser, membershipId: string) {
  return supabaseRpc<Record<string, unknown>>("api_revoke_pet_member", {
    p_auth_subject: user.userId,
    p_membership_id: membershipId,
  });
}

export function createAccountReservation(user: ChatGPTUser, input: Record<string, unknown>) {
  return supabaseRpc<{ id: string; reservationNumber: string; status: string }>("api_create_account_reservation", {
    p_auth_subject: user.userId,
    p_input: input,
  });
}

export function listAccountReservations(user: ChatGPTUser) {
  return supabaseRpc<Array<Record<string, unknown>>>("api_account_reservations", {
    p_auth_subject: user.userId,
  });
}

export function cancelAccountReservation(user: ChatGPTUser, reservationId: string, reason?: string) {
  return supabaseRpc<Record<string, unknown>>("api_cancel_account_reservation", {
    p_auth_subject: user.userId,
    p_reservation_id: reservationId,
    p_reason: reason ?? null,
  });
}

export function generateReservationCode(user: ChatGPTUser, reservationId: string, operation: "DROPOFF" | "PICKUP") {
  return supabaseRpc<{ code: string; operation: string; expiresAt: string; expiresInMinutes: number }>("api_generate_reservation_code", {
    p_auth_subject: user.userId,
    p_reservation_id: reservationId,
    p_operation: operation,
  });
}

export function adminReservationDetail(reservationId: string) {
  return supabaseRpc<Record<string, unknown> | null>("api_admin_reservation_detail", {
    p_reservation_id: reservationId,
  });
}

export function completeReservationOperation(
  admin: ChatGPTUser,
  reservationId: string,
  operation: "DROPOFF" | "PICKUP",
  code: string,
  notes?: string,
) {
  return supabaseRpc<Record<string, unknown>>("api_admin_complete_reservation_operation", {
    p_admin_auth_subject: admin.userId,
    p_reservation_id: reservationId,
    p_operation: operation,
    p_code: code,
    p_notes: notes ?? null,
  });
}
