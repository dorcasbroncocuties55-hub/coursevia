# Render Deployment - Blank Screen Fix

## Current Status
✅ All code is correct and builds successfully
✅ Configuration files are correct (`render.yaml`, `_redirects`)
✅ Build creates all necessary files (`200.html`, `404.html`, `_redirects`)
⚠️ **Render is not applying the rewrite rules**

## The Problem
When you refresh any page (e.g., `/dashboard`, `/admin-login`), Render returns a blank page because it's trying to find a physical file at that path instead of serving `index.html` and letting React Router handle the route.

## Solution: Manual Deployment with Cache Clear

### Step 1: Clear Render Cache and Deploy
1. Go to **Render Dashboard**: https://dashboard.render.com
2. Find and click on your **coursevia-frontend** service
3. Click the **"Manual Deploy"** dropdown button (top right)
4. Select **"Clear build cache & deploy"**
5. Wait for the deployment to complete (usually 2-5 minutes)

### Step 2: Verify the Fix
After deployment completes, test these scenarios:

1. **Homepage**: Go to https://coursevia.site → Should load ✅
2. **Dashboard**: Go to https://coursevia.site/dashboard → Should load ✅
3. **Refresh Test**: On any page, press F5 → Should reload (not blank) ✅
4. **Admin Login**: Go to https://coursevia.site/admin-login → Should load ✅
5. **Support Login**: Go to https://coursevia.site/support-agent → Should load ✅

## If Still Blank After Cache Clear

### Option A: Check Render Service Settings
1. In Render Dashboard, go to your service
2. Click **"Settings"** tab
3. Verify these settings:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist` (or `./dist`)
   - **Auto-Deploy**: Yes (optional)

### Option B: Check Render Logs
1. In Render Dashboard, click **"Logs"** tab
2. Look for errors during build or deployment
3. Common issues:
   - `_redirects` file not found
   - `dist` folder not created
   - Permission errors

### Option C: Verify Environment Variables
Make sure these are set in Render Dashboard → Settings → Environment:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BACKEND_URL`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_CHECKOUT_PUBLIC_KEY`

## Alternative Solution: Switch to Hash Router (Last Resort)

If Render continues to fail with the rewrite rules, we can switch to hash-based routing as a temporary workaround. This uses URLs like `https://coursevia.site/#/dashboard` instead of `https://coursevia.site/dashboard`.

**Pros**: Works on any static host without configuration
**Cons**: URLs have `#` in them, not SEO-friendly

Let me know if you want to try this approach.

## Technical Details

### What We've Already Done
1. ✅ Created `public/_redirects` with SPA routing rule
2. ✅ Added rewrite rule in `render.yaml`
3. ✅ Created Vite plugin to generate `200.html` and `404.html`
4. ✅ Set `base: "/"` in `vite.config.ts`
5. ✅ Added cache headers to prevent stale content
6. ✅ Committed and pushed all changes

### Why This Should Work
- Render's static site hosting supports rewrite rules in `render.yaml`
- The `_redirects` file is a fallback for Netlify-style routing
- `200.html` is Render's fallback for unmatched routes
- `404.html` must be `index.html` so React Router handles 404s

### Why It Might Not Be Working
- **Render cache**: Old deployment cached without the rewrite rules
- **Render bug**: Sometimes Render doesn't read `render.yaml` correctly
- **Timing issue**: Files created after Render scans the dist folder

## Next Steps

1. **Try the cache clear first** (Step 1 above)
2. **If still broken**, share:
   - Screenshot of Render logs during deployment
   - Browser console errors (F12 → Console tab)
   - Network tab showing what files are loaded (F12 → Network tab)
3. **If nothing works**, we'll switch to hash routing or migrate to Netlify/Vercel

## Contact Support

If the cache clear doesn't work, you may need to contact Render support:
- Email: support@render.com
- Dashboard: Click "Help" → "Contact Support"
- Mention: "Static site rewrite rules not working for SPA routing"
