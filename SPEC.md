# Railway Concession Platform — SPEC

A concession-form issuance and appointment system for the college admin office. It replaces the physical queue where students wait 2-3 hours to get a railway concession form filled and signed.

## 1. Scope and the one constraint that shapes everything

This platform digitizes the **college's concession-form step and the appointment queue**. It does not issue the railway pass.

- Concessional student season tickets cannot be booked online. That is a railway rule, not a design choice. The student still collects the signed concession form and buys the actual pass at the railway counter.
- Mumbai railways send the college concession-form booklets (50 pre-numbered forms each). The college assigns one form number per student and submits a report for each exhausted booklet. **The CSV/XLSX export is that report.**
- Route is always home-to-Thane. `station_to` defaults to Thane (the college station). `station_from` (home station) is the only routing field a student fills.

What the platform owns: signup, the request form, eligibility checks, appointment slots, a live slots page, OTP check-in, admin verification, form-number assignment, and export. What it does not own: the pass purchase.

## 2. Stack

- **Next.js** (App Router) on **Vercel**. Free Hobby tier covers v1. Pro ($20/mo) only becomes necessary if v2 monetization goes live, since the free tier is non-commercial.
- **Supabase**: Postgres + Auth (college-email OTP login) + Realtime (live slots page).
- **Resend** for transactional email.
- **Razorpay**: v2 only.

Supabase is chosen over plain Postgres because Realtime makes the live-slots page trivial, Auth handles college-email OTP, and Row Level Security keeps student data scoped without app-layer guards.

## 3. Data model (Postgres / Supabase)

```sql
-- Enums
create type gender_t            as enum ('male', 'female', 'other');
create type travel_class_t      as enum ('first', 'second');
create type period_t            as enum ('monthly', 'quarterly');
create type request_reason_t    as enum ('new', 'renewal', 'lost', 'route_change');
create type request_status_t    as enum ('draft', 'booked', 'verified', 'issued', 'rejected');
create type appointment_status_t as enum ('booked', 'checked_in', 'no_show', 'done', 'cancelled');
create type user_role_t         as enum ('student', 'admin');

-- Profiles, linked to Supabase auth.users
create table users (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique references auth.users(id) on delete cascade,
  role          user_role_t not null default 'student',
  name          text not null,
  dob           date,                       -- required for students (age check)
  gender        gender_t,                   -- required for students
  phone         text,
  enrollment_no text unique,                -- ENR; null for admin accounts
  college_email text unique not null,
  home_station  text,                       -- default origin; prefills station_from
  address       text,                       -- student's residential address; printed on the form
  id_verified   boolean not null default false,
  verified_by   uuid references users(id),
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- One row per form requested
create table concession_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  station_from        text not null,                 -- home station
  station_to          text not null default 'Thane', -- college station, fixed default
  travel_class        travel_class_t not null,
  period              period_t not null,
  reason              request_reason_t not null default 'new',
  previous_request_id uuid references concession_requests(id), -- renewal / reissue lineage
  status              request_status_t not null default 'draft',
  due_date            date,                          -- current pass expiry; drives v2 reminders
  created_at          timestamptz not null default now()
);

-- Allowed (class, period) pairs. Config, not hardcoded logic.
create table concession_policies (
  travel_class travel_class_t not null,
  period       period_t not null,
  allowed      boolean not null default true,
  primary key (travel_class, period)
);
-- Seed AFTER confirming the first-class rule with the admin office:
--   ('second','monthly',true), ('second','quarterly',true),
--   ('first','monthly',true),  ('first','quarterly', <confirm>)

-- Weekly working hours. Multiple rows per weekday = split shifts.
-- A LUNCH BREAK is just two windows with a gap, e.g. 09:00-13:00 and 14:00-17:00
-- (nothing is generated for 13:00-14:00). weekday: 0 = Sunday ... 6 = Saturday.
-- A weekday with no row = closed.
create table working_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    int not null check (weekday between 0 and 6),
  open_time  time not null,
  close_time time not null,
  check (close_time > open_time)
);

-- Slot generation settings. Keep a single active row.
create table slot_config (
  id               uuid primary key default gen_random_uuid(),
  slot_minutes     int not null default 60 check (slot_minutes > 0),
  default_capacity int not null default 5  check (default_capacity > 0), -- people per slot
  generate_weeks   int not null default 4  check (generate_weeks > 0),   -- horizon to materialize
  updated_by       uuid references users(id),
  updated_at       timestamptz not null default now()
);

-- Holidays / closures. A date here suppresses every slot that day.
create table holidays (
  holiday_date date primary key,
  reason       text,
  created_by   uuid references users(id),
  created_at   timestamptz not null default now()
);

-- Appointment slots, MATERIALIZED from working_hours + slot_config, minus holidays
create table slots (
  id         uuid primary key default gen_random_uuid(),
  slot_start timestamptz not null unique,        -- unique makes generation idempotent
  slot_end   timestamptz not null,
  capacity   int not null check (capacity > 0),  -- copied from default_capacity, overridable
  is_active  boolean not null default true,      -- flipped false when a holiday lands on this date
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- A student's booking into a slot
create table appointments (
  id              uuid primary key default gen_random_uuid(),
  slot_id         uuid not null references slots(id) on delete cascade,
  request_id      uuid not null references concession_requests(id) on delete cascade,
  otp_hash        text not null,            -- store only the hash, never the raw OTP
  otp_verified_at timestamptz,
  status          appointment_status_t not null default 'booked',
  created_at      timestamptz not null default now()
);
-- At most one active booking per request
create unique index one_active_appt_per_request
  on appointments (request_id)
  where status in ('booked', 'checked_in');

-- Issued forms, written only when admin issues
create table concession_forms (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null unique references concession_requests(id),
  booklet_no      text not null,
  railway_form_no text not null,            -- the pre-numbered serial from the booklet
  issued_by       uuid references users(id),
  issued_at       timestamptz not null default now(),
  unique (booklet_no, railway_form_no)
);

-- Audit trail
create table audit_log (
  id         bigserial primary key,
  actor      uuid references users(id),
  action     text not null,
  request_id uuid references concession_requests(id),
  meta       jsonb,
  created_at timestamptz not null default now()
);
```

