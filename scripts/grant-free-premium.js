#!/usr/bin/env node

/**
 * Grant Free Premium Access
 * 
 * This script gives a user free premium access without requiring Stripe payment.
 * 
 * Use cases:
 * - Beta testers
 * - Staff accounts
 * - Promotional/influencer accounts
 * - Lifetime deals
 * - Customer service compensation
 * 
 * The premium won't have a Stripe subscription, but will work in the app.
 * 
 * Usage:
 *   node scripts/grant-free-premium.js <email> [duration_days]
 *   node scripts/grant-free-premium.js user@example.com 365
 *   node scripts/grant-free-premium.js user@example.com lifetime
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

async function grantFreePremium(email, duration) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           GRANT FREE PREMIUM ACCESS                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Find user
    console.log(`🔍 Looking up user: ${email}`);
    
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, premium')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ${user.display_name || user.email}`);
    console.log(`   User ID: ${user.id}`);
    
    // Calculate period end
    const now = new Date();
    let periodEnd;
    
    if (duration === 'lifetime') {
      // 100 years from now = lifetime
      periodEnd = new Date(now.getFullYear() + 100, now.getMonth(), now.getDate());
      console.log(`\n🎁 Granting LIFETIME premium access`);
    } else {
      const days = parseInt(duration) || 365;
      periodEnd = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
      console.log(`\n🎁 Granting premium for ${days} days`);
    }
    
    console.log(`   Valid until: ${periodEnd.toLocaleDateString()}`);
    
    // Get a default plan to use
    const { data: plans } = await supabase
      .from('premium_plans')
      .select('id, name, stripe_price_id')
      .eq('is_active', true)
      .limit(1);
    
    const defaultPlan = plans?.[0];
    const planId = defaultPlan?.id || 'free-premium';
    const planName = defaultPlan?.name || 'Free Premium';
    
    console.log(`   Using plan: ${planName}`);
    
    // Create premium data
    const premiumData = {
      isActive: true,
      planId: planId,
      type: planId,
      status: 'active',
      currentPeriodEnd: periodEnd.toISOString(),
      currentPeriodStart: now.toISOString(),
      cancelAtPeriodEnd: false,
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      // Mark as free/comp access
      isFree: true,
      grantedBy: 'admin',
      grantedAt: now.toISOString(),
      grantedReason: duration === 'lifetime' ? 'lifetime' : `${duration} days free`,
    };
    
    // Update database
    console.log('\n💾 Updating database...');
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        premium: premiumData,
        updated_at: now.toISOString()
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('❌ Error updating database:', updateError.message);
      return;
    }
    
    console.log('✅ Database updated successfully!');
    
    // Verify
    const { data: updatedUser } = await supabase
      .from('user_profiles')
      .select('premium')
      .eq('id', user.id)
      .single();
    
    console.log('\n📊 Premium Status:');
    console.log(`   ✅ isActive: ${updatedUser?.premium?.isActive}`);
    console.log(`   Plan: ${updatedUser?.premium?.planId}`);
    console.log(`   Status: ${updatedUser?.premium?.status}`);
    console.log(`   Valid until: ${new Date(updatedUser?.premium?.currentPeriodEnd).toLocaleDateString()}`);
    console.log(`   Free access: ${updatedUser?.premium?.isFree ? 'Yes' : 'No'}`);
    
    console.log('\n✅ Premium access granted successfully!');
    console.log(`   ${email} now has premium features until ${periodEnd.toLocaleDateString()}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Main
const email = process.argv[2];
const duration = process.argv[3] || '365'; // Default 1 year

if (!email) {
  console.log(`
Grant Free Premium Access

Usage:
  node scripts/grant-free-premium.js <email> [duration]

Arguments:
  email       User email address
  duration    Number of days OR "lifetime" (default: 365)

Examples:
  # 1 year free
  node scripts/grant-free-premium.js user@example.com 365
  
  # 30 days free
  node scripts/grant-free-premium.js user@example.com 30
  
  # Lifetime access
  node scripts/grant-free-premium.js user@example.com lifetime

Use Cases:
  ✅ Beta testers
  ✅ Staff/team accounts
  ✅ Influencers/promoters
  ✅ Customer compensation
  ✅ Lifetime deals
  ✅ Testing

Note:
  - This bypasses Stripe completely
  - User won't be charged
  - No Stripe subscription created
  - Premium expires after duration
  `);
  process.exit(0);
}

grantFreePremium(email, duration);

