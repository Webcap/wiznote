/**
 * Check User Subscription Dates
 * Compare dates in database vs Stripe
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserDates(userId) {
  console.log(`\n🔍 Checking subscription dates for user: ${userId}`);
  console.log('='.repeat(70));

  try {
    // Get user from database
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('❌ User not found:', error?.message);
      return;
    }

    console.log('\n📊 DATABASE DATA:');
    console.log('User ID:', profile.id);
    console.log('Premium Data:', JSON.stringify(profile.premium, null, 2));

    if (!profile.premium?.stripeSubscriptionId) {
      console.log('⚠️  No Stripe subscription found');
      return;
    }

    const subscriptionId = profile.premium.stripeSubscriptionId;
    console.log('\n🔍 Fetching from Stripe: ' + subscriptionId);
    
    // Get subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    console.log('\n💳 STRIPE DATA:');
    console.log('Subscription ID:', subscription.id);
    console.log('Status:', subscription.status);
    console.log('Cancel at period end:', subscription.cancel_at_period_end);
    
    // Convert Stripe timestamps
    const stripeCurrentPeriodStart = new Date(subscription.current_period_start * 1000);
    const stripeCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);
    
    console.log('\n📅 STRIPE TIMESTAMPS (raw):');
    console.log('current_period_start:', subscription.current_period_start);
    console.log('current_period_end:', subscription.current_period_end);
    
    console.log('\n📅 STRIPE DATES (converted):');
    console.log('Period Start:', stripeCurrentPeriodStart.toISOString());
    console.log('Period End:', stripeCurrentPeriodEnd.toISOString());
    console.log('Period Start (Local):', stripeCurrentPeriodStart.toLocaleString());
    console.log('Period End (Local):', stripeCurrentPeriodEnd.toLocaleString());
    
    console.log('\n📅 DATABASE DATES:');
    console.log('Period Start:', profile.premium.currentPeriodStart);
    console.log('Period End:', profile.premium.currentPeriodEnd);
    
    // Compare dates
    console.log('\n🔄 COMPARISON:');
    const dbStart = new Date(profile.premium.currentPeriodStart || 0);
    const dbEnd = new Date(profile.premium.currentPeriodEnd || 0);
    
    const startMatch = Math.abs(stripeCurrentPeriodStart - dbStart) < 1000; // Within 1 second
    const endMatch = Math.abs(stripeCurrentPeriodEnd - dbEnd) < 1000;
    
    console.log('Start dates match:', startMatch ? '✅' : '❌');
    if (!startMatch) {
      console.log('  Stripe:', stripeCurrentPeriodStart.toISOString());
      console.log('  DB:    ', dbStart.toISOString());
      console.log('  Diff:  ', (stripeCurrentPeriodStart - dbStart) / 1000, 'seconds');
    }
    
    console.log('End dates match:', endMatch ? '✅' : '❌');
    if (!endMatch) {
      console.log('  Stripe:', stripeCurrentPeriodEnd.toISOString());
      console.log('  DB:    ', dbEnd.toISOString());
      console.log('  Diff:  ', (stripeCurrentPeriodEnd - dbEnd) / 1000, 'seconds');
    }

    // Check timezone display
    console.log('\n🌍 TIMEZONE INFO:');
    console.log('Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log('Stripe dates are in UTC (ISO format)');
    console.log('Your local time:', new Date().toLocaleString());

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run check
const userId = process.argv[2] || '8a7f1fbd-2b4f-4f18-87cc-abea09d2ee9f';
checkUserDates(userId)
  .then(() => {
    console.log('\n✅ Done!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Failed:', err);
    process.exit(1);
  });

