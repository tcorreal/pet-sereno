create index if not exists pet_memberships_created_by_idx
  on public.pet_memberships (created_by) where created_by is not null;
create index if not exists pet_permission_audit_membership_idx
  on public.pet_permission_audit (membership_id);
create index if not exists pet_permission_audit_responsible_idx
  on public.pet_permission_audit (responsible_profile_id);
create index if not exists pet_permission_audit_changed_by_idx
  on public.pet_permission_audit (changed_by_profile_id);
create index if not exists reservation_authorized_people_authorized_by_idx
  on public.reservation_authorized_people (authorized_by_profile_id);
create index if not exists reservation_operations_pet_idx
  on public.reservation_operations (pet_id);
create index if not exists reservation_operations_person_idx
  on public.reservation_operations (person_profile_id);
create index if not exists reservation_status_history_changed_by_idx
  on public.reservation_status_history (changed_by_profile_id) where changed_by_profile_id is not null;
create index if not exists reservations_cancelled_by_idx
  on public.reservations (cancelled_by_profile_id) where cancelled_by_profile_id is not null;
