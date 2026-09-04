-- 0022 only generates a referral_code for profiles created AFTER it ran (via
-- the handle_new_user trigger) -- every pre-existing account was left with
-- referral_code = null, so their Refer & Earn page had no code/link to show.
-- Backfill using the same generator.

update public.profiles
  set referral_code = public.generate_referral_code()
  where referral_code is null;
