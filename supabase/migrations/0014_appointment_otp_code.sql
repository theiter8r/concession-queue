-- Keep the plain counter OTP alongside its hash so the student can see it on
-- their dashboard (/me) as well as in the booking email. Students can already
-- read only their own appointments via RLS; the verify flow still checks
-- otp_hash. Written by the booking API with the service role.

alter table appointments add column if not exists otp_code text;
