-- Al confirmar una reserva, además de crear los servicios (como ya hacía),
-- crea una notificación EMAIL por cada mascota/servicio (mismo patrón que
-- core_update_service_status usa para SERVICE_ACTIVATED/SERVICE_CLOSED), y
-- las devuelve para que la capa de aplicación (lib/data.ts:confirmReservation)
-- las entregue por el mismo webhook de correo ya configurado.
create or replace function public.core_confirm_reservation(p_reservation_id uuid)
 returns jsonb
 language plpgsql
 set search_path to ''
as $function$
declare
  v_reservation public.reservations%rowtype;
  v_customer public.customers%rowtype;
  v_service_type public.service_types%rowtype;
  v_pet record;
  v_pet_row public.pets%rowtype;
  v_service_id uuid;
  v_service_number text;
  v_services jsonb := '[]'::jsonb;
  v_notifications jsonb := '[]'::jsonb;
  v_notification public.customer_notifications%rowtype;
  v_subject text;
  v_body text;
begin
  select * into v_reservation from public.reservations where id=p_reservation_id for update;
  if not found then
    raise exception using message='No encontramos esa reserva.',errcode='P0001';
  end if;
  if v_reservation.status='CONFIRMED' then
    return jsonb_build_object('alreadyConfirmed',true);
  end if;
  if v_reservation.status not in ('PENDING','DRAFT') then
    raise exception using message='Esta reserva no puede confirmarse en su estado actual.',errcode='P0001';
  end if;

  update public.reservations set status='CONFIRMED' where id=p_reservation_id;

  select * into v_customer from public.customers where id=v_reservation.customer_id;
  select * into v_service_type from public.service_types where id=v_reservation.service_type_id;

  for v_pet in select pet_id from public.reservation_pets where reservation_id=p_reservation_id
  loop
    insert into public.services(
      reservation_id,customer_id,pet_id,service_type_id,scheduled_entry_at,scheduled_exit_at,status,notes
    ) values(
      v_reservation.id,v_reservation.customer_id,v_pet.pet_id,v_reservation.service_type_id,
      v_reservation.start_datetime,v_reservation.end_datetime,'SCHEDULED',v_reservation.notes
    ) returning id,service_number into v_service_id,v_service_number;

    v_services := v_services || jsonb_build_array(jsonb_build_object(
      'id',v_service_id,'number',v_service_number,'petId',v_pet.pet_id
    ));

    select * into v_pet_row from public.pets where id=v_pet.pet_id;

    v_subject := 'Tu reserva en Pet Sereno quedó confirmada';
    v_body := 'Hola '||v_customer.first_name||E',\n\n'
      ||'Te contamos con calma que confirmamos la reserva '||v_reservation.reservation_number
      ||' para '||v_pet_row.name||' ('||v_service_type.name||').'
      ||E'\n\nIngreso: '||to_char(v_reservation.start_datetime,'DD/MM/YYYY HH24:MI')
      ||E'\nSalida: '||to_char(v_reservation.end_datetime,'DD/MM/YYYY HH24:MI')
      ||E'\n\nTe escribiremos de nuevo cuando comience su experiencia en el club.'
      ||E'\n\nCon cariño,\nPet Sereno — Club de Mascotas';

    insert into public.customer_notifications(
      customer_id,pet_id,service_id,channel,event,recipient,subject,body_text,status
    ) values(
      v_customer.id,v_pet_row.id,v_service_id,'EMAIL','RESERVATION_CONFIRMED',lower(v_customer.email),v_subject,v_body,'PENDING'
    )
    on conflict(service_id,event,channel) do update
    set recipient=excluded.recipient,subject=excluded.subject,body_text=excluded.body_text
    returning * into v_notification;

    v_notifications := v_notifications || jsonb_build_array(to_jsonb(v_notification));
  end loop;

  return jsonb_build_object('services',v_services,'notifications',v_notifications);
end;
$function$
