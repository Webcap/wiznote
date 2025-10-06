/**
 * Netlify Scheduled Function for Monthly Usage Reset
 * 
 * This function runs automatically on the 1st of every month at 2 AM UTC
 * to reset expired user usage records.
 * 
 * Schedule: "0 2 1 * *" (1st of every month at 2 AM UTC)
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Only allow scheduled events
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Verify this is a scheduled event
  if (!event.headers['x-netlify-scheduled-event']) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized - not a scheduled event' })
    };
  }

  try {
    console.log('🔄 Monthly Usage Reset: Starting scheduled reset...');
    const startTime = new Date();

    // Initialize Supabase client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Usage Reset Service (inline for Netlify function)
    class UsageResetService {
      constructor(supabaseClient) {
        this.supabase = supabaseClient;
      }

      needsReset(usageRecord, currentDate) {
        const periodStart = new Date(usageRecord.current_period_start);
        const periodType = usageRecord.period_type;
        
        switch (periodType) {
          case 'daily':
            return !this.isSameDay(periodStart, currentDate);
          case 'weekly':
            return !this.isSameWeek(periodStart, currentDate);
          case 'monthly':
            return !this.isSameMonth(periodStart, currentDate);
          default:
            return false;
        }
      }

      isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
      }

      isSameWeek(date1, date2) {
        const week1 = this.getWeekNumber(date1);
        const week2 = this.getWeekNumber(date2);
        return week1.year === week2.year && week1.week === week2.week;
      }

      isSameMonth(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth();
      }

      getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return {
          year: d.getUTCFullYear(),
          week: Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
        };
      }

      calculateNewPeriod(periodType, currentDate) {
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
      }

      async checkAndResetExpiredUsage() {
        const currentDate = new Date();
        const results = {
          totalChecked: 0,
          totalReset: 0,
          errors: []
        };

        // Get all usage records
        const { data: allUsage, error: fetchError } = await this.supabase
          .from('user_feature_usage')
          .select('*');

        if (fetchError) {
          console.error('Error fetching all usage records:', fetchError);
          throw fetchError;
        }

        if (!allUsage || allUsage.length === 0) {
          console.log('No usage records found');
          return results;
        }

        results.totalChecked = allUsage.length;
        console.log(`Checking ${allUsage.length} usage records...`);

        // Group by user for batch processing
        const userGroups = new Map();
        allUsage.forEach(usage => {
          if (!userGroups.has(usage.user_id)) {
            userGroups.set(usage.user_id, []);
          }
          userGroups.get(usage.user_id).push(usage);
        });

        // Process each user's usage records
        for (const [userId, userUsageRecords] of userGroups) {
          try {
            const needsResetRecords = userUsageRecords.filter(record => 
              this.needsReset(record, currentDate)
            );

            if (needsResetRecords.length === 0) {
              continue; // No resets needed for this user
            }

            console.log(`Resetting ${needsResetRecords.length} expired records for user ${userId}`);

            // Reset all expired records for this user
            const resetPromises = needsResetRecords.map(async (usageRecord) => {
              const { start: newPeriodStart, end: newPeriodEnd } = this.calculateNewPeriod(
                usageRecord.period_type,
                currentDate
              );

              return this.supabase
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
                .eq('user_id', userId)
                .eq('feature_id', usageRecord.feature_id);
            });

            const resetResults = await Promise.all(resetPromises);
            
            // Check for errors
            const errors = resetResults.filter(result => result.error);
            if (errors.length > 0) {
              const errorMsg = `Failed to reset ${errors.length} records for user ${userId}`;
              results.errors.push(errorMsg);
              console.error(errorMsg);
            } else {
              results.totalReset += needsResetRecords.length;
              console.log(`✅ Reset ${needsResetRecords.length} records for user ${userId}`);
            }

          } catch (userError) {
            const errorMsg = `Error processing user ${userId}: ${userError}`;
            results.errors.push(errorMsg);
            console.error(errorMsg);
          }
        }

        console.log(`✅ Completed expired usage check. Reset ${results.totalReset} records, ${results.errors.length} errors`);
        return results;
      }

      async getResetStatistics() {
        const currentDate = new Date();
        
        // Get all usage records
        const { data: allUsage, error: fetchError } = await this.supabase
          .from('user_feature_usage')
          .select('*');

        if (fetchError) {
          console.error('Error fetching usage statistics:', fetchError);
          throw fetchError;
        }

        if (!allUsage || allUsage.length === 0) {
          return {
            totalUsers: 0,
            totalFeatures: 0,
            totalUsageRecords: 0,
            expiredRecords: 0
          };
        }

        // Calculate statistics
        const uniqueUsers = new Set(allUsage.map(record => record.user_id));
        const uniqueFeatures = new Set(allUsage.map(record => record.feature_id));
        const expiredRecords = allUsage.filter(record => this.needsReset(record, currentDate)).length;

        return {
          totalUsers: uniqueUsers.size,
          totalFeatures: uniqueFeatures.size,
          totalUsageRecords: allUsage.length,
          expiredRecords
        };
      }
    }

    // Run the reset process
    const resetService = new UsageResetService(supabase);
    const resetResults = await resetService.checkAndResetExpiredUsage();
    const statistics = await resetService.getResetStatistics();
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    const response = {
      success: true,
      message: `Monthly usage reset completed successfully`,
      statistics: {
        ...statistics,
        resetResults,
        duration: Math.round(duration / 1000),
        timestamp: endTime.toISOString()
      },
      errors: resetResults.errors
    };

    console.log('📊 Monthly Reset Results:', response);

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
