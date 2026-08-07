# Keep Backend Alive - Fix 503 Errors

Render free tier spins down after 15 minutes of inactivity. This causes 503 errors when users try to make payments.

## Solutions (Pick One)

### Option 1: Render Cron Job (Recommended)
Already configured in `render.yaml`. The cron job pings your backend every 10 minutes.

**To enable:**
1. Commit and push the updated `render.yaml`
2. Render will automatically create the cron job

**Cost:** Free (included in Render free tier)

---

### Option 2: UptimeRobot (External, Free)
Use a free monitoring service to ping your backend.

**Setup:**
1. Go to https://uptimerobot.com
2. Sign up (free)
3. Click "Add New Monitor"
4. Settings:
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `Coursevia Backend`
   - URL: `https://coursevia-backend.onrender.com/health`
   - Monitoring Interval: **5 minutes** (free tier)
5. Click "Create Monitor"

**Cost:** Free forever

---

### Option 3: Cron-Job.org (External, Free)
Another free cron service.

**Setup:**
1. Go to https://cron-job.org
2. Sign up (free)
3. Create new cronjob:
   - Title: `Keep Coursevia Backend Alive`
   - URL: `https://coursevia-backend.onrender.com/health`
   - Schedule: Every 10 minutes
4. Save

**Cost:** Free forever

---

## Current Frontend Workarounds

Already implemented in the code:

1. **App.tsx** - Pings backend immediately when app loads
2. **PaddleTopUp.tsx** - Retries 503 errors twice with 20s & 25s delays
3. **All directories** - 30s timeout instead of 10s

These help but don't eliminate the problem. Use one of the solutions above for best results.

---

## Upgrade to Paid Tier (Eliminates Problem)

**Render Starter Plan:** $7/month
- Backend never sleeps
- No more 503 errors
- Better performance

https://render.com/pricing
