# Render Deployment Fix - Blank Screen on Reload

## Problem
All pages go blank when refreshed on https://coursevia.site

## Root Cause
Render is not properly serving the SPA (Single Page Application) with client-side routing.

## Solution Applied

### 1. ✅ render.yaml Configuration
Already has the correct rewrite rule:
```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

### 2. ✅ _redirects File
Located in `public/_redirects` and copied to `dist/_redirects`:
```
/*    /index.html   200
```

### 3. ✅ Vite Plugin
`vite.config.ts` has a plugin that ensures these files are created:
- `dist/_redirects`
- `dist/200.html` (Render fallback)
- `dist/404.html` (must be index.html for React Router)

## Steps to Fix Deployment

### Option 1: Clear Render Cache (Recommended)
1. Go to Render Dashboard: https://dashboard.render.com
2. Select your `coursevia-frontend` service
3. Click "Manual Deploy" → "Clear build cache & deploy"
4. Wait for deployment to complete

### Option 2: Force Rebuild
1. Make a small change (add a comment to any file)
2. Commit and push
3. Render will auto-deploy

### Option 3: Check Render Logs
1. Go to Render Dashboard
2. Click on your service
3. Check "Logs" tab for any errors during deployment
4. Look for:
   - Build errors
   - Missing files
   - Permission issues

## Verification Steps

After deployment completes:

1. **Test Homepage**
   - Go to https://coursevia.site
   - Should load correctly ✅

2. **Test Dashboard**
   - Go to https://coursevia.site/dashboard
   - Should load correctly ✅

3. **Test Refresh**
   - On any page, press F5 or Ctrl+R
   - Should reload the same page (not blank) ✅

4. **Test Direct URL**
   - Open new tab
   - Go directly to https://coursevia.site/admin-login
   - Should load the admin login page ✅

## If Still Not Working

### Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors (red text)
4. Share the error messages

### Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for failed requests (red)
5. Check if `index.html` is being served

### Common Issues

**Issue: 404 Not Found**
- Render is not reading `_redirects` file
- Solution: Use render.yaml routes (already configured)

**Issue: Blank page with no errors**
- JavaScript is crashing
- Solution: Check console for errors

**Issue: Old code is cached**
- Browser cache or Render cache
- Solution: Hard refresh (Ctrl+Shift+R) or clear Render cache

## Current Status

✅ Code is correct
✅ Configuration files are correct
✅ Build is successful
⏳ Waiting for Render to deploy correctly

## Next Steps

1. Clear Render build cache
2. Trigger new deployment
3. Test all pages after deployment
4. If still broken, check Render logs for errors
