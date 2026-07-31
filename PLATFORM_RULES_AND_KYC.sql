-- =============================================================================
-- Coursevia — Platform rules, KYC, learner wallet, admin multi-account,
--             5% commission split, subscription → admin, saved cards
-- Safe to run multiple times (idempotent)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PLATFORM FEE CONSTANTS (stored so backend + triggers agree)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value) values
  ('platform_fee_rate',        '0.05'),   -- 5% on video, booking, course
  ('subscription_admin_rate',  '1.00'),   -- 100% of subscription goes to admin
  ('min_provider_price',       '6.00'),
  ('monthly_plan_price',       '10.00'),
  ('yearly_plan_price',        '120.00')
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;
drop policy if exists "Admins manage platform settings" on public.platform_settings;
create policy "Admins manage platform settings"
  on public.platform_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Anyone can read platform settings" on public.platform_settings;
create policy "Anyone can read platform settings"
  on public.platform_settings for select using (true);

-- ---------------------------------------------------------------------------
-- 2. ADMIN WALLET — allow multiple admin accounts, each with their own wallet
--    Admins are identified by the 'admin' role in user_roles.
--    No restriction on how many admin accounts exist.
-- ---------------------------------------------------------------------------

-- Ensure wallets table has all needed columns
alter table public.wallets
  add column if not exists pending_balance   numeric not null default 0,
  add column if not exists available_balance numeric not null default 0,
  add column if not exists currency          text    not null default 'USD',
  add column if not exists updated_at        timestamptz default now();

-- Wallet ledger for full audit trail
create table if not exists public.wallet_ledger (
  id           uuid        primary key default gen_random_uuid(),
  wallet_id    uuid        not null references public.wallets(id) on delete cascade,
  amount       numeric     not null,
  type         text        not null check (type in ('credit','debit')),
  description  text,
  balance_after numeric,
  created_at   timestamptz not null default now()
);
create index if not exists wallet_ledger_wallet_id_idx on public.wallet_ledger(wallet_id, created_at desc);
alter table public.wallet_ledger enable row level security;
drop policy if exists "Users read own ledger" on public.wallet_ledger;
create policy "Users read own ledger" on public.wallet_ledger for select to authenticated
  using (exists (select 1 from public.wallets w where w.id = wallet_id and w.user_id = auth.uid()));
drop policy if exists "Admins read all ledger" on public.wallet_ledger;
create policy "Admins read all ledger" on public.wallet_ledger for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 3. PAYMENTS TABLE — add commission tracking columns
-- ---------------------------------------------------------------------------
alter table public.payments
  add column if not exists payment_method      text    default 'checkout',
  add column if not exists checkout_payment_id text,
  add column if not exists admin_share         numeric default 0,
  add column if not exists provider_share      numeric default 0,
  add column if not exists commission_settled  boolean default false,
  add column if not exists payer_id            uuid references auth.users(id),
  add column if not exists updated_at          timestamptz default now();

create index if not exists payments_checkout_payment_id_idx
  on public.payments(checkout_payment_id) where checkout_payment_id is not null;
create index if not exists payments_reference_id_idx
  on public.payments(reference_id) where reference_id is not null;
create index if not exists payments_payer_id_idx
  on public.payments(payer_id);

-- ---------------------------------------------------------------------------
-- 4. LEARNER WALLET
--    Learners get a wallet for refunds and payouts.
--    Created automatically on signup (handle_new_user already does this).
-- ---------------------------------------------------------------------------

-- Ensure every existing user has a wallet
insert into public.wallets (user_id, currency, balance, pending_balance, available_balance)
select p.user_id, 'USD', 0, 0, 0
from public.profiles p
where not exists (select 1 from public.wallets w where w.user_id = p.user_id)
on conflict (user_id) do nothing;

-- RLS: users see only their own wallet; admins see all
alter table public.wallets enable row level security;
drop policy if exists "Users read own wallet" on public.wallets;
create policy "Users read own wallet" on public.wallets for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Admins read all wallets" on public.wallets;
create policy "Admins read all wallets" on public.wallets for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Service role manages wallets" on public.wallets;
create policy "Service role manages wallets" on public.wallets for all
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 5. PAYMENT METHODS — saved cards (Checkout.com tokens)
--    Learners can add/remove cards; first card becomes default.
-- ---------------------------------------------------------------------------
create table if not exists public.payment_methods (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  provider         text        not null default 'checkout',
  method_type      text        not null default 'card',
  brand            text,
  last4            text,
  exp_month        integer,
  exp_year         integer,
  cardholder_name  text,
  -- Checkout.com token / instrument ID for charging saved cards
  instrument_id    text,
  is_default       boolean     not null default false,
  created_at       timestamptz not null default now()
);

