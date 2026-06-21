-- Restrict college_email to the @kccemsr.edu.in domain.
-- DB-level guarantee so a misbehaving client or a missed API check can't slip
-- a foreign email into the users table.

alter table users
  add constraint users_college_email_domain
  check (college_email ~* '^[^@\s]+@kccemsr\.edu\.in$');
