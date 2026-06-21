-- Railway Concession Platform — schema
-- Reference: SPEC.md §3 (data model) and §4 (atomic slot booking RPC).

-- ─── Enums ────────────────────────────────────────────────────────────────────
create type gender_t             as enum ('male', 'female', 'other');
create type travel_class_t       as enum ('first', 'second');
create type period_t             as enum ('monthly', 'quarterly');
create type request_reason_t     as enum ('new', 'renewal', 'lost', 'route_change');
create type request_status_t     as enum ('draft', 'booked', 'verified', 'issued', 'rejected');
create type appointment_status_t as enum ('booked', 'checked_in', 'no_show', 'done', 'cancelled');
create type user_role_t          as enum ('student', 'admin');

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- Linked to Supabase auth.users. Students fill dob/gender/enrollment_no;
-- admin accounts may leave enrollment_no null.
create table users (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique references auth.users(id) on delete cascade,
  role          user_role_t not null default 'student',
  name          text not null,
  dob           date,
  gender        gender_t,
  phone         text,
  enrollment_no text unique,
  college_email text unique not null,
  home_station  text,
  address       text,
  id_verified   boolean not null default false,
  verified_by   uuid references users(id),
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- ─── Concession requests ─────────────────────────────────────────────────────
-- One row per form requested. station_to defaults to Thane (§1).
create table concession_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  station_from        text not null,
  station_to          text not null default 'Thane',
  travel_class        travel_class_t not null,
  period              period_t not null,
  reason              request_reason_t not null default 'new',
  previous_request_id uuid references concession_requests(id),
  status              request_status_t not null default 'draft',
  due_date            date,
  created_at          timestamptz not null default now()
);

-- ─── Eligibility policy ──────────────────────────────────────────────────────
-- Allowed (class, period) pairs. Config-driven so the first-class rule
-- (open item §16.1) is changeable without code edits.
create table concession_policies (
  travel_class travel_class_t not null,
  period       period_t not null,
  allowed      boolean not null default true,
  primary key (travel_class, period)
);

-- ─── Scheduling config ───────────────────────────────────────────────────────
-- Multiple rows per weekday = split shifts (lunch break = the gap between rows).
-- weekday: 0=Sun..6=Sat. A weekday with no row = closed.
create table working_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    int not null check (weekday between 0 and 6),
  open_time  time not null,
  close_time time not null,
  check (close_time > open_time)
);

-- Single-active-row config table.
create table slot_config (
  id               uuid primary key default gen_random_uuid(),
  slot_minutes     int not null default 60 check (slot_minutes > 0),
  default_capacity int not null default 5  check (default_capacity > 0),
  generate_weeks   int not null default 4  check (generate_weeks > 0),
  updated_by       uuid references users(id),
  updated_at       timestamptz not null default now()
);

-- A date listed here suppresses every slot that day.
create table holidays (
  holiday_date date primary key,
  reason       text,
  created_by   uuid references users(id),
  created_at   timestamptz not null default now()
);

-- ─── Materialized appointment slots ──────────────────────────────────────────
-- Generated from working_hours + slot_config, minus holidays.
-- A real row is required so book_appointment can SELECT…FOR UPDATE on it (§4).
create table slots (
  id         uuid primary key default gen_random_uuid(),
  slot_start timestamptz not null unique,
  slot_end   timestamptz not null,
  capacity   int not null check (capacity > 0),
  is_active  boolean not null default true,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- ─── Appointments ────────────────────────────────────────────────────────────
create table appointments (
  id              uuid primary key default gen_random_uuid(),
  slot_id         uuid not null references slots(id) on delete cascade,
  request_id      uuid not null references concession_requests(id) on delete cascade,
  otp_hash        text not null,
  otp_verified_at timestamptz,
  status          appointment_status_t not null default 'booked',
  created_at      timestamptz not null default now()
);

-- At most one active booking per request.
create unique index one_active_appt_per_request
  on appointments (request_id)
  where status in ('booked', 'checked_in');

-- ─── Issued forms ────────────────────────────────────────────────────────────
create table concession_forms (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null unique references concession_requests(id),
  booklet_no      text not null,
  railway_form_no text not null,
  issued_by       uuid references users(id),
  issued_at       timestamptz not null default now(),
  unique (booklet_no, railway_form_no)
);

-- ─── Audit ───────────────────────────────────────────────────────────────────
create table audit_log (
  id         bigserial primary key,
  actor      uuid references users(id),
  action     text not null,
  request_id uuid references concession_requests(id),
  meta       jsonb,
  created_at timestamptz not null default now()
);
