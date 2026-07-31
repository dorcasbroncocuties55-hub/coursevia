# Coursevia deep repair pass

## Implemented fixes
- Prevented role auto-fallback from silently defaulting every unknown role to learner during auth record repair.
- Added `normalizeRoleOrNull` for callback safety.
- Kept dashboard brand links inside the correct authenticated dashboard instead of dropping users into the public homepage state.
- Updated landing navbar brand link to route signed-in users back to their dashboard.
- Added missing therapist sessions page and protected route.
- Updated therapist profile save flow to also maintain the shared provider row in `coach_profiles`, which the existing booking/session system depends on.
- Updated booking creation to persist `provider_id` and use the shared provider profile lookup path.
- Replaced weak public-facing copy in hero/blog/creator/admin text with cleaner client-safe wording.
- Added the uploaded Coursevia promo video to the homepage hero in a more intentional placement.

## Still requires live verification
- Full auth success still depends on the database constraint and RPC working correctly in Supabase.
- Checkout, webhook handling, payout verification, and booking lifecycle need live environment testing with valid backend env values.
- Messaging, booking, and provider profile flows should be regression-tested after database fixes are applied.

## Security reminder
- The Paystack secret key shared in chat should be rotated immediately and stored only in backend environment variables.
