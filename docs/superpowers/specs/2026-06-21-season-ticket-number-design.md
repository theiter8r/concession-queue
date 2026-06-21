# Season Ticket Number — Capture, Reminder & Pass Display

**Date:** 2026-06-21
**Status:** Approved design, pending spec review

## Problem

A student takes their issued concession **form** to the railway counter and buys
the actual season pass; the railway assigns a **season ticket number**. The
college's paper register records this number (see the "Season Ticket No" column
on the K C College Western/Central Railway Concession form statement), but the
app never captures it. Students lose the number, and admins cannot export it.

We need to:
1. Capture the season ticket number **from the student**.
2. Remind students who haven't entered it.
3. Display the student's current pass in a physical-ticket style, with an
   expiry / "renew now" state.
4. Include the number in admin exports.

## Data model

New migration (`supabase/migrations/0009_season_ticket.sql`) adds three nullable
columns to `concession_requests`:

| Column | Type | Purpose |
| --- | --- | --- |
| `season_ticket_no` | `text` | The railway pass number, entered by the student. |
| `season_ticket_recorded_at` | `timestamptz` | When the student entered it. Powers the "once per month" booking-prompt throttle. |
| `season_ticket_reminder_sent_at` | `timestamptz` | Dedup flag for the single 24h reminder email. |

`due_date` (existing) is the pass expiry and drives the pass-card expiry display.

### `due_date` auto-compute at issuance

For the pass card's expiry and "renew now" states to be meaningful, `due_date`
must be populated. Today it is only set if the request-creation client happens
to pass it. Change `POST /api/admin/requests/[id]/issue`:

- When a form is issued, if the request's `due_date` is null, set
  `due_date = issued_at + period` where `monthly → +1 month`,
  `quarterly → +3 months`.
- Do not overwrite an existing `due_date`.

## Capture point A — at booking (`/book`)

Before booking, prompt the student for their **current** season ticket number,
but only when both are true:
1. The student has **not recorded any season ticket number in the current
   calendar month** (no `concession_requests` row owned by them with
   `season_ticket_recorded_at` in the current month).
2. They have a **prior issued request** (`status = 'issued'`) whose
   `season_ticket_no` is null.

The prompt is **skippable** ("I'll add it later"). If filled, the number is
saved to that prior issued request via the write endpoint below. The monthly
check prevents nagging on every booking.

## Capture point B — 24h reminder email (single, via cron)

Extend the existing daily Vercel cron. Add a new handler
`/api/cron/season-ticket-reminders` (registered in `vercel.json`) that:

- Finds issued requests where:
  - the linked `concession_forms.issued_at` is between **24h and 48h ago**
    (the 24h window the daily cron can catch),
  - `season_ticket_no` is null, and
  - `season_ticket_reminder_sent_at` is null.
- Sends **one** reminder email per request, then sets
  `season_ticket_reminder_sent_at = now()` so it never repeats.

New `sendSeasonTicketReminder({ to, name, route, meUrl })` in `src/lib/email.ts`,
matching the existing Resend → Gmail-pool `deliver()` pattern. The email links
to `/me` where the student enters the number.

Auth follows the existing cron pattern (`x-vercel-cron` header or
`Bearer ${CRON_SECRET}`). Uses `supabaseAdmin()`.

## The pass UI (`/me`, ticket-styled)

Render the student's **latest issued request** as a card styled like a physical
railway season ticket. Contents:

- Student name
- Route: `home_station → Thane`
- Class (First/Second) and period (Monthly/Quarterly)
- Season ticket number — or, if null, an inline **"Add season ticket number"**
  input that POSTs to the write endpoint.
- "Valid until {due_date}"

States:
- **Active** (`now <= due_date`): normal ticket styling.
- **Expired** (`now > due_date`): expired visual treatment plus a
  **"Pass expired — Renew now"** CTA that triggers the existing renew flow
  (`POST /api/requests/[id]/renew` → `/book`).
- **Missing number**: show the inline input regardless of expiry.

The existing request list below the card is unchanged.

## Write path

New `POST /api/requests/[id]/season-ticket`:

- `requireUser()`, read the request, verify `user_id === me.id` (404/403 otherwise).
- Verify `status === 'issued'` (reject otherwise).
- Update **only** `season_ticket_no` and `season_ticket_recorded_at` via
  `supabaseAdmin()`.

Rationale: the student RLS update policy on `concession_requests` only permits
updates while `status = 'draft'` (`0003_rls.sql:38`). Rather than loosen RLS
(which cannot restrict *which* columns a student edits), the write goes through
a server endpoint that uses the admin client with an explicit ownership check
and a hardcoded two-column update.

## Export

- Add `season_ticket_no: (r: any) => r.season_ticket_no` to `COLUMN_WHITELIST`
  in `src/lib/export-columns.ts`.
- Add `'season_ticket_no'` to the column list in
  `src/app/admin/export/page.tsx`.

## Out of scope (YAGNI)

- Multiple/repeated reminders (decision: single reminder only).
- Admin-side entry of the number (decision: student self-service).
- Storing the number on `concession_forms` (decision: on `concession_requests`).
- Paid expiry-reminder tier (SPEC roadmap v2).

## Files touched

| File | Change |
| --- | --- |
| `supabase/migrations/0009_season_ticket.sql` | New: 3 columns on `concession_requests`. |
| `src/app/api/admin/requests/[id]/issue/route.ts` | Auto-compute `due_date` at issuance. |
| `src/app/api/requests/[id]/season-ticket/route.ts` | New: scoped student write endpoint. |
| `src/app/api/cron/season-ticket-reminders/route.ts` | New: 24h reminder cron. |
| `vercel.json` | Register the new cron. |
| `src/lib/email.ts` | New `sendSeasonTicketReminder()`. |
| `src/app/me/page.tsx` | Ticket-style pass card + inline number input + expired/renew state. |
| `src/app/book/page.tsx` | Booking-time capture prompt. |
| `src/lib/export-columns.ts` | Whitelist `season_ticket_no`. |
| `src/app/admin/export/page.tsx` | Add column to the export UI. |
