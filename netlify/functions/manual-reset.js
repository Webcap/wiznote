/**
 * Manual Usage Reset API Endpoint
 * 
 * This function can be called manually to trigger a usage reset
 * Usage: POST /api/manual-reset with optional API key
 */

const { createClient } = require('@supabase/supabase-js');

// CORS headers helper with Content-Type for JSON responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Optional API key validation - safely parse body
    let body = {};
    if (event.body) {
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (parseError) {
        console.error('❌ Failed to parse request body:', parseError);
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Invalid JSON in request body',
            timestamp: new Date().toISOString()
          })
        };
      }
    }
    const apiKey = body.api_key || event.headers['x-api-key'] || event.headers['X-API-Key'];
    
    if (process.env.USAGE_RESET_API_KEY && apiKey !== process.env.USAGE_RESET_API_KEY) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid API key' })
      };
    }

    console.log('🔄 Manual Usage Reset: Starting...');
    
    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables (need service role key)');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const currentDate = new Date();
    
    console.log(`📅 Manual reset date: ${currentDate.toISOString()}`);

    // Get all usage records
    const { data: allUsage, error: fetchError } = await supabase
      .from('user_feature_usage')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching usage records:', fetchError);
      throw fetchError;
    }

    if (!allUsage || allUsage.length === 0) {
      console.log('✅ No usage records found');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'No usage records found',
          resetCount: 0,
          timestamp: currentDate.toISOString()
        })
      };
    }

    console.log(`📊 Found ${allUsage.length} usage records`);

    // Reset all records (manual reset resets everything)
    let resetCount = 0;
    const errors = [];

    for (const record of allUsage) {
      try {
        // Calculate new period dates based on the record's period type
        const start = new Date(currentDate);
        const end = new Date(currentDate);
        
        switch (record.period_type) {
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

        const { error: updateError } = await supabase
          .from('user_feature_usage')
          .update({
            usage_count: 0,
            usage_duration: 0,
            usage_storage: 0,
            current_period_start: start.toISOString(),
            current_period_end: end.toISOString(),
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
        }
      } catch (error) {
        console.error(`❌ Error processing record for user ${record.user_id}, feature ${record.feature_id}:`, error);
        errors.push(`User ${record.user_id}, Feature ${record.feature_id}: ${error.message}`);
      }
    }

    const response = {
      success: true,
      message: `Manual usage reset completed`,
      resetCount,
      totalRecords: allUsage.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: currentDate.toISOString()
    };

    console.log(`✅ Manual reset completed: ${resetCount}/${allUsage.length} records reset successfully`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('❌ Manual usage reset failed:', error);
    
    // Ensure we always return JSON, even on errors
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    const errorResponse = {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    };
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify(errorResponse)
    };
  }
};
