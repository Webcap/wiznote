#!/usr/bin/env node

/**
 * List All Premium Plans
 * 
 * Shows all available premium plans from the database.
 * 
 * Usage: node scripts/list-plans.js
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

async function listPlans() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              AVAILABLE PREMIUM PLANS                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const { data: plans, error } = await supabase
      .from('premium_plans')
      .select('*')
      .order('price', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching plans:', error.message);
      return;
    }
    
    if (plans.length === 0) {
      console.log('⚠️  No plans found in database');
      console.log('\n💡 Create plans in Admin → Enhanced Plans');
      return;
    }
    
    plans.forEach((plan, i) => {
      const status = plan.is_active ? '✅ Active' : '❌ Inactive';
      const stripeSync = plan.stripe_price_id ? '✅' : '❌';
      
      console.log(`Plan ${i + 1}: ${plan.name}`);
      console.log(`   ID: ${plan.id}`);
      console.log(`   Price: $${plan.price}/${plan.interval}`);
      console.log(`   Status: ${status}`);
      console.log(`   Stripe Synced: ${stripeSync} ${plan.stripe_price_id || ''}`);
      console.log(`   Description: ${plan.description || 'N/A'}`);
      console.log('');
    });
    
    console.log('═'.repeat(60));
    console.log(`Total Plans: ${plans.length}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listPlans();