### Why both `home_station` and `station_from`

`users.home_station` is the student's saved default. `concession_requests.station_from` is a snapshot of what was on that specific form. The first prefills the second, so a renewal auto-fills routing and the student changes nothing unless they moved. A changed `station_from` is the trigger for the re-verify path (see flows).

## 4. Atomic slot booking (the reopened-slot race)

When a last-minute cancellation frees a spot, several students may grab it at once. App-level "count then insert" double-books. The database is the referee. Book through this function, which locks the slot row so concurrent bookers serialize:

```sql
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
  for update;                       -- lock: concurrent callers wait here

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
```

Call it from the app via `supabase.rpc('book_appointment', {...})`. Handle `slot_full` by refreshing the slots list and asking the student to pick another.

## 4b. Slot generation from working hours and holidays

Slots are not created by hand. The admin sets working hours, slot length, capacity, and holidays in the settings view, and the system materializes concrete `slots` rows. Materializing (rather than computing on the fly) is required because the `book_appointment` lock needs a real row to lock. Each weekday can hold multiple windows; the gap between two windows is a lunch break and generates no slots.

Generation rule, run on demand from the settings page ("Generate slots") and by a daily Vercel Cron so the horizon stays full:

```
for each date D in [today .. today + slot_config.generate_weeks weeks]:
    if D is in holidays:            skip
    for each working_hours row W where W.weekday = weekday(D):
        for each [start, start+slot_minutes) window inside [W.open_time, W.close_time):
            upsert slots(slot_start, slot_end, capacity = slot_config.default_capacity)
            on conflict (slot_start) do nothing   -- idempotent, never duplicates
```

Editing config after generation:

- **Add a holiday for a date that already has slots:** set `is_active = false` on those slots, and fire the admin-cancel email to anyone already booked on them. Reuses the cancellation path from section 9.
- **Change hours or capacity:** regeneration only adds missing future slots and never touches past ones. Capacity changes apply to newly generated slots; existing slots keep their `capacity` unless the admin overrides a specific slot.
- The live slots page and booking only ever read `slots` where `is_active = true`, so holidays and closed days simply never appear.

### Availability editor (`/admin/settings`)

The admin configures everything above from one screen, modeled on Cal.com's availability page:

- A row per weekday with an on/off toggle. A day that is off generates nothing.
- Each open day holds one or more time windows (start, end). A plus adds a window, a trash removes one. Two windows on a day means a lunch break in the gap, e.g. 09:00-13:00 and 14:00-17:00 leaves 13:00-14:00 unbooked.
- Slot length (30/45/60 min), people per slot (`default_capacity`), and the generation horizon in weeks.
- A holidays list (date + reason) with add/remove.
- A live preview shows slots per week, student spots per week, and total spots through the horizon, recomputed as settings change. A Generate slots button runs the materialization.

