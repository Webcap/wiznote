/**
 * List All Subscriptions
 * Show all premium users and their subscription dates from database and Stripe
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

async function listAllSubscriptions() {
  console.log('\n🔍 Listing all premium users...\n');

  try {
    // Get all users with premium subscriptions
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, email, premium, stripe_customer_id')
      .not('premium', 'is', null);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    console.log(`Found ${users.length} users with premium data\n`);
    console.log('='.repeat(100));
    
    for (const user of users || []) {
      if (!user.premium?.isActive) continue;
      
      console.log(`\n👤 User: ${user.email || user.id}`);
      console.log(`   DB Subscription ID: ${user.premium.stripeSubscriptionId || 'N/A'}`);
      console.log(`   DB Period Start: ${user.premium.currentPeriodStart || 'N/A'}`);
      console.log(`   DB Period End: ${user.premium.currentPeriodEnd || 'N/A'}`);
      
      // Check Stripe
      if (user.premium.stripeSubscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(user.premium.stripeSubscriptionId);
          const stripeStart = new Date(sub.current_period_start * 1000);
          const stripeEnd = new Date(sub.current_period_end * 1000);
          
          console.log(`   Stripe Status: ${sub.status}`);
          console.log(`   Stripe Period Start: ${stripeStart.toISOString()}`);
          console.log(`   Stripe Period End: ${stripeEnd.toISOString()}`);
          
          // Check if dates match
          const dbStart = new Date(user.premium.currentPeriodStart);
          const dbEnd = new Date(user.premium.currentPeriodEnd);
          
          const startMatch = Math.abs(stripeStart - dbStart) < 1000;
          const endMatch = Math.abs(stripeEnd - dbEnd) < 1000;
          
          if (!startMatch || !endMatch) {
            console.log(`   ⚠️  DATES DON'T MATCH!`);
            if (!startMatch) {
              console.log(`      Start diff: ${Math.round((stripeStart - dbStart) / 1000 / 3600 / 24)} days`);
            }
            if (!endMatch) {
              console.log(`      End diff: ${Math.round((stripeEnd - dbEnd) / 1000 / 3600 / 24)} days`);
            }
          } else {
            console.log(`   ✅ Dates match`);
          }
        } catch (err) {
          console.log(`   ⚠️  Could not fetch from Stripe: ${err.message}`);
        }
      }
      console.log('-'.repeat(100));
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

listAllSubscriptions()
  .then(() => {
    console.log('\n✅ Done!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Failed:', err);
    process.exit(1);
  });

