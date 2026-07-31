-- =============================================================================
-- Coursevia — Platform Rules Migration
-- 5% commission, admin multi-account, learner wallet+payout,
-- subscription→admin, KYC all roles, saved card checkout
-- Safe to run multiple times (idempotent)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PLATFORM SETTINGS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (key, value) VALUES
  ('platform_fee_rate',      '0.05'),
  ('escrow_hold_days',       '8'),
  ('min_withdrawal',         '10'),
  ('subscription_100_admin', 'true')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins manage platform settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Authenticated read platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated read platform settings"
  ON public.platform_settings FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 2. ADMIN MULTI-ACCOUNT — invite codes
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'admin'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.admin_invite_codes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text        UNIQUE NOT NULL,
  created_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at    timestamptz,
  expires_at timestamptz,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_invite_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage invite codes" ON public.admin_invite_codes;
CREATE POLICY "Admins manage invite codes"
  ON public.admin_invite_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.consume_admin_invite_code(p_code text, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.admin_invite_codes
  WHERE code = p_code AND is_active = true AND used_by IS NULL
    AND (expires_at IS NULL OR expires_at > now());
  IF v_id IS NULL THEN RETURN false; END IF;
  UPDATE public.admin_invite_codes
  SET used_by = p_user_id, used_at = now(), is_active = false WHERE id = v_id;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_admin_invite_code(text, uuid) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.create_admin_invite_code(p_expires_hours integer DEFAULT 48)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  v_code := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 8));
  INSERT INTO public.admin_invite_codes (code, created_by, expires_at)
  VALUES (v_code, auth.uid(), now() + (p_expires_hours || ' hours')::interval);
  RETURN v_code;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_admin_invite_code(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. LEARNER WALLET — ensure all learners have one
-- ---------------------------------------------------------------------------
INSERT INTO public.wallets (user_id, currency, balance, pending_balance, available_balance)
SELECT p.user_id, 'USD', 0, 0, 0
FROM public.profiles p
WHERE p.role = 'learner'
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS account_role text DEFAULT 'provider';
UPDATE public.bank_accounts SET account_role = 'provider' WHERE account_role IS NULL;

-- ---------------------------------------------------------------------------
-- 4. PAYMENT METHODS — Checkout.com instrument storage
-- ---------------------------------------------------------------------------
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS checkout_instrument_id text,
  ADD COLUMN IF NOT EXISTS checkout_customer_id   text,
  ADD COLUMN IF NOT EXISTS fingerprint            text;

CREATE INDEX IF NOT EXISTS payment_methods_user_default_idx
  ON public.payment_methods (user_id, is_default DESC);

CREATE OR REPLACE FUNCTION public.get_default_payment_method(p_user_id uuid)
RETURNS TABLE (
  id uuid, brand text, last4 text, exp_month integer, exp_year integer,
  cardholder_name text, checkout_instrument_id text, checkout_customer_id text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT id, brand, last4, exp_month, exp_year, cardholder_name,
         checkout_instrument_id, checkout_customer_id
  FROM public.payment_methods
  WHERE user_id = p_user_id AND is_default = true LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_default_payment_method(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. SUBSCRIPTION → 100% ADMIN TRIGGER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credit_admin_subscription_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_user_id   uuid;
  v_admin_wallet_id uuid;
  v_amount          numeric;
BEGIN
  IF NEW.payment_type <> 'subscription' THEN RETURN NEW; END IF;
  IF NEW.status <> 'success' THEN RETURN NEW; END IF;
  IF OLD.status = 'success' THEN RETURN NEW; END IF;
  v_amount := COALESCE(NEW.amount, 0);
  IF v_amount <= 0 THEN RETURN NEW; END IF;

  SELECT user_id INTO v_admin_user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF v_admin_user_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.wallets (user_id, currency, balance, pending_balance, available_balance)
  VALUES (v_admin_user_id, 'USD', 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO v_admin_wallet_id FROM public.wallets WHERE user_id = v_admin_user_id;

  UPDATE public.wallets
  SET balance = balance + v_amount, available_balance = available_balance + v_amount,
      updated_at = now()
  WHERE id = v_admin_wallet_id;

  INSERT INTO public.wallet_ledger (wallet_id, amount, type, description, reference_id, reference_type)
  VALUES (v_admin_wallet_id, v_amount, 'credit', 'Subscription — 100% platform revenue', NEW.id::text, 'payment');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_admin_subscription ON public.payments;
CREATE TRIGGER trg_credit_admin_subscription
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.credit_admin_subscription_payment();

-- ---------------------------------------------------------------------------
-- 6. BOOKING & VIDEO 5%/95% COMMISSION TRIGGER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.split_payment_commission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type               text;
  v_amount             numeric;
  v_admin_share        numeric;
  v_provider_share     numeric;
  v_fee_rate           numeric := 0.05;
  v_hold_days          integer := 8;
  v_admin_user_id      uuid;
  v_admin_wallet_id    uuid;
  v_provider_user_id   uuid;
  v_provider_wallet_id uuid;
  v_content_id         text;
BEGIN
  v_type := lower(COALESCE(NEW.payment_type, ''));
  IF v_type NOT IN ('booking', 'video', 'course') THEN RETURN NEW; END IF;
  IF NEW.status <> 'success' THEN RETURN NEW; END IF;
  IF OLD.status = 'success' THEN RETURN NEW; END IF;

  v_amount := COALESCE(NEW.amount, 0);
  IF v_amount <= 0 THEN RETURN NEW; END IF;

  SELECT COALESCE(value::numeric, 0.05) INTO v_fee_rate
  FROM public.platform_settings WHERE key = 'platform_fee_rate';
  SELECT COALESCE(value::integer, 8) INTO v_hold_days
  FROM public.platform_settings WHERE key = 'escrow_hold_days';

  v_admin_share    := ROUND(v_amount * v_fee_rate, 2);
  v_provider_share := v_amount - v_admin_share;

  v_content_id := regexp_replace(COALESCE(NEW.admin_notes, ''), '^.*content_id:', '');
  IF v_content_id = '' THEN v_content_id := NULL; END IF;

  -- Admin wallet
  SELECT user_id INTO v_admin_user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF v_admin_user_id IS NOT NULL THEN
    INSERT INTO public.wallets (user_id, currency, balance, pending_balance, available_balance)
    VALUES (v_admin_user_id, 'USD', 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;
    SELECT id INTO v_admin_wallet_id FROM public.wallets WHERE user_id = v_admin_user_id;
    UPDATE public.wallets
    SET balance = balance + v_admin_share, available_balance = available_balance + v_admin_share,
        updated_at = now()
    WHERE id = v_admin_wallet_id;
    INSERT INTO public.wallet_ledger (wallet_id, amount, type, description, reference_id, reference_type)
    VALUES (v_admin_wallet_id, v_admin_share, 'credit', '5% platform fee from ' || v_type, NEW.id::text, 'payment');
  END IF;

  -- Provider wallet
  IF v_type = 'booking' AND v_content_id IS NOT NULL THEN
    SELECT provider_id INTO v_provider_user_id FROM public.bookings WHERE id = v_content_id::uuid LIMIT 1;
  ELSIF v_type IN ('video', 'course') AND v_content_id IS NOT NULL THEN
    SELECT owner_id INTO v_provider_user_id FROM public.content_items WHERE id = v_content_id::uuid LIMIT 1;
    IF v_provider_user_id IS NULL THEN
      SELECT creator_id INTO v_provider_user_id FROM public.courses WHERE id = v_content_id::uuid LIMIT 1;
    END IF;
  END IF;

  IF v_provider_user_id IS NOT NULL AND v_provider_share > 0 THEN
    INSERT INTO public.wallets (user_id, currency, balance, pending_balance, available_balance)
    VALUES (v_provider_user_id, 'USD', 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;
    SELECT id INTO v_provider_wallet_id FROM public.wallets WHERE user_id = v_provider_user_id;
    UPDATE public.wallets
    SET pending_balance = pending_balance + v_provider_share, updated_at = now()
    WHERE id = v_provider_wallet_id;
    INSERT INTO public.wallet_ledger (wallet_id, amount, type, description, reference_id, reference_type)
    VALUES (v_provider_wallet_id, v_provider_share, 'credit',
            '95% earnings from ' || v_type || ' (held ' || v_hold_days || ' days)', NEW.id::text, 'payment');
    INSERT INTO public.wallet_pending_releases (wallet_id, source_type, source_id, amount, release_at)
    VALUES (v_provider_wallet_id, v_type, v_content_id, v_provider_share,
            now() + (v_hold_days || ' days')::interval)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_split_payment_commission ON public.payments;
CREATE TRIGGER trg_split_payment_commission
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.split_payment_commission();

-- ---------------------------------------------------------------------------
-- 7. REFUNDS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.refunds (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   uuid        REFERENCES public.payments(id) ON DELETE SET NULL,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount       numeric     NOT NULL CHECK (amount > 0),
  reason       text,
  status       text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected','processed')),
  processed_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own refunds" ON public.refunds;
CREATE POLICY "Users see own refunds"
  ON public.refunds FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage refunds" ON public.refunds;
CREATE POLICY "Admins manage refunds"
  ON public.refunds FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.approve_refund(p_refund_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_refund public.refunds%rowtype; v_wallet_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO v_refund FROM public.refunds WHERE id = p_refund_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund not found or already processed'; END IF;

  INSERT INTO public.wallets (user_id, currency, balance, pending_balance, available_balance)
  VALUES (v_refund.user_id, 'USD', 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = v_refund.user_id;

  UPDATE public.wallets
  SET balance = balance + v_refund.amount, available_balance = available_balance + v_refund.amount,
      updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO public.wallet_ledger (wallet_id, amount, type, description, reference_id, reference_type)
  VALUES (v_wallet_id, v_refund.amount, 'credit', 'Refund approved by admin', p_refund_id::text, 'refund');

  UPDATE public.refunds
  SET status = 'processed', processed_by = auth.uid(), processed_at = now()
  WHERE id = p_refund_id;

  RETURN jsonb_build_object('ok', true, 'amount', v_refund.amount);
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_refund(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. KYC — extend to all roles
-- ---------------------------------------------------------------------------
ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS role             text,
  ADD COLUMN IF NOT EXISTS full_name        text,
  ADD COLUMN IF NOT EXISTS date_of_birth    date,
  ADD COLUMN IF NOT EXISTS nationality      text,
  ADD COLUMN IF NOT EXISTS id_number        text,
  ADD COLUMN IF NOT EXISTS selfie_url       text,
  ADD COLUMN IF NOT EXISTS id_front_url     text,
  ADD COLUMN IF NOT EXISTS id_back_url      text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at      timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status      text DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.submit_kyc_request(
  p_role          text,
  p_full_name     text,
  p_date_of_birth date    DEFAULT NULL,
  p_nationality   text    DEFAULT NULL,
  p_id_number     text    DEFAULT NULL,
  p_document_type text    DEFAULT 'national_id',
  p_id_front_url  text    DEFAULT NULL,
  p_id_back_url   text    DEFAULT NULL,
  p_selfie_url    text    DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.verification_requests (
    user_id, verification_type, role, full_name, date_of_birth,
    nationality, id_number, document_type, id_front_url, id_back_url, selfie_url, status
  ) VALUES (
    auth.uid(), 'identity', p_role, p_full_name, p_date_of_birth,
    p_nationality, p_id_number, p_document_type, p_id_front_url, p_id_back_url, p_selfie_url, 'pending'
  )
  ON CONFLICT (user_id, verification_type) DO UPDATE
    SET full_name = EXCLUDED.full_name, date_of_birth = EXCLUDED.date_of_birth,
        nationality = EXCLUDED.nationality, id_number = EXCLUDED.id_number,
        document_type = EXCLUDED.document_type, id_front_url = EXCLUDED.id_front_url,
        id_back_url = EXCLUDED.id_back_url, selfie_url = EXCLUDED.selfie_url,
        status = 'pending', rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL
  RETURNING id INTO v_id;
  UPDATE public.profiles SET kyc_status = 'pending' WHERE user_id = auth.uid();
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_kyc_request(text,text,date,text,text,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_approve_kyc(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT user_id INTO v_user_id FROM public.verification_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'KYC request not found'; END IF;
  UPDATE public.verification_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() WHERE id = p_request_id;
  UPDATE public.profiles
  SET kyc_status = 'approved', kyc_verified_at = now(), is_verified = true WHERE user_id = v_user_id;
  RETURN jsonb_build_object('ok', true, 'user_id', v_user_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_approve_kyc(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_kyc(p_request_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT user_id INTO v_user_id FROM public.verification_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'KYC request not found'; END IF;
  UPDATE public.verification_requests
  SET status = 'rejected', rejection_reason = p_reason,
      reviewed_by = auth.uid(), reviewed_at = now() WHERE id = p_request_id;
  UPDATE public.profiles SET kyc_status = 'rejected' WHERE user_id = v_user_id;
  RETURN jsonb_build_object('ok', true, 'user_id', v_user_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_reject_kyc(uuid, text) TO authenticated;

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own KYC" ON public.verification_requests;
CREATE POLICY "Users see own KYC"
  ON public.verification_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users submit KYC" ON public.verification_requests;
CREATE POLICY "Users submit KYC"
  ON public.verification_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage KYC" ON public.verification_requests;
CREATE POLICY "Admins manage KYC"
  ON public.verification_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 9. LEARNER PAYOUT
-- ---------------------------------------------------------------------------
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS account_role text DEFAULT 'provider';

CREATE OR REPLACE FUNCTION public.learner_request_withdrawal(
  p_amount          numeric,
  p_bank_account_id uuid
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet_id     uuid;
  v_available     numeric;
  v_min           numeric := 10;
  v_withdrawal_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT COALESCE(value::numeric, 10) INTO v_min
  FROM public.platform_settings WHERE key = 'min_withdrawal';

  IF p_amount < v_min THEN
    RAISE EXCEPTION 'Minimum withdrawal is $%', v_min;
  END IF;

  SELECT id, COALESCE(available_balance, 0) INTO v_wallet_id, v_available
  FROM public.wallets WHERE user_id = auth.uid();

  IF v_wallet_id IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF p_amount > v_available THEN RAISE EXCEPTION 'Insufficient available balance'; END IF;

  -- Deduct from available_balance
  UPDATE public.wallets
  SET available_balance = available_balance - p_amount,
      balance = balance - p_amount, updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO public.wallet_ledger (wallet_id, amount, type, description, reference_type)
  VALUES (v_wallet_id, p_amount, 'debit', 'Learner withdrawal request', 'withdrawal');

  INSERT INTO public.withdrawals (user_id, bank_account_id, amount, status, account_role)
  VALUES (auth.uid(), p_bank_account_id, p_amount, 'pending', 'learner')
  RETURNING id INTO v_withdrawal_id;

  RETURN v_withdrawal_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.learner_request_withdrawal(numeric, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 10. SUBSCRIPTION CANCEL — set cancel_at_period_end flag
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at         timestamptz;

CREATE OR REPLACE FUNCTION public.cancel_subscription_at_period_end(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sub_id uuid;
BEGIN
  -- Allow user to cancel own subscription, or admin to cancel any
  IF auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT id INTO v_sub_id FROM public.subscriptions
  WHERE user_id = p_user_id AND status = 'active' ORDER BY created_at DESC LIMIT 1;

  IF v_sub_id IS NULL THEN RAISE EXCEPTION 'No active subscription found'; END IF;

  UPDATE public.subscriptions
  SET cancel_at_period_end = true, cancelled_at = now()
  WHERE id = v_sub_id;

  RETURN jsonb_build_object('ok', true, 'subscription_id', v_sub_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.cancel_subscription_at_period_end(uuid) TO authenticated;

-- Cron-style: expire subscriptions past ends_at (run daily via pg_cron or Supabase scheduled function)
CREATE OR REPLACE FUNCTION public.expire_ended_subscriptions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired'
  WHERE status = 'active' AND ends_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.expire_ended_subscriptions() TO authenticated;

-- ---------------------------------------------------------------------------
-- 11. VERIFY COMPLETE
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE '✓ platform_settings ready';
  RAISE NOTICE '✓ admin invite codes ready';
  RAISE NOTICE '✓ learner wallets provisioned';
  RAISE NOTICE '✓ payment_methods checkout columns added';
  RAISE NOTICE '✓ subscription 100%% admin trigger ready';
  RAISE NOTICE '✓ 5%%/95%% commission split trigger ready';
  RAISE NOTICE '✓ refunds table + approve_refund() ready';
  RAISE NOTICE '✓ KYC extended to all roles';
  RAISE NOTICE '✓ learner payout function ready';
  RAISE NOTICE '✓ subscription cancel_at_period_end ready';
  RAISE NOTICE 'Platform rules migration complete.';
END;
$$;
