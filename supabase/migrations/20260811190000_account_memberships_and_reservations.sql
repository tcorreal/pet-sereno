-- Pet Sereno account, pet membership and reservation authorization model.
-- Additive migration: existing customers, pets, reservations and services remain valid.

create sequence if not exists public.profile_code_seq start 1;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_subject text not null unique,
  customer_id uuid unique references public.customers(id) on delete restrict,
  first_name text,
  last_name text,
  email text not null,
  phone text,
  document_type text,
  document_number text,
  username text,
  user_code text not null unique default ('USR-' || lpad(nextval('public.profile_code_seq')::text, 6, '0')),
  photo_url text,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_check check (email = lower(email) and position('@' in email) > 1),
  constraint profiles_phone_check check (phone is null or phone ~ '^\+[0-9]{7,15}$'),
  constraint profiles_username_check check (username is null or username ~ '^[a-z0-9._-]{3,30}$')
);

create unique index if not exists profiles_username_unique on public.profiles (lower(username)) where username is not null;
create unique index if not exists profiles_document_unique on public.profiles (document_type, document_number) where document_number is not null;
create index if not exists profiles_email_idx on public.profiles (lower(email));

create table if not exists public.pet_memberships (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('OWNER', 'RESPONSIBLE')),
  status text not null default 'PENDING' check (status in ('PENDING', 'ACTIVE', 'REVOKED')),
  created_by uuid references public.profiles(id) on delete set null,
  can_create_reservations boolean not null default false,
  can_cancel_reservations boolean not null default false,
  can_dropoff boolean not null default false,
  can_pickup boolean not null default false,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pet_memberships_owner_permissions check (
    role <> 'OWNER' or (can_create_reservations and can_cancel_reservations and can_dropoff and can_pickup)
  )
);

create unique index if not exists pet_memberships_current_unique
  on public.pet_memberships (pet_id, profile_id) where status in ('PENDING', 'ACTIVE');
create index if not exists pet_memberships_profile_active_idx
  on public.pet_memberships (profile_id, pet_id) where status = 'ACTIVE';
create index if not exists pet_memberships_pet_role_status_idx
  on public.pet_memberships (pet_id, role, status);

create table if not exists public.pet_permission_audit (
  id bigint generated always as identity primary key,
  pet_id uuid not null references public.pets(id) on delete cascade,
  membership_id uuid not null references public.pet_memberships(id) on delete cascade,
  responsible_profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_name text not null check (permission_name in ('can_create_reservations','can_cancel_reservations','can_dropoff','can_pickup')),
  old_value boolean not null,
  new_value boolean not null,
  changed_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  changed_at timestamptz not null default now()
);
create index if not exists pet_permission_audit_pet_changed_idx on public.pet_permission_audit (pet_id, changed_at desc);

alter table public.reservations add column if not exists pet_id uuid references public.pets(id) on delete restrict;
alter table public.reservations add column if not exists created_by_profile_id uuid references public.profiles(id) on delete set null;
alter table public.reservations add column if not exists created_by_membership_role text check (created_by_membership_role in ('OWNER','RESPONSIBLE'));
alter table public.reservations add column if not exists cancelled_by_profile_id uuid references public.profiles(id) on delete set null;
alter table public.reservations add column if not exists cancelled_at timestamptz;
alter table public.reservations add column if not exists cancellation_reason text;

update public.reservations r
set pet_id = x.pet_id
from (
  select reservation_id, min(pet_id::text)::uuid as pet_id
  from public.reservation_pets
  group by reservation_id
  having count(*) = 1
) x
where r.id = x.reservation_id and r.pet_id is null;

create index if not exists reservations_pet_start_idx on public.reservations (pet_id, start_datetime desc);
create index if not exists reservations_creator_idx on public.reservations (created_by_profile_id, created_at desc);

create table if not exists public.reservation_authorized_people (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  authorization_type text not null check (authorization_type in ('DROPOFF','PICKUP')),
  authorized_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (reservation_id, profile_id, authorization_type)
);
create index if not exists reservation_authorized_people_profile_idx on public.reservation_authorized_people (profile_id, reservation_id);

create table if not exists public.reservation_access_codes (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  operation text not null check (operation in ('DROPOFF','PICKUP')),
  code_hash bytea not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reservation_access_codes_expiry check (expires_at > created_at)
);
create index if not exists reservation_access_codes_lookup_idx
  on public.reservation_access_codes (reservation_id, operation, code_hash) where used_at is null;
create index if not exists reservation_access_codes_profile_idx
  on public.reservation_access_codes (profile_id, created_at desc);

create table if not exists public.reservation_operations (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete restrict,
  operation text not null check (operation in ('DROPOFF','PICKUP')),
  person_profile_id uuid not null references public.profiles(id) on delete restrict,
  employee_auth_subject text not null,
  validation_method text not null default 'TEMPORARY_CODE' check (validation_method in ('TEMPORARY_CODE','MANUAL_ADMIN')),
  notes text,
  occurred_at timestamptz not null default now()
);
create index if not exists reservation_operations_reservation_idx on public.reservation_operations (reservation_id, occurred_at desc);

create table if not exists public.reservation_status_history (
  id bigint generated always as identity primary key,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by_profile_id uuid references public.profiles(id) on delete set null,
  changed_by_auth_subject text,
  notes text,
  changed_at timestamptz not null default now()
);
create index if not exists reservation_status_history_reservation_idx on public.reservation_status_history (reservation_id, changed_at desc);

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function private.touch_updated_at();
drop trigger if exists pet_memberships_touch_updated_at on public.pet_memberships;
create trigger pet_memberships_touch_updated_at before update on public.pet_memberships
for each row execute function private.touch_updated_at();

