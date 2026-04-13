# Complete Banking System Setup Guide

Follow these steps **in order** to set up the banking system:

## Step 1: Quick Setup (REQUIRED)

1. **Open your Supabase project dashboard**
2. **Navigate to**: SQL Editor (in the left sidebar)
3. **Copy the entire contents** of `QUICK_SETUP.sql`
4. **Paste it** into the SQL Editor
5. **Click "Run"** to execute the script
6. **Wait for completion** - you should see success messages

## Step 2: Verify Setup (RECOMMENDED)

1. **In the same SQL Editor**, clear the previous query
2. **Copy the entire contents** of `VERIFY_SETUP.sql`  
3. **Paste it** into the SQL Editor
4. **Click "Run"** to execute the verification
5. **Check the results**:
   - Countries table should have 30+ records
   - Banks table should have 40+ records
   - Functions should all exist
   - View should be accessible

## Step 3: Test the Application (FINAL)

1. **Refresh your application** in the browser
2. **Navigate to**: Bank Accounts page (e.g., `/coach/bank-accounts`)
3. **Verify**:
   - No more "Database Setup Required" messages
   - Country dropdown loads with countries
   - Bank dropdown loads when you select a country
   - You can add a bank account successfully

## Expected Results After Setup

✅ **Countries Available**: 30+ countries including USA, UK, Canada, Australia, Germany, France, Japan, China, India, Brazil, Nigeria, and more

✅ **Banks Available**: 40+ major international banks including:
- **US**: Chase, Bank of America, Wells Fargo, Citibank
- **UK**: Barclays, HSBC, Lloyds, NatWest
- **Canada**: RBC, TD Bank, Scotia Bank, BMO
- **Australia**: Commonwealth Bank, ANZ, Westpac, NAB
- **And many more...**

✅ **Full Banking Features**:
- Add bank accounts with full validation
- Set primary accounts
- Account verification system
- International transfer support (SWIFT/IBAN)
- Withdrawal system integration

## Troubleshooting

### If Step 1 Fails:
- **Check permissions**: Make sure you're logged in as a project owner
- **Check syntax**: Ensure you copied the entire SQL script
- **Check logs**: Look at the Supabase logs for specific error messages

### If Step 2 Shows Missing Data:
- **Re-run Step 1**: The setup script is safe to run multiple times
- **Check foreign keys**: Ensure all relationships were created properly

### If Step 3 Still Shows Errors:
- **Clear browser cache**: Hard refresh the application
- **Check network**: Ensure your app can connect to Supabase
- **Check RLS policies**: Verify Row Level Security allows your operations

## Advanced: Full Global Setup (Optional)

For complete global coverage with 195+ countries:

1. **Use `GLOBAL_BANKING_SYSTEM.sql`** instead of `QUICK_SETUP.sql`
2. **This includes**: All world countries, major banks per country, comprehensive validation
3. **Note**: Larger script, takes longer to run but provides complete global support

## Support

If you encounter issues:
1. Check the browser console for JavaScript errors
2. Check Supabase logs for database errors  
3. Verify all tables and functions were created successfully
4. Ensure your user has proper permissions

The banking system should now be fully operational! 🎉