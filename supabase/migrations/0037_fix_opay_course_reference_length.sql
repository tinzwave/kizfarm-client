-- create-opay-course-payment built its OPay reference as
-- "KFM-CRS_<courseId>_<userId>_<ms>", embedding two raw UUIDs so the
-- opay-webhook fallback branch could decode courseId/userId back out of it
-- (courses have no pre-staged reference column the way orders do). That
-- comes out to ~95 characters -- OPay rejects any reference over 50, so
-- create-opay-course-payment's very first call to OPay's create-checkout
-- API failed for every course purchase with "reference length is
-- invalid[1-50]", the same bug just fixed for order/transport-fare
-- payments (which also embedded a raw order UUID).
--
-- Order payments didn't need this table because orders already have their
-- own payment_reference column staged in advance (set_order_payment_reference).
-- Courses get the equivalent here: a short opaque reference is generated,
-- staged against courseId/userId before ever contacting OPay, and the
-- webhook looks it up instead of parsing the string.

create table public.course_payment_intents (
  reference text primary key,
  user_id uuid not null references public.profiles(id),
  course_id uuid not null references public.courses(id),
  created_at timestamptz not null default now()
);

alter table public.course_payment_intents enable row level security;

create policy course_payment_intents_select on public.course_payment_intents
  for select using (user_id = auth.uid() or public.is_admin());

-- Mirrors set_order_payment_reference (0008): stages the reference under
-- the caller's own auth.uid(), before create-opay-course-payment ever
-- talks to OPay.
create or replace function public.stage_course_payment_intent(p_reference text, p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.course_payment_intents (reference, user_id, course_id)
  values (p_reference, auth.uid(), p_course_id);
end;
$$;

grant execute on function public.stage_course_payment_intent(text, uuid) to authenticated;
