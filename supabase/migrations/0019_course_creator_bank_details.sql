-- =========================================================================
-- COURSE CREATOR BANK DETAILS
-- =========================================================================
-- Course creators (buyer-source course authors) aren't necessarily
-- registered farmers, so they have no route to the farmer bank-details
-- flow (which lives on the farmers table). These columns give any profile
-- a place to store payout bank details, independent of farmer status.
-- Not added to the profiles_protect_privileged_columns lockout in 0001 --
-- a user is meant to self-edit these, same as name/phone/address already.

alter table public.profiles add column bank_name text;
alter table public.profiles add column account_holder_name text;
alter table public.profiles add column account_number text;
