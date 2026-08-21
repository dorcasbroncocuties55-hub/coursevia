/**
 * Quick API test for refund-to-ban pipeline
 * Run: node test-refund-api.js
 * 
 * Prerequisites:
 * - Backend server running on http://localhost:5000
 * - Valid test user IDs from Supabase
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Replace with actual test IDs from your Supabase
const TEST_LEARNER_ID = 'test-learner-uuid';
const TEST_COACH_ID = 'test-coach-uuid';
const TEST_BOOKING_ID = 'test-booking-uuid';

async function testRefundSubmission() {
  console.log('\n🧪 Testing Refund Submission...\n');

  const payload = {
    booking_id: TEST_BOOKING_ID,
    user_id: TEST_LEARNER_ID,
    reason: 'Service was not delivered as described'
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/refunds/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(json, null, 2));

    if (res.ok && json.success) {
      console.log('\n✅ Refund submitted successfully');
      if (json.refund?.court_case_id) {
        console.log(`✅ Auto-escalated to court room: ${json.refund.court_case_id}`);
      }
    } else {
      console.log('\n❌ Refund submission failed');
    }
  } catch (e) {
    console.error('❌ Request failed:', e.message);
  }
}

async function testProviderRestrictions() {
  console.log('\n🧪 Testing Provider Restrictions API...\n');

  try {
    const res = await fetch(`${BACKEND_URL}/api/court/provider/restrictions/${TEST_COACH_ID}`, {
      headers: { 'x-user-id': TEST_COACH_ID }
    });

    const json = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(json, null, 2));

    if (res.ok) {
      if (json.isRestricted) {
        console.log('\n✅ Provider is RESTRICTED (portal banned)');
        console.log(`   Case: ${json.caseDetails?.caseNumber || 'N/A'}`);
        console.log(`   Amount: $${json.caseDetails?.amount || 0}`);
      } else {
        console.log('\n✅ Provider is NOT restricted (portal accessible)');
      }

      if (json.mercyWindow?.hasAccess) {
        console.log(`   🕐 Mercy window active until ${json.mercyWindow.accessEnd}`);
      }

      if (json.judgeGrantedAccess?.hasAccess) {
        console.log(`   ⚖️  Judge access granted: ${json.judgeGrantedAccess.reason}`);
      }
    } else {
      console.log('\n❌ Restrictions check failed');
    }
  } catch (e) {
    console.error('❌ Request failed:', e.message);
  }
}

async function testCourtCaseRetrieval() {
  console.log('\n🧪 Testing Court Case Retrieval...\n');

  try {
    const res = await fetch(`${BACKEND_URL}/api/court/provider/cases/${TEST_COACH_ID}`, {
      headers: { 'x-user-id': TEST_COACH_ID }
    });

    const json = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(json, null, 2));

    if (res.ok && json.cases) {
      console.log(`\n✅ Found ${json.cases.length} court case(s)`);
      json.cases.forEach(c => {
        console.log(`   - ${c.case_number}: ${c.dispute_type} ($${c.disputed_amount}) - ${c.status}`);
      });
    } else {
      console.log('\n❌ Court case retrieval failed');
    }
  } catch (e) {
    console.error('❌ Request failed:', e.message);
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Coursevia Refund-to-Ban Pipeline API Tests');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Backend: ${BACKEND_URL}`);
  console.log(`Learner ID: ${TEST_LEARNER_ID}`);
  console.log(`Coach ID: ${TEST_COACH_ID}`);
  console.log(`Booking ID: ${TEST_BOOKING_ID}`);
  console.log('═══════════════════════════════════════════════════════');

  if (TEST_LEARNER_ID === 'test-learner-uuid') {
    console.log('\n⚠️  WARNING: Using placeholder test IDs!');
    console.log('   Update TEST_LEARNER_ID, TEST_COACH_ID, and TEST_BOOKING_ID');
    console.log('   with real UUIDs from your Supabase database.\n');
  }

  // Test 1: Check provider restrictions (should be unrestricted initially)
  await testProviderRestrictions();

  // Test 2: Submit refund request (triggers court room escalation)
  await testRefundSubmission();

  // Wait 2 seconds for DB writes
  console.log('\n⏳ Waiting 2s for court room escalation...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Check provider restrictions again (should now be restricted)
  await testProviderRestrictions();

  // Test 4: Retrieve court cases
  await testCourtCaseRetrieval();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Tests Complete');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testRefundSubmission, testProviderRestrictions, testCourtCaseRetrieval };