-- Update existing rows
update public.payment_methods set provider = 'checkout' where provider = 'paystack';
alter table public.payment_methods alter column provider set default 'checkout';

alter table public.payment_methods enable row level security;
drop policy if exists "Users manage own payment methods" on public.payment_methods;
create policy "Users manage own payment methods" on public.payment_methods
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Function: ensure only one default per user
create or replace function public.enforce_single_default_payment_method()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_default then
    update public.payment_methods
    set is_default = false
    where user_id = new.user_id and id <> new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_single_default_payment_method on public.payment_methods;
create trigger trg_single_default_payment_method
  after insert or update of is_default on public.payment_methods
  for each row when (new.is_default = true)
  execute function public.enforce_single_default_payment_method();

-- ---------------------------------------------------------------------------
-- 6. SUBSCRIPTIONS TABLE — add provider columns, ensure admin gets 100%
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists payment_provider text    default 'checkout',
  add column if not exists provider_name    text    default 'Checkout.com',
  add column if not exists cancel_at_period_end boolean default false;

update public.subscriptions
set payment_provider = 'checkout', provider_name = 'Checkout.com'
where payment_provider is null or payment_provider ilike '%paystack%';

-- ---------------------------------------------------------------------------
-- 7. COMMISSION SPLIT FUNCTION
--    Called after every successful payment verification.
--    - subscription  → 100% to admin wallet
--    - video/booking/course → 5% to admin, 95% to provider
-- ---------------------------------------------------------------------------
create or replace function public.settle_payment_commission(
  p_payment_id   uuid,
  p_type         text,
  p_amount       numeric,
  p_payer_id     uuid    default null,
  p_provider_id  uuid    default null   -- content owner / coach / therapist
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_share    numeric;
  v_provider_share numeric;
  v_admin_wallet   record;
  v_provider_wallet record;
  v_fee_rate       numeric := 0.05;
begin
  -- Already settled?
  if exists (select 1 from public.payments where id = p_payment_id and commission_settled = true) then
    return jsonb_build_object('ok', true, 'skipped', true);
  end if;

  if lower(p_type) = 'subscription' then
    v_admin_share    := p_amount;
    v_provider_share := 0;
  else
    v_admin_share    := round(p_amount * v_fee_rate, 2);
    v_provider_share := round(p_amount - v_admin_share, 2);
  end if;

  -- Update payment row with split
  update public.payments
  set admin_share = v_admin_share,
      provider_share = v_provider_share,
      commission_settled = true,
      updated_at = now()
  where id = p_payment_id;

  -- Credit admin wallet (any admin — use the first admin wallet found)
  select w.* into v_admin_wallet
  from public.wallets w
  join public.user_roles ur on ur.user_id = w.user_id
  where ur.role = 'admin'
  order by w.created_at
  limit 1;

  if v_admin_wallet.id is not null then
    update public.wallets
    set balance           = coalesce(balance, 0) + v_admin_share,
        available_balance = coalesce(available_balance, 0) + v_admin_share,
        updated_at        = now()
    where id = v_admin_wallet.id;

    insert into public.wallet_ledger (wallet_id, amount, type, description, balance_after)
    values (
      v_admin_wallet.id,
      v_admin_share,
      'credit',
      'Admin share from ' || p_type || ' payment',
      (select available_balance from public.wallets where id = v_admin_wallet.id)
    );
  end if;

  -- Credit provider wallet (if applicable)
  if v_provider_share > 0 and p_provider_id is not null then
    -- Ensure provider has a wallet
    insert into public.wallets (user_id, currency, balance, pending_balance, available_balance)
    values (p_provider_id, 'USD', 0, 0, 0)
    on conflict (user_id) do nothing;

    select w.* into v_provider_wallet
    from public.wallets w where w.user_id = p_provider_id;

    update public.wallets
    set pending_balance   = coalesce(pending_balance, 0) + v_provider_share,
        updated_at        = now()
    where id = v_provider_wallet.id;

    insert into public.wallet_ledger (wallet_id, amount, type, description, balance_after)
    values (
      v_provider_wallet.id,
      v_provider_share,
      'credit',
      '95% provider share from ' || p_type || ' payment (pending 8-day release)',
      (select pending_balance from public.wallets where id = v_provider_wallet.id)
    );

    -- Schedule release after 8 days
    insert into public.wallet_pending_releases (wallet_id, source_type, source_id, amount, release_at)
    values (v_provider_wallet.id, p_type, p_payment_id, v_provider_share, now() + interval '8 days')
    on conflict do nothing;
  end if;

  -- Credit learner refund reserve (for refunds — 0 amount, just ensures wallet exists)
  if p_payer_id is not null then
    insert into public.wallets (user_id, currency, balance, pending_balance, available_balance)
    values (p_payer_id, 'USD', 0, 0, 0)
    on conflict (user_id) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'admin_share', v_admin_share,
    'provider_share', v_provider_share
  );
