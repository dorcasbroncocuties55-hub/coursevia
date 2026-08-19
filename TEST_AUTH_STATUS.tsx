// PASTE THIS INTO ANY PAGE TO TEST AUTH STATUS
// Add this to the top of any component to see what's happening

console.log('=== AUTH DEBUG ===');
console.log('localStorage keys:', Object.keys(localStorage).filter(k => k.includes('auth') || k.startsWith('sb-')));

const authToken = localStorage.getItem('sb-lpvcaukviteexnjzqqeo-auth-token');
console.log('Auth token exists:', !!authToken);

if (authToken) {
  try {
    const parsed = JSON.parse(authToken);
    console.log('User ID:', parsed?.user?.id);
    console.log('User email:', parsed?.user?.email);
    console.log('Token expires:', new Date(parsed?.expires_at * 1000));
  } catch (e) {
    console.log('Token parse error:', e);
  }
}

// Test if user is really logged in
fetch('https://lpvcaukviteexnjzqqeo.supabase.co/rest/v1/profiles?select=user_id&limit=1', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdmNhdWt2aXRlZXhuanpxcWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTQxNDgsImV4cCI6MjA4OTQ5MDE0OH0.rHd16T2wKEUxyu2IWME-faqW-ZlrW8fNCmFaTs1IiV8',
    'Authorization': authToken ? `Bearer ${JSON.parse(authToken).access_token}` : 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdmNhdWt2aXRlZXhuanpxcWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTQxNDgsImV4cCI6MjA4OTQ5MDE0OH0.rHd16T2wKEUxyu2IWME-faqW-ZlrW8fNCmFaTs1IiV8'
  }
})
.then(r => r.json())
.then(data => console.log('API test result:', data))
.catch(e => console.log('API test error:', e));

console.log('==================');

// HOW TO USE:
// 1. Copy this entire block
// 2. Paste at the top of any React component (after imports)
// 3. Check browser console 
// 4. This will tell you exactly what's wrong with auth