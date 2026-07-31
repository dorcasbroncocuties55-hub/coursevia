# Setup Google OAuth for Coursevia

## Problem
Google sign-in button doesn't work or shows an error.

## Solution: Configure Google OAuth in Supabase

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Choose **Web application**
6. Add these to **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   https://your-production-domain.com
   ```
7. Add these to **Authorized redirect URIs**:
   ```
   https://lpvcaukviteexnjzqqeo.supabase.co/auth/v1/callback
   ```
8. Click **Create**
9. Copy your **Client ID** and **Client Secret**

### Step 2: Configure in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `lpvcaukviteexnjzqqeo`
3. Go to **Authentication → Providers**
4. Find **Google** in the list
5. Toggle it **ON** (Enable)
6. Paste your **Client ID**
7. Paste your **Client Secret**
8. Click **Save**

### Step 3: Configure Redirect URLs in Supabase

1. Still in **Authentication** section, go to **URL Configuration**
2. Under **Redirect URLs**, add:
   ```
   http://localhost:5173/auth/callback
   https://your-production-domain.com/auth/callback
   ```
3. Set **Site URL** to: `http://localhost:5173` (or your production URL)
4. Click **Save**

### Step 4: Test Google OAuth

1. Clear your browser cache (F12 → Application → Clear site data)
2. Go to your login page: `http://localhost:5173/login`
3. Click "Continue with Google"
4. You should see Google's sign-in popup
5. After signing in, you'll be redirected to `/auth/callback`
6. Then redirected to `/onboarding`

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Problem**: The redirect URI doesn't match what's configured in Google Cloud Console

**Solution**: 
1. Check your Google Cloud Console → Credentials → OAuth 2.0 Client IDs
2. Make sure this exact URL is in Authorized redirect URIs:
   ```
   https://lpvcaukviteexnjzqqeo.supabase.co/auth/v1/callback
   ```

### Error: "Access blocked: This app's request is invalid"
**Problem**: Google OAuth consent screen not configured

**Solution**:
1. Go to Google Cloud Console
2. Navigate to **APIs & Services → OAuth consent screen**
3. Fill in required fields (App name, User support email, Developer email)
4. Add your email to **Test users** if app is in testing mode
5. Save

### Error: "Origin not allowed"
**Problem**: Your localhost/domain isn't in authorized origins

**Solution**: Add your domain to **Authorized JavaScript origins** in Google Cloud Console

### Button doesn't do anything
**Problem**: Check browser console for errors

**Solution**:
1. Press F12 → Console tab
2. Look for errors
3. Common issues:
   - CORS errors → Add domain to authorized origins
   - Network errors → Check Supabase project URL in .env
   - "Provider not enabled" → Enable Google in Supabase dashboard

### Still not working?
1. Check Supabase logs: **Database → Logs → Auth Logs**
2. Check browser network tab (F12 → Network) for failed requests
3. Verify your `.env` file has correct values:
   ```
   VITE_SUPABASE_URL=https://lpvcaukviteexnjzqqeo.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Restart your dev server after any .env changes

## Quick Test

Run this in browser console on your login page:
```javascript
console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("Has anon key:", !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

Both should show valid values.