end;
$$;
grant execute on function public.settle_payment_commission(uuid, text, numeric, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. LEARNER REFUND FUNCTION
--    Admin can issue a refund to a learner's wallet
-- ---------------------------------------------------------------------------
create or replace function public.issue_learner_refund(
  p_payment_id  uuid,
  p_amount      numeric,
  p_reason      text default 'Admin refund'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_wallet  record;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Admin access required';
  end if;

  select * into v_payment from public.payments where id = p_payment_id;
  if not found then raise exception 'Payment not found'; end if;

  -- Ensure learner wallet exists
  insert into public.wallets (user_id, currency, balance, pending_balance, available_balance)
  values (v_payment.payer_id, 'USD', 0, 0, 0)
  on conflict (user_id) do nothing;

  select * into v_wallet from public.wallets where user_id = v_payment.payer_id;

  update public.wallets
  set balance           = coalesce(balance, 0) + p_amount,
      available_balance = coalesce(available_balance, 0) + p_amount,
      updated_at        = now()
  where id = v_wallet.id;

  insert into public.wallet_ledger (wallet_id, amount, type, description)
  values (v_wallet.id, p_amount, 'credit', p_reason);

  update public.payments
  set status = 'refunded', updated_at = now()
  where id = p_payment_id;

  return jsonb_build_object('ok', true, 'refunded', p_amount);
end;
$$;
grant execute on function public.issue_learner_refund(uuid, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. LEARNER WALLET PAYOUT (withdraw to bank)
-- ---------------------------------------------------------------------------
create table if not exists public.withdrawals (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  bank_account_id uuid        references public.bank_accounts(id),
  amount          numeric     not null,
  status          text        not null default 'pending'
                              check (status in ('pending','processing','completed','failed')),
  payment_provider text       default 'checkout',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz default now()
);
alter table public.withdrawals enable row level security;
drop policy if exists "Users manage own withdrawals" on public.withdrawals;
create policy "Users manage own withdrawals" on public.withdrawals
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Admins manage all withdrawals" on public.withdrawals;
create policy "Admins manage all withdrawals" on public.withdrawals
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 10. KYC SYSTEM
--     Supports both Persona (existing) and a lightweight built-in flow.
--     Providers (coach/therapist) must pass KYC before going live.
-- ---------------------------------------------------------------------------

-- KYC submissions table
create table if not exists public.kyc_submissions (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  role             text        not null,   -- coach | therapist | creator
  -- Document info
  document_type    text        not null default 'national_id',
                                           -- national_id | passport | drivers_license
  document_front_url  text,
  document_back_url   text,
  selfie_url          text,
  -- Status
  status           text        not null default 'pending'
                               check (status in ('pending','under_review','approved','rejected','requires_resubmission')),
  rejection_reason text,
  -- Persona integration
  persona_inquiry_id  text,
  persona_template_id text,
  persona_inquiry_url text,
  -- Admin review
  reviewed_by      uuid        references auth.users(id),
  reviewed_at      timestamptz,
  -- Metadata
  submitted_at     timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists kyc_submissions_user_pending_idx
  on public.kyc_submissions(user_id)
  where status in ('pending','under_review');

create index if not exists kyc_submissions_status_idx
  on public.kyc_submissions(status, submitted_at desc);

alter table public.kyc_submissions enable row level security;

drop policy if exists "Users manage own KYC" on public.kyc_submissions;
create policy "Users manage own KYC" on public.kyc_submissions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Admins manage all KYC" on public.kyc_submissions;
create policy "Admins manage all KYC" on public.kyc_submissions
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- KYC document storage bucket (run in Supabase dashboard if not exists)
-- insert into storage.buckets (id, name, public) values ('kyc-documents', 'kyc-documents', false) on conflict do nothing;

-- RPC: submit KYC
create or replace function public.submit_kyc(
  p_role                text,
  p_document_type       text    default 'national_id',
  p_document_front_url  text    default null,
  p_document_back_url   text    default null,
  p_selfie_url          text    default null,
  p_persona_inquiry_id  text    default null,
  p_persona_inquiry_url text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  -- Cancel any previous pending submission
  update public.kyc_submissions
  set status = 'requires_resubmission', updated_at = now()
  where user_id = auth.uid()
    and status in ('pending', 'under_review');

  insert into public.kyc_submissions (
    user_id, role, document_type,
    document_front_url, document_back_url, selfie_url,
    persona_inquiry_id, persona_inquiry_url,
    status
  ) values (
    auth.uid(), p_role, p_document_type,
    p_document_front_url, p_document_back_url, p_selfie_url,
    p_persona_inquiry_id, p_persona_inquiry_url,
    case when p_persona_inquiry_id is not null then 'under_review' else 'pending' end
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'submission_id', v_id);
end;
$$;
grant execute on function public.submit_kyc(text, text, text, text, text, text, text) to authenticated;

-- RPC: admin review KYC
create or replace function public.review_kyc(
  p_submission_id  uuid,
  p_decision       text,   -- 'approved' | 'rejected'
  p_reason         text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Admin access required';
  end if;

  select * into v_sub from public.kyc_submissions where id = p_submission_id;
  if not found then raise exception 'Submission not found'; end if;

  update public.kyc_submissions
  set status           = p_decision,
      rejection_reason = p_reason,
      reviewed_by      = auth.uid(),
      reviewed_at      = now(),
      updated_at       = now()
  where id = p_submission_id;

  -- Sync to profiles
  update public.profiles
  set kyc_status  = p_decision,
      is_verified = (p_decision = 'approved')
  where user_id = v_sub.user_id;

  return jsonb_build_object('ok', true, 'decision', p_decision);
end;
$$;
grant execute on function public.review_kyc(uuid, text, text) to authenticated;

-- RPC: get my KYC status
create or replace function public.get_my_kyc_status()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select jsonb_build_object(
      'status',          ks.status,
      'document_type',   ks.document_type,
      'submitted_at',    ks.submitted_at,
      'rejection_reason',ks.rejection_reason,
      'persona_inquiry_url', ks.persona_inquiry_url
    )
    from public.kyc_submissions ks
    where ks.user_id = auth.uid()
    order by ks.submitted_at desc
    limit 1),
    jsonb_build_object('status', 'not_submitted')
  );
$$;
grant execute on function public.get_my_kyc_status() to authenticated;

-- ---------------------------------------------------------------------------
-- 11. ADMIN MULTI-ACCOUNT — no restriction, just ensure wallet on signup
--     The handle_new_user trigger already creates wallets for all roles.
--     Admin accounts are created via AdminSignup page (role = 'admin').
-- ---------------------------------------------------------------------------

-- Ensure all existing admins have wallets
insert into public.wallets (user_id, currency, balance, pending_balance, available_balance)
select ur.user_id, 'USD', 0, 0, 0
from public.user_roles ur
where ur.role = 'admin'
  and not exists (select 1 from public.wallets w where w.user_id = ur.user_id)
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 12. CHECKOUT WEBHOOK EVENTS (idempotent)
-- ---------------------------------------------------------------------------
create table if not exists public.checkout_webhook_events (
  id            uuid        primary key default gen_random_uuid(),
  event_id      text        unique,
  event_type    text        not null,
  payment_id    text,
  reference     text,
  status        text,
  amount_cents  bigint,
  currency      text,
  payload       jsonb       not null default '{}'::jsonb,
  processed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists checkout_webhook_events_payment_id_idx on public.checkout_webhook_events(payment_id);
create index if not exists checkout_webhook_events_reference_idx  on public.checkout_webhook_events(reference);
alter table public.checkout_webhook_events enable row level security;
drop policy if exists "Admins read webhook events" on public.checkout_webhook_events;
create policy "Admins read webhook events" on public.checkout_webhook_events
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 13. VERIFY
-- ---------------------------------------------------------------------------
do $$
begin
  raise notice '✓ platform_settings ready';
  raise notice '✓ wallet_ledger ready';
  raise notice '✓ payment_methods updated (checkout default)';
  raise notice '✓ subscriptions updated (checkout provider)';
  raise notice '✓ settle_payment_commission() ready';
  raise notice '✓ issue_learner_refund() ready';
  raise notice '✓ kyc_submissions table ready';
  raise notice '✓ submit_kyc() / review_kyc() / get_my_kyc_status() ready';
  raise notice '✓ All admin wallets provisioned';
  raise notice 'Migration complete.';
end;
$$;
