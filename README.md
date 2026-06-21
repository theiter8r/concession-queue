<div align="center">

<!-- Header Banner -->
<img src="https://capsule-render.vercel.app/api?type=venom&height=300&color=gradient&text=Railway%20Concession&fontSize=52&fontColor=e6edf3&fontAlignY=35&desc=Slot-Based%20Form%20Issuance%20%C2%B7%20Next.js%20%C2%B7%20Supabase%20%C2%B7%20Built%20for%20Mobile&descSize=15&descAlignY=55&reversal=false&animation=fadeIn" width="100%"/>

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-15%20App%20Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%C2%B7%20Auth%20%C2%B7%20RLS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Made by](https://img.shields.io/badge/Made%20by-%40theiter8r-FF6B35?style=for-the-badge&logo=github&logoColor=white)](https://github.com/theiter8r)

<br/>

```
Your home → Thane concession form. Signed, printed, done — in one visit.
```

</div>

---

<br/>

## `$ whatis concession`

A college-internal platform that digitizes the railway concession form pipeline at **K.C. College of Engineering, Mumbai**. Replaces the queue-outside-the-office workflow with a live slot calendar, OTP-gated college-email sign-in, and pre-filled forms ready for the registrar to sign.

Designed mobile-first because that's where students actually are — phone, between lectures, picking the next free slot in ten seconds.

Built with **Next.js 15 (App Router)**, **Supabase** (Postgres + Auth + Realtime + RLS), and a tiny custom design system. No framework UI kit; every primitive is hand-rolled in TypeScript to match a single dark/light token palette inspired by cal.com.

<br/>

## `📦` Feature Surface

<table>
<tr>
<td width="50%">

### 🔐 Email-Domain OTP Auth
> `Supabase Auth` `Custom SMTP` `Nodemailer`

Sign in with a 6-digit code sent to a verified `@kccemsr.edu.in` address. The domain is enforced at **three layers** — Postgres `CHECK`, API route, and client.

**Highlights:**
- Custom SMTP via Gmail App Password to override Supabase's locked default template
- OTP body uses `{{ .Token }}` (not magic link) for in-person code entry
- `otp_hash` column stores **SHA-256 only** — raw token never persisted
- Middleware redirects unauth → landing, no-profile → `/signup`

</td>
<td width="50%">

### 🗓️ Live Slot Calendar
> `Postgres Functions` `RLS` `Realtime`

A two-pane calendar/slot view (`/book`, `/slots`) showing every open slot at the registrar's office. Bookings are atomic — a `SECURITY DEFINER` RPC flips the request from `draft → booked` and decrements slot capacity in one transaction.

**Highlights:**
- `book_appointment(...)` RPC bypasses RLS on the trusted status flip
- Distinguishes `slot_full (409)`, `slot_not_found (404)`, `one_active_per_request (23505)`
- Auto-selects the first day with availability so mobile users skip a tap
- `@starting-style` calendar entrance, sub-300ms easings (Emil-style)

</td>
</tr>
<tr>
<td width="50%">

### 🧭 Multi-Step Signup Wizard
> `Mobile-First UX` `Per-Step Validation`

Onboarding is split into **5 directional steps** — name → basics → student ID → home station → review. Continue is gated by per-step validity, Enter advances, Back rewinds, and a progress bar tracks the journey.

**Highlights:**
- Direction-aware slide animation (forward / back from opposite sides)
- Themed `DatePicker` and station typeahead (no native iOS picker breaking the dark theme)
- Searchable combobox over **~127 Mumbai Suburban stations** with startsWith-ranked results, keyboard nav, highlighted match
- One field per screen — designed for thumbs on a 6.1" display

</td>
<td width="50%">

### 🛡️ Row-Level Security That Doesn't Recurse
> `Postgres RLS` `SECURITY DEFINER` `Policy Design`

Every table — `users`, `concession_requests`, `appointments`, `slots`, `concession_forms`, `audit_log` — is locked down with RLS. Admin checks route through a `public.is_admin()` helper to avoid the **infinite-recursion-in-policy** trap.

**Highlights:**
- `is_admin()` is `SECURITY DEFINER` + `STABLE` — bypasses RLS on the self-referencing lookup
- Self-insert on `users` locked to `role='student'` (no privilege escalation via signup)
- Explicit `WITH CHECK` on every `UPDATE` policy (Postgres' USING-vs-WITH-CHECK gotcha)
- Admin export whitelists columns — **never** interpolates user-supplied names into SQL

</td>
</tr>
</table>

<br/>

## `🛠` Tech Stack

<div align="center">

| Domain | Technologies |
|:---|:---|
| **Framework** | Next.js 15 (App Router) · React 19 · TypeScript (strict) |
| **Backend** | Supabase Postgres · Row-Level Security · `SECURITY DEFINER` RPCs · Realtime |
| **Auth** | Supabase Auth · Email OTP · Custom SMTP (Gmail App Password + Nodemailer) |
| **UI** | Hand-rolled primitives · `@starting-style` animations · Emil Kowalski easings |
| **Mobile** | Mobile-first CSS at 560 / 720 / 760 / 860px · 40px tap targets · `100dvh` |
| **Infra** | Vercel · Supabase migrations (versioned SQL) · Service-role key server-only |

</div>

<br/>

## `🚉` Architecture at a Glance

```
┌─────────────────┐    OTP    ┌────────────────────┐
│  /  landing     │ ────────► │  /login            │
│  parallax + T&C │           │  Supabase Auth     │
└─────────────────┘           └──────────┬─────────┘
                                         │ session cookie
                                         ▼
                              ┌─────────────────────┐
                              │  middleware.ts      │
                              │  role + profile     │
                              │  routing gate       │
                              └────┬──────────┬─────┘
                                   │          │
                       student ────┘          └──── admin
                            │                          │
                            ▼                          ▼
                ┌────────────────────┐     ┌────────────────────┐
                │  /book   /slots    │     │  /admin            │
                │  /me     /profile  │     │  settings · export │
                └─────────┬──────────┘     └────────────────────┘
                          │
                          │ book_appointment(uuid, uuid, text)
                          ▼
                ┌─────────────────────────────────────┐
                │  Postgres                           │
                │  • RLS on every table               │
                │  • is_admin() SECURITY DEFINER      │
                │  • atomic slot decrement            │
                │  • audit_log on every state change  │
                └─────────────────────────────────────┘
```

<br/>

## `🚀` Local Development

```bash
git clone https://github.com/theiter8r/consession.git
cd consession
npm install

# Fill these from your Supabase project + Gmail App Password
cp .env.example .env.local

# Apply migrations in order
supabase db push   # or run files in supabase/migrations/ manually

npm run dev
```

Open [`http://localhost:3000`](http://localhost:3000). Sign in with any `@kccemsr.edu.in` address — the OTP arrives via your configured SMTP.

<br/>

## `📁` Project Layout

```
src/
├── app/
│   ├── page.tsx              # cal.com-style landing (parallax + T&C gate)
│   ├── login/                # OTP entry
│   ├── signup/               # 5-step wizard
│   ├── book/  slots/  me/    # student flow
│   ├── profile/              # change home station
│   ├── admin/                # settings · export · audit
│   └── api/                  # me · requests · appointments · slots · export
├── components/
│   ├── ui.tsx                # Button · Card · Input · Page · Badge
│   ├── date-picker.tsx       # themed, replaces native input[type=date]
│   ├── station-select.tsx    # ~127 stations, startsWith-ranked typeahead
│   └── site-footer.tsx       # global footer with auth-aware sign in/out
├── lib/
│   ├── stations.ts           # Mumbai Suburban Railway, deduped + sorted
│   ├── email-domain.ts       # @kccemsr.edu.in enforcement
│   └── supabase/             # browser + server clients
└── middleware.ts             # route guards + profile-completion gate

supabase/migrations/
├── 0001_init.sql             # tables, enums, base policies
├── 0007_fix_users_recursion.sql   # is_admin() helper, rebuilt policies
└── 0008_book_security_definer.sql # atomic booking RPC
```

<br/>

## `🎯` Highlights

- **Mobile-first** — every grid collapses to a single column under 560px; touch targets stay ≥ 40px
- **Zero UI dependencies** — no Tailwind, no shadcn, no Radix; every primitive hand-written
- **RLS-first security** — every table policy reviewed; no client trusts the server, no server trusts the client
- **Themed, not native** — dark theme survives because `DatePicker` and `StationSelect` are custom
- **Sub-300ms everywhere** — page enter, slot reveals, signup transitions, popover entries

<br/>

<div align="center">

```
made by raajpatkar — github.com/theiter8r
```

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,50:161b22,100:1f6feb&height=100&section=footer" width="100%"/>

</div>