Each weekday row maps to zero or more `working_hours` rows. Saving replaces that weekday's rows wholesale.

## 5. Row Level Security

Enable RLS on every table. Students touch only their own rows; admins touch all. Pattern:

```sql
alter table concession_requests enable row level security;

create policy "students read own requests"
  on concession_requests for select
  using (user_id in (select id from users where auth_id = auth.uid()));

create policy "admins manage all requests"
  on concession_requests for all
  using (exists (select 1 from users u
                 where u.auth_id = auth.uid() and u.role = 'admin'));
```

Repeat the analogous pattern for `appointments`, `concession_forms`, and `slots` (slots are admin-write, all-read). The config tables `working_hours`, `slot_config`, and `holidays` are admin-only (no student access needed; students see the resulting slots, not the config).

## 6. Eligibility

Computed from `dob` and `gender` at request creation, and enforced server-side:

- `age = extract(year from age(dob))`
- If `gender = 'male'` and `age >= 25`, reject the request.
- All female students eligible.
- The age cutoff is a constant. Confirm the exact college rule before launch (see open items).

Period-by-class eligibility is read from `concession_policies`, not hardcoded. A request whose `(travel_class, period)` pair is not `allowed` is rejected.

## 7. Flows

**First-time issue.** Signup (name, DOB, gender, phone, college email, ENR, home station) → fill request (`station_from` prefilled, `station_to` = Thane locked, class, period) → eligibility check → pick an open slot → `book_appointment` issues an OTP and emails it → at the slot the admin confirms the person matches an enrolled student (college ID against name + ENR), verifies the OTP, flips `id_verified`, marks the request `verified` → admin assigns `booklet_no` + `railway_form_no` and marks `issued` → student carries the signed form to the railway counter.

**Renewal.** Student picks a past `issued` request → system clones it (`reason = 'renewal'`, `previous_request_id` set) with routing prefilled → if `station_from` is unchanged and identity already verified, skip the deep ID check and use a short confirm slot → issue. Value here is prefill plus the v2 reminder before `due_date`.

**Lost pass.** Same as first-time issue (`reason = 'lost'`), because the railway issues no duplicate for a lost season ticket. Prefill from the last record to keep it fast, but it is a full new form. Do not build a "duplicate" path.

**Route or address change.** Fresh issue (`reason = 'route_change'`). Detected automatically when `station_from` differs from the previous form's `station_from`. This forces the re-verify path at the appointment. The old pass is surrendered at the counter, outside this system.

**Slot booking and the queue fix.** Admin defines slots with a capacity (for example 5 per hour). Students book open slots. The physical line disappears because everyone arrives at a known time with a pre-filled, pre-validated request and an OTP.

## 8. Live available-slots page

A page listing upcoming slots with `capacity`, active booking count, and `spots_left`. A cancellation (student or admin) frees a spot and the slot reappears as open.

- **Preferred:** subscribe to the `appointments` table via Supabase Realtime. On insert or status change to `cancelled`, recompute `spots_left` and update the UI live.
- **Fallback:** poll `GET /api/slots` every 15-20s. Acceptable at college concurrency if Realtime is skipped.

`spots_left` query:

```sql
select s.id, s.slot_start, s.slot_end, s.capacity,
       s.capacity - count(a.*) filter (
         where a.status in ('booked','checked_in')
       ) as spots_left
from slots s
left join appointments a on a.slot_id = s.id
where s.slot_start > now() and s.is_active
group by s.id
having s.capacity - count(a.*) filter (
         where a.status in ('booked','checked_in')
       ) > 0
order by s.slot_start;
```

## 8b. Booking page UX (Cal.com-style)

`/book` mirrors Cal.com's booking screen: a month date-picker on the left, the selected date's times on the right.

- The calendar disables any date that is in the past, falls on a closed weekday, or is a holiday. Available dates are clickable; the selected date is highlighted.
- Picking a date lists that day's start times, sliced from the day's windows at `slot_minutes`. The lunch gap has no slots, so it simply isn't shown.
- Unlike Cal.com, a slot holds more than one person, so each time shows seats left (`spots_left`). A time at 0 left is disabled as full.
- Picking a time and confirming calls `book_appointment`, which issues the OTP and triggers the booking email.
- The live `/slots` board reuses the same time-slot component. A cancellation that frees a seat bumps that time's seats-left back up in realtime (section 8).

