-- ============================================================
-- Remove DEFAULT 'learner' from profiles.role
-- This was auto-assigning 'learner' to every new Google user
-- before they completed onboarding and chose their own role.
-- Role is now ONLY written by the complete_onboarding() RPC.
-- Safe to run multiple times (idempotent).
-- ============================================================

ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT;

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'profiles.role default removed — role is now null until onboarding completes.';
END;
$$;
