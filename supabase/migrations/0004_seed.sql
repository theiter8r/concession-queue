-- Seed — SPEC §3 ("Seed AFTER confirming the first-class rule with the admin office").
-- Open item §16.1: confirm whether first-class allows quarterly. Default below
-- mirrors the spec's draft: second allows both; first is monthly-only.
-- Flip 'first','quarterly' to allowed=true once the admin office confirms.

insert into concession_policies (travel_class, period, allowed) values
  ('second', 'monthly',   true),
  ('second', 'quarterly', true),
  ('first',  'monthly',   true),
  ('first',  'quarterly', false)
on conflict (travel_class, period) do nothing;

-- Default slot_config (admin can edit in /admin/settings).
insert into slot_config (slot_minutes, default_capacity, generate_weeks)
select 60, 5, 4
where not exists (select 1 from slot_config);

-- ─── First-admin bootstrap ──────────────────────────────────────────────────
-- Promote a user by email. Run once, manually, after the first college-office
-- account signs in via OTP and completes /signup:
--
--   update users set role = 'admin' where college_email = 'admin@college.edu';
--
-- Or supply a comma-separated env list at deploy time and run:
--   select promote_admins('admin1@college.edu,admin2@college.edu');

create or replace function promote_admins(p_csv text) returns int
language plpgsql
as $$
declare
  v_emails text[];
  v_count  int;
begin
  v_emails := string_to_array(p_csv, ',');
  update users
    set role = 'admin'
    where college_email = any (v_emails)
      and role <> 'admin';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