## 9. Emails (v1, transactional, via Resend)

| Event | Trigger | Contents |
|---|---|---|
| Appointment booked | student books a slot | slot date/time, OTP for check-in, cancel link |
| Appointment cancelled by admin | admin cancels | cancellation notice, one-tap rebook link to `/slots` |
| Appointment cancelled by student | student self-cancels (optional) | short confirmation; also reopens the slot on the live page |

Reminders before `due_date` are v2 (see roadmap), not here.

## 10. Export

- Formats: CSV and XLSX. Use `exceljs` for XLSX, a CSV writer for CSV. Stream server-side.
- Column picker on the admin side maps to a **whitelist** of allowed columns. Never interpolate user-supplied column names into SQL.
- Filters: date range, station, status.
- **Railway-report preset:** a one-click export matching the booklet report (every issued `railway_form_no` + student details for a given `booklet_no`). This is the report the office actually submits, so make it a first-class button, not a manual column build.

## 11. API surface

Student:
```
POST   /api/requests                 create a concession request
GET    /api/requests                 my requests + statuses + due dates
POST   /api/requests/:id/renew       clone into a renewal
GET    /api/slots                    open slots (also used by live page)
POST   /api/appointments             book a slot  (calls book_appointment RPC)
DELETE /api/appointments/:id         student self-cancel (reopens slot)
```
Admin:
```
GET    /api/admin/requests           list + filter
POST   /api/admin/requests/:id/verify  flip id_verified, status -> verified
POST   /api/admin/requests/:id/issue   assign booklet_no + railway_form_no, status -> issued
POST   /api/admin/requests/:id/reject
POST   /api/admin/slots              create/override a single slot
GET    /api/admin/schedule           current working_hours + slot_config + holidays
PUT    /api/admin/schedule           save working hours + slot config (people per slot, slot length)
POST   /api/admin/holidays           add a holiday (suppresses + cancels affected slots)
DELETE /api/admin/holidays/:date     remove a holiday
POST   /api/admin/slots/generate     materialize slots for the configured horizon
DELETE /api/admin/appointments/:id   admin cancel (sends email)
GET    /api/admin/export             format, columns, from, to, status
GET    /api/admin/export/railway-report  booklet_no
```

## 12. Pages

```
/            landing + college-email OTP login
/book        Cal.com-style booking: month date-picker beside a time-slot list (station_to locked to Thane)
/slots       live available slots
/me          my requests, statuses, due dates
/admin       dashboard (queue, filters)
/admin/settings Cal.com-style availability editor: per-day windows (+ lunch breaks), slot length, capacity per slot, holidays, generate
/admin/today check-in view (verify OTP, verify, issue form number)
/admin/export export builder + railway-report preset
```

## 13. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server-only: admin exports, elevated RPC
RESEND_API_KEY
RESEND_FROM_EMAIL
APP_URL                          # for links in emails

# v2 only:
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
```

## 14. v1 definition of done

1. College-email OTP login (Supabase Auth).
2. Request form with eligibility gate and Thane-locked destination.
3. Admin scheduling settings (working hours, slot length, capacity per slot, holidays) + slot generation.
4. Booking via the atomic RPC.
5. Live slots page reflecting cancellations and holidays.
6. OTP check-in, admin verify, form-number assignment.
7. Booking and admin-cancel emails.
8. CSV/XLSX export with column picker + railway-report preset.

Renewal prefill and due-date tracking should work in v1 (the data is there); paid reminders wait for v2.

## 15. v2 roadmap

- **Paid expiry-reminder tier via Razorpay.** Add a `subscriptions` table keyed to `users`. A Vercel Cron job runs daily, finds requests whose `due_date` is within the reminder window for subscribed users, and sends a reminder email. Gate the reminder behind an active subscription. This monetizes convenience, not queue access, which keeps it defensible on a college system.

## 16. Open items to confirm before build

1. **First-class period rule.** You stated first class renews monthly while second class allows monthly or quarterly. The railway itself issues both monthly and quarterly student passes and prices first class at 4x second class, with no monthly-only restriction found. This is likely a college policy. Confirm it, then seed `concession_policies` accordingly.
2. **Residence address.** Captured at signup in `users.address` and available for the printed form. Confirm the format your college's form expects (single line vs structured fields).
3. **Eligibility cutoff for male students.** Confirm the exact age (commonly under 25) and whether any other category applies.
4. **Destination.** Confirm Thane is the only college station and whether any program runs to a different station (if so, keep `station_to` admin-editable for those cases).