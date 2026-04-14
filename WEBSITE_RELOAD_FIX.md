# Website Reload Fix Guide

## Issue
Website not reloading properly after Render incident on Feb 4, 2026.

## Quick Fixes to Try

### 1. Clear Browser Cache (Try First)
- **Chrome/Edge**: Ctrl+Shift+Delete → Clear cached images and files
- **Firefox**: Ctrl+Shift+Delete → Cached Web Content
- **Hard Reload**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### 2. Verify Deployment
Check if your site is actually deployed:
```bash
curl -I https://coursevia.site
```

Look for:
- Status: 200 OK
- Content-Type: text/html
- No 404 or 500 errors

### 3. Check Render Service Status
1. Go to Render Dashboard: https://dashboard.render.com
2. Check "coursevia-frontend" service status
3. Look for:
   - ✓ Deploy succeeded
   - ✓ Service is live
   - Last deploy timestamp

### 4. Force Redeploy on Render
If the service shows issues:
1. Go to Render Dashboard → coursevia-frontend
2. Click "Manual Deploy" → "Clear build cache & deploy"
3. Wait for build to complete (usually 2-5 minutes)

### 5. Verify Environment Variables
Check that all required env vars are set in Render:
- VITE_BACKEND_URL
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_STRIPE_PUBLISHABLE_KEY

### 6. Check DNS/Domain
If using custom domain (coursevia.site):
```bash
nslookup coursevia.site
```

Should point to Render's servers.

## Backend Health Check
Your backend is on: https://coursevia-backend.onrender.com

Test it:
```bash
curl https://coursevia-backend.onrender.com/health
```

Expected response:
```json
{"status":"ok"}
```

## If Still Not Working

### Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors like:
   - Failed to load resource
   - CORS errors
   - 404 on assets

### Check Network Tab
1. Open DevTools → Network tab
2. Reload page
3. Look for:
   - Red/failed requests
   - 404 errors on JS/CSS files
   - Slow response times

### Verify Build Output
Locally test the build:
```bash
npm run build
npm run preview
```

Then visit http://localhost:4173

## Render-Specific Issues

### Free Tier Sleep
If on Render free tier, services sleep after 15 min of inactivity:
- First request takes 30-60 seconds to wake up
- Solution: Upgrade to paid tier or use UptimeRobot to ping every 5 min

### Static Site Routing
Your render.yaml has the correct rewrite rule:
```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

This ensures React Router works on page reload.

## Contact Support
If none of these work:
1. Render Support: https://render.com/support
2. Check Render Status: https://status.render.com
3. Reference the Feb 4 incident in your support ticket

## Prevention
Set up monitoring:
1. UptimeRobot: https://uptimerobot.com (free)
2. Ping your site every 5 minutes
3. Get alerts if site goes down