create or replace function private.enforce_pet_membership_rules()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  current_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.pet_id::text, 0));

  if new.role = 'OWNER' then
    new.can_create_reservations := true;
    new.can_cancel_reservations := true;
    new.can_dropoff := true;
    new.can_pickup := true;
  end if;

  if new.status in ('PENDING','ACTIVE') then
    select count(*) into current_count
    from public.pet_memberships m
    where m.pet_id = new.pet_id
      and m.role = new.role
      and m.status in ('PENDING','ACTIVE')
      and m.id <> new.id;

    if new.role = 'OWNER' and current_count >= 2 then
      raise exception 'Esta mascota ya tiene el máximo de 2 propietarios.' using errcode = '23514';
    elsif new.role = 'RESPONSIBLE' and current_count >= 5 then
      raise exception 'Esta mascota ya tiene 5 responsables.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_pet_membership_rules on public.pet_memberships;
create trigger enforce_pet_membership_rules
before insert or update of pet_id, role, status, can_create_reservations, can_cancel_reservations, can_dropoff, can_pickup
on public.pet_memberships for each row execute function private.enforce_pet_membership_rules();

alter table public.profiles enable row level security;
alter table public.pet_memberships enable row level security;
alter table public.pet_permission_audit enable row level security;
alter table public.reservation_authorized_people enable row level security;
alter table public.reservation_access_codes enable row level security;
alter table public.reservation_operations enable row level security;
alter table public.reservation_status_history enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','pet_memberships','pet_permission_audit','reservation_authorized_people','reservation_access_codes','reservation_operations','reservation_status_history']
  loop
    execute format('drop policy if exists app_token_access on public.%I', t);
    execute format('create policy app_token_access on public.%I for all to anon using (private.request_token_valid()) with check (private.request_token_valid())', t);
  end loop;
end $$;

grant usage on sequence public.profile_code_seq to anon;
grant select, insert, update on public.profiles, public.pet_memberships, public.pet_permission_audit,
  public.reservation_authorized_people, public.reservation_access_codes, public.reservation_operations,
  public.reservation_status_history to anon;
grant usage, select on all sequences in schema public to anon;

create or replace function private.profile_for_subject(p_auth_subject text)
returns public.profiles language plpgsql stable set search_path = public, pg_temp as $$
declare result public.profiles;
begin
  select * into result from public.profiles where auth_subject = p_auth_subject;
  if result.id is null then
    raise exception 'Completa primero tu perfil.' using errcode = 'P0001';
  end if;
  return result;
end;
$$;

create or replace function private.active_membership(p_auth_subject text, p_pet_id uuid)
returns public.pet_memberships language plpgsql stable set search_path = public, pg_temp as $$
declare result public.pet_memberships;
begin
  select m.* into result
  from public.pet_memberships m
  join public.profiles p on p.id = m.profile_id
  where p.auth_subject = p_auth_subject and m.pet_id = p_pet_id and m.status = 'ACTIVE';
  if result.id is null then
    raise exception 'No tienes autorización para realizar esta acción.' using errcode = '42501';
  end if;
  return result;
end;
$$;

create or replace function private.assert_owner(p_auth_subject text, p_pet_id uuid)
returns public.pet_memberships language plpgsql stable set search_path = public, pg_temp as $$
declare result public.pet_memberships;
begin
  result := private.active_membership(p_auth_subject, p_pet_id);
  if result.role <> 'OWNER' then
    raise exception 'Solo un propietario puede realizar esta acción.' using errcode = '42501';
  end if;
  return result;
end;
$$;

create or replace function public.api_account_context(
  p_app_token text,
  p_auth_subject text,
  p_email text,
  p_full_name text default null
) returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare
  account public.profiles;
  matched_customer uuid;
  given_name text;
  family_name text;
begin
  perform private.assert_app_token(p_app_token);
  if nullif(trim(p_auth_subject), '') is null or nullif(trim(p_email), '') is null then
    raise exception 'Necesitas iniciar sesión para continuar.' using errcode = '42501';
  end if;

  select * into account from public.profiles where auth_subject = p_auth_subject;
  if account.id is null then
    select id into matched_customer from public.customers where lower(email) = lower(trim(p_email)) order by created_at limit 1;
    given_name := nullif(split_part(trim(coalesce(p_full_name, '')), ' ', 1), '');
    family_name := nullif(trim(regexp_replace(trim(coalesce(p_full_name, '')), '^\S+\s*', '')), '');
    insert into public.profiles (auth_subject, customer_id, first_name, last_name, email)
    values (p_auth_subject, matched_customer, given_name, family_name, lower(trim(p_email)))
    returning * into account;
  elsif account.email <> lower(trim(p_email)) then
    update public.profiles set email = lower(trim(p_email)) where id = account.id returning * into account;
  end if;

  return jsonb_build_object(
    'profile', to_jsonb(account),
    'pets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', m.id,
        'role', m.role,
        'permissions', jsonb_build_object(
          'can_create_reservations', m.can_create_reservations,
          'can_cancel_reservations', m.can_cancel_reservations,
          'can_dropoff', m.can_dropoff,
          'can_pickup', m.can_pickup
        ),
        'pet', to_jsonb(pet),
        'next_reservation', (
          select jsonb_build_object(
            'id', r.id, 'reservation_number', r.reservation_number,
            'start_datetime', r.start_datetime, 'status', coalesce(s.status::text, r.status::text),
            'service_number', s.service_number
          )
          from public.reservations r
          left join public.services s on s.reservation_id = r.id and s.pet_id = pet.id
          where r.pet_id = pet.id and r.status in ('PENDING','CONFIRMED') and r.end_datetime >= now()
          order by r.start_datetime limit 1
        )
      ) order by pet.name)
      from public.pet_memberships m
      join public.pets pet on pet.id = m.pet_id
      where m.profile_id = account.id and m.status = 'ACTIVE'
    ), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', m.id, 'role', m.role, 'created_at', m.created_at,
        'pet', jsonb_build_object('id', pet.id, 'name', pet.name, 'species', pet.species, 'breed', pet.breed),
        'invited_by', trim(concat(inv.first_name, ' ', inv.last_name))
      ) order by m.created_at desc)
      from public.pet_memberships m
      join public.pets pet on pet.id = m.pet_id
      left join public.profiles inv on inv.id = m.created_by
      where m.profile_id = account.id and m.status = 'PENDING'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.api_update_profile(
  p_app_token text,
  p_auth_subject text,
  p_email text,
  p_input jsonb
) returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare
  account public.profiles;
  customer public.customers;
  normalized_username text := lower(trim(coalesce(p_input->>'username','')));
  normalized_document text := regexp_replace(trim(coalesce(p_input->>'documentNumber','')), '\s+', '', 'g');
  normalized_phone text := trim(coalesce(p_input->>'phone',''));
