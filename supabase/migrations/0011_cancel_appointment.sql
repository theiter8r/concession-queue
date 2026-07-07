-- Student self-cancel mirrors book_appointment: the app needs to flip the
-- appointment status and move the request back to draft, which crosses RLS
-- policy boundaries. Keep ownership enforcement inside the database.

create or replace function public.cancel_appointment(
  p_appointment_id uuid
) returns table (
  appointment_id uuid,
  request_id uuid,
  slot_start timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_request_id uuid;
  v_slot_start timestamptz;
begin
  select u.id into v_user_id
  from public.users u
  where u.auth_id = auth.uid();

  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  select a.request_id, s.slot_start
    into v_request_id, v_slot_start
  from public.appointments a
  join public.concession_requests r on r.id = a.request_id
  join public.slots s on s.id = a.slot_id
  where a.id = p_appointment_id
    and r.user_id = v_user_id
    and a.status in ('booked', 'checked_in')
  for update of a;

  if v_request_id is null then
    return;
  end if;

  update public.appointments
  set status = 'cancelled'
  where id = p_appointment_id;

  update public.concession_requests
  set status = 'draft'
  where id = v_request_id
    and status in ('booked', 'verified');

  appointment_id := p_appointment_id;
  request_id := v_request_id;
  slot_start := v_slot_start;
  return next;
end;
$$;

revoke all on function public.cancel_appointment(uuid) from public;
grant execute on function public.cancel_appointment(uuid) to authenticated;
