/**
 * Sync Billing Dates from Stripe
 * 
 * This script fetches subscription data from Stripe and updates
 * the user profile with the actual billing dates
 * 
 * Usage: node scripts/sync-billing-dates-from-stripe.js [user_id]
 */

require('dotenv').config();
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncBillingDatesFromStripe(userId) {
  try {
    console.log(`🔄 Syncing billing dates from Stripe for user: ${userId || 'all users'}\n`);

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

    console.log(`📋 Found ${profiles.length} profile(s) to sync\n`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const profile of profiles) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing: ${profile.id}`);
      console.log('='.repeat(60));

      if (!profile.premium || !profile.premium.isActive) {
        console.log('⏭️  No active premium subscription, skipping');
        skippedCount++;
        continue;
      }

      const subscriptionId = profile.premium.subscriptionId || profile.premium.stripeSubscriptionId;
      
      if (!subscriptionId) {
        console.log('⚠️  No Stripe subscription ID found, skipping');
        skippedCount++;
        continue;
      }

      console.log(`📦 Subscription ID: ${subscriptionId}`);
      console.log(`💳 Customer ID: ${profile.stripe_customer_id || 'N/A'}`);
      console.log(`📋 Current plan: ${profile.premium.planName || 'Unknown'}`);

      try {
        // Fetch subscription from Stripe
        console.log('\n🔍 Fetching subscription from Stripe...');
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        console.log('✅ Subscription found in Stripe');
        console.log(`   Status: ${subscription.status}`);
        console.log(`   Current period start: ${new Date(subscription.current_period_start * 1000).toISOString()}`);
        console.log(`   Current period end: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
        console.log(`   Cancel at period end: ${subscription.cancel_at_period_end}`);

        // Get the price/plan ID
        const priceId = subscription.items.data[0]?.price?.id;
        console.log(`   Price ID: ${priceId || 'N/A'}`);

        // Update the user profile with actual Stripe data
        const updatedPremium = {
          ...profile.premium,
          subscriptionId: subscription.id,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          planId: priceId || profile.premium.planId,
        };

        // Add trial dates if they exist
        if (subscription.trial_start) {
          updatedPremium.trialStart = new Date(subscription.trial_start * 1000).toISOString();
        }
        if (subscription.trial_end) {
          updatedPremium.trialEnd = new Date(subscription.trial_end * 1000).toISOString();
        }

        // Add canceled date if exists
        if (subscription.canceled_at) {
          updatedPremium.canceledAt = new Date(subscription.canceled_at * 1000).toISOString();
        }

        console.log('\n💾 Updating user profile in Supabase...');
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            premium: updatedPremium,
            stripe_customer_id: subscription.customer,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error('❌ Error updating profile:', updateError.message);
          errorCount++;
        } else {
          console.log('✅ Successfully synced billing dates from Stripe');
          syncedCount++;
        }

      } catch (stripeError) {
        console.error('❌ Error fetching from Stripe:', stripeError.message);
        if (stripeError.code === 'resource_missing') {
          console.log('   Subscription not found in Stripe (may have been deleted)');
        }
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Synced: ${syncedCount} profile(s)`);
    console.log(`⏭️  Skipped: ${skippedCount} profile(s)`);
    console.log(`❌ Errors: ${errorCount} profile(s)`);
    console.log(`📦 Total: ${profiles.length} profile(s)`);
    console.log('='.repeat(60) + '\n');

    if (syncedCount > 0) {
      console.log('✅ Billing dates synced successfully from Stripe!');
    } else {
      console.log('⚠️  No profiles were synced.');
    }

  } catch (error) {
    console.error('\n❌ Error syncing billing dates:', error);
    process.exit(1);
  }
}

// Run the sync
if (require.main === module) {
  const userId = process.argv[2];
  syncBillingDatesFromStripe(userId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { syncBillingDatesFromStripe };