begin
  perform private.assert_app_token(p_app_token);
  account := private.profile_for_subject(p_auth_subject);
  if lower(trim(p_email)) <> account.email then
    raise exception 'La identidad autenticada no coincide con el perfil.' using errcode = '42501';
  end if;
  if nullif(trim(p_input->>'firstName'),'') is null or nullif(trim(p_input->>'lastName'),'') is null
    or normalized_username !~ '^[a-z0-9._-]{3,30}$'
    or nullif(normalized_document,'') is null or normalized_phone !~ '^\+[0-9]{7,15}$' then
    raise exception 'Completa correctamente todos los campos obligatorios.' using errcode = '22023';
  end if;

  select * into customer from public.customers where document_number = normalized_document limit 1;
  if customer.id is not null and account.customer_id is distinct from customer.id and lower(customer.email) <> lower(p_email) then
    raise exception 'Ese documento ya está asociado a otra cuenta.' using errcode = '23505';
  end if;

  if customer.id is null then
    insert into public.customers (
      first_name, last_name, document_type, document_number, phone, whatsapp_phone, email,
      address, city, department, source
    ) values (
      trim(p_input->>'firstName'), trim(p_input->>'lastName'), trim(p_input->>'documentType'),
      normalized_document, normalized_phone, normalized_phone, lower(trim(p_email)),
      nullif(trim(p_input->>'address'),''), nullif(trim(p_input->>'city'),''),
      nullif(trim(p_input->>'department'),''), 'WEB'
    ) returning * into customer;
  else
    update public.customers set
      first_name = trim(p_input->>'firstName'), last_name = trim(p_input->>'lastName'),
      document_type = trim(p_input->>'documentType'), phone = normalized_phone,
      whatsapp_phone = normalized_phone, email = lower(trim(p_email)),
      address = nullif(trim(p_input->>'address'),''), city = nullif(trim(p_input->>'city'),''),
      department = nullif(trim(p_input->>'department'),''), updated_at = now()
    where id = customer.id returning * into customer;
  end if;

  update public.profiles set
    customer_id = customer.id,
    first_name = trim(p_input->>'firstName'),
    last_name = trim(p_input->>'lastName'),
    phone = normalized_phone,
    document_type = trim(p_input->>'documentType'),
    document_number = normalized_document,
    username = normalized_username,
    photo_url = nullif(trim(p_input->>'photoUrl'),''),
    profile_completed = true
  where id = account.id returning * into account;
  return to_jsonb(account);
exception
  when unique_violation then
    if exists (select 1 from public.profiles where lower(username) = normalized_username and auth_subject <> p_auth_subject) then
      raise exception 'Ese nombre de usuario ya está en uso.' using errcode = '23505';
    end if;
    raise;
end;
$$;

create or replace function public.api_create_account_pet(
  p_app_token text,
  p_auth_subject text,
  p_input jsonb
) returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare
  account public.profiles;
  pet public.pets;
  membership public.pet_memberships;
begin
  perform private.assert_app_token(p_app_token);
  account := private.profile_for_subject(p_auth_subject);
  if not account.profile_completed or account.customer_id is null then
    raise exception 'Completa primero tu perfil.' using errcode = 'P0001';
  end if;
  if nullif(trim(p_input->>'name'),'') is null or nullif(trim(p_input->>'species'),'') is null then
    raise exception 'El nombre y la especie son obligatorios.' using errcode = '22023';
  end if;
  insert into public.pets (
    customer_id, name, species, breed, sex, birth_date, approximate_age, weight, color, photo_url, notes
  ) values (
    account.customer_id, trim(p_input->>'name'), trim(p_input->>'species'), nullif(trim(p_input->>'breed'),''),
    nullif(trim(p_input->>'sex'),''), nullif(p_input->>'birthDate','')::date,
    nullif(p_input->>'approximateAge','')::integer, nullif(p_input->>'weight','')::numeric,
    nullif(trim(p_input->>'color'),''), nullif(trim(p_input->>'photoUrl'),''), nullif(trim(p_input->>'notes'),'')
  ) returning * into pet;

  insert into public.pet_memberships (
    pet_id, profile_id, role, status, created_by,
    can_create_reservations, can_cancel_reservations, can_dropoff, can_pickup, accepted_at
  ) values (pet.id, account.id, 'OWNER', 'ACTIVE', account.id, true, true, true, true, now())
  returning * into membership;
  return jsonb_build_object('pet', to_jsonb(pet), 'membership', to_jsonb(membership));
end;
$$;

