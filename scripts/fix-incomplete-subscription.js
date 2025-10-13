/**
 * Fix Incomplete Subscription Data
 * 
 * This script fetches subscription data from Stripe and updates Supabase
 * with all the missing fields (planId, currentPeriodEnd, etc.)
 * 
 * Usage: node scripts/fix-incomplete-subscription.js <user_id>
 * Or run without args to fix all users with incomplete data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get credentials from environment
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate credentials
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !STRIPE_SECRET_KEY) {
  console.error('\n❌ Error: Missing required environment variables');
  console.log('\nPlease create a .env file in the project root with:');
  console.log('  SUPABASE_URL=your_supabase_url');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key');
  console.log('  STRIPE_SECRET_KEY=your_stripe_secret_key');
  console.log('\nOr set these environment variables before running the script.');
  process.exit(1);
}

const Stripe = require('stripe');
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixUserSubscription(userId) {
  console.log(`\n📋 Fixing subscription for user: ${userId}`);
  console.log('='.repeat(60));

  try {
    // Step 1: Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('❌ User not found:', profileError?.message);
      return false;
    }

    console.log('✅ Found user:', userId);
    console.log('📊 Current premium data:', JSON.stringify(profile.premium, null, 2));

    if (!profile.premium?.stripeSubscriptionId) {
      console.log('⚠️  No Stripe subscription ID found, skipping...');
      return false;
    }

    const subscriptionId = profile.premium.stripeSubscriptionId;
    console.log(`\n🔍 Fetching Stripe subscription: ${subscriptionId}`);

    // Step 2: Get subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product']
    });

    console.log('✅ Found subscription in Stripe');
    console.log('   Status:', subscription.status);
    console.log('   Customer:', subscription.customer);
    console.log('   Current Period:', new Date(subscription.current_period_start * 1000).toISOString(), 
                'to', new Date(subscription.current_period_end * 1000).toISOString());

    // Step 3: Get price ID and find matching plan
    const priceId = subscription.items.data[0]?.price?.id;
    console.log(`\n🔍 Looking for plan with Stripe price ID: ${priceId}`);

    const { data: plans, error: planError } = await supabase
      .from('premium_plans')
      .select('*')
      .eq('stripe_price_id', priceId);

    if (planError) {
      console.error('❌ Error querying plans:', planError.message);
      return false;
    }

    let planId = null;
    if (plans && plans.length > 0) {
      planId = plans[0].id;
      console.log('✅ Found plan:', plans[0].name);
      console.log('   Plan ID:', planId);
      console.log('   Price:', `$${plans[0].price} ${plans[0].currency}`);
      console.log('   Interval:', plans[0].interval);
    } else {
      console.warn('⚠️  No matching plan found in database');
      console.log('   Available plans:');
      const { data: allPlans } = await supabase.from('premium_plans').select('*');
      allPlans?.forEach(p => {
        console.log(`   - ${p.name}: stripe_price_id = ${p.stripe_price_id}`);
      });
      
      // Use price ID as fallback
      planId = priceId;
      console.log(`   Using Stripe price ID as fallback: ${priceId}`);
    }

    // Step 4: Build complete premium object
    const updatedPremium = {
      isActive: ['active', 'trialing'].includes(subscription.status),
      planId: planId,
      type: priceId, // Keep price ID as type for compatibility
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      startedAt: profile.premium?.startedAt || new Date(subscription.created * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add optional fields
    if (subscription.canceled_at) {
      updatedPremium.canceledAt = new Date(subscription.canceled_at * 1000).toISOString();
    }
    
    if (subscription.trial_start) {
      updatedPremium.trialStart = new Date(subscription.trial_start * 1000).toISOString();
    }
    
    if (subscription.trial_end) {
      updatedPremium.trialEnd = new Date(subscription.trial_end * 1000).toISOString();
    }

    console.log('\n📝 Updating user profile with complete data:');
    console.log(JSON.stringify(updatedPremium, null, 2));

    // Step 5: Update user profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        premium: updatedPremium,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Failed to update user profile:', updateError.message);
      return false;
    }

    console.log('\n✅ Successfully updated subscription data!');
    console.log('🎉 User can now manage their subscription in the app.');
    return true;

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.error('   Stripe error - subscription may not exist or API key may be invalid');
    }
    return false;
  }
}

async function fixAllIncompleteSubscriptions() {
  console.log('\n🔍 Searching for users with incomplete subscription data...\n');

  try {
    // Find all users with active premium but missing planId
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, premium')
      .not('premium', 'is', null);

    if (error) {
      console.error('❌ Error querying users:', error.message);
      return;
    }

    const incompleteUsers = users.filter(user => 
      user.premium?.isActive && 
      user.premium?.stripeSubscriptionId &&
      (!user.premium?.planId || !user.premium?.currentPeriodEnd)
    );

    console.log(`Found ${incompleteUsers.length} users with incomplete subscription data:\n`);

    if (incompleteUsers.length === 0) {
      console.log('✅ All subscriptions are complete!');
      return;
    }

    incompleteUsers.forEach(user => {
      console.log(`- User ID: ${user.id}`);
      console.log(`  Subscription: ${user.premium?.stripeSubscriptionId}`);
      console.log(`  Missing: ${!user.premium?.planId ? 'planId ' : ''}${!user.premium?.currentPeriodEnd ? 'currentPeriodEnd' : ''}`);
    });

    console.log('\n' + '='.repeat(60));
    
    let fixed = 0;
    for (const user of incompleteUsers) {
      const success = await fixUserSubscription(user.id);
      if (success) fixed++;
      console.log('='.repeat(60));
    }

    console.log(`\n✅ Fixed ${fixed} out of ${incompleteUsers.length} subscriptions`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Main execution
async function main() {
  console.log('🔧 Fix Incomplete Subscription Data');
  console.log('='.repeat(60));

  const userId = process.argv[2];

  if (userId) {
    // Fix specific user
    await fixUserSubscription(userId);
  } else {
    // Fix all users with incomplete data
    await fixAllIncompleteSubscriptions();
  }

  console.log('\n✅ Done!');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});

