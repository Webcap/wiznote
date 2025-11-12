import { Platform } from 'react-native';
import { featureFlagService } from './FeatureFlagService';
import { featureLimitService } from './FeatureLimitService';
import { supabase } from '../lib/supabase';
import { User, UserPermissions, UserRole } from '../types/User';
import { roleService } from './RoleService';
import { SubscriptionDetails, SubscriptionManagementService } from './SubscriptionManagementService';

export interface InitializationProgress {
  stage: 'profile' | 'feature-flags' | 'feature-limits' | 'preferences' | 'complete';
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface InitializationResult {
  success: boolean;
  user: User | null;
  error?: string;
  progress: InitializationProgress;
}

export type ProgressCallback = (progress: InitializationProgress) => void;

export class AuthInitializationService {
  private static instance: AuthInitializationService;
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private currentProgress: InitializationProgress = {
    stage: 'profile',
    progress: 0,
    message: 'Initializing...',
  };

  private constructor() {}

  static getInstance(): AuthInitializationService {
    if (!AuthInitializationService.instance) {
      AuthInitializationService.instance = new AuthInitializationService();
    }
    return AuthInitializationService.instance;
  }

  /**
   * Register a callback to receive initialization progress updates
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    // Immediately call with current progress
    callback(this.currentProgress);
    
    // Return unsubscribe function
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  /**
   * Notify all registered callbacks of progress updates
   */
  private notifyProgress(progress: InitializationProgress) {
    this.currentProgress = progress;
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('AuthInitializationService: Error in progress callback:', error);
      }
    });
  }

  /**
   * Load user profile from database
   */
  private async loadUserProfile(userId: string): Promise<any | null> {
    const maxRetries = Platform.OS === 'web' ? 2 : 3;
    const retryDelay = 1000;
    const queryTimeoutMs = Platform.OS === 'web' ? 5000 : 15000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`AuthInitializationService: Retrying profile load (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

        const profilePromise = supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database query timeout')), queryTimeoutMs)
        );

        const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('AuthInitializationService: No user profile found');
            return null;
          }

          if (attempt < maxRetries) {
            console.warn(`AuthInitializationService: Profile load failed (attempt ${attempt}/${maxRetries}), retrying...`);
            continue;
          }

          console.error('AuthInitializationService: Error loading user profile:', error);
          return null;
        }

        console.log('AuthInitializationService: User profile loaded successfully');
        return profile;
      } catch (raceError) {
        if (raceError instanceof Error && raceError.message.includes('timeout')) {
          if (attempt < maxRetries) {
            console.warn(`AuthInitializationService: Database query timed out (attempt ${attempt}/${maxRetries}), retrying...`);
            continue;
          }
          console.error('AuthInitializationService: Database query timed out after', maxRetries, 'attempts');
          return null;
        }

        if (attempt === maxRetries) {
          throw raceError;
        }
      }
    }

    console.error('AuthInitializationService: Failed to load user profile after', maxRetries, 'attempts');
    return null;
  }

  /**
   * Initialize all required data for authenticated user
   * Loads: Profile, Feature Flags, Feature Limits (in parallel)
   * Then: Preferences (in background, non-blocking)
   */
  async initialize(
    supabaseUser: any,
    minimalUser: User
  ): Promise<InitializationResult> {
    const startTime = Date.now();
    
    try {
      this.notifyProgress({
        stage: 'profile',
        progress: 10,
        message: 'Loading your profile...',
      });

      // Step 1: Load user profile (required)
      let userProfile = await this.loadUserProfile(supabaseUser.id);

      if (!userProfile) {
        // Profile doesn't exist - try to create it (for new Google OAuth users)
        console.log('AuthInitializationService: No profile found, attempting to create profile for new user');
        try {
          userProfile = await this.createUserProfile(supabaseUser);
          if (!userProfile) {
            console.warn('AuthInitializationService: Failed to create profile');
            return {
              success: false,
              user: minimalUser,
              error: 'User profile not found',
              progress: {
                stage: 'profile',
                progress: 0,
                message: 'Profile not found',
                error: 'User profile not found. Please complete your account setup.',
              },
            };
          }
          console.log('AuthInitializationService: Profile created successfully for new user');
        } catch (createError) {
          console.error('AuthInitializationService: Error creating profile:', createError);
          return {
            success: false,
            user: minimalUser,
            error: 'Failed to create user profile',
            progress: {
              stage: 'profile',
              progress: 0,
              message: 'Failed to create profile',
              error: 'Failed to create user profile. Please try again.',
            },
          };
        }
      }

      const { role, permissions, premium, preferences: normalizedPreferences } = await this.normalizeProfileData(
        supabaseUser,
        userProfile
      );

      // Build full user object from profile
      const fullUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        displayName: userProfile.display_name || supabaseUser.email?.split('@')[0],
        photoURL: supabaseUser.user_metadata?.avatar_url,
        role,
        createdAt: userProfile.created_at ? new Date(userProfile.created_at) : new Date(),
        lastLoginAt: userProfile.last_login_at ? new Date(userProfile.last_login_at) : new Date(),
        preferences: normalizedPreferences,
        premium,
        permissions,
        supportInfo: userProfile.support_info,
      };

      this.notifyProgress({
        stage: 'feature-flags',
        progress: 40,
        message: 'Loading feature settings...',
      });

      // Step 2 & 3: Load feature flags and limits in parallel (both required)
      const [flagsResult, limitsResult] = await Promise.allSettled([
        featureFlagService.initialize(true), // true = isAuthenticated
        featureLimitService.initialize(),
      ]);

      // Check for failures
      if (flagsResult.status === 'rejected') {
        console.error('AuthInitializationService: Feature flags load failed:', flagsResult.reason);
        // Don't fail initialization, but log the error
      }

      if (limitsResult.status === 'rejected') {
        console.error('AuthInitializationService: Feature limits load failed:', limitsResult.reason);
        // Don't fail initialization, but log the error
      }

      this.notifyProgress({
        stage: 'preferences',
        progress: 80,
        message: 'Loading your preferences...',
      });

      // Step 4: Ensure preferences are loaded (they should already be in fullUser from profile)
      // But verify they exist - if not, set defaults
      // CRITICAL: Theme must always be defined to avoid white flash
      if (!fullUser.preferences) {
        console.warn('AuthInitializationService: Preferences not found in profile, setting defaults');
        fullUser.preferences =
          normalizedPreferences ||
          {
            theme: 'auto',
            language: 'en',
            autoSync: true,
            notifications: true,
          };
      } else if (!fullUser.preferences.theme) {
        // Ensure theme is always defined even if preferences object exists
        console.warn('AuthInitializationService: Theme not found in preferences, setting default');
        fullUser.preferences.theme = 'auto';
      }
      
      // Log preferences for debugging
      console.log('AuthInitializationService: Preferences loaded with theme:', fullUser.preferences.theme);

      // Update last login time in background (don't block)
      this.updateLastLogin(supabaseUser.id).catch(error => {
        console.warn('AuthInitializationService: Failed to update last login:', error);
      });

      const elapsed = Date.now() - startTime;
      console.log(`AuthInitializationService: Initialization complete in ${elapsed}ms`);

      this.notifyProgress({
        stage: 'complete',
        progress: 100,
        message: 'Ready!',
      });

      return {
        success: true,
        user: fullUser,
        progress: {
          stage: 'complete',
          progress: 100,
          message: 'Initialization complete',
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during initialization';
      console.error('AuthInitializationService: Initialization error:', error);

      this.notifyProgress({
        stage: 'profile',
        progress: 0,
        message: 'Initialization failed',
        error: errorMessage,
      });

      return {
        success: false,
        user: minimalUser,
        error: errorMessage,
        progress: {
          stage: 'profile',
          progress: 0,
          message: 'Initialization failed',
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Normalize role, permissions, and premium information to guarantee downstream UI consistency.
   */
  private async normalizeProfileData(
    supabaseUser: any,
    userProfile: any
  ): Promise<{
    role: UserRole;
    permissions: UserPermissions;
    premium: User['premium'];
    preferences: User['preferences'];
  }> {
    console.log('AuthInitializationService: Raw profile data', {
      role: userProfile.role,
      permissions: userProfile.permissions,
      permissionsType: typeof userProfile.permissions,
    });
    try {
      console.log(
        'AuthInitializationService: Raw profile data (full dump)',
        typeof userProfile === 'object' ? JSON.stringify(userProfile, null, 2) : userProfile
      );
    } catch (dumpError) {
      console.warn('AuthInitializationService: Failed to stringify raw profile data:', dumpError);
    }

    if (Array.isArray(userProfile)) {
      console.warn(
        'AuthInitializationService: Profile payload is array, using first element'
      );
      userProfile = userProfile[0] ?? {};
    }

    let role = this.normalizeRole(userProfile.role);
    let permissions = this.parseJsonField<UserPermissions>(userProfile.permissions);
    let premium = this.deserializePremium(userProfile.premium);
    let preferences = this.parseJsonField<User['preferences']>(userProfile.preferences);

    const updates: Record<string, any> = {};

    if (!role) {
      const metadataRole = this.extractRoleFromSupabaseUser(supabaseUser);
      if (metadataRole) {
        console.log('AuthInitializationService: Resolved role from Supabase metadata:', metadataRole);
        role = metadataRole;
        updates.role = metadataRole;
      }
    }

    if (!permissions) {
      const metadataPermissions = this.extractPermissionsFromSupabaseUser(supabaseUser, role);
      if (metadataPermissions) {
        console.log('AuthInitializationService: Resolved permissions from Supabase metadata');
        permissions = metadataPermissions;
        updates.permissions = metadataPermissions;
      }
    }

    if (!role) {
      role = 'user';
    }

    if (!permissions) {
      permissions = roleService.getDefaultPermissions(role);
    }

    if (permissions?.canAccessAdminPanel) {
      role = 'admin';
    } else if (permissions?.canAccessSupportTools && role !== 'admin') {
      role = 'support';
    }

    console.log('AuthInitializationService: Normalized profile data', {
      role,
      permissions,
    });


    if (!premium || premium.isActive === undefined) {
      premium = await this.resolvePremiumStatus(supabaseUser.id, premium);
      if (premium) {
        updates.premium = this.serializePremiumForStorage(premium);
      }
    }

    if (!preferences) {
      preferences = {
        theme: 'auto',
        language: 'en',
        autoSync: true,
        notifications: true,
        autoKeyDetails: false,
        autoAISummaries: false,
      };
      updates.preferences = preferences;
    }

    if (Object.keys(updates).length > 0) {
      try {
        updates.updated_at = new Date().toISOString();
        await supabase
          .from('user_profiles')
          .update(updates)
          .eq('id', supabaseUser.id);
      } catch (updateError) {
        console.warn('AuthInitializationService: Failed to persist profile normalization updates:', updateError);
      }
    }

    return {
      role: role || 'user',
      permissions: permissions || roleService.getDefaultPermissions('user'),
      premium: premium ?? undefined,
      preferences,
    };
  }

  private normalizeRole(rawRole: any): UserRole | null {
    if (rawRole === null || rawRole === undefined) {
      return null;
    }

    if (typeof rawRole === 'object') {
      if (Array.isArray(rawRole)) {
        for (const item of rawRole) {
          const normalized = this.normalizeRole(item);
          if (normalized) {
            return normalized;
          }
        }
        return null;
      }

      if (typeof rawRole.role !== 'undefined') {
        return this.normalizeRole(rawRole.role);
      }

      if (typeof rawRole.value !== 'undefined') {
        return this.normalizeRole(rawRole.value);
      }

      if (typeof rawRole.type !== 'undefined') {
        return this.normalizeRole(rawRole.type);
      }

      const stringified = JSON.stringify(rawRole);
      if (stringified && stringified !== '{}' && stringified !== '[]') {
        return this.normalizeRole(stringified);
      }

      return null;
    }

    let stringValue = String(rawRole).trim();

    if (
      (stringValue.startsWith('"') && stringValue.endsWith('"')) ||
      (stringValue.startsWith("'") && stringValue.endsWith("'"))
    ) {
      stringValue = stringValue.slice(1, -1).trim();
    }

    if (stringValue.startsWith('{') || stringValue.startsWith('[')) {
      try {
        const parsed = JSON.parse(stringValue);
        return this.normalizeRole(parsed);
      } catch (error) {
        console.warn('AuthInitializationService: Failed to parse role JSON string:', error);
      }
    }

    const lower = stringValue.toLowerCase();
    if (lower === 'admin' || lower === 'support' || lower === 'user') {
      return lower as UserRole;
    }
    return null;
  }

  private parseJsonField<T>(value: T | string | null | undefined): T | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        console.warn('AuthInitializationService: Failed to parse JSON field', error);
        return undefined;
      }
    }

    return value as T;
  }

  private deserializePremium(raw: any): User['premium'] | undefined {
    if (!raw) return undefined;

    const premiumObject = typeof raw === 'string' ? this.parseJsonField<User['premium']>(raw) : raw;
    if (!premiumObject) {
      return undefined;
    }

    return {
      isActive: premiumObject.isActive,
      planId: premiumObject.planId,
      currentPeriodStart: premiumObject.currentPeriodStart ? new Date(premiumObject.currentPeriodStart) : undefined,
      currentPeriodEnd: premiumObject.currentPeriodEnd ? new Date(premiumObject.currentPeriodEnd) : undefined,
      trialStart: premiumObject.trialStart ? new Date(premiumObject.trialStart) : undefined,
      trialEnd: premiumObject.trialEnd ? new Date(premiumObject.trialEnd) : undefined,
      status: premiumObject.status,
      type: premiumObject.type,
      renewedAt: premiumObject.renewedAt ? new Date(premiumObject.renewedAt) : undefined,
      expiresAt: premiumObject.expiresAt ? new Date(premiumObject.expiresAt) : undefined,
      updatedAt: premiumObject.updatedAt ? new Date(premiumObject.updatedAt) : undefined,
    };
  }

  private serializePremiumForStorage(premium: User['premium']): Record<string, any> {
    return {
      ...premium,
      currentPeriodStart: premium.currentPeriodStart ? premium.currentPeriodStart.toISOString() : undefined,
      currentPeriodEnd: premium.currentPeriodEnd ? premium.currentPeriodEnd.toISOString() : undefined,
      trialStart: premium.trialStart ? premium.trialStart.toISOString() : undefined,
      trialEnd: premium.trialEnd ? premium.trialEnd.toISOString() : undefined,
      renewedAt: premium.renewedAt ? premium.renewedAt.toISOString() : undefined,
      expiresAt: premium.expiresAt ? premium.expiresAt.toISOString() : undefined,
      updatedAt: premium.updatedAt ? premium.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  private extractRoleFromSupabaseUser(supabaseUser: any): UserRole | null {
    const roleCandidates = [
      supabaseUser?.user_metadata?.role,
      supabaseUser?.user_metadata?.Role,
      supabaseUser?.user_metadata?.profile?.role,
      supabaseUser?.user_metadata?.roles?.primary,
      supabaseUser?.app_metadata?.role,
      supabaseUser?.app_metadata?.user_role,
      supabaseUser?.app_metadata?.profile?.role,
      supabaseUser?.app_metadata?.roles,
    ];

    for (const candidate of roleCandidates) {
      const normalized = this.normalizeRole(candidate);
      if (normalized) {
        return normalized;
      }
    }

    if (supabaseUser?.app_metadata?.claims_admin === true) {
      return 'admin';
    }

    if (supabaseUser?.app_metadata?.claims_support === true) {
      return 'support';
    }

    return null;
  }

  private extractPermissionsFromSupabaseUser(
    supabaseUser: any,
    inferredRole: UserRole | null
  ): UserPermissions | undefined {
    const permissionCandidates = [
      supabaseUser?.user_metadata?.permissions,
      supabaseUser?.user_metadata?.Permissions,
      supabaseUser?.user_metadata?.profile?.permissions,
      supabaseUser?.app_metadata?.permissions,
      supabaseUser?.app_metadata?.role_permissions,
    ];

    for (const candidate of permissionCandidates) {
      const normalized = this.normalizePermissionsObject(candidate);
      if (normalized) {
        return normalized;
      }
    }

    if (supabaseUser?.app_metadata?.claims_admin === true || inferredRole === 'admin') {
      return roleService.getDefaultPermissions('admin');
    }

    if (supabaseUser?.app_metadata?.claims_support === true || inferredRole === 'support') {
      return roleService.getDefaultPermissions('support');
    }

    return undefined;
  }

  private normalizePermissionsObject(source: any): UserPermissions | undefined {
    if (!source) {
      return undefined;
    }

    const parsed =
      typeof source === 'string'
        ? this.parseJsonField<UserPermissions>(source)
        : (source as UserPermissions);

    if (!parsed || typeof parsed !== 'object') {
      return undefined;
    }

    const normalized: UserPermissions = {
      canManageUsers: this.toBoolean((parsed as any).canManageUsers),
      canAccessAdminPanel: this.toBoolean((parsed as any).canAccessAdminPanel),
      canViewAnalytics: this.toBoolean((parsed as any).canViewAnalytics),
      canManageContent: this.toBoolean((parsed as any).canManageContent),
      canAccessSupportTools: this.toBoolean((parsed as any).canAccessSupportTools),
      canViewUserData: this.toBoolean((parsed as any).canViewUserData),
      canManageSystemSettings: this.toBoolean((parsed as any).canManageSystemSettings),
    };

    const hasDefinedField = [
      'canManageUsers',
      'canAccessAdminPanel',
      'canViewAnalytics',
      'canManageContent',
      'canAccessSupportTools',
      'canViewUserData',
      'canManageSystemSettings',
    ].some((key) => Object.prototype.hasOwnProperty.call(parsed, key));

    if (!hasDefinedField) {
      return undefined;
    }

    return normalized;
  }

  private toBoolean(value: any): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private async resolvePremiumStatus(
    userId: string,
    existingPremium?: User['premium']
  ): Promise<User['premium'] | undefined> {
    if (existingPremium && existingPremium.isActive !== undefined) {
      return existingPremium;
    }

    const subscriptionManager = SubscriptionManagementService.getInstance();
    try {
      const subscription = await subscriptionManager.getCurrentSubscription(userId);
      if (!subscription) {
        if (existingPremium) {
          existingPremium.isActive = false;
          return existingPremium;
        }
        return undefined;
      }

      return this.buildPremiumFromSubscription(subscription);
    } catch (error) {
      console.warn('AuthInitializationService: Failed to resolve premium status:', error);
      if (existingPremium) {
        existingPremium.isActive = this.deriveIsActive(existingPremium.status, existingPremium.currentPeriodEnd);
        return existingPremium;
      }
      return undefined;
    }
  }

  private buildPremiumFromSubscription(subscription: SubscriptionDetails): User['premium'] {
    const isActive = this.deriveIsActive(subscription.status, subscription.currentPeriodEnd);
    const interval = subscription.planInterval?.toLowerCase();
    const normalizedInterval =
      interval === 'monthly' || interval === 'weekly' || interval === 'yearly' ? interval : null;

    return {
      isActive,
      planId: subscription.planId,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
      status: subscription.status,
      type: normalizedInterval,
      renewedAt: subscription.nextBillingDate,
      expiresAt: subscription.nextBillingDate,
      updatedAt: new Date(),
    };
  }

  private deriveIsActive(status?: string, periodEnd?: Date): boolean {
    if (!status) {
      if (!periodEnd) return false;
      return periodEnd > new Date();
    }

    const normalized = status.toLowerCase();
    if (normalized === 'active' || normalized === 'trialing' || normalized === 'past_due') {
      return true;
    }

    if (normalized === 'canceled' || normalized === 'incomplete' || normalized === 'unpaid') {
      if (periodEnd) {
        return periodEnd > new Date();
      }
      return false;
    }

    return false;
  }

  /**
   * Load preferences in background (non-blocking)
   */
  private async loadPreferencesInBackground(userId: string): Promise<void> {
    try {
      // This is for any additional settings that aren't in the main profile
      // Currently, preferences are already loaded with the profile
      // This method can be extended for future use
      console.log('AuthInitializationService: Preferences already loaded with profile');
    } catch (error) {
      console.warn('AuthInitializationService: Error loading preferences:', error);
    }
  }

  /**
   * Create user profile for new users
   */
  private async createUserProfile(supabaseUser: any): Promise<any | null> {
    try {
      // Use RoleService if available, otherwise default to 'user'
      let userRole = 'user';
      try {
        const { roleService } = require('./RoleService');
        userRole = roleService.determineUserRole(supabaseUser.email);
      } catch (error) {
        console.warn('AuthInitializationService: RoleService not available, using default role');
      }

      const profileData = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        display_name: supabaseUser.user_metadata?.display_name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0],
        role: userRole,
        preferences: {
          theme: 'auto',
          language: 'en',
          autoSync: true,
          notifications: true,
        },
        premium: {
          isActive: false,
          type: null,
        },
        permissions: {
          canCreateNotes: true,
          canExportNotes: true,
          canShareNotes: true,
        },
        last_login_at: new Date().toISOString(),
      };

      // Try using RPC function first
      try {
        const { data: profile, error: rpcError } = await supabase.rpc('create_user_profile_safe', {
          user_id: supabaseUser.id,
          user_email: supabaseUser.email || '',
          user_display_name: profileData.display_name,
          user_role: userRole,
        });

        if (!rpcError && profile && profile.length > 0) {
          console.log('AuthInitializationService: Profile created via RPC function');
          return profile[0];
        }
      } catch (rpcError) {
        console.warn('AuthInitializationService: RPC function failed, trying direct insert');
      }

      // Fallback to direct insert
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('AuthInitializationService: Error creating profile:', error);
        
        // If profile already exists, try to load it
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          console.log('AuthInitializationService: Profile already exists, loading...');
          return await this.loadUserProfile(supabaseUser.id);
        }
        
        return null;
      }

      return profile;
    } catch (error) {
      console.error('AuthInitializationService: Error creating user profile:', error);
      return null;
    }
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('AuthInitializationService: Error updating last login:', error);
      }
    } catch (error) {
      console.error('AuthInitializationService: Error updating last login:', error);
    }
  }

  /**
   * Get current initialization progress
   */
  getCurrentProgress(): InitializationProgress {
    return { ...this.currentProgress };
  }

  /**
   * Reset initialization state
   */
  reset(): void {
    this.currentProgress = {
      stage: 'profile',
      progress: 0,
      message: 'Initializing...',
    };
    this.notifyProgress(this.currentProgress);
  }
}

// Export singleton instance
export const authInitializationService = AuthInitializationService.getInstance();

