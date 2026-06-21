-- Season ticket number capture (2026-06-21 design).
-- After a student gets their form issued, they go to the railway counter to
-- buy the actual pass — the railway assigns a "season ticket number" that the
-- college's paper register records. The app never captured it before.

alter table concession_requests
  add column if not exists season_ticket_no text,
  add column if not exists season_ticket_recorded_at timestamptz,
  add column if not exists season_ticket_reminder_sent_at timestamptz;

-- Lookup that powers the cron + booking-prompt throttle.
create index if not exists concession_requests_season_ticket_pending_idx
  on concession_requests (status)
  where status = 'issued' and season_ticket_no is null;