create or replace function public.api_account_pet_detail(
  p_app_token text,
  p_auth_subject text,
  p_pet_id uuid
) returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare actor public.pet_memberships;
begin
  perform private.assert_app_token(p_app_token);
  actor := private.active_membership(p_auth_subject, p_pet_id);
  return jsonb_build_object(
    'pet', (select to_jsonb(p) from public.pets p where p.id = p_pet_id),
    'membership', to_jsonb(actor),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', m.id, 'role', m.role, 'status', m.status,
        'can_create_reservations', m.can_create_reservations,
        'can_cancel_reservations', m.can_cancel_reservations,
        'can_dropoff', m.can_dropoff, 'can_pickup', m.can_pickup,
        'profile', jsonb_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name,
          'username', p.username, 'user_code', p.user_code, 'photo_url', p.photo_url)
      ) order by m.role, m.created_at)
      from public.pet_memberships m join public.profiles p on p.id = m.profile_id
      where m.pet_id = p_pet_id and m.status in ('PENDING','ACTIVE')
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'service_number', s.service_number, 'status', s.status,
        'scheduled_entry_at', s.scheduled_entry_at, 'scheduled_exit_at', s.scheduled_exit_at,
        'service_type', st.name
      ) order by s.scheduled_entry_at desc)
      from public.services s join public.service_types st on st.id = s.service_type_id
      where s.pet_id = p_pet_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.api_search_profiles(
  p_app_token text,
  p_auth_subject text,
  p_pet_id uuid,
  p_query text
) returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare actor public.pet_memberships;
declare q text := lower(trim(p_query));
begin
  perform private.assert_app_token(p_app_token);
  actor := private.assert_owner(p_auth_subject, p_pet_id);
  if char_length(q) < 3 then raise exception 'Escribe al menos 3 caracteres.' using errcode = '22023'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', trim(concat(p.first_name,' ',p.last_name)), 'username', p.username,
      'user_code', p.user_code,
      'email_hint', regexp_replace(p.email, '(^.).*(@.*$)', '\1***\2'),
      'phone_hint', case when p.phone is null then null else '***' || right(p.phone, 4) end
    ))
    from public.profiles p
    where p.profile_completed and p.id <> actor.profile_id
      and (lower(p.username) = q or lower(p.email) = q or upper(p.user_code) = upper(trim(p_query))
        or regexp_replace(coalesce(p.phone,''), '\s+', '', 'g') = regexp_replace(p_query, '\s+', '', 'g'))
    limit 10
  ), '[]'::jsonb);
end;
$$;

create or replace function public.api_invite_pet_member(
  p_app_token text,
  p_auth_subject text,
  p_pet_id uuid,
  p_target_profile_id uuid,
  p_role text,
  p_permissions jsonb default '{}'::jsonb
) returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare actor public.pet_memberships;
declare result public.pet_memberships;
declare normalized_role text := upper(trim(p_role));
begin
  perform private.assert_app_token(p_app_token);
  actor := private.assert_owner(p_auth_subject, p_pet_id);
  if normalized_role not in ('OWNER','RESPONSIBLE') then raise exception 'El tipo de relación no es válido.' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where id = p_target_profile_id and profile_completed) then
    raise exception 'No encontramos una cuenta activa para invitar.' using errcode = 'P0001';
  end if;
  insert into public.pet_memberships (
    pet_id, profile_id, role, status, created_by,
    can_create_reservations, can_cancel_reservations, can_dropoff, can_pickup
  ) values (
    p_pet_id, p_target_profile_id, normalized_role, 'PENDING', actor.profile_id,
    case when normalized_role='OWNER' then true else coalesce((p_permissions->>'can_create_reservations')::boolean,false) end,
    case when normalized_role='OWNER' then true else coalesce((p_permissions->>'can_cancel_reservations')::boolean,false) end,
    case when normalized_role='OWNER' then true else coalesce((p_permissions->>'can_dropoff')::boolean,false) end,
    case when normalized_role='OWNER' then true else coalesce((p_permissions->>'can_pickup')::boolean,false) end
  ) returning * into result;
  return to_jsonb(result);
exception when unique_violation then
  raise exception 'Esa persona ya está vinculada o tiene una invitación pendiente.' using errcode = '23505';
end;
$$;

create or replace function public.api_accept_pet_invitation(
  p_app_token text,
  p_auth_subject text,
  p_membership_id uuid
) returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare account public.profiles;
declare result public.pet_memberships;
begin
  perform private.assert_app_token(p_app_token);
  account := private.profile_for_subject(p_auth_subject);
  update public.pet_memberships set status='ACTIVE', accepted_at=now(), revoked_at=null
  where id=p_membership_id and profile_id=account.id and status='PENDING'
  returning * into result;
  if result.id is null then raise exception 'La invitación no existe o ya no está disponible.' using errcode='P0001'; end if;
  return to_jsonb(result);
end;
$$;

create or replace function public.api_update_member_permissions(
  p_app_token text,
  p_auth_subject text,
  p_membership_id uuid,
  p_permissions jsonb
) returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare target public.pet_memberships;
declare actor public.pet_memberships;
declare updated public.pet_memberships;
declare permission text;
declare old_value boolean;
declare new_value boolean;
begin
  perform private.assert_app_token(p_app_token);
  select * into target from public.pet_memberships where id=p_membership_id and status in ('PENDING','ACTIVE');
  if target.id is null or target.role <> 'RESPONSIBLE' then raise exception 'Solo se pueden editar permisos de responsables.' using errcode='22023'; end if;
  actor := private.assert_owner(p_auth_subject, target.pet_id);

  foreach permission in array array['can_create_reservations','can_cancel_reservations','can_dropoff','can_pickup'] loop
    old_value := case permission
      when 'can_create_reservations' then target.can_create_reservations
      when 'can_cancel_reservations' then target.can_cancel_reservations
      when 'can_dropoff' then target.can_dropoff else target.can_pickup end;
    new_value := coalesce((p_permissions->>permission)::boolean, old_value);
    if old_value is distinct from new_value then
      insert into public.pet_permission_audit (pet_id,membership_id,responsible_profile_id,permission_name,old_value,new_value,changed_by_profile_id)
      values (target.pet_id,target.id,target.profile_id,permission,old_value,new_value,actor.profile_id);
    end if;
  end loop;

  update public.pet_memberships set
    can_create_reservations=coalesce((p_permissions->>'can_create_reservations')::boolean,can_create_reservations),
    can_cancel_reservations=coalesce((p_permissions->>'can_cancel_reservations')::boolean,can_cancel_reservations),
    can_dropoff=coalesce((p_permissions->>'can_dropoff')::boolean,can_dropoff),
    can_pickup=coalesce((p_permissions->>'can_pickup')::boolean,can_pickup)
  where id=target.id returning * into updated;
  return to_jsonb(updated);
