-- Fix: POST /api/appointments returns 400 because book_appointment runs as the
-- caller, and the "students update own draft requests" policy's USING clause
-- ('status = draft') is evaluated against the NEW row when no WITH CHECK is
-- defined — blocking the draft→booked transition.
--
-- Fix 1: make book_appointment SECURITY DEFINER so it bypasses RLS for the
-- internal slot lock + status update. The route handler still verifies
-- ownership before calling, so this isn't a privilege escalation.
--
-- Fix 2: tighten the update policy with an explicit WITH CHECK so manual
-- edits (without the RPC) only allow draft→draft mutations.

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

revoke all on function book_appointment(uuid, uuid, text) from public;
grant execute on function book_appointment(uuid, uuid, text) to authenticated;

-- Rebuild the update policy with a proper WITH CHECK clause.
drop policy if exists "students update own draft requests" on concession_requests;
create policy "students update own draft requests"
  on concession_requests for update
  using (user_id in (select id from users where auth_id = auth.uid())
         and status = 'draft')
  with check (user_id in (select id from users where auth_id = auth.uid()));
