/**
 * Import Stripe Plans to Supabase
 * 
 * This script fetches all active products and prices from Stripe
 * and creates corresponding plans in the premium_plans table if they don't exist.
 * 
 * Usage: node scripts/import-stripe-plans.js
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
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importStripePlans() {
  try {
    console.log('🔄 Starting Stripe plan import...\n');

    // Fetch all active products from Stripe
    console.log('📦 Fetching products from Stripe...');
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    console.log(`✅ Found ${products.data.length} active products in Stripe\n`);

    let importedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    // Process each product
    for (const product of products.data) {
      console.log(`\n📦 Processing product: ${product.name} (${product.id})`);

      // Fetch all prices for this product
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 100,
      });

      if (prices.data.length === 0) {
        console.log(`   ⚠️  No active prices found, skipping`);
        skippedCount++;
        continue;
      }

      // Process each price (each price becomes a separate plan)
      for (const price of prices.data) {
        const priceAmount = price.unit_amount ? price.unit_amount / 100 : 0;
        const interval = price.recurring?.interval || 'one-time';
        const planName = `${product.name}${prices.data.length > 1 ? ` - ${interval}` : ''}`;

        console.log(`   💰 Processing price: ${price.id} ($${priceAmount}/${interval})`);

        // Check if plan already exists by stripe_price_id
        const { data: existingPlan, error: checkError } = await supabase
          .from('premium_plans')
          .select('*')
          .eq('stripe_price_id', price.id)
          .maybeSingle();

        if (checkError) {
          console.error(`   ❌ Error checking existing plan:`, checkError.message);
          continue;
        }

        if (existingPlan) {
          console.log(`   ℹ️  Plan already exists, updating: ${existingPlan.id}`);
          
          // Update existing plan
          const { error: updateError } = await supabase
            .from('premium_plans')
            .update({
              name: planName,
              description: product.description || `${planName} subscription`,
              price: priceAmount,
              currency: price.currency.toUpperCase(),
              interval: interval === 'one-time' ? 'monthly' : interval,
              stripe_product_id: product.id,
              stripe_price_id: price.id,
              plan_type: price.recurring ? 'subscription' : 'one-time',
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingPlan.id);

          if (updateError) {
            console.error(`   ❌ Error updating plan:`, updateError.message);
          } else {
            console.log(`   ✅ Updated plan: ${existingPlan.id}`);
            updatedCount++;
          }
        } else {
          // Create new plan
          const newPlan = {
            name: planName,
            description: product.description || `${planName} subscription`,
            price: priceAmount,
            currency: price.currency.toUpperCase(),
            interval: interval === 'one-time' ? 'monthly' : interval,
            stripe_product_id: product.id,
            stripe_price_id: price.id,
            plan_type: price.recurring ? 'subscription' : 'one-time',
            is_active: true,
            trial_days: 0,
            max_users: 1,
            max_storage: 100,
            is_popular: false,
            feature_flags: {
              voice_recording: true,
              premium_features: true,
              advanced_search: true,
              ai_key_details: true,
              ai_summaries: true,
              note_export: true,
              ai_transcription: true,
              note_sharing: true,
              ai_name_generating: true,
              ai_quiz: true,
              ai_flashcards: true,
              ai_chat: true,
              ai_write_essay: true,
              pdf_upload: true,
            },
            limits: {},
            metadata: {
              imported_from_stripe: true,
              import_date: new Date().toISOString(),
            },
            created_by: 'system',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { data: createdPlan, error: createError } = await supabase
            .from('premium_plans')
            .insert(newPlan)
            .select()
            .single();

          if (createError) {
            console.error(`   ❌ Error creating plan:`, createError.message);
          } else {
            console.log(`   ✅ Created new plan: ${createdPlan.id}`);
            importedCount++;
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Imported: ${importedCount} new plans`);
    console.log(`🔄 Updated: ${updatedCount} existing plans`);
    console.log(`⏭️  Skipped: ${skippedCount} products (no active prices)`);
    console.log(`📦 Total processed: ${products.data.length} products`);
    console.log('='.repeat(60) + '\n');

    console.log('✅ Stripe plan import completed successfully!');

  } catch (error) {
    console.error('\n❌ Error importing Stripe plans:', error);
    process.exit(1);
  }
}

// Run the import
if (require.main === module) {
  importStripePlans()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { importStripePlans };