end;
$$;

create or replace function public.api_revoke_pet_member(
  p_app_token text,
  p_auth_subject text,
  p_membership_id uuid
) returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare target public.pet_memberships;
declare actor public.pet_memberships;
declare result public.pet_memberships;
begin
  perform private.assert_app_token(p_app_token);
  select * into target from public.pet_memberships where id=p_membership_id and status in ('PENDING','ACTIVE');
  if target.id is null then raise exception 'La relación ya no está activa.' using errcode='P0001'; end if;
  actor := private.assert_owner(p_auth_subject, target.pet_id);
  if target.id=actor.id then raise exception 'No puedes revocar tu propia relación de propietario.' using errcode='42501'; end if;
  if target.role='OWNER' and target.status='ACTIVE' and
    (select count(*) from public.pet_memberships where pet_id=target.pet_id and role='OWNER' and status='ACTIVE') <= 1 then
    raise exception 'La mascota debe conservar al menos un propietario.' using errcode='23514';
  end if;
  update public.pet_memberships set status='REVOKED',revoked_at=now() where id=target.id returning * into result;
  return to_jsonb(result);
end;
$$;

create or replace function private.has_operation_permission(p_profile_id uuid, p_pet_id uuid, p_operation text)
returns boolean language sql stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.pet_memberships m
    where m.profile_id=p_profile_id and m.pet_id=p_pet_id and m.status='ACTIVE'
      and (m.role='OWNER' or (p_operation='DROPOFF' and m.can_dropoff) or (p_operation='PICKUP' and m.can_pickup))
  );
$$;

