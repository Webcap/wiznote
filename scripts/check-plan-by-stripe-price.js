/**
 * Check Plan by Stripe Price ID
 * 
 * This script checks if a plan exists with a specific Stripe price ID
 * 
 * Usage: node scripts/check-plan-by-stripe-price.js <stripe_price_id>
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPlan(stripePriceId) {
  try {
    console.log(`🔍 Searching for plan with Stripe price ID: ${stripePriceId}\n`);

    const { data: plan, error } = await supabase
      .from('premium_plans')
      .select('*')
      .eq('stripe_price_id', stripePriceId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error querying database:', error);
      return;
    }

    if (!plan) {
      console.log('❌ No plan found with that Stripe price ID');
      return;
    }

    console.log('✅ Plan found!');
    console.log('='.repeat(60));
    console.log('Plan Details:');
    console.log('='.repeat(60));
    console.log(`ID: ${plan.id}`);
    console.log(`Name: ${plan.name}`);
    console.log(`Description: ${plan.description || 'N/A'}`);
    console.log(`Price: $${plan.price} ${plan.currency}`);
    console.log(`Interval: ${plan.interval}`);
    console.log(`Plan Type: ${plan.plan_type}`);
    console.log(`Active: ${plan.is_active}`);
    console.log(`Stripe Product ID: ${plan.stripe_product_id || 'N/A'}`);
    console.log(`Stripe Price ID: ${plan.stripe_price_id || 'N/A'}`);
    console.log('='.repeat(60));
    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the check
if (require.main === module) {
  const stripePriceId = process.argv[2] || 'price_1SFNXSJ8pJSkCNufdNODhET9';
  checkPlan(stripePriceId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { checkPlan };

