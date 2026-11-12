-- Run this AFTER you have signed up on the Pitchfork website with your own email.
-- Replace the address below with the one you signed up with, then Run.
update public.profiles set role = 'admin' where email = 'you@example.com';
select email, role from public.profiles where role = 'admin';
