-- Structured door details from the map picker. The map gets the building or
-- street; the student adds the flat number by hand. address stays the single
-- printable line (built from these by /api/me) so the railway form and
-- exports are unchanged; the parts exist so Edit profile can rebuild the form.

alter table users
  add column if not exists address_flat     text,
  add column if not exists address_building text,
  add column if not exists address_landmark text,
  add column if not exists address_map_line text;
