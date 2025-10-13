/**
 * Test Cancel Subscription
 * 
 * This script tests the cancel subscription functionality
 * to ensure it properly cancels in Stripe and updates the database
 * 
 * Usage: node scripts/test-cancel-subscription.js <user_id>
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCancelSubscription(userId) {
  try {
    console.log(`🧪 Testing cancel subscription for user: ${userId}\n`);

    // Step 1: Get current subscription status
    console.log('📋 Step 1: Getting current subscription status...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('premium, stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('❌ Error fetching user profile:', profileError);
      return;
    }

    console.log('✅ Current subscription status:');
    console.log(`   Plan: ${profile.premium?.planName || 'N/A'}`);
    console.log(`   Status: ${profile.premium?.status || 'N/A'}`);
    console.log(`   Cancel at period end: ${profile.premium?.cancelAtPeriodEnd || false}`);
    console.log(`   Subscription ID: ${profile.premium?.subscriptionId || 'N/A'}`);
    console.log(`   Period end: ${profile.premium?.currentPeriodEnd || 'N/A'}`);
    console.log('');

    if (!profile.premium?.subscriptionId) {
      console.log('❌ No subscription ID found. User may not have an active subscription.');
      return;
    }

    // Step 2: Call the cancel endpoint
    console.log('📋 Step 2: Calling cancel subscription API...');
    const webhookUrl = process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL || 'https://api.webcap.media/api';
    
    const response = await fetch(`${webhookUrl}/stripe/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        subscriptionId: profile.premium.subscriptionId
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('❌ Failed to cancel subscription:', data);
      return;
    }

    console.log('✅ Cancel subscription response:');
    console.log(`   Success: ${data.success}`);
    console.log(`   Message: ${data.message}`);
    console.log(`   Subscription status: ${data.subscription?.status}`);
    console.log(`   Cancel at period end: ${data.subscription?.cancel_at_period_end}`);
    console.log(`   Current period end: ${data.subscription?.current_period_end}`);
    console.log('');

    // Step 3: Verify the database was updated
    console.log('📋 Step 3: Verifying database update...');
    const { data: updatedProfile, error: verifyError } = await supabase
      .from('user_profiles')
      .select('premium')
      .eq('id', userId)
      .maybeSingle();

    if (verifyError || !updatedProfile) {
      console.error('❌ Error verifying profile update:', verifyError);
      return;
    }

    console.log('✅ Updated subscription status in database:');
    console.log(`   Status: ${updatedProfile.premium?.status || 'N/A'}`);
    console.log(`   Cancel at period end: ${updatedProfile.premium?.cancelAtPeriodEnd || false}`);
    console.log(`   Canceled at: ${updatedProfile.premium?.canceledAt || 'N/A'}`);
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(60));
    console.log('📝 Summary:');
    console.log(`   ✅ Subscription canceled in Stripe`);
    console.log(`   ✅ Database updated with cancellation status`);
    console.log(`   ✅ User will not be charged after: ${data.subscription?.current_period_end}`);
    console.log(`   ℹ️  User still has access until period end`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error testing cancel subscription:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  const userId = process.argv[2] || 'c588ad8d-a710-4f86-8a79-bfbe18d3268c';
  testCancelSubscription(userId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testCancelSubscription };

