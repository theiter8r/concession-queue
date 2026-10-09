-- Pinned home location from the Google Maps address picker.
-- address stays the full printable line (it goes on the railway form);
-- these columns hold the map pin plus the coarse locality ("Thane", "Dombivli")
-- that the admin desk sees once a student is past their first visit.
-- Nullable: students who typed their address before this existed keep working.

alter table users
  add column if not exists address_lat      double precision,
  add column if not exists address_lng      double precision,
  add column if not exists address_locality text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_address_coords_check'
  ) then
    alter table users
      add constraint users_address_coords_check
      check (
        (address_lat is null and address_lng is null)
        or (address_lat between -90 and 90 and address_lng between -180 and 180)
      );
  end if;
end$$;
