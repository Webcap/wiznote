import { supabase } from '../lib/supabase';
import { featureLimitService } from './FeatureLimitService';
import { supabaseFeatureService } from './SupabaseFeatureService';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  lastActive: Date;
  premium?: {
    isActive: boolean;
    planName: string;
    expiresAt?: Date;
  };
}

export interface UserFeatureStatus {
  limits: Record<string, any>;
  currentUsage: Record<string, number>;
  remainingQuota: Record<string, number>;
  upgradeRecommendations: string[];
  lastUpdated: Date;
}

export interface LimitOverride {
  id: string;
  userId: string;
  featureId: string;
  originalLimit: number | 'unlimited';
  currentLimit: number | 'unlimited';
  expiresAt: Date;
  grantedBy: string;
  reason: string;
  notes?: string;
  createdAt: Date;
}

export interface FeatureLimitDebugInfo {
  currentState: {
    limit: number | 'unlimited';
    usage: number;
    remaining: number;
    lastReset: Date;
    nextReset: Date;
  };
  cacheStatus: {
    isCached: boolean;
    cacheTimestamp: Date;
    lastInvalidation: Date;
  };
  realTimeStatus: {
    subscriptionActive: boolean;
    lastUpdate: Date;
    connectionHealth: 'healthy' | 'degraded' | 'down';
  };
  recommendations: string[];
}

export class SupportService {
  private static instance: SupportService;

  private constructor() {}

  static getInstance(): SupportService {
    if (!SupportService.instance) {
      SupportService.instance = new SupportService();
    }
    return SupportService.instance;
  }

  // ===== USER FEATURE LIMIT INSPECTOR =====

  /**
   * Search for a user by email, user ID, or username
   */
  async searchUser(query: string): Promise<UserProfile | null> {
    try {
      console.log(`SupportService: Searching for user with query: ${query}`);

      // First, try using the database function to search by email or name
      try {
        const { data: searchResults, error: searchError } = await supabase
          .rpc('search_users_by_email_or_name', { search_query: query });

        if (!searchError && searchResults && searchResults.length > 0) {
          const user = searchResults[0];
          console.log(`SupportService: Found user via RPC:`, user);

          // Now get the full profile
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!profileError && profile) {
            return {
              id: profile.id,
              email: user.email || profile.email || 'Unknown',
              displayName: profile.display_name || user.display_name || 'Unknown User',
              createdAt: new Date(profile.created_at || Date.now()),
              lastActive: new Date(profile.last_login_at || profile.created_at || Date.now()),
              premium: profile.premium ? {
                isActive: profile.premium.isActive || false,
                planName: profile.premium.planName || profile.premium.type || 'Free',
                expiresAt: profile.premium.currentPeriodEnd ? new Date(profile.premium.currentPeriodEnd) : undefined,
              } : {
                isActive: false,
                planName: 'Free',
                expiresAt: undefined,
              },
            };
          }
        }
      } catch (rpcError) {
        console.warn(`SupportService: RPC search failed, falling back to direct search:`, rpcError);
      }

      // Fallback: Check if email column exists in user_profiles and search directly
      const isEmail = query.includes('@');
      if (isEmail) {
        console.log(`SupportService: Email search detected, trying user_profiles.email column for: ${query}`);
        
        try {
          const { data: profile, error: emailError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', query)
            .single();

          if (!emailError && profile) {
            return {
              id: profile.id,
              email: profile.email || query,
              displayName: profile.display_name || query.split('@')[0],
              createdAt: new Date(profile.created_at || Date.now()),
              lastActive: new Date(profile.last_login_at || profile.created_at || Date.now()),
              premium: profile.premium ? {
                isActive: profile.premium.isActive || false,
                planName: profile.premium.planName || profile.premium.type || 'Free',
                expiresAt: profile.premium.currentPeriodEnd ? new Date(profile.premium.currentPeriodEnd) : undefined,
              } : {
                isActive: false,
                planName: 'Free',
                expiresAt: undefined,
              },
            };
          }
        } catch (emailError) {
          console.log(`SupportService: Email column search failed:`, emailError);
        }
      }

      // If not an email, try searching by user ID (UUID format)
      if (query.length === 36 && query.includes('-')) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', query)
            .single();

          if (!profileError && profile) {
            return {
              id: profile.id,
              email: profile.email || profile.id,
              displayName: profile.display_name || 'Unknown User',
              createdAt: new Date(profile.created_at || Date.now()),
              lastActive: new Date(profile.last_login_at || profile.created_at || Date.now()),
              premium: profile.premium ? {
                isActive: profile.premium.isActive || false,
                planName: profile.premium.planName || profile.premium.type || 'Free',
                expiresAt: profile.premium.currentPeriodEnd ? new Date(profile.premium.currentPeriodEnd) : undefined,
              } : {
                isActive: false,
                planName: 'Free',
                expiresAt: undefined,
              },
            };
          }
        } catch (profileError) {
          console.log(`SupportService: Could not find user by ID: ${query}`);
        }
      }

