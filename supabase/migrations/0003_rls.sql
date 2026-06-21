-- Row Level Security — SPEC §5.
-- Pattern: students touch only their own rows; admins touch all.
-- Config tables (working_hours, slot_config, holidays, concession_policies) are
-- admin-only — students see resulting slots, not the config.

-- Helper expressions repeated below:
--   me()       → users.id for the current auth user
--   am_admin() → true if current auth user has role='admin'
-- Inlined as subqueries to keep this migration self-contained (no functions).

-- ─── users ───────────────────────────────────────────────────────────────────
alter table users enable row level security;

create policy "users read self"
  on users for select
  using (auth_id = auth.uid());

create policy "users update self"
  on users for update
  using (auth_id = auth.uid());

create policy "admins manage users"
  on users for all
  using (exists (select 1 from users u
                 where u.auth_id = auth.uid() and u.role = 'admin'));

-- ─── concession_requests ─────────────────────────────────────────────────────
alter table concession_requests enable row level security;

create policy "students read own requests"
  on concession_requests for select
  using (user_id in (select id from users where auth_id = auth.uid()));

create policy "students insert own requests"
  on concession_requests for insert
  with check (user_id in (select id from users where auth_id = auth.uid()));

create policy "students update own draft requests"
  on concession_requests for update
  using (user_id in (select id from users where auth_id = auth.uid())
         and status = 'draft');

create policy "admins manage all requests"
  on concession_requests for all
  using (exists (select 1 from users u
                 where u.auth_id = auth.uid() and u.role = 'admin'));

-- ─── appointments ────────────────────────────────────────────────────────────
alter table appointments enable row level security;

create policy "students read own appointments"
  on appointments for select
  using (request_id in (
    select r.id from concession_requests r
    join users u on u.id = r.user_id
    where u.auth_id = auth.uid()
  ));

-- Inserts go through book_appointment RPC (security definer-friendly), but
-- allow self-insert as a fallback so the RPC isn't strictly required.
create policy "students insert own appointments"
  on appointments for insert
  with check (request_id in (
    select r.id from concession_requests r
    join users u on u.id = r.user_id
    where u.auth_id = auth.uid()
  ));

-- Students may cancel their own active booking (status flip only).
create policy "students cancel own appointments"
  on appointments for update
  using (request_id in (
    select r.id from concession_requests r
    join users u on u.id = r.user_id
    where u.auth_id = auth.uid()
  ));

create policy "admins manage appointments"
  on appointments for all
  using (exists (select 1 from users u
                 where u.auth_id = auth.uid() and u.role = 'admin'));

-- ─── slots ───────────────────────────────────────────────────────────────────
-- Admin-write, all-read (§5).
alter table slots enable row level security;

create policy "all read slots"
  on slots for select
  using (true);

create policy "admins manage slots"
  on slots for all
  using (exists (select 1 from users u
                 where u.auth_id = auth.uid() and u.role = 'admin'));

-- ─── concession_forms ────────────────────────────────────────────────────────
alter table concession_forms enable row level security;

create policy "students read own forms"
  on concession_forms for select
  using (request_id in (
    select r.id from concession_requests r
    join users u on u.id = r.user_id
    where u.auth_id = auth.uid()
  ));

create policy "admins manage forms"
  on concession_forms for all
  using (exists (select 1 from users u
                 where u.auth_id = auth.uid() and u.role = 'admin'));

-- ─── Config tables: admin-only ───────────────────────────────────────────────
alter table working_hours        enable row level security;
alter table slot_config          enable row level security;
alter table holidays             enable row level security;
alter table concession_policies  enable row level security;

create policy "admins manage working_hours"
  on working_hours for all
  using (exists (select 1 from users u
                 where u.auth_id = auth.uid() and u.role = 'admin'));

create policy "admins manage slot_config"
  on slot_config for all
  using (exists (select 1 from users u
                 where u.auth_id = auth.uid() and u.role = 'admin'));

create policy "admins manage holidays"
  on holidays for all
  using (exists (select 1 from users u
                 where u.auth_id = auth.uid() and u.role = 'admin'));

create policy "admins manage policies"
  on concession_policies for all
  using (exists (select 1 from users u
                 where u.auth_id = auth.uid() and u.role = 'admin'));

-- Eligibility check (§6) needs to read policies; expose read to all authed users.
create policy "all read policies"
  on concession_policies for select
  using (auth.uid() is not null);

-- ─── audit_log ───────────────────────────────────────────────────────────────
alter table audit_log enable row level security;

create policy "admins read audit"
  on audit_log for select
  using (exists (select 1 from users u
                 where u.auth_id = auth.uid() and u.role = 'admin'));
