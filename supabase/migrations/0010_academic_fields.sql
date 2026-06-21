-- Academic fields on the user profile: department, year, division.
-- Required by the railway concession form (the paper form has dedicated
-- boxes for each) and by the college office for filing/sorting by branch.
-- Nullable so existing admin/student rows don't break; the signup wizard
-- and /api/me require them for new student writes.

alter table users
  add column if not exists department    text,
  add column if not exists academic_year text,
  add column if not exists division      text;

-- Constrain academic_year to the four standard engineering year labels.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_academic_year_check'
  ) then
    alter table users
      add constraint users_academic_year_check
      check (academic_year is null or academic_year in ('FE','SE','TE','BE'));
  end if;
end$$;
