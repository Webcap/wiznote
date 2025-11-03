/**
 * Netlify Function for Monthly Usage Reset
 * 
 * This function is called automatically by Netlify's scheduled functions
 * on the 1st of every month at 2 AM UTC to reset expired user usage records.
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  console.log('🔄 Monthly Usage Reset: Starting...');
  
  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    
    // Support both new sb_secret_ keys and legacy JWT-based keys
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let supabaseKey;
    if (secretKey && secretKey.startsWith('sb_secret_')) {
      console.log('✅ Using NEW Supabase Secret Key (sb_secret_...)');
      supabaseKey = secretKey;
    } else if (serviceRoleKey) {
      console.log('⚠️  Using legacy Service Role Key (JWT-based)');
      supabaseKey = serviceRoleKey;
    } else {
      console.error('❌ Missing Supabase environment variables');
      console.error('Required: EXPO_PUBLIC_SUPABASE_URL');
      console.error('Required: SUPABASE_SECRET_KEY (sb_secret_...) OR SUPABASE_SERVICE_ROLE_KEY');
      throw new Error('Missing Supabase environment variables (need secret key or service role key)');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const currentDate = new Date();
    
    console.log(`📅 Reset date: ${currentDate.toISOString()}`);

    // Get all usage records
    const { data: allUsage, error: fetchError } = await supabase
      .from('user_feature_usage')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching usage records:', fetchError);
      throw fetchError;
    }

    if (!allUsage || allUsage.length === 0) {
      console.log('✅ No usage records found - nothing to reset');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No usage records found',
          resetCount: 0,
          timestamp: currentDate.toISOString()
        })
      };
    }

    console.log(`📊 Found ${allUsage.length} usage records to check`);

    // Helper function to check if a record needs reset
    const needsReset = (usageRecord) => {
      const periodStart = new Date(usageRecord.current_period_start);
      const periodType = usageRecord.period_type;
      
      switch (periodType) {
        case 'daily':
          return !isSameDay(periodStart, currentDate);
        case 'weekly':
          return !isSameWeek(periodStart, currentDate);
        case 'monthly':
          return !isSameMonth(periodStart, currentDate);
        default:
          return false;
      }
    };

    // Helper functions for date comparison
    const isSameDay = (date1, date2) => {
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getDate() === date2.getDate();
    };

    const isSameWeek = (date1, date2) => {
      const week1 = getWeekNumber(date1);
      const week2 = getWeekNumber(date2);
      return week1.year === week2.year && week1.week === week2.week;
    };

    const isSameMonth = (date1, date2) => {
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth();
    };

    const getWeekNumber = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return {
        year: d.getUTCFullYear(),
        week: Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
      };
    };

    // Calculate new period dates
    const calculateNewPeriod = (periodType, currentDate) => {
      const start = new Date(currentDate);
      const end = new Date(currentDate);
      
      switch (periodType) {
        case 'daily':
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case 'weekly':
          const day = start.getDay();
          const diff = start.getDate() - day + (day === 0 ? -6 : 1);
          start.setDate(diff);
          start.setHours(0, 0, 0, 0);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          break;
        case 'monthly':
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(end.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          break;
      }
      
      return { start, end };
    };

    // Find records that need reset
    const recordsToReset = allUsage.filter(needsReset);
    
    if (recordsToReset.length === 0) {
      console.log('✅ No expired records found - all usage is current');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No expired records found',
          resetCount: 0,
          totalChecked: allUsage.length,
          timestamp: currentDate.toISOString()
        })
      };
    }

    console.log(`🔄 Found ${recordsToReset.length} expired records to reset`);

    // Reset expired records
    let resetCount = 0;
    const errors = [];

    for (const record of recordsToReset) {
      try {
        const { start: newPeriodStart, end: newPeriodEnd } = calculateNewPeriod(
          record.period_type,
          currentDate
        );

        const { error: updateError } = await supabase
          .from('user_feature_usage')
          .update({
            usage_count: 0,
            usage_duration: 0,
            usage_storage: 0,
            current_period_start: newPeriodStart.toISOString(),
            current_period_end: newPeriodEnd.toISOString(),
            last_used_at: currentDate.toISOString(),
            updated_at: currentDate.toISOString()
          })
          .eq('user_id', record.user_id)
          .eq('feature_id', record.feature_id);

        if (updateError) {
          console.error(`❌ Error resetting record for user ${record.user_id}, feature ${record.feature_id}:`, updateError);
          errors.push(`User ${record.user_id}, Feature ${record.feature_id}: ${updateError.message}`);
        } else {
          resetCount++;
          console.log(`✅ Reset usage for user ${record.user_id}, feature ${record.feature_id}`);
        }
      } catch (error) {
        console.error(`❌ Error processing record for user ${record.user_id}, feature ${record.feature_id}:`, error);
        errors.push(`User ${record.user_id}, Feature ${record.feature_id}: ${error.message}`);
      }
    }

    const response = {
      success: true,
      message: `Monthly usage reset completed`,
      resetCount,
      totalChecked: allUsage.length,
      expiredFound: recordsToReset.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: currentDate.toISOString()
    };

    console.log(`✅ Monthly reset completed: ${resetCount}/${recordsToReset.length} records reset successfully`);

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('❌ Monthly usage reset failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