create or replace function private.audit_reservation_change()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op='INSERT' or old.status is distinct from new.status then
    insert into public.reservation_status_history (
      reservation_id, previous_status, new_status, changed_by_profile_id, changed_by_auth_subject, notes
    ) values (
      new.id, case when tg_op='INSERT' then null else old.status::text end, new.status::text,
      nullif(current_setting('pet_sereno.actor_profile_id', true),'')::uuid,
      nullif(current_setting('pet_sereno.actor_auth_subject', true),''),
      nullif(current_setting('pet_sereno.audit_notes', true),'')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_reservation_change on public.reservations;
create trigger audit_reservation_change after insert or update of status on public.reservations
for each row execute function private.audit_reservation_change();

create or replace function private.audit_service_reservation_change()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if old.status is distinct from new.status then
    insert into public.reservation_status_history (
      reservation_id, previous_status, new_status, changed_by_profile_id, changed_by_auth_subject, notes
    ) values (
      new.reservation_id, old.status::text, new.status::text,
      nullif(current_setting('pet_sereno.actor_profile_id', true),'')::uuid,
      nullif(current_setting('pet_sereno.actor_auth_subject', true),''),
      nullif(current_setting('pet_sereno.audit_notes', true),'')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_service_reservation_change on public.services;
create trigger audit_service_reservation_change after update of status on public.services
for each row execute function private.audit_service_reservation_change();

create or replace function public.api_create_account_reservation(
  p_app_token text,
  p_auth_subject text,
  p_input jsonb
) returns jsonb language plpgsql set search_path = public, private, extensions, pg_temp as $$
declare
  account public.profiles;
  membership public.pet_memberships;
  pet public.pets;
  reservation public.reservations;
  requested_profile_id uuid;
  start_at timestamptz := (p_input->>'startDatetime')::timestamptz;
  end_at timestamptz := (p_input->>'endDatetime')::timestamptz;
begin
  perform private.assert_app_token(p_app_token);
  account := private.profile_for_subject(p_auth_subject);
  membership := private.active_membership(p_auth_subject, (p_input->>'petId')::uuid);
  if membership.role <> 'OWNER' and not membership.can_create_reservations then
    raise exception 'No tienes autorización para realizar esta acción.' using errcode='42501';
  end if;
  if start_at < now() or end_at <= start_at then
    raise exception 'La fecha de salida debe ser posterior al ingreso y la reserva debe ser futura.' using errcode='22023';
  end if;
  if not exists (select 1 from public.service_types where id=(p_input->>'serviceTypeId')::uuid and active) then
    raise exception 'El servicio seleccionado no está disponible.' using errcode='22023';
  end if;
  select * into pet from public.pets where id=membership.pet_id and status='ACTIVE';
  if pet.id is null then raise exception 'La mascota no está disponible.' using errcode='P0001'; end if;

  perform set_config('pet_sereno.actor_profile_id', account.id::text, true);
  perform set_config('pet_sereno.actor_auth_subject', p_auth_subject, true);
  perform set_config('pet_sereno.audit_notes', 'Reserva creada desde Mi cuenta', true);

  insert into public.reservations (
    customer_id, service_type_id, start_datetime, end_datetime, status, source, notes,
    pet_id, created_by_profile_id, created_by_membership_role
  ) values (
    pet.customer_id, (p_input->>'serviceTypeId')::uuid, start_at, end_at, 'PENDING', 'WEB',
    nullif(trim(p_input->>'notes'),''), pet.id, account.id, membership.role
  ) returning * into reservation;
  insert into public.reservation_pets (reservation_id,pet_id) values (reservation.id,pet.id);

  for requested_profile_id in select value::uuid from jsonb_array_elements_text(coalesce(p_input->'dropoffProfileIds','[]'::jsonb)) loop
    if not private.has_operation_permission(requested_profile_id,pet.id,'DROPOFF') then
      raise exception 'Una persona seleccionada no está autorizada para entregar la mascota.' using errcode='42501';
    end if;
    insert into public.reservation_authorized_people (reservation_id,profile_id,authorization_type,authorized_by_profile_id)
    values (reservation.id,requested_profile_id,'DROPOFF',account.id) on conflict do nothing;
  end loop;
  for requested_profile_id in select value::uuid from jsonb_array_elements_text(coalesce(p_input->'pickupProfileIds','[]'::jsonb)) loop
    if not private.has_operation_permission(requested_profile_id,pet.id,'PICKUP') then
      raise exception 'Una persona seleccionada no está autorizada para recoger la mascota.' using errcode='42501';
    end if;
    insert into public.reservation_authorized_people (reservation_id,profile_id,authorization_type,authorized_by_profile_id)
    values (reservation.id,requested_profile_id,'PICKUP',account.id) on conflict do nothing;
  end loop;

  if not exists (select 1 from public.reservation_authorized_people where reservation_id=reservation.id and authorization_type='DROPOFF')
    and private.has_operation_permission(account.id,pet.id,'DROPOFF') then
    insert into public.reservation_authorized_people (reservation_id,profile_id,authorization_type,authorized_by_profile_id)
    values (reservation.id,account.id,'DROPOFF',account.id);
  end if;
  if not exists (select 1 from public.reservation_authorized_people where reservation_id=reservation.id and authorization_type='PICKUP')
    and private.has_operation_permission(account.id,pet.id,'PICKUP') then
    insert into public.reservation_authorized_people (reservation_id,profile_id,authorization_type,authorized_by_profile_id)
    values (reservation.id,account.id,'PICKUP',account.id);
  end if;

  return jsonb_build_object('id',reservation.id,'reservationNumber',reservation.reservation_number,'status',reservation.status);
end;
$$;

create or replace function public.api_account_reservations(
  p_app_token text,
  p_auth_subject text
) returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare account public.profiles;
begin
  perform private.assert_app_token(p_app_token);
  account := private.profile_for_subject(p_auth_subject);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'reservation_number', r.reservation_number, 'pet_id', pet.id, 'pet_name', pet.name,
      'service_type', st.name, 'start_datetime', r.start_datetime, 'end_datetime', r.end_datetime,
      'reservation_status', r.status, 'status', coalesce(s.status::text,r.status::text),
      'service_id', s.id, 'service_number', s.service_number, 'notes', r.notes,
      'created_by', trim(concat(creator.first_name,' ',creator.last_name)),
      'can_cancel', (r.status in ('PENDING','CONFIRMED') and coalesce(s.status::text,'SCHEDULED')='SCHEDULED'
        and (m.role='OWNER' or m.can_cancel_reservations)),
      'can_dropoff', (m.role='OWNER' or m.can_dropoff) and exists (
        select 1 from public.reservation_authorized_people ap where ap.reservation_id=r.id and ap.profile_id=account.id and ap.authorization_type='DROPOFF'),
      'can_pickup', (m.role='OWNER' or m.can_pickup) and exists (
        select 1 from public.reservation_authorized_people ap where ap.reservation_id=r.id and ap.profile_id=account.id and ap.authorization_type='PICKUP')
    ) order by r.start_datetime desc)
    from public.reservations r
    join public.pets pet on pet.id=r.pet_id
    join public.pet_memberships m on m.pet_id=pet.id and m.profile_id=account.id and m.status='ACTIVE'
    join public.service_types st on st.id=r.service_type_id
    left join public.services s on s.reservation_id=r.id and s.pet_id=pet.id
    left join public.profiles creator on creator.id=r.created_by_profile_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.api_cancel_account_reservation(
  p_app_token text,
  p_auth_subject text,
  p_reservation_id uuid,
  p_reason text default null
) returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare account public.profiles;
declare reservation public.reservations;
declare membership public.pet_memberships;
declare service_status_text text;
begin
  perform private.assert_app_token(p_app_token);
  account := private.profile_for_subject(p_auth_subject);
  select * into reservation from public.reservations where id=p_reservation_id for update;
  if reservation.id is null or reservation.pet_id is null then raise exception 'No encontramos esa reserva.' using errcode='P0001'; end if;
  membership := private.active_membership(p_auth_subject,reservation.pet_id);
  if membership.role <> 'OWNER' and not membership.can_cancel_reservations then
    raise exception 'No tienes autorización para realizar esta acción.' using errcode='42501';
  end if;
  select status::text into service_status_text from public.services where reservation_id=reservation.id and pet_id=reservation.pet_id limit 1;
  if reservation.status not in ('PENDING','CONFIRMED') or coalesce(service_status_text,'SCHEDULED') <> 'SCHEDULED' then
    raise exception 'Esta reserva ya no puede cancelarse.' using errcode='P0001';
  end if;
  perform set_config('pet_sereno.actor_profile_id',account.id::text,true);
  perform set_config('pet_sereno.actor_auth_subject',p_auth_subject,true);
  perform set_config('pet_sereno.audit_notes',coalesce(nullif(trim(p_reason),''),'Cancelada por el cliente'),true);
  update public.reservations set status='CANCELLED',cancelled_by_profile_id=account.id,cancelled_at=now(),
    cancellation_reason=coalesce(nullif(trim(p_reason),''),'Cancelada por el cliente') where id=reservation.id returning * into reservation;
  update public.services set status='CANCELLED',notes=concat_ws(E'\n',notes,'Reserva cancelada por el cliente')
    where reservation_id=reservation.id and status='SCHEDULED';
  update public.reservation_access_codes set used_at=now() where reservation_id=reservation.id and used_at is null;
  return to_jsonb(reservation);
