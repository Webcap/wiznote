/**
 * Fix Billing Dates for Users with "N/A" Values
 * 
 * This script updates user profiles that have "N/A" as their billing dates
 * and sets proper dates based on their plan interval
 * 
 * Usage: node scripts/fix-billing-dates.js [user_id]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixBillingDates(userId) {
  try {
    console.log(`🔧 Fixing billing dates for user: ${userId || 'all users'}\n`);

    // Build query
    let query = supabase
      .from('user_profiles')
      .select('id, premium, stripe_customer_id');

    if (userId) {
      query = query.eq('id', userId);
    }

    const { data: profiles, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching user profiles:', fetchError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ No profiles found');
      return;
    }

    console.log(`📋 Found ${profiles.length} profile(s) to check\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const profile of profiles) {
      if (!profile.premium || !profile.premium.isActive) {
        console.log(`⏭️  Skipping ${profile.id}: No active premium`);
        skippedCount++;
        continue;
      }

      const needsFixing = 
        profile.premium.currentPeriodStart === 'N/A' || 
        profile.premium.currentPeriodEnd === 'N/A' ||
        !profile.premium.currentPeriodStart ||
        !profile.premium.currentPeriodEnd;

      if (!needsFixing) {
        console.log(`✅ ${profile.id}: Dates are valid, skipping`);
        skippedCount++;
        continue;
      }

      console.log(`🔧 Fixing dates for ${profile.id} (${profile.premium.planName || 'Unknown plan'})`);

      // Get plan details to determine interval
      const planId = profile.premium.planId;
      if (!planId) {
        console.log(`   ⚠️  No planId found, skipping`);
        skippedCount++;
        continue;
      }

      // Try to find plan by ID or stripe_price_id
      let plan = null;
      
      const { data: planById } = await supabase
        .from('premium_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();

      if (planById) {
        plan = planById;
      } else {
        const { data: planByStripeId } = await supabase
          .from('premium_plans')
          .select('*')
          .eq('stripe_price_id', planId)
          .maybeSingle();

        if (planByStripeId) {
          plan = planByStripeId;
        }
      }

      if (!plan) {
        console.log(`   ⚠️  Plan not found for planId: ${planId}, skipping`);
        skippedCount++;
        continue;
      }

      // Calculate billing dates based on interval
      const now = new Date();
      const currentPeriodStart = new Date(now);
      const currentPeriodEnd = new Date(now);

      switch (plan.interval) {
        case 'weekly':
          currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 7);
          break;
        case 'monthly':
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
          break;
        case 'yearly':
          currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
          break;
        default:
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      }

      console.log(`   📅 Plan interval: ${plan.interval}`);
      console.log(`   📅 New period start: ${currentPeriodStart.toISOString()}`);
      console.log(`   📅 New period end: ${currentPeriodEnd.toISOString()}`);

      // Update the profile
      const updatedPremium = {
        ...profile.premium,
        currentPeriodStart: currentPeriodStart.toISOString(),
        currentPeriodEnd: currentPeriodEnd.toISOString(),
      };

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          premium: updatedPremium,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error(`   ❌ Error updating profile:`, updateError.message);
      } else {
        console.log(`   ✅ Successfully updated billing dates`);
        fixedCount++;
      }

      console.log('');
    }

    console.log('='.repeat(60));
    console.log('📊 Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Fixed: ${fixedCount} profile(s)`);
    console.log(`⏭️  Skipped: ${skippedCount} profile(s)`);
    console.log(`📦 Total: ${profiles.length} profile(s)`);
    console.log('='.repeat(60) + '\n');

    console.log('✅ Billing dates fixed successfully!');

  } catch (error) {
    console.error('\n❌ Error fixing billing dates:', error);
    process.exit(1);
  }
}

// Run the fix
if (require.main === module) {
  const userId = process.argv[2];
  fixBillingDates(userId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { fixBillingDates };