      // Try searching by display name
      try {
        const { data: profiles, error: nameError } = await supabase
          .from('user_profiles')
          .select('*')
          .ilike('display_name', `%${query}%`)
          .limit(1);

        if (!nameError && profiles?.length) {
          const profile = profiles[0];
          return {
            id: profile.id,
            email: profile.id, // Use ID as email since we can't get real email
            displayName: profile.display_name || 'Unknown User',
            createdAt: new Date(profile.created_at || Date.now()),
            lastActive: new Date(profile.last_login_at || profile.created_at || Date.now()),
            premium: profile.premium ? {
              isActive: profile.premium.isActive || false,
              planName: profile.premium.type || 'Free',
              expiresAt: undefined,
            } : {
              isActive: false,
              planName: 'Free',
              expiresAt: undefined,
            },
          };
        }
      } catch (nameError) {
        console.log(`SupportService: Could not find user by display name: ${query}`);
      }

      console.log(`SupportService: No user found for query: ${query}`);
      return null;
    } catch (error) {
      console.error('SupportService: Error searching for user:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive feature status for a user
   */
  async getUserFeatureStatus(userId: string): Promise<UserFeatureStatus> {
    try {
      console.log(`SupportService: Getting feature status for user: ${userId}`);

      // Get all feature limits
      const allLimits = await featureLimitService.getFeatureLimits();
      
      // Get user's current usage for all features
      const currentUsage: Record<string, number> = {};
      const remainingQuota: Record<string, number> = {};
      const upgradeRecommendations: string[] = [];

      for (const limit of allLimits) {
        try {
          const usage = await supabaseFeatureService.getUserFeatureUsage(userId, limit.featureId);
          const usageCount = usage?.currentPeriod?.usage || 0;
          
          currentUsage[limit.featureId] = usageCount;
          
          if (typeof limit.freeUserLimit === 'number') {
            const remaining = Math.max(0, limit.freeUserLimit - usageCount);
            remainingQuota[limit.featureId] = remaining;
            
            // Suggest upgrade if usage is high
            if (usageCount > limit.freeUserLimit * 0.8) {
              upgradeRecommendations.push(
                `Consider upgrading ${limit.featureName} - currently at ${usageCount}/${limit.freeUserLimit} usage`
              );
            }
          } else {
            remainingQuota[limit.featureId] = 'unlimited' as any;
          }
        } catch (error) {
          console.warn(`SupportService: Could not get usage for feature ${limit.featureId}:`, error);
          currentUsage[limit.featureId] = 0;
          remainingQuota[limit.featureId] = typeof limit.freeUserLimit === 'number' ? limit.freeUserLimit : 'unlimited' as any;
        }
      }

      return {
        limits: allLimits,
        currentUsage,
        remainingQuota,
        upgradeRecommendations,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('SupportService: Error getting user feature status:', error);
      throw error;
    }
  }

  /**
   * Get user's plan information
   */
  async getUserPlanInfo(userId: string): Promise<{
    currentPlan: string;
    isPremium: boolean;
    planFeatures: string[];
    nextBillingDate: Date | null;
  }> {
    try {
      console.log(`SupportService: Getting plan info for user: ${userId}`);

      // Get user profile to check premium status
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!userProfile || !userProfile.premium?.isActive) {
        return {
          currentPlan: 'Free',
          isPremium: false,
          planFeatures: ['Basic features'],
          nextBillingDate: null,
        };
      }

      // Get plan details - for now return basic info since plans table might not exist
      const planData = null;

      return {
        currentPlan: userProfile.premium?.type || 'Premium',
        isPremium: true,
        planFeatures: ['All premium features'], // Default for now
        nextBillingDate: null, // Not stored in current schema
      };
    } catch (error) {
      console.error('SupportService: Error getting user plan info:', error);
      throw error;
    }
  }

  // ===== EMERGENCY LIMIT OVERRIDE =====

  /**
   * Grant temporary access to a feature
   */
  async grantTemporaryAccess(
    userId: string,
    featureId: string,
    options: {
      duration: '1hour' | '24hours' | '7days';
      reason: string;
      supportAgentId: string;
      notes?: string;
    }
  ): Promise<LimitOverride> {
    try {
      console.log(`SupportService: Granting temporary access for user ${userId}, feature ${featureId}`);

      // Calculate expiration time
      const now = new Date();
      let expiresAt: Date;
      
      switch (options.duration) {
        case '1hour':
          expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case '24hours':
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '7days':
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }

      // Get current limit
      const currentLimit = await featureLimitService.getFeatureLimit(featureId);
      const originalLimit = currentLimit?.freeUserLimit || 0;

      // Create override record
      const overrideData = {
        id: this.generateOverrideId(),
        user_id: userId,
        feature_id: featureId,
        original_limit: originalLimit,
        current_limit: 'unlimited',
        expires_at: expiresAt.toISOString(),
        granted_by: options.supportAgentId,
        reason: options.reason,
        notes: options.notes,
        created_at: now.toISOString(),
      };

      const { error } = await supabase
        .from('feature_limit_overrides')
        .insert(overrideData);

      if (error) throw error;

      // Force refresh user's limits
      await featureLimitService.forceRefresh();

      console.log(`SupportService: Temporary access granted until ${expiresAt}`);

      return {
        id: overrideData.id,
        userId,
        featureId,
        originalLimit,
        currentLimit: 'unlimited',
        expiresAt,
        grantedBy: options.supportAgentId,
        reason: options.reason,
        notes: options.notes,
        createdAt: now,
      };
    } catch (error) {
      console.error('SupportService: Error granting temporary access:', error);
      throw error;
    }
  }

  /**
   * Get active overrides for a user
   */
  async getActiveOverrides(userId: string): Promise<LimitOverride[]> {
    try {
      console.log(`SupportService: Getting active overrides for user: ${userId}`);

      const { data, error } = await supabase
        .from('feature_limit_overrides')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(override => ({
        id: override.id,
        userId: override.user_id,
        featureId: override.feature_id,
        originalLimit: override.original_limit,
        currentLimit: override.current_limit,
        expiresAt: new Date(override.expires_at),
        grantedBy: override.granted_by,
        reason: override.reason,
        notes: override.notes,
        createdAt: new Date(override.created_at),
      }));
    } catch (error) {
      console.error('SupportService: Error getting active overrides:', error);
      throw error;
    }
  }

  /**
   * Revoke an override early
   */
  async revokeOverride(overrideId: string, reason: string): Promise<void> {
    try {
      console.log(`SupportService: Revoking override: ${overrideId}`);

      const { error } = await supabase
        .from('feature_limit_overrides')
        .update({
          expires_at: new Date().toISOString(),
          notes: `Revoked early: ${reason}`,
        })
        .eq('id', overrideId);

      if (error) throw error;

      // Force refresh user's limits
      await featureLimitService.forceRefresh();

      console.log(`SupportService: Override ${overrideId} revoked successfully`);
    } catch (error) {
      console.error('SupportService: Error revoking override:', error);
      throw error;
    }
  }

  // ===== FEATURE LIMIT DEBUGGER =====

  /**
   * Debug a specific feature limit issue
   */
  async debugFeatureLimit(userId: string, featureId: string): Promise<FeatureLimitDebugInfo> {
    try {
      console.log(`SupportService: Debugging feature limit for user ${userId}, feature ${featureId}`);

      // Get current limit and usage
      const limit = await featureLimitService.getFeatureLimit(featureId);
      const usage = await supabaseFeatureService.getUserFeatureUsage(userId, featureId);

      if (!limit) {
        throw new Error(`Feature limit not found for ${featureId}`);
      }

      const currentUsage = usage?.currentPeriod?.usage || 0;
      const remaining: number | 'unlimited' = typeof limit.freeUserLimit === 'number' ? Math.max(0, limit.freeUserLimit - currentUsage) : 'unlimited';

      // Get cache status
      const cacheStatus = await this.getCacheStatus(featureId);

      // Get real-time status
      const realTimeStatus = await this.getRealTimeStatus(featureId);

      // Generate recommendations
      const recommendations = this.generateDebugRecommendations({
        limit,
        usage,
        cacheStatus,
        realTimeStatus,
      });

      return {
        currentState: {
          limit: limit.freeUserLimit,
          usage: currentUsage,
          remaining: remaining as number,
          lastReset: usage?.lastReset || new Date(),
          nextReset: this.calculateNextReset(limit.freeUserPeriod),
        },
        cacheStatus,
        realTimeStatus,
        recommendations,
      };
    } catch (error) {
      console.error('SupportService: Error debugging feature limit:', error);
      throw error;
    }
  }

  /**
   * Force refresh user's limits
   */
  async forceRefreshUserLimits(userId: string): Promise<{
    success: boolean;
    newLimits: Record<string, any>;
    cacheCleared: boolean;
  }> {
    try {
      console.log(`SupportService: Force refreshing limits for user: ${userId}`);

      // Clear cache and reload
      await featureLimitService.forceRefresh();

      // Get updated limits
      const newLimits = await featureLimitService.getFeatureLimits();

      return {
        success: true,
        newLimits,
        cacheCleared: true,
      };
    } catch (error) {
      console.error('SupportService: Error force refreshing user limits:', error);
      return {
        success: false,
        newLimits: {},
        cacheCleared: false,
      };
    }
  }

  // ===== SUPPORT TICKETS =====

  /**
   * Get all support tickets (admin/support only)
   */
  async getAllSupportTickets(filters?: {
    type?: string;
    status?: string;
    priority?: string;
  }): Promise<Array<{
    id: string;
    type: string;
    status: string;
    priority: string;
    userEmail: string;
    userId: string | null;
    subject: string;
    description: string;
    metadata: any;
    assignedTo: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    try {
      console.log('SupportService: Getting all support tickets');

      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query;

      if (error) {
        console.error('SupportService: Error fetching tickets:', error);
        // If table doesn't exist, return empty array
        if (error.code === '42P01') {
          console.warn('SupportService: support_tickets table does not exist');
          return [];
        }
        throw error;
      }

      return (data || []).map(ticket => ({
        id: ticket.id,
        type: ticket.type,
        status: ticket.status,
        priority: ticket.priority,
        userEmail: ticket.user_email,
        userId: ticket.user_id,
        subject: ticket.subject,
        description: ticket.description,
        metadata: ticket.metadata,
        assignedTo: ticket.assigned_to,
        createdAt: new Date(ticket.created_at),
        updatedAt: new Date(ticket.updated_at),
      }));
    } catch (error) {
      console.error('SupportService: Error getting support tickets:', error);
      throw error;
    }
  }

  /**
   * Update support ticket status
   */
  async updateTicketStatus(
    ticketId: string,
    status: 'pending' | 'in_progress' | 'resolved' | 'closed' | 'cancelled',
    options?: {
      assignedTo?: string;
      resolutionNotes?: string;
      resolvedBy?: string;
    }
  ): Promise<void> {
    try {
      console.log(`SupportService: Updating ticket ${ticketId} to status ${status}`);
      console.log('Update options:', options);

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (options?.assignedTo) {
        updateData.assigned_to = options.assignedTo;
      }

      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
        if (options?.resolvedBy) {
          updateData.resolved_by = options.resolvedBy;
        }
        if (options?.resolutionNotes) {
          updateData.resolution_notes = options.resolutionNotes;
        }
      }

      console.log('Update data:', updateData);

      const { data, error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId)
        .select();

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        
        // If table doesn't exist, provide helpful error
        if (error.code === '42P01') {
          throw new Error('Support tickets table does not exist. Please run database/support-tickets-setup.sql first.');
        }
        
        // If RLS policy blocks the update
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          throw new Error('Permission denied. Check RLS policies or ensure user has admin/support role.');
        }
        
        throw new Error(error.message || 'Failed to update ticket');
      }

      console.log(`SupportService: Ticket ${ticketId} updated successfully`, data);
    } catch (error) {
      console.error('SupportService: Error updating ticket status:', error);
      throw error;
    }
  }

  /**
   * Create an account deletion request ticket
   */
  async createAccountDeletionRequest(data: {
    email: string;
    reason?: string;
    userId?: string; // Optional - for authenticated users
  }): Promise<{
    success: boolean;
    ticketId: string;
    message: string;
  }> {
    try {
      console.log('SupportService: Creating account deletion request for:', data.email);

      const ticketId = `DEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const ticketData = {
        id: ticketId,
        type: 'account_deletion',
        status: 'pending',
        priority: 'high',
        user_email: data.email,
        user_id: data.userId || null,
        subject: 'Account Deletion Request',
        description: data.reason || 'No reason provided',
        metadata: {
          requestType: 'account_deletion',
          dataToDelete: [
            'Account profile',
            'All notes and documents',
            'All preferences and settings',
            'All subscription information',
          ],
          gdprCompliant: true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('support_tickets')
        .insert(ticketData);

      if (error) {
        console.error('SupportService: Database error creating ticket:', error);
        // If table doesn't exist, return success anyway (graceful degradation)
        if (error.code === '42P01') {
          console.warn('SupportService: support_tickets table does not exist, logging request instead');
          console.log('Account Deletion Request:', ticketData);
          return {
            success: true,
            ticketId,
            message: 'Account deletion request logged. You will receive confirmation within 24-48 hours.',
          };
        }
        throw error;
      }

      console.log(`SupportService: Deletion request ticket created: ${ticketId}`);

      return {
        success: true,
        ticketId,
        message: 'Account deletion request submitted successfully. You will receive a confirmation email within 24-48 hours.',
      };
    } catch (error) {
      console.error('SupportService: Error creating account deletion request:', error);
      throw error;
    }
  }

  /**
   * Create a general support ticket
   */
  async createSupportTicket(data: {
    email: string;
    subject: string;
    description: string;
    type: 'technical' | 'billing' | 'feature_request' | 'account_deletion' | 'other';
    userId?: string;
    priority?: 'low' | 'medium' | 'high';
  }): Promise<{
    success: boolean;
    ticketId: string;
    message: string;
  }> {
    try {
      console.log('SupportService: Creating support ticket for:', data.email);

      const ticketId = `TKT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const ticketData = {
        id: ticketId,
        type: data.type,
        status: 'pending',
        priority: data.priority || 'medium',
        user_email: data.email,
        user_id: data.userId || null,
        subject: data.subject,
        description: data.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('support_tickets')
        .insert(ticketData);

      if (error) {
        console.error('SupportService: Database error creating ticket:', error);
        // If table doesn't exist, return success anyway (graceful degradation)
        if (error.code === '42P01') {
          console.warn('SupportService: support_tickets table does not exist, logging request instead');
          console.log('Support Ticket:', ticketData);
          return {
            success: true,
            ticketId,
            message: 'Support request logged. You will receive confirmation soon.',
          };
        }
        throw error;
      }

      console.log(`SupportService: Support ticket created: ${ticketId}`);

      return {
        success: true,
        ticketId,
        message: 'Support ticket submitted successfully. We will respond soon.',
      };
    } catch (error) {
      console.error('SupportService: Error creating support ticket:', error);
      throw error;
    }
  }

  // ===== REAL-TIME USAGE MONITORING =====

  /**
   * Get real-time usage data for all users
   */
  async getRealTimeUsageData(): Promise<{
    activeUsers: number;
    totalUsage: Record<string, number>;
    recentActivity: Array<{
      userId: string;
      userEmail: string;
      featureId: string;
      action: 'used' | 'blocked' | 'upgraded';
      timestamp: Date;
      usageCount: number;
    }>;
    alerts: Array<{
      type: 'high_usage' | 'limit_reached' | 'unusual_activity';
      userId: string;
      userEmail: string;
      featureId: string;
      message: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: Date;
    }>;
  }> {
    try {
      console.log('SupportService: Getting real-time usage data');

      // Get all active users in the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { data: recentUsers, error: usersError } = await supabase
        .from('user_feature_usage')
        .select('user_id, feature_id, usage_count, last_used_at')
        .gte('last_used_at', twentyFourHoursAgo.toISOString())
        .order('last_used_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching usage data:', usersError);
        // Return empty data if table doesn't exist
        if (usersError.code === '42P01') {
          return {
            activeUsers: 0,
            totalUsage: {},
            recentActivity: [],
            alerts: [],
          };
        }
        throw usersError;
      }

      // Get recent activity from the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { data: recentActivity, error: activityError } = await supabase
        .from('user_feature_usage')
        .select('user_id, feature_id, usage_count, last_used_at')
        .gte('last_used_at', oneHourAgo.toISOString())
        .order('last_used_at', { ascending: false });

      if (activityError && activityError.code !== '42P01') throw activityError;

      // Process data
      const activeUsers = new Set(recentUsers?.map(u => u.user_id) || []).size;
      const totalUsage: Record<string, number> = {};
      const recentActivityList: Array<{
        userId: string;
        userEmail: string;
        featureId: string;
        action: 'used' | 'blocked' | 'upgraded';
        timestamp: Date;
        usageCount: number;
      }> = [];

      // Get user emails for activity using the search function
      const userEmailsMap = new Map<string, string>();
      
      // Collect unique user IDs from recent activity
      const uniqueUserIds = [...new Set(recentActivity?.map(a => a.user_id) || [])];
      
      // Fetch user profiles in batches to get emails
      if (uniqueUserIds.length > 0) {
        try {
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, email, display_name')
            .in('id', uniqueUserIds);
          
          if (!profilesError && profiles) {
            // Populate the map with emails or display names as fallback
            profiles.forEach(profile => {
              const emailOrName = profile.email || profile.display_name || profile.id;
              userEmailsMap.set(profile.id, emailOrName);
            });
            
            console.log(`SupportService: Loaded ${profiles.length} user profiles for activity display`);
          } else if (profilesError) {
            console.warn('SupportService: Error loading user profiles for activity:', profilesError);
          }
        } catch (error) {
          console.warn('SupportService: Failed to load user profiles:', error);
        }
      }
      
      // Process recent activity
      for (const activity of recentActivity || []) {
        // Try to get user email (will use user ID as fallback)
        let userEmail = userEmailsMap.get(activity.user_id) || activity.user_id;
        
        recentActivityList.push({
          userId: activity.user_id,
          userEmail: userEmail,
          featureId: activity.feature_id,
          action: 'used',
          timestamp: new Date(activity.last_used_at),
          usageCount: activity.usage_count,
        });

        // Aggregate total usage
        totalUsage[activity.feature_id] = (totalUsage[activity.feature_id] || 0) + activity.usage_count;
      }

      // Generate alerts
      const alerts = await this.generateUsageAlerts(recentUsers || []);

      return {
        activeUsers,
        totalUsage,
        recentActivity: recentActivityList,
        alerts,
      };
    } catch (error) {
      console.error('SupportService: Error getting real-time usage data:', error);
      throw error;
    }
  }

  /**
   * Monitor a specific user's real-time activity
   */
  async monitorUserActivity(userId: string, duration: '1hour' | '24hours' | '7days' = '1hour'): Promise<{
    userId: string;
    userEmail: string;
    activity: Array<{
      featureId: string;
      action: string;
      timestamp: Date;
      usageCount: number;
      limit: number | 'unlimited';
      remaining: number | 'unlimited';
    }>;
    summary: {
      totalActions: number;
      featuresUsed: string[];
      peakUsageTime: Date;
      averageUsagePerHour: number;
    };
  }> {
    try {
      console.log(`SupportService: Monitoring activity for user: ${userId}`);

      // Calculate time range
      const now = new Date();
      let startTime: Date;
      
      switch (duration) {
        case '1hour':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24hours':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7days':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
      }

      // Get user activity
      const { data: activity, error } = await supabase
        .from('user_feature_usage')
        .select(`
          feature_id,
          usage_count,
          last_used_at,
          feature_limits!inner(free_user_limit, free_user_period)
        `)
        .eq('user_id', userId)
        .gte('last_used_at', startTime.toISOString())
        .order('last_used_at', { ascending: false });

      if (error) throw error;

      // Get user email
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      // Process activity
      const activityList = (activity || []).map(item => {
        const limit = item.feature_limits as any;
        const usageCount = item.usage_count;
        const remaining: number | 'unlimited' = typeof limit.free_user_limit === 'number' ? 
          Math.max(0, limit.free_user_limit - usageCount) : 'unlimited';

        return {
          featureId: item.feature_id,
          action: 'feature_used',
          timestamp: new Date(item.last_used_at),
          usageCount,
          limit: limit.free_user_limit,
          remaining,
        };
      });

      // Calculate summary
      const totalActions = activityList.length;
      const featuresUsed = [...new Set(activityList.map(a => a.featureId))];
      const peakUsageTime = activityList.length > 0 ? 
        activityList.reduce((max, current) => 
          current.timestamp > max.timestamp ? current : max
        ).timestamp : now;
      
      const hoursInDuration = duration === '1hour' ? 1 : duration === '24hours' ? 24 : 7 * 24;
      const averageUsagePerHour = totalActions / hoursInDuration;

      return {
        userId,
        userEmail: userData?.email || 'Unknown',
        activity: activityList,
        summary: {
          totalActions,
          featuresUsed,
          peakUsageTime,
          averageUsagePerHour,
        },
      };
    } catch (error) {
      console.error('SupportService: Error monitoring user activity:', error);
      throw error;
    }
  }

  /**
   * Get usage alerts for support agents
   */
  async getUsageAlerts(): Promise<Array<{
    id: string;
    type: 'high_usage' | 'limit_reached' | 'unusual_activity' | 'upgrade_opportunity';
    userId: string;
    userEmail: string;
    featureId: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
    isResolved: boolean;
    resolvedBy?: string;
    resolvedAt?: Date;
    notes?: string;
  }>> {
    try {
      console.log('SupportService: Getting usage alerts');

      // Get all feature limits
      const allLimits = await featureLimitService.getFeatureLimits();
      
      // Get recent usage data
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { data: recentUsage, error } = await supabase
        .from('user_feature_usage')
        .select('user_id, feature_id, usage_count, last_used_at')
        .gte('last_used_at', oneHourAgo.toISOString());

      if (error && error.code !== '42P01') throw error;
      if (!recentUsage) {
        return [];
      }

      const alerts: Array<{
        id: string;
        type: 'high_usage' | 'limit_reached' | 'unusual_activity' | 'upgrade_opportunity';
        userId: string;
        userEmail: string;
        featureId: string;
        message: string;
        severity: 'low' | 'medium' | 'high';
        timestamp: Date;
        isResolved: boolean;
        resolvedBy?: string;
        resolvedAt?: Date;
        notes?: string;
      }> = [];

      // Fetch user emails for alerts
      const userEmailsMap = new Map<string, string>();
      const uniqueUserIds = [...new Set(recentUsage.map(u => u.user_id))];
      
      if (uniqueUserIds.length > 0) {
        try {
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, email, display_name')
            .in('id', uniqueUserIds);
          
          if (!profilesError && profiles) {
            profiles.forEach(profile => {
              const emailOrName = profile.email || profile.display_name || profile.id;
              userEmailsMap.set(profile.id, emailOrName);
            });
            
            console.log(`SupportService: Loaded ${profiles.length} user profiles for usage alerts`);
          } else if (profilesError) {
            console.warn('SupportService: Error loading user profiles for usage alerts:', profilesError);
          }
        } catch (error) {
          console.warn('SupportService: Failed to load user profiles for usage alerts:', error);
        }
      }

      // Check for high usage and limit reached alerts
      for (const usage of recentUsage) {
        const limit = allLimits.find(l => l.featureId === usage.feature_id);
        if (!limit) continue;

        const usageCount = usage.usage_count;
        const limitValue = limit.freeUserLimit;

        if (typeof limitValue !== 'number') continue;
        
        // Get user email from map or fallback to user ID
        const userEmail = userEmailsMap.get(usage.user_id) || usage.user_id;

        // High usage alert (80% of limit)
        if (usageCount >= limitValue * 0.8 && usageCount < limitValue) {
          alerts.push({
            id: `high_${usage.user_id}_${usage.feature_id}`,
            type: 'high_usage',
            userId: usage.user_id,
            userEmail: userEmail,
            featureId: usage.feature_id,
            message: `User is at ${Math.round((usageCount / limitValue) * 100)}% of their ${usage.feature_id} limit`,
            severity: 'medium',
            timestamp: new Date(usage.last_used_at),
            isResolved: false,
          });
        }

        // Limit reached alert
        if (usageCount >= limitValue) {
          alerts.push({
            id: `limit_${usage.user_id}_${usage.feature_id}`,
            type: 'limit_reached',
            userId: usage.user_id,
            userEmail: userEmail,
            featureId: usage.feature_id,
            message: `User has reached their ${usage.feature_id} limit`,
            severity: 'high',
            timestamp: new Date(usage.last_used_at),
            isResolved: false,
          });
        }

        // Upgrade opportunity (high usage over time)
        if (usageCount >= limitValue * 0.6) {
          alerts.push({
            id: `upgrade_${usage.user_id}_${usage.feature_id}`,
            type: 'upgrade_opportunity',
            userId: usage.user_id,
            userEmail: userEmail,
            featureId: usage.feature_id,
            message: `User consistently uses ${Math.round((usageCount / limitValue) * 100)}% of ${usage.feature_id} - upgrade opportunity`,
            severity: 'low',
            timestamp: new Date(usage.last_used_at),
            isResolved: false,
          });
        }
      }

      return alerts;
    } catch (error) {
      console.error('SupportService: Error getting usage alerts:', error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, notes?: string): Promise<void> {
    try {
      console.log(`SupportService: Resolving alert: ${alertId}`);

      // In a real implementation, you'd store this in a database
      // For now, we'll just log it
      console.log(`Alert ${alertId} resolved by ${resolvedBy} with notes: ${notes}`);
    } catch (error) {
      console.error('SupportService: Error resolving alert:', error);
      throw error;
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private generateOverrideId(): string {
    return `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getCacheStatus(featureId: string): Promise<{
    isCached: boolean;
    cacheTimestamp: Date;
    lastInvalidation: Date;
  }> {
    // This would check the actual cache implementation
    // For now, return mock data
    return {
      isCached: true,
      cacheTimestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      lastInvalidation: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    };
  }

  private async getRealTimeStatus(featureId: string): Promise<{
    subscriptionActive: boolean;
    lastUpdate: Date;
    connectionHealth: 'healthy' | 'degraded' | 'down';
  }> {
    // This would check the actual real-time subscription status
    // For now, return mock data
    return {
      subscriptionActive: true,
      lastUpdate: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
      connectionHealth: 'healthy',
    };
  }

  private generateDebugRecommendations(data: any): string[] {
    const recommendations: string[] = [];

    if (data.cacheStatus.isCached && data.cacheStatus.lastInvalidation < new Date(Date.now() - 10 * 60 * 1000)) {
      recommendations.push('Cache may be stale - consider forcing a refresh');
    }

    if (data.realTimeStatus.connectionHealth !== 'healthy') {
      recommendations.push('Real-time connection issues detected - check Supabase status');
    }

    if (data.usage && data.limit && data.usage > data.limit * 0.9) {
      recommendations.push('User is approaching limit - consider temporary override');
    }

    return recommendations;
  }

  private calculateNextReset(period: string): Date {
    const now = new Date();
    const next = new Date(now);

    switch (period) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        next.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(0, 0, 0, 0);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(0, 0, 0, 0);
    }

    return next;
  }

  private async generateUsageAlerts(recentUsers: any[]): Promise<Array<{
    type: 'high_usage' | 'limit_reached' | 'unusual_activity';
    userId: string;
    userEmail: string;
    featureId: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
  }>> {
    const alerts: Array<{
      type: 'high_usage' | 'limit_reached' | 'unusual_activity';
      userId: string;
      userEmail: string;
      featureId: string;
      message: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: Date;
    }> = [];

    // Get all feature limits
    const allLimits = await featureLimitService.getFeatureLimits();

    // Fetch user emails for alert recipients
    const userEmailsMap = new Map<string, string>();
    const uniqueUserIds = [...new Set(recentUsers.slice(0, 10).map(u => u.user_id))];
    
    if (uniqueUserIds.length > 0) {
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, email, display_name')
          .in('id', uniqueUserIds);
        
        if (!profilesError && profiles) {
          profiles.forEach(profile => {
            const emailOrName = profile.email || profile.display_name || profile.id;
            userEmailsMap.set(profile.id, emailOrName);
          });
          
          console.log(`SupportService: Loaded ${profiles.length} user profiles for alerts`);
        } else if (profilesError) {
          console.warn('SupportService: Error loading user profiles for alerts:', profilesError);
        }
      } catch (error) {
        console.warn('SupportService: Failed to load user profiles for alerts:', error);
      }
    }

    // Generate alerts based on actual usage data
    for (const user of recentUsers.slice(0, 10)) {
      const limit = allLimits.find(l => l.featureId === user.feature_id);
      if (!limit || typeof limit.freeUserLimit !== 'number') continue;

      const usageCount = user.usage_count || 0;
      const limitValue = limit.freeUserLimit;
      const percentage = (usageCount / limitValue) * 100;
      
      // Get user email from map or fallback to user ID
      const userEmail = userEmailsMap.get(user.user_id) || user.user_id;

      if (usageCount >= limitValue) {
        alerts.push({
          type: 'limit_reached',
          userId: user.user_id,
          userEmail: userEmail,
          featureId: user.feature_id,
          message: `User has reached ${user.feature_id} limit (${usageCount}/${limitValue})`,
          severity: 'high',
          timestamp: new Date(user.last_used_at),
        });
      } else if (percentage >= 80) {
        alerts.push({
          type: 'high_usage',
          userId: user.user_id,
          userEmail: userEmail,
          featureId: user.feature_id,
          message: `User at ${Math.round(percentage)}% of ${user.feature_id} limit`,
          severity: 'medium',
          timestamp: new Date(user.last_used_at),
        });
      }
    }

    return alerts;
  }
}

// Export singleton instance
export const supportService = SupportService.getInstance();
