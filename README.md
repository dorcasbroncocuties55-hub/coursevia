# Welcome to your Lovable project

TODO: Document your project here


## Recurring subscription setup

1. Run the SQL migration `supabase/migrations/20260325_add_recurring_subscription_system.sql`.
2. Copy `backend/.env.example` to `backend/.env` and fill in your keys.
3. Start the frontend with `npm run dev`.
4. Start the subscription backend with `npm run backend`.
5. In your Checkout.com dashboard, set the webhook URL to `https://YOUR-DOMAIN/api/webhooks/checkout` or your local tunnel URL.
6. Learner membership now uses recurring billing from `/pricing` and `/dashboard/subscription`.
