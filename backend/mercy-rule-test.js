// Mercy Rule Integration Test
// Tests the provider restriction system with mercy window timing logic

import { supabase } from "../src/integrations/supabase/client.js";
import { checkMercyWindowAccess } from "./court-room-integration.js";

/**
 * Test mercy rule timing scenarios
 */
export async function testMercyRuleTiming() {
  console.log('\n🕒 Testing Mercy Rule Timing Logic\n');
  
  const providerId = 'test-mercy-provider';
  const now = new Date();
  
  const scenarios = [
    {
      name: 'Session starting in 15 minutes (should have mercy access)',
      sessionTime: new Date(now.getTime() + 15 * 60 * 1000),
      expectedAccess: true
    },
    {
      name: 'Session started 10 minutes ago (should have mercy access)',
      sessionTime: new Date(now.getTime() - 10 * 60 * 1000),
      expectedAccess: true
    },
    {
      name: 'Session in 45 minutes (should NOT have mercy access)',
      sessionTime: new Date(now.getTime() + 45 * 60 * 1000),
      expectedAccess: false
    },
    {
      name: 'Session ended 35 minutes ago (should NOT have mercy access)',
      sessionTime: new Date(now.getTime() - 35 * 60 * 1000),
      expectedAccess: false
    },
    {
      name: 'Multiple sessions - one within mercy window',
      sessions: [
        new Date(now.getTime() + 60 * 60 * 1000), // 1 hour away
        new Date(now.getTime() + 20 * 60 * 1000), // 20 minutes away (within mercy)
        new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours away
      ],
      expectedAccess: true
    }
  ];
  
  const results = [];
  
  for (const scenario of scenarios) {
    console.log(`Testing: ${scenario.name}`);
    
    try {
      // Clean up any existing test bookings
      await supabase
        .from('bookings')
        .delete()
        .eq('provider_id', providerId)
        .ilike('id', 'test-mercy%');
      
      // Create test booking(s)
      if (scenario.sessions) {
        // Multiple sessions scenario
        const bookings = scenario.sessions.map((sessionTime, index) => ({
          id: `test-mercy-${index}`,
          provider_id: providerId,
          learner_id: 'test-learner-mercy',
          scheduled_at: sessionTime.toISOString(),
          status: 'confirmed'
        }));
        
        await supabase.from('bookings').insert(bookings);
      } else {
        // Single session scenario
        await supabase.from('bookings').insert({
          id: `test-mercy-single`,
          provider_id: providerId,
          learner_id: 'test-learner-mercy',
          scheduled_at: scenario.sessionTime.toISOString(),
          status: 'confirmed'
        });
      }
      
      // Check mercy window access
      const mercyAccess = await checkMercyWindowAccess(providerId);
      
      const passed = mercyAccess.hasAccess === scenario.expectedAccess;
      
      console.log(`  Expected access: ${scenario.expectedAccess}`);
      console.log(`  Actual access: ${mercyAccess.hasAccess}`);
      console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
      
      if (mercyAccess.hasAccess && mercyAccess.activeBooking) {
        console.log(`  Active booking time: ${mercyAccess.activeBooking.scheduled_at}`);
      }
      
      results.push({
        scenario: scenario.name,
        passed,
        expected: scenario.expectedAccess,
        actual: mercyAccess.hasAccess
      });
      
    } catch (error) {
      console.log(`  Error: ${error.message}`);
      results.push({
        scenario: scenario.name,
        passed: false,
        error: error.message
      });
    }
    
    console.log('');
  }
  
  // Clean up test data
  await supabase
    .from('bookings')
    .delete()
    .eq('provider_id', providerId)
    .ilike('id', 'test-mercy%');
  
  // Print summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log('📊 Mercy Rule Test Summary:');
  console.log(`✅ Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All mercy rule timing tests passed!');
  } else {
    console.log('❌ Some mercy rule tests failed:');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`  • ${result.scenario}: ${result.error || `Expected ${result.expected}, got ${result.actual}`}`);
    });
  }
  
  return { passed, total, results };
}

/**
 * Test provider restriction enforcement
 */
export async function testProviderRestrictionEnforcement() {
  console.log('\n🚫 Testing Provider Restriction Enforcement\n');
  
  const providerId = 'test-restricted-provider';
  const caseId = 'test-case-123';
  
  try {
    // Create a test court case with active restrictions
    await supabase.from('provider_restrictions').upsert({
      provider_id: providerId,
      court_case_id: caseId,
      restriction_type: 'dashboard_access',
      is_active: true,
      mercy_rule_enabled: true,
      mercy_window_minutes: 30
    });
    
    console.log('✅ Test restriction created');
    
    // Simulate checking restrictions (this would be called by middleware)
    const { data: restrictions } = await supabase
      .from('provider_restrictions')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_active', true);
    
    const isRestricted = restrictions && restrictions.length > 0;
    
    console.log(`Provider restriction check: ${isRestricted ? '🚫 RESTRICTED' : '✅ ALLOWED'}`);
    
    if (isRestricted) {
      console.log(`Restriction type: ${restrictions[0].restriction_type}`);
      console.log(`Mercy rule enabled: ${restrictions[0].mercy_rule_enabled}`);
      console.log(`Mercy window: ${restrictions[0].mercy_window_minutes} minutes`);
    }
    
    // Test mercy window access
    console.log('\nTesting mercy window access...');
    const mercyAccess = await checkMercyWindowAccess(providerId);
    
    console.log(`Mercy window access: ${mercyAccess.hasAccess ? '✅ GRANTED' : '🚫 DENIED'}`);
    
    // Clean up
    await supabase
      .from('provider_restrictions')
      .delete()
      .eq('provider_id', providerId);
    
    console.log('✅ Test data cleaned up');
    
    return { success: true, isRestricted };
    
  } catch (error) {
    console.error('❌ Provider restriction test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Run all mercy rule tests
 */
export async function runMercyRuleTests() {
  console.log('🧪 Running Mercy Rule Integration Tests');
  
  const timingResults = await testMercyRuleTiming();
  const restrictionResults = await testProviderRestrictionEnforcement();
  
  const allPassed = timingResults.passed === timingResults.total && restrictionResults.success;
  
  console.log('\n' + '='.repeat(50));
  console.log('MERCY RULE TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`Timing Logic: ${timingResults.passed}/${timingResults.total} passed`);
  console.log(`Restriction Enforcement: ${restrictionResults.success ? 'PASS' : 'FAIL'}`);
  console.log(`Overall: ${allPassed ? '🎉 ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return allPassed;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMercyRuleTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(console.error);
}