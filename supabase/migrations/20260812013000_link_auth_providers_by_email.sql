create or replace function public.api_account_context(
  p_app_token text,
  p_auth_subject text,
  p_email text,
  p_full_name text default null
) returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare
  account public.profiles;
  email_account public.profiles;
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
    select * into email_account from public.profiles where lower(email) = lower(trim(p_email)) order by created_at limit 1;
    if email_account.id is not null then
      update public.profiles set auth_subject = p_auth_subject, updated_at = now()
      where id = email_account.id returning * into account;
    else
      select id into matched_customer from public.customers where lower(email) = lower(trim(p_email)) order by created_at limit 1;
      given_name := nullif(split_part(trim(coalesce(p_full_name, '')), ' ', 1), '');
      family_name := nullif(trim(regexp_replace(trim(coalesce(p_full_name, '')), '^\S+\s*', '')), '');
      insert into public.profiles (auth_subject, customer_id, first_name, last_name, email)
      values (p_auth_subject, matched_customer, given_name, family_name, lower(trim(p_email)))
      returning * into account;
    end if;
  elsif account.email <> lower(trim(p_email)) then
    update public.profiles set email = lower(trim(p_email)) where id = account.id returning * into account;
  end if;

  return jsonb_build_object(
    'profile', to_jsonb(account),
    'pets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', m.id, 'role', m.role,
        'permissions', jsonb_build_object('can_create_reservations',m.can_create_reservations,'can_cancel_reservations',m.can_cancel_reservations,'can_dropoff',m.can_dropoff,'can_pickup',m.can_pickup),
        'pet', to_jsonb(pet),
        'next_reservation', (select jsonb_build_object('id',r.id,'reservation_number',r.reservation_number,'start_datetime',r.start_datetime,'status',coalesce(s.status::text,r.status::text),'service_number',s.service_number) from public.reservations r left join public.services s on s.reservation_id=r.id and s.pet_id=pet.id where r.pet_id=pet.id and r.status in ('PENDING','CONFIRMED') and r.end_datetime>=now() order by r.start_datetime limit 1)
      ) order by pet.name) from public.pet_memberships m join public.pets pet on pet.id=m.pet_id where m.profile_id=account.id and m.status='ACTIVE'
    ), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object('membership_id',m.id,'role',m.role,'created_at',m.created_at,'pet',jsonb_build_object('id',pet.id,'name',pet.name,'species',pet.species,'breed',pet.breed),'invited_by',trim(concat(inv.first_name,' ',inv.last_name))) order by m.created_at desc)
      from public.pet_memberships m join public.pets pet on pet.id=m.pet_id left join public.profiles inv on inv.id=m.created_by where m.profile_id=account.id and m.status='PENDING'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.api_account_context(text,text,text,text) from public, authenticated;
grant execute on function public.api_account_context(text,text,text,text) to anon;
