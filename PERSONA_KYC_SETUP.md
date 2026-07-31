# Persona KYC wired into file

This package now includes the Persona sandbox template directly in the project:

- Template ID: `persona_sandbox_59ce022a-0305-4892-84fd-4bc3482399d5`
- Backend route: `POST /api/kyc/persona/session`
- Webhook route: `POST /api/kyc/persona/webhook`
- SQL file: `COURSEVIA_PROVIDER_KYC_AND_BOOKING_FLOW.sql`

## Still required before live use

1. Add your real `PERSONA_API_KEY` in `backend/.env`
2. Add your real `PERSONA_WEBHOOK_SECRET` in `backend/.env`
3. Keep your real Supabase service role key in `backend/.env`
4. Run `COURSEVIA_PROVIDER_KYC_AND_BOOKING_FLOW.sql`
5. Point Persona webhooks to your backend `/api/kyc/persona/webhook`

## What this backend now does

- Starts Persona inquiry sessions with your sandbox template
- Stores a pending verification record when inquiry creation succeeds
- Accepts Persona webhook events
- Calls `apply_provider_verification_decision(...)` in Supabase
- Stores webhook events in `provider_verification_events`
- Marks approved profiles as verified through existing SQL logic
