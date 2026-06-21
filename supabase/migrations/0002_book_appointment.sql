-- Atomic slot booking — SPEC §4.
-- SELECT…FOR UPDATE on the slot row serializes concurrent bookers so the
-- "reopened slot" race (a freed seat grabbed by N students at once) cannot
-- double-book. App layer calls supabase.rpc('book_appointment', {...}) and
-- handles the 'slot_full' exception by refreshing the slots list.

create or replace function book_appointment(
  p_slot_id    uuid,
  p_request_id uuid,
  p_otp_hash   text
) returns appointments
language plpgsql
as $$
declare
  v_capacity int;
  v_taken    int;
  v_appt     appointments;
begin
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
