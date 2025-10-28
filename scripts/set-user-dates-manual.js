/**
 * Manually Set User Subscription Dates
 * Use this when dates are missing or incorrect in the database
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setDates(email, startDate, endDate) {
  console.log(`\n🔧 Setting dates for: ${email}\n`);

  try {
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email);
    
    if (userError || !users || users.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = users[0];
    console.log('📅 Current dates:');
    console.log('  Start:', user.premium?.currentPeriodStart || 'N/A');
    console.log('  End:', user.premium?.currentPeriodEnd || 'N/A');
    console.log('\n📅 New dates:');
    console.log('  Start:', startDate);
    console.log('  End:', endDate);
    
    const updatedPremium = {
      ...user.premium,
      currentPeriodStart: startDate,
      currentPeriodEnd: endDate,
      updatedAt: new Date().toISOString()
    };
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ premium: updatedPremium })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('❌ Error updating:', updateError.message);
    } else {
      console.log('\n✅ Successfully updated!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

const email = 'solox312@gmail.com';
// Based on Stripe dashboard showing Oct 14 - Nov 14
const startDate = '2025-10-14T00:00:00.000Z';
const endDate = '2025-11-14T00:00:00.000Z';

setDates(email, startDate, endDate)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Failed:', err);
    process.exit(1);
  });

