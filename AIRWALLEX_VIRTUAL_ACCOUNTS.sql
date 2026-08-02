-- ============================================================
-- Airwallex Virtual Accounts
-- Run this in your Supabase SQL editor
-- ============================================================

-- 0. Create has_role helper if it doesn't exist
create or replace function public.has_role(p_user_id uuid, p_role text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id
      and role::text = p_role
  );
$$;
grant execute on function public.has_role(uuid, text) to authenticated, anon;

-- 1. Virtual accounts — one per user
create table if not exists public.virtual_accounts (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  airwallex_id        text        not null unique,          -- Airwallex account_id
  account_number      text,                                  -- local bank account number
  routing_number      text,                                  -- routing / sort code
  iban                text,                                  -- IBAN for EU/UK
  bic                 text,                                  -- BIC/SWIFT
  bank_name           text,
  account_name        text,
  currency            text        not null default 'USD',
  country_code        text        not null default 'US',
  status              text        not null default 'active'
                                  check (status in ('pending','active','inactive','closed')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz default now()
);

create unique index if not exists virtual_accounts_user_id_currency_idx
  on public.virtual_accounts (user_id, currency);

alter table public.virtual_accounts enable row level security;

drop policy if exists "Users view own virtual account" on public.virtual_accounts;
create policy "Users view own virtual account" on public.virtual_accounts
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins manage all virtual accounts" on public.virtual_accounts;
create policy "Admins manage all virtual accounts" on public.virtual_accounts
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- 2. Topup events — every inbound transfer recorded here
create table if not exists public.wallet_topups (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  virtual_account_id  uuid        references public.virtual_accounts(id),
  airwallex_event_id  text        unique,                   -- idempotency key from webhook
  amount              numeric     not null,
  currency            text        not null default 'USD',
  sender_name         text,
  sender_bank         text,
  reference           text,
  status              text        not null default 'completed',
  created_at          timestamptz not null default now()
);

alter table public.wallet_topups enable row level security;

drop policy if exists "Users view own topups" on public.wallet_topups;
create policy "Users view own topups" on public.wallet_topups
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins manage all topups" on public.wallet_topups;
create policy "Admins manage all topups" on public.wallet_topups
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));
