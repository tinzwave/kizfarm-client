-- Admin-initiated outbound email (bulk to all farmers/buyers, or a single
-- recipient). Everything here is admin-only, read-only for `authenticated`
-- via RLS -- all writes (campaign + per-recipient rows) happen from the
-- admin-send-email Edge Function's service-role client, same as every
-- other privileged write path in this project. Mirrors the
-- released_funds_ledger audit-trail pattern already used elsewhere.

create table public.admin_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  audience_type text not null check (audience_type in ('single', 'all_farmers', 'all_buyers', 'custom_list')),
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'sent' check (status in ('sent', 'partial', 'failed')),
  sent_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.admin_email_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.admin_email_campaigns(id) on delete cascade,
  email text not null,
  -- Resend's batch endpoint doesn't reliably attribute a failure to one
  -- address within a <=100-recipient chunk, so every email in a failed
  -- chunk gets the same status/error rather than a false precision the
  -- API doesn't actually give.
  status text not null check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
create index admin_email_recipients_campaign_id_idx on public.admin_email_recipients(campaign_id);

alter table public.admin_email_campaigns enable row level security;
alter table public.admin_email_recipients enable row level security;

create policy admin_email_campaigns_select on public.admin_email_campaigns
  for select using (public.is_admin());
create policy admin_email_recipients_select on public.admin_email_recipients
  for select using (public.is_admin());
