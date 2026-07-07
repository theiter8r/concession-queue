-- Booklet registry: each row is one physical booklet from the railway.
-- Booklets contain pre-numbered forms (usually 50). This lets admins
-- track which booklets exist, how many forms have been issued from each,
-- and download the report per booklet.

create table booklets (
  id          uuid primary key default gen_random_uuid(),
  booklet_no  text not null unique,
  total_forms int not null default 50 check (total_forms > 0),
  notes       text,
  created_at  timestamptz not null default now(),
  created_by  uuid references users(id)
);

-- Only authenticated admins can manage booklets.
alter table booklets enable row level security;

create policy "admins can manage booklets"
  on booklets for all
  using (auth.uid() in (select auth_id from users where role = 'admin'))
  with check (auth.uid() in (select auth_id from users where role = 'admin'));
