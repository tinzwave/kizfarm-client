-- 0032's `revoke select (content) on courses from anon, authenticated` had no
-- effect: verified live against the anon key that content was still
-- returned. Table SELECT in this project is granted to the PUBLIC
-- pseudo-role (every role, including anon/authenticated, implicitly has
-- whatever PUBLIC has), so revoking from two named roles alone doesn't
-- remove access inherited through PUBLIC. Revoke the whole row from PUBLIC
-- too, then re-grant column-level select on everything except `content`
-- to just the two roles that actually need it.
revoke select on public.courses from public, anon, authenticated;
grant select (
  id, title, description, price, commission, final_price, tutor_id, creator_id,
  source, audience, status, rejection_reason, reviewed_by, reviewed_at,
  is_published, cover_image, created_at, updated_at
) on public.courses to anon, authenticated;
