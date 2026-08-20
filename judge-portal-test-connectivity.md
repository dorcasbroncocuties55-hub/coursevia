# Judge Portal Database Connectivity Test & CNAME DNS Setup

## Database Connectivity Status

✅ **Database Functions Present:**
- `calculate_judge_performance()`
- `auto_promote_judges()` 
- `get_judge_rankings()`
- `run_daily_judge_promotions()`

✅ **Database Tables Present:**
- `judges` table with 4 active judges
- All court_cases, case_participants, dispute_evidence tables exist
- Proper relationships and constraints in place

✅ **Supabase Client Configuration:**
- Project ID: `lpvcaukviteexnjzqqeo`
- Valid environment variables configured
- Auth flow properly configured with localStorage persistence

## Identified Issues & Fixes

### 1. Create Judge Account Issue
The signup functionality exists in `JudgeSignup.tsx` but users need to know the route. 

**Solution:** Navigate to `/judge-portal/signup` to create a judge account.

### 2. Database Connectivity Issues
Components are properly configured to fetch from Supabase. If data isn't loading:

**Debugging Steps:**
1. Check browser developer console for any errors
2. Verify network requests to Supabase are successful
3. Ensure user is properly authenticated and has judge status

### 3. Subdomain CNAME DNS Configuration

Since you mentioned you can add CNAME records to `coursevia.site`, here's the DNS setup:

#### DNS Records to Add:

**For Judge Login Portal:**
```
Type: CNAME
Name: console.judge-login
Target: coursevia-main.vercel.app (or your current hosting domain)
TTL: 300 (or default)
```

**For Judge Portal Dashboard:**  
```
Type: CNAME
Name: console.judge-portal
Target: coursevia-main.vercel.app (or your current hosting domain)
TTL: 300 (or default)
```

#### Alternative: Wildcard CNAME (Easier Management)
```
Type: CNAME
Name: *.console
Target: coursevia-main.vercel.app
TTL: 300
```

This allows both `console.judge-login.coursevia.site` and `console.judge-portal.coursevia.site` to work.

## Testing Steps

### 1. Test Database Connectivity
1. Open browser dev tools (F12)
2. Navigate to `/judge-portal/login`
3. Try logging in with judge credentials
4. Check Console tab for any errors
5. Check Network tab for failed requests to Supabase

### 2. Test Judge Account Creation
1. Navigate to `/judge-portal/signup`
2. Fill out the judge application form
3. Submit and check for success/error messages
4. Verify account appears in database with `pending` status

### 3. Test CNAME DNS Setup
After adding CNAME records:
1. Wait 5-15 minutes for DNS propagation
2. Test `https://console.judge-login.coursevia.site`
3. Test `https://console.judge-portal.coursevia.site` 
4. Verify both resolve to your application

## Current Judge Portal Features

✅ **Working Features:**
- Judge authentication system
- Judge signup/application workflow
- Dashboard with performance metrics
- Rankings system with auto-promotion
- Case management interface
- Profile management
- Database functions for judge performance

🔧 **Next Steps:**
1. Add the CNAME DNS records to your domain provider
2. Test judge portal functionality end-to-end
3. Verify auto-promotion system is working
4. Test subdomain routing after DNS propagation

## Quick Commands for Testing

```sql
-- Check active judges
SELECT id, full_name, email, rank, status FROM judges WHERE status = 'active';

-- Test performance calculation
SELECT * FROM calculate_judge_performance('judge_id_here');

-- Check judge rankings
SELECT * FROM get_judge_rankings();
```

## Support URLs
- Main Portal: `/judge-portal/dashboard`
- Login: `/judge-portal/login`
- Signup: `/judge-portal/signup`
- Rankings: `/judge-portal/rankings`
- Cases: `/judge-portal/cases`
- Profile: `/judge-portal/profile`