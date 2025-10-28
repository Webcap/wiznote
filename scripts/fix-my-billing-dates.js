/**
 * Fix My Billing Dates
 * Manually sync your billing dates from Stripe
 * 
 * This will fetch the actual dates from Stripe and update your database
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('🔧 Environment check:');
console.log('SUPABASE_URL:', SUPABASE_URL ? '✅ Found' : '❌ Missing');
console.log('STRIPE_SECRET:', process.env.STRIPE_SECRET_KEY ? '✅ Found' : '❌ Missing');
console.log('SUPABASE_KEY:', SUPABASE_KEY ? '✅ Found' : '❌ Missing');

if (!SUPABASE_URL || !SUPABASE_KEY || !process.env.STRIPE_SECRET_KEY) {
  console.error('\n❌ Missing required environment variables.');
  console.error('Make sure .env.local or .env file exists with:');
  console.error('  - EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('  - SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY');
  console.error('  - STRIPE_SECRET_KEY');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixMyBillingDates() {
  console.log('\n🔍 Fetching your subscription from Stripe...\n');
  
  try {
    // Get all active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100
    });
    
    console.log(`Found ${subscriptions.data.length} active subscription(s) in Stripe\n`);
    
    for (const subscription of subscriptions.data) {
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer.id;
      
      console.log(`\n📋 Processing subscription: ${subscription.id}`);
      console.log(`   Customer ID: ${customerId}`);
      console.log(`   Status: ${subscription.status}`);
      console.log(`   Period Start: ${new Date(subscription.current_period_start * 1000).toISOString()}`);
      console.log(`   Period End: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
      
      // Find user in database
      const { data: users, error: userError } = await supabase
        .from('user_profiles')
        .select('id, premium, stripe_customer_id')
        .eq('stripe_customer_id', customerId);
      
      if (userError || !users || users.length === 0) {
        console.log('   ⚠️  No user found for this customer');
        continue;
      }
      
      const user = users[0];
      
      console.log(`   ✅ Found user: ${user.id}`);
      console.log(`   Current dates in DB:`);
      console.log(`     Start: ${user.premium?.currentPeriodStart || 'N/A'}`);
      console.log(`     End: ${user.premium?.currentPeriodEnd || 'N/A'}`);
      
      // Update with Stripe dates
      const updatedPremium = {
        ...user.premium,
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        status: subscription.status,
        updatedAt: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          premium: updatedPremium,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('   ❌ Error updating:', updateError.message);
      } else {
        console.log('   ✅ Successfully updated billing dates!');
        console.log(`   New dates:`);
        console.log(`     Start: ${updatedPremium.currentPeriodStart}`);
        console.log(`     End: ${updatedPremium.currentPeriodEnd}`);
      }
    }
    
    console.log('\n✅ Done! Refresh the app to see updated dates.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

fixMyBillingDates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