end;
$$;

create or replace function public.api_generate_reservation_code(
  p_app_token text,
  p_auth_subject text,
  p_reservation_id uuid,
  p_operation text
) returns jsonb language plpgsql set search_path = public, private, extensions, pg_temp as $$
declare account public.profiles;
declare reservation public.reservations;
declare operation_name text := upper(trim(p_operation));
declare plain_code text;
declare result public.reservation_access_codes;
begin
  perform private.assert_app_token(p_app_token);
  account := private.profile_for_subject(p_auth_subject);
  if operation_name not in ('DROPOFF','PICKUP') then raise exception 'La operación no es válida.' using errcode='22023'; end if;
  select * into reservation from public.reservations where id=p_reservation_id;
  if reservation.id is null or reservation.pet_id is null then raise exception 'No encontramos esa reserva.' using errcode='P0001'; end if;
  if not private.has_operation_permission(account.id,reservation.pet_id,operation_name) or not exists (
    select 1 from public.reservation_authorized_people where reservation_id=reservation.id and profile_id=account.id and authorization_type=operation_name
  ) then raise exception 'No tienes autorización para realizar esta acción.' using errcode='42501'; end if;
  if operation_name='DROPOFF' and not exists (
    select 1 from public.services where reservation_id=reservation.id and pet_id=reservation.pet_id and status='SCHEDULED'
  ) then raise exception 'La reserva no está lista para registrar el ingreso.' using errcode='P0001'; end if;
  if operation_name='PICKUP' and not exists (
    select 1 from public.services where reservation_id=reservation.id and pet_id=reservation.pet_id and status='READY_FOR_PICKUP'
  ) then raise exception 'La mascota todavía no está lista para salir.' using errcode='P0001'; end if;

  update public.reservation_access_codes set used_at=now()
    where reservation_id=reservation.id and profile_id=account.id and operation=operation_name and used_at is null;
  plain_code := upper(encode(extensions.gen_random_bytes(4),'hex'));
  insert into public.reservation_access_codes (reservation_id,profile_id,operation,code_hash,expires_at)
  values (reservation.id,account.id,operation_name,extensions.digest(plain_code,'sha256'),now()+interval '10 minutes')
  returning * into result;
  return jsonb_build_object('code',plain_code,'operation',operation_name,'expiresAt',result.expires_at,'expiresInMinutes',10);
end;
$$;

create or replace function public.api_admin_complete_reservation_operation(
  p_app_token text,
  p_admin_auth_subject text,
  p_reservation_id uuid,
  p_operation text,
  p_code text,
  p_notes text default null
) returns jsonb language plpgsql set search_path = public, private, extensions, pg_temp as $$
declare operation_name text := upper(trim(p_operation));
declare access_code public.reservation_access_codes;
declare reservation public.reservations;
declare service public.services;
begin
  perform private.assert_app_token(p_app_token);
  if nullif(trim(p_admin_auth_subject),'') is null then raise exception 'Necesitas iniciar sesión para continuar.' using errcode='42501'; end if;
  if operation_name not in ('DROPOFF','PICKUP') then raise exception 'La operación no es válida.' using errcode='22023'; end if;
  select * into access_code from public.reservation_access_codes
    where reservation_id=p_reservation_id and operation=operation_name
      and code_hash=extensions.digest(upper(trim(p_code)),'sha256')
    order by created_at desc limit 1 for update;
  if access_code.id is null then raise exception 'El código no es válido.' using errcode='P0001'; end if;
  if access_code.used_at is not null then raise exception 'El código ya fue utilizado.' using errcode='P0001'; end if;
  if access_code.expires_at <= now() then raise exception 'El código ha expirado.' using errcode='P0001'; end if;
  select * into reservation from public.reservations where id=p_reservation_id and pet_id is not null for update;
  if reservation.id is null or not private.has_operation_permission(access_code.profile_id,reservation.pet_id,operation_name)
    or not exists (select 1 from public.reservation_authorized_people where reservation_id=reservation.id and profile_id=access_code.profile_id and authorization_type=operation_name)
  then raise exception 'La persona ya no está autorizada para esta operación.' using errcode='42501'; end if;
  select * into service from public.services where reservation_id=reservation.id and pet_id=reservation.pet_id for update;
  if operation_name='DROPOFF' and service.status <> 'SCHEDULED' then raise exception 'El ingreso no se puede registrar en el estado actual.' using errcode='P0001'; end if;
  if operation_name='PICKUP' and service.status <> 'READY_FOR_PICKUP' then raise exception 'La salida no se puede registrar en el estado actual.' using errcode='P0001'; end if;

  perform set_config('pet_sereno.actor_auth_subject',p_admin_auth_subject,true);
  perform set_config('pet_sereno.audit_notes',coalesce(nullif(trim(p_notes),''),case when operation_name='DROPOFF' then 'Ingreso validado con código temporal' else 'Salida validada con código temporal' end),true);
  if operation_name='DROPOFF' then
    update public.services set status='CHECKED_IN',actual_entry_at=now(),notes=concat_ws(E'\n',notes,nullif(trim(p_notes),'')) where id=service.id returning * into service;
  else
    update public.services set status='CHECKED_OUT',actual_exit_at=now(),notes=concat_ws(E'\n',notes,nullif(trim(p_notes),'')) where id=service.id returning * into service;
    update public.reservations set status='COMPLETED' where id=reservation.id;
  end if;
  update public.reservation_access_codes set used_at=now() where id=access_code.id;
  insert into public.reservation_operations (reservation_id,pet_id,operation,person_profile_id,employee_auth_subject,validation_method,notes)
  values (reservation.id,reservation.pet_id,operation_name,access_code.profile_id,p_admin_auth_subject,'TEMPORARY_CODE',nullif(trim(p_notes),''));
  return jsonb_build_object('reservationId',reservation.id,'service',to_jsonb(service),'operation',operation_name,'validatedProfileId',access_code.profile_id);
