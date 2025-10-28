/**
 * Find User and Their Subscriptions
 * Look up user by email and check their subscriptions in Stripe and database
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findUserAndSubscriptions(email) {
  console.log(`\n🔍 Looking for user: ${email}\n`);
  console.log('='.repeat(70));

  try {
    // Find user in database
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, premium, stripe_customer_id')
      .eq('email', email);
    
    if (userError || !users || users.length === 0) {
      console.log('❌ User not found in database');
      return;
    }
    
    const user = users[0];
    console.log('\n👤 USER DATA:');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Stripe Customer ID:', user.stripe_customer_id || 'N/A');
    console.log('Premium Active:', user.premium?.isActive || false);
    console.log('Subscription ID:', user.premium?.stripeSubscriptionId || 'N/A');
    
    if (user.premium) {
      console.log('\n📅 DATABASE DATES:');
      console.log('Period Start:', user.premium.currentPeriodStart);
      console.log('Period End:', user.premium.currentPeriodEnd);
      console.log('Status:', user.premium.status);
    }
    
    // Get subscriptions from Stripe
    if (user.stripe_customer_id) {
      console.log('\n💳 STRIPE SUBSCRIPTIONS:');
      
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        limit: 100
      });
      
      console.log(`Found ${subscriptions.data.length} subscription(s) in Stripe\n`);
      
      for (const sub of subscriptions.data) {
        console.log(`Subscription: ${sub.id}`);
        console.log(`  Status: ${sub.status}`);
        console.log(`  Period Start: ${new Date(sub.current_period_start * 1000).toLocaleString()}`);
        console.log(`  Period End: ${new Date(sub.current_period_end * 1000).toLocaleString()}`);
        console.log(`  Cancel at period end: ${sub.cancel_at_period_end}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

// Get email from command line
const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/find-user-subscription.js <user_email>');
  console.error('Example: node scripts/find-user-subscription.js user@example.com');
  process.exit(1);
}

findUserAndSubscriptions(email)
  .then(() => {
    console.log('\n✅ Done!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Failed:', err);
    process.exit(1);
  });

