-- Enforce max 2 bookings per week per student.
-- Applied separately since 0008 was already deployed.

create or replace function book_appointment(
  p_slot_id    uuid,
  p_request_id uuid,
  p_otp_hash   text
) returns appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity    int;
  v_taken       int;
  v_user_id     uuid;
  v_weekly_bookings int;
  v_appt        appointments;
begin
  select user_id into v_user_id
  from concession_requests
  where id = p_request_id;

  select count(*) into v_weekly_bookings
  from appointments a
  join slots s on s.id = a.slot_id
  join concession_requests r on r.id = a.request_id
  where r.user_id = v_user_id
    and s.slot_start >= date_trunc('week', current_timestamp)
    and s.slot_start < date_trunc('week', current_timestamp) + interval '7 days'
    and a.status in ('booked', 'checked_in');

  if v_weekly_bookings >= 2 then
    raise exception 'weekly_limit_reached';
  end if;

  select capacity into v_capacity
  from slots where id = p_slot_id
  for update;

  if v_capacity is null then
    raise exception 'slot_not_found';
  end if;

  select count(*) into v_taken
  from appointments
  where slot_id = p_slot_id and status in ('booked', 'checked_in');

  if v_taken >= v_capacity then
    raise exception 'slot_full';
  end if;

  insert into appointments (slot_id, request_id, otp_hash)
  values (p_slot_id, p_request_id, p_otp_hash)
  returning * into v_appt;

  update concession_requests set status = 'booked' where id = p_request_id;
  return v_appt;
end;
$$;

revoke all on function book_appointment(uuid, uuid, text) from public;
grant execute on function book_appointment(uuid, uuid, text) to authenticated;