end;
$$;

create or replace function public.api_admin_reservation_detail(
  p_app_token text,
  p_reservation_id uuid
) returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare reservation public.reservations;
begin
  perform private.assert_app_token(p_app_token);
  select * into reservation from public.reservations where id=p_reservation_id;
  if reservation.id is null then return null; end if;
  return jsonb_build_object(
    'reservation',to_jsonb(reservation),
    'pet',(select to_jsonb(p) from public.pets p where p.id=reservation.pet_id),
    'customer',(select jsonb_build_object('id',c.id,'first_name',c.first_name,'last_name',c.last_name,'email',c.email,'phone',c.phone) from public.customers c where c.id=reservation.customer_id),
    'service_type',(select to_jsonb(st) from public.service_types st where st.id=reservation.service_type_id),
    'service',(select to_jsonb(s) from public.services s where s.reservation_id=reservation.id and (reservation.pet_id is null or s.pet_id=reservation.pet_id) order by s.created_at limit 1),
    'created_by',(select jsonb_build_object('id',p.id,'name',trim(concat(p.first_name,' ',p.last_name)),'username',p.username) from public.profiles p where p.id=reservation.created_by_profile_id),
    'members',coalesce((select jsonb_agg(jsonb_build_object('profile_id',p.id,'name',trim(concat(p.first_name,' ',p.last_name)),'username',p.username,'role',m.role,'status',m.status))
      from public.pet_memberships m join public.profiles p on p.id=m.profile_id where m.pet_id=reservation.pet_id and m.status='ACTIVE'),'[]'::jsonb),
    'authorized_people',coalesce((select jsonb_agg(jsonb_build_object('profile_id',p.id,'name',trim(concat(p.first_name,' ',p.last_name)),'username',p.username,'authorization_type',ap.authorization_type))
      from public.reservation_authorized_people ap join public.profiles p on p.id=ap.profile_id where ap.reservation_id=reservation.id),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.changed_at) from public.reservation_status_history h where h.reservation_id=reservation.id),'[]'::jsonb),
    'operations',coalesce((select jsonb_agg(to_jsonb(o) order by o.occurred_at) from public.reservation_operations o where o.reservation_id=reservation.id),'[]'::jsonb)
  );
end;
$$;

revoke all on function private.profile_for_subject(text) from public, authenticated;
revoke all on function private.active_membership(text,uuid) from public, authenticated;
revoke all on function private.assert_owner(text,uuid) from public, authenticated;
revoke all on function private.has_operation_permission(uuid,uuid,text) from public, authenticated;
revoke all on function public.api_account_context(text,text,text,text) from public, authenticated;
revoke all on function public.api_update_profile(text,text,text,jsonb) from public, authenticated;
revoke all on function public.api_create_account_pet(text,text,jsonb) from public, authenticated;
revoke all on function public.api_account_pet_detail(text,text,uuid) from public, authenticated;
revoke all on function public.api_search_profiles(text,text,uuid,text) from public, authenticated;
revoke all on function public.api_invite_pet_member(text,text,uuid,uuid,text,jsonb) from public, authenticated;
revoke all on function public.api_accept_pet_invitation(text,text,uuid) from public, authenticated;
revoke all on function public.api_update_member_permissions(text,text,uuid,jsonb) from public, authenticated;
revoke all on function public.api_revoke_pet_member(text,text,uuid) from public, authenticated;
revoke all on function public.api_create_account_reservation(text,text,jsonb) from public, authenticated;
revoke all on function public.api_account_reservations(text,text) from public, authenticated;
revoke all on function public.api_cancel_account_reservation(text,text,uuid,text) from public, authenticated;
revoke all on function public.api_generate_reservation_code(text,text,uuid,text) from public, authenticated;
revoke all on function public.api_admin_complete_reservation_operation(text,text,uuid,text,text,text) from public, authenticated;
revoke all on function public.api_admin_reservation_detail(text,uuid) from public, authenticated;

grant execute on function private.profile_for_subject(text) to anon;
grant execute on function private.active_membership(text,uuid) to anon;
grant execute on function private.assert_owner(text,uuid) to anon;
grant execute on function private.has_operation_permission(uuid,uuid,text) to anon;
grant execute on function public.api_account_context(text,text,text,text) to anon;
grant execute on function public.api_update_profile(text,text,text,jsonb) to anon;
grant execute on function public.api_create_account_pet(text,text,jsonb) to anon;
grant execute on function public.api_account_pet_detail(text,text,uuid) to anon;
grant execute on function public.api_search_profiles(text,text,uuid,text) to anon;
grant execute on function public.api_invite_pet_member(text,text,uuid,uuid,text,jsonb) to anon;
grant execute on function public.api_accept_pet_invitation(text,text,uuid) to anon;
grant execute on function public.api_update_member_permissions(text,text,uuid,jsonb) to anon;
grant execute on function public.api_revoke_pet_member(text,text,uuid) to anon;
grant execute on function public.api_create_account_reservation(text,text,jsonb) to anon;
grant execute on function public.api_account_reservations(text,text) to anon;
grant execute on function public.api_cancel_account_reservation(text,text,uuid,text) to anon;
grant execute on function public.api_generate_reservation_code(text,text,uuid,text) to anon;
grant execute on function public.api_admin_complete_reservation_operation(text,text,uuid,text,text,text) to anon;
grant execute on function public.api_admin_reservation_detail(text,uuid) to anon;

-- New public tables are not exposed automatically on current Supabase projects.
-- Keep the surface minimal and explicit: RPC functions above are the supported API.
revoke all on public.profiles, public.pet_memberships, public.pet_permission_audit,
  public.reservation_authorized_people, public.reservation_access_codes, public.reservation_operations,
  public.reservation_status_history from authenticated;
