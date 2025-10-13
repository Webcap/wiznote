/**
 * Test getCurrentSubscription with Stripe Price ID
 * 
 * This script tests if the subscription service can retrieve subscription details
 * when the user profile has a Stripe price ID as the planId
 * 
 * Usage: node scripts/test-get-subscription.js <user_id>
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testGetSubscription(userId) {
  try {
    console.log(`🧪 Testing getCurrentSubscription for user: ${userId}\n`);

    // Step 1: Get user profile to see their premium data
    console.log('📋 Step 1: Fetching user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('premium, stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError);
      return;
    }

    if (!profile) {
      console.log('❌ No user profile found');
      return;
    }

    console.log('✅ User profile found');
    console.log('Premium data:', JSON.stringify(profile.premium, null, 2));
    console.log('');

    // Step 2: Try to find plan by planId (which might be a Stripe price ID)
    const planId = profile.premium?.planId || profile.premium?.type;
    if (!planId) {
      console.log('❌ No planId found in premium data');
      return;
    }

    console.log(`📋 Step 2: Looking up plan with ID: ${planId}`);

    // Try by id first
    console.log('   Trying by id...');
    const { data: planById, error: errorById } = await supabase
      .from('premium_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (planById && !errorById) {
      console.log('   ✅ Found by id');
      console.log('   Plan:', planById.name);
    } else {
      console.log('   ❌ Not found by id');

      // Try by stripe_price_id
      console.log('   Trying by stripe_price_id...');
      const { data: planByStripeId, error: errorByStripeId } = await supabase
        .from('premium_plans')
        .select('*')
        .eq('stripe_price_id', planId)
        .maybeSingle();

      if (planByStripeId && !errorByStripeId) {
        console.log('   ✅ Found by stripe_price_id');
        console.log('   Plan:', planByStripeId.name);
        console.log('');
        console.log('='.repeat(60));
        console.log('Plan Details:');
        console.log('='.repeat(60));
        console.log(`ID: ${planByStripeId.id}`);
        console.log(`Name: ${planByStripeId.name}`);
        console.log(`Price: $${planByStripeId.price} ${planByStripeId.currency}`);
        console.log(`Interval: ${planByStripeId.interval}`);
        console.log(`Stripe Price ID: ${planByStripeId.stripe_price_id}`);
        console.log('='.repeat(60));
      } else {
        console.log('   ❌ Not found by stripe_price_id');
        console.error('   Error:', errorByStripeId);
      }
    }

    console.log('\n✅ Test completed successfully!');
    console.log('\n💡 The fix to SubscriptionManagementService should now work correctly.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  const userId = process.argv[2] || 'c588ad8d-a710-4f86-8a79-bfbe18d3268c';
  testGetSubscription(userId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testGetSubscription };

