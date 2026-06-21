-- Fix: "infinite recursion detected in policy for relation users".
--
-- The original "admins manage users" policy queried users from inside a
-- policy ON users, which re-triggers RLS and loops. Same risk for any other
-- policy that checks admin-ness by scanning users.
--
-- We replace the inline `exists (select 1 from users ...)` admin check with a
-- SECURITY DEFINER function that bypasses RLS when looking itself up. The
-- function is owned by postgres, so it reads users without re-entering the
-- policy stack.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where auth_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- ─── users: rebuild the admin policy ─────────────────────────────────────────
drop policy if exists "admins manage users" on public.users;

create policy "admins manage users"
  on public.users for all
  using (public.is_admin());

-- ─── Rebuild every other admin policy to use the helper ──────────────────────
-- (Not strictly required for breaking the recursion on users, but consistency
-- avoids future foot-guns if anyone adds a new policy on users.)

drop policy if exists "admins manage all requests" on public.concession_requests;
create policy "admins manage all requests"
  on public.concession_requests for all
  using (public.is_admin());

drop policy if exists "admins manage appointments" on public.appointments;
create policy "admins manage appointments"
  on public.appointments for all
  using (public.is_admin());

drop policy if exists "admins manage slots" on public.slots;
create policy "admins manage slots"
  on public.slots for all
  using (public.is_admin());

drop policy if exists "admins manage forms" on public.concession_forms;
create policy "admins manage forms"
  on public.concession_forms for all
  using (public.is_admin());

drop policy if exists "admins manage working_hours" on public.working_hours;
create policy "admins manage working_hours"
  on public.working_hours for all
  using (public.is_admin());

drop policy if exists "admins manage slot_config" on public.slot_config;
create policy "admins manage slot_config"
  on public.slot_config for all
  using (public.is_admin());

drop policy if exists "admins manage holidays" on public.holidays;
create policy "admins manage holidays"
  on public.holidays for all
  using (public.is_admin());

drop policy if exists "admins manage policies" on public.concession_policies;
create policy "admins manage policies"
  on public.concession_policies for all
  using (public.is_admin());

drop policy if exists "admins read audit" on public.audit_log;
create policy "admins read audit"
  on public.audit_log for select
  using (public.is_admin());
