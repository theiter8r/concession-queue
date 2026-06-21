-- Allow a freshly-OTP'd user to create their own profile row.
-- Forces role='student' on self-insert so users can't self-promote to admin.
-- (Admin promotion happens via promote_admins() — see 0004_seed.sql.)

create policy "users insert self as student"
  on users for insert
  with check (
    auth_id = auth.uid()
    and role = 'student'
  );
