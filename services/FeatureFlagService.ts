import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_FEATURE_FLAGS } from '../constants/DefaultFeatureFlags';
import { supabase } from '../lib/supabase';
import { FeatureFlag, FeatureFlagKey } from '../types/FeatureFlags';
import { User } from '../types/User';

// Optional environment variable to control FeatureFlagService logging
const enableFeatureFlagServiceLogs = process.env.EXPO_PUBLIC_FEATURE_FLAG_SERVICE_LOGS === 'true';

// Helper function to conditionally log
const log = (message: string, ...args: any[]) => {
  if (enableFeatureFlagServiceLogs) {
    console.log(message, ...args);
  }
};

export class FeatureFlagService {
  private flags: Record<string, FeatureFlag> = {};
  private configVersion: string = '1.0.0';
  private errorHandler?: (message: string, type: 'error' | 'warning' | 'info') => void;
  private readonly LOCAL_STORAGE_KEY = 'feature_flags_cache';
  private readonly LAST_SYNC_KEY = 'feature_flags_last_sync';
  private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Initialize with Supabase
  }

  setErrorHandler(handler: (message: string, type: 'error' | 'warning' | 'info') => void) {
    this.errorHandler = handler;
  }

  // Check if Supabase is available
  private isSupabaseAvailable(): boolean {
    return supabase !== undefined && supabase !== null;
  }

  private handleError(error: any, context: string) {
    const errorMessage = error instanceof Error ? error.message : `Unknown error in ${context}`;
    console.error(`FeatureFlagService: ${context} error:`, error);
    this.errorHandler?.(errorMessage, 'error');
    throw new Error(errorMessage);
  }

  // Enhanced initialization with better caching
  async initialize(isAuthenticated?: boolean): Promise<void> {
    try {
      log('FeatureFlagService: Starting initialization... isAuthenticated:', isAuthenticated);
      
      // Try to load from cache first (fastest)
      await this.loadFromCache();
      
      // Only load from Supabase if user is authenticated
      if (isAuthenticated) {
        log('FeatureFlagService: User authenticated, loading from Supabase...');
        await this.loadFlagsFromSupabase();
      } else {
        log('FeatureFlagService: User not authenticated, skipping Supabase load');
      }
      
      // If no flags loaded (or user not authenticated), ensure we have defaults
      if (Object.keys(this.flags).length === 0) {
        log('FeatureFlagService: No flags loaded, using defaults');
        this.flags = { ...DEFAULT_FEATURE_FLAGS };
        await this.saveToCache();
      }
      
      log('FeatureFlagService: Initialization complete. Flags loaded:', Object.keys(this.flags));
    } catch (error) {
      console.error('FeatureFlagService: Initialization error:', error);
      // Fallback to defaults
      this.flags = { ...DEFAULT_FEATURE_FLAGS };
    }
  }

  // Enhanced cache loading
  private async loadFromCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (cached) {
        const { flags, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < this.CACHE_EXPIRY) {
          // Convert date strings back to Date objects
          Object.values(flags).forEach((flag: any) => {
            if (flag.createdAt) flag.createdAt = new Date(flag.createdAt);
            if (flag.updatedAt) flag.updatedAt = new Date(flag.updatedAt);
          });
          this.flags = flags;
          log('FeatureFlagService: Loaded flags from cache');
        } else {
          log('FeatureFlagService: Cache expired, will reload from Supabase');
        }
      }
    } catch (error) {
      console.warn('FeatureFlagService: Cache load error:', error);
    }
  }

  // Enhanced cache saving
  private async saveToCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify({
        flags: this.flags,
        timestamp: Date.now(),
      }));
      log('FeatureFlagService: Saved flags to cache');
    } catch (error) {
      console.warn('FeatureFlagService: Cache save error:', error);
    }
  }

  // Enhanced Supabase loading
  async loadFlagsFromSupabase(): Promise<void> {
    if (!this.isSupabaseAvailable()) {
      log('FeatureFlagService: Supabase not available, skipping Supabase load');
      return;
    }

    try {
      log('FeatureFlagService: Loading flags from Supabase...');
      
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedFlags: Record<string, FeatureFlag> = {};
      
      if (data && data.length > 0) {
        data.forEach((flag: any) => {
          loadedFlags[flag.id] = {
            id: flag.id,
            name: flag.name,
            description: flag.description,
            enabled: flag.enabled,
            rolloutPercentage: flag.rollout_percentage,
            targetUsers: flag.target_users || [],
            targetRoles: flag.target_roles || [],
            targetEnvironments: flag.target_environments || [],
            premiumOnly: flag.premium_only || false,
            trackingEnabled: flag.tracking_enabled !== undefined ? flag.tracking_enabled : true,
            createdAt: new Date(flag.created_at),
            updatedAt: new Date(flag.updated_at),
            createdBy: flag.created_by,
          };
        });
        
        this.flags = loadedFlags;
        log(`FeatureFlagService: Loaded ${Object.keys(loadedFlags).length} flags from Supabase`);
      } else {
        // No flags in database, use defaults
        log('FeatureFlagService: No flags found in Supabase, using defaults');
        this.flags = { ...DEFAULT_FEATURE_FLAGS };
      }
      
      await this.saveToCache();
    } catch (error) {
      console.error('FeatureFlagService: Error loading from Supabase:', error);
      // On error, fall back to defaults
      this.flags = { ...DEFAULT_FEATURE_FLAGS };
      throw error;
    }
  }

  // Enhanced Supabase saving
  async saveFlagToSupabase(flag: FeatureFlag): Promise<void> {
    if (!this.isSupabaseAvailable()) {
      log('FeatureFlagService: Supabase not available, skipping Supabase save');
      return;
    }

    try {
      const { error } = await supabase
        .from('feature_flags')
        .upsert({
          id: flag.id,
          name: flag.name,
          description: flag.description,
          enabled: flag.enabled,
          rollout_percentage: flag.rolloutPercentage,
          target_users: flag.targetUsers,
          target_roles: flag.targetRoles,
          target_environments: flag.targetEnvironments,
          premium_only: flag.premiumOnly,
          tracking_enabled: flag.trackingEnabled,
          created_by: flag.createdBy,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      // Update local cache
      this.flags[flag.id] = flag;
      await this.saveToCache();
      
      log(`FeatureFlagService: Saved flag ${flag.id} to Supabase`);
    } catch (error) {
      console.error('FeatureFlagService: Error saving to Supabase:', error);
      throw error;
    }
  }

  // Check if a feature is enabled for a user
  isFeatureEnabled(flagKey: FeatureFlagKey, user?: User): boolean {
    const flag = this.flags[flagKey];
    if (!flag) {
      console.warn(`FeatureFlagService: Flag ${flagKey} not found, returning false. Available flags:`, Object.keys(this.flags));
      // For voice_recording, return true as fallback to ensure it works
      if (flagKey === 'voice_recording') {
        log('FeatureFlagService: Voice recording flag not found, allowing access as fallback');
        return true;
      }
      return false;
    }

    log(`FeatureFlagService: Checking ${flagKey} for user:`, user?.id, 'Flag data:', {
      enabled: flag.enabled,
      targetEnvironments: flag.targetEnvironments,
      targetRoles: flag.targetRoles,
      targetUsers: flag.targetUsers,
      premiumOnly: flag.premiumOnly,
      rolloutPercentage: flag.rolloutPercentage
    });

    // Check if flag is globally enabled
    if (!flag.enabled) {
      log(`FeatureFlagService: ${flagKey} - Flag not globally enabled`);
      return false;
    }

    // Check environment targeting
    const currentEnv = this.getCurrentEnvironment();
    if (flag.targetEnvironments && !flag.targetEnvironments.includes(currentEnv)) {
      log(`FeatureFlagService: ${flagKey} - Environment mismatch. Current: ${currentEnv}, Allowed: ${flag.targetEnvironments}`);
      return false;
    }

    // Check user targeting
    if (user) {
      // Check specific user targeting - only if targetUsers is specified and not empty
      if (flag.targetUsers && flag.targetUsers.length > 0 && !flag.targetUsers.includes(user.id)) {
        log(`FeatureFlagService: ${flagKey} - User not in target users. User: ${user.id}, Allowed: ${flag.targetUsers}`);
        return false;
      }

      // Check role targeting
      if (flag.targetRoles && !flag.targetRoles.includes(user.role)) {
        log(`FeatureFlagService: ${flagKey} - Role mismatch. User role: ${user.role}, Allowed roles: ${flag.targetRoles}`);
        return false;
      }

      // Check premium targeting
      log(`FeatureFlagService: ${flagKey} - Checking premium targeting: flag.premiumOnly=${flag.premiumOnly}, user.premium?.isActive=${user.premium?.isActive}`);
      if (flag.premiumOnly && !user.premium?.isActive) {
        log(`FeatureFlagService: ${flagKey} - Premium only feature, user not premium. User premium: ${user.premium?.isActive}`);
        return false;
      }

      // Check rollout percentage
      if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage !== null) {
        const userHash = this.hashUserId(user.id);
        const userPercentage = userHash % 100;
        if (userPercentage >= flag.rolloutPercentage) {
          log(`FeatureFlagService: ${flagKey} - User not in rollout percentage. User %: ${userPercentage}, Rollout %: ${flag.rolloutPercentage}`);
          return false;
        }
      }
    }

    log(`FeatureFlagService: ${flagKey} - All checks passed, feature is enabled`);
    return true;
  }

  // Get all enabled features for a user
  getEnabledFeatures(user?: User): FeatureFlagKey[] {
    return Object.keys(this.flags).filter(flagKey => 
      this.isFeatureEnabled(flagKey as FeatureFlagKey, user)
    ) as FeatureFlagKey[];
  }

  // Get all features that have tracking enabled
  getTrackingEnabledFeatures(): FeatureFlagKey[] {
    return Object.keys(this.flags).filter(flagKey => {
      const flag = this.flags[flagKey];
      return flag && flag.trackingEnabled !== false; // Default to true if not specified
    }) as FeatureFlagKey[];
  }

  // Get all enabled features that have tracking enabled for a user
  getEnabledTrackingFeatures(user?: User): FeatureFlagKey[] {
    return Object.keys(this.flags).filter(flagKey => {
      const flag = this.flags[flagKey];
      return flag && 
             this.isFeatureEnabled(flagKey as FeatureFlagKey, user) && 
             flag.trackingEnabled !== false; // Default to true if not specified
    }) as FeatureFlagKey[];
  }

  // Debug method to list all available flags
  getAllFlags(): Record<string, FeatureFlag> {
    return { ...this.flags };
  }

  // Debug method to check if a specific flag exists
  hasFlag(flagKey: FeatureFlagKey): boolean {
    return flagKey in this.flags;
  }

  // Check if feature is available (enabled and accessible)
  isFeatureAvailable(flagKey: FeatureFlagKey, user?: User): boolean {
    return this.isFeatureEnabled(flagKey, user);
  }

  // Update a feature flag
  async updateFlag(flagKey: FeatureFlagKey, updates: Partial<FeatureFlag>): Promise<void> {
    try {
      const currentFlag = this.flags[flagKey];
      if (!currentFlag) {
        throw new Error(`Feature flag ${flagKey} not found`);
      }

      const updatedFlag: FeatureFlag = {
        ...currentFlag,
        ...updates,
        updatedAt: new Date(),
      };

      // Update local cache
      this.flags[flagKey] = updatedFlag;
      await this.saveToCache();

      // Save to Supabase
      await this.saveFlagToSupabase(updatedFlag);

      log(`FeatureFlagService: Updated flag ${flagKey}`);
    } catch (error) {
      this.handleError(error, 'Update Flag');
    }
  }

  // Save all flags to Supabase
  async saveFlagsToSupabase(): Promise<void> {
    if (!this.isSupabaseAvailable()) {
      log('FeatureFlagService: Supabase not available, skipping Supabase save');
      return;
    }

    try {
      log('FeatureFlagService: Saving all flags to Supabase...');
      
      const flagData = Object.values(this.flags).map(flag => ({
        id: flag.id,
        name: flag.name,
        description: flag.description,
        enabled: flag.enabled,
        rollout_percentage: flag.rolloutPercentage,
        target_users: flag.targetUsers,
        target_roles: flag.targetRoles,
        target_environments: flag.targetEnvironments,
        premium_only: flag.premiumOnly,
        tracking_enabled: flag.trackingEnabled,
        created_by: flag.createdBy,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('feature_flags')
        .upsert(flagData);

      if (error) throw error;

      log(`FeatureFlagService: Saved ${flagData.length} flags to Supabase`);
    } catch (error) {
      this.handleError(error, 'Save Flags to Supabase');
    }
  }

  // Update multiple feature flags at once
  async updateFeatureFlags(featureFlags: Partial<Record<FeatureFlagKey, FeatureFlag>>): Promise<void> {
    if (!this.isSupabaseAvailable()) {
      log('FeatureFlagService: Supabase not available, skipping Supabase update');
      return;
    }

    try {
      log('FeatureFlagService: Starting batch update of feature flags...');
      log('FeatureFlagService: Number of flags to update:', Object.keys(featureFlags).length);
      
      // Check authentication status using getSession (more reliable than getUser)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      log('FeatureFlagService: Session check result:', { session: !!session, error: sessionError });
      
      if (sessionError) {
        console.error('FeatureFlagService: Session error:', sessionError);
        throw new Error('Authentication session error');
      }
      
      if (!session?.user) {
        log('FeatureFlagService: No authenticated session found');
        throw new Error('No authenticated user found');
      }
      
      log('FeatureFlagService: Current Supabase user:', session.user.id);
      log('FeatureFlagService: User authenticated:', !!session.user);
      
      // Check user role
      try {
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          console.error('FeatureFlagService: Supabase error checking user role:', userError);
          throw userError;
        }
        if (userData) {
          log('FeatureFlagService: User role:', userData.role);
          if (userData.role !== 'admin') {
            throw new Error('Only admins can update feature flags');
          }
        }
      } catch (roleError) {
        console.error('FeatureFlagService: Error checking user role:', roleError);
        throw new Error('Unable to verify user permissions');
      }

      // Update each flag
      for (const [flagKey, updates] of Object.entries(featureFlags)) {
        const currentFlag = this.flags[flagKey];
        if (!currentFlag) {
          console.warn(`FeatureFlagService: Flag ${flagKey} not found, skipping`);
          continue;
        }

        const updatedFlag: FeatureFlag = {
          ...currentFlag,
          ...updates,
          updatedAt: new Date(),
        };

        // Update local cache
        this.flags[flagKey] = updatedFlag;

        // Save to Supabase
        await this.saveFlagToSupabase(updatedFlag);
      }

      // Save to cache
      await this.saveToCache();

      log('FeatureFlagService: Batch update completed successfully');
    } catch (error) {
      this.handleError(error, 'Batch Update Feature Flags');
    }
  }

  // Sync with default feature flags
  async syncWithDefaults(): Promise<void> {
    try {
      log('FeatureFlagService: Syncing with default feature flags...');
      
      // Get all default flags
      const defaultFlags = { ...DEFAULT_FEATURE_FLAGS };
      
      // Update local flags with defaults
      for (const [flagKey, defaultFlag] of Object.entries(defaultFlags)) {
        const existingFlag = this.flags[flagKey];
        
        if (existingFlag) {
          // Merge with existing flag, preserving customizations
          this.flags[flagKey] = {
            ...defaultFlag,
            enabled: existingFlag.enabled,
            rolloutPercentage: existingFlag.rolloutPercentage,
            targetUsers: existingFlag.targetUsers,
            targetRoles: existingFlag.targetRoles,
            targetEnvironments: existingFlag.targetEnvironments,
            premiumOnly: existingFlag.premiumOnly,
            updatedAt: new Date(),
          };
        } else {
          // Add new flag
          this.flags[flagKey] = {
            ...defaultFlag,
            updatedAt: new Date(),
          };
        }
      }

      // Save to cache and Supabase
      await this.saveToCache();
      await this.saveFlagsToSupabase();

      log('FeatureFlagService: Sync with defaults completed');
    } catch (error) {
      this.handleError(error, 'Sync with Defaults');
    }
  }

  // Reset a feature flag to defaults
  async resetFeatureToDefaults(flagKey: FeatureFlagKey): Promise<void> {
    try {
      const defaultFlag = DEFAULT_FEATURE_FLAGS[flagKey];
      if (!defaultFlag) {
        throw new Error(`Default flag ${flagKey} not found`);
      }

      this.flags[flagKey] = {
        ...defaultFlag,
        updatedAt: new Date(),
      };

      await this.saveToCache();
      await this.saveFlagToSupabase(this.flags[flagKey]);

      log(`FeatureFlagService: Reset flag ${flagKey} to defaults`);
    } catch (error) {
      this.handleError(error, 'Reset Feature to Defaults');
    }
  }

  // Reset all feature flags to defaults
  async resetAllFeaturesToDefaults(): Promise<void> {
    try {
      log('FeatureFlagService: Resetting all features to defaults...');
      
      this.flags = { ...DEFAULT_FEATURE_FLAGS };
      
      await this.saveToCache();
      await this.saveFlagsToSupabase();

      log('FeatureFlagService: All features reset to defaults');
    } catch (error) {
      this.handleError(error, 'Reset All Features to Defaults');
    }
  }

  // Get current environment
  private getCurrentEnvironment(): 'development' | 'staging' | 'production' {
    const env = process.env.NODE_ENV || 'development';
    return env as 'development' | 'staging' | 'production';
  }

  // Hash user ID for consistent rollout percentage
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }


  // Get a specific flag
  getFlag(flagKey: FeatureFlagKey): FeatureFlag | undefined {
    return this.flags[flagKey];
  }

  // Export flags to default file format
  exportFlagsToDefaultFile(): string {
    const exportData = Object.entries(this.flags).map(([key, flag]) => ({
      [key]: {
        id: flag.id,
        name: flag.name,
        description: flag.description,
        enabled: flag.enabled,
        premiumOnly: flag.premiumOnly,
        rolloutPercentage: flag.rolloutPercentage,
        targetEnvironments: flag.targetEnvironments,
        targetRoles: flag.targetRoles,
        targetUsers: flag.targetUsers,
        createdAt: flag.createdAt,
        updatedAt: flag.updatedAt,
        createdBy: flag.createdBy,
      }
    }));

    return JSON.stringify(exportData, null, 2);
  }

  // Get flags summary
  getFlagsSummary(): { total: number; enabled: number; disabled: number; premiumOnly: number } {
    const flags = Object.values(this.flags);
    return {
      total: flags.length,
      enabled: flags.filter(f => f.enabled).length,
      disabled: flags.filter(f => !f.enabled).length,
      premiumOnly: flags.filter(f => f.premiumOnly).length,
    };
  }

  // Clear local cache
  async clearLocalCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.LOCAL_STORAGE_KEY);
      await AsyncStorage.removeItem(this.LAST_SYNC_KEY);
      log('FeatureFlagService: Local cache cleared');
    } catch (error) {
      console.error('FeatureFlagService: Error clearing local cache:', error);
    }
  }

  // Force reload from Supabase
  async forceReloadFromSupabase(): Promise<void> {
    try {
      log('FeatureFlagService: Force reloading from Supabase...');
      await this.loadFlagsFromSupabase();
      log('FeatureFlagService: Force reload completed');
    } catch (error) {
      this.handleError(error, 'Force Reload from Supabase');
    }
  }

  // Force sync with Supabase
  async forceSyncWithSupabase(): Promise<void> {
    try {
      log('FeatureFlagService: Force syncing with Supabase...');
      await this.saveFlagsToSupabase();
      log('FeatureFlagService: Force sync completed');
    } catch (error) {
      this.handleError(error, 'Force Sync with Supabase');
    }
  }
}

// Export singleton instance
export const featureFlagService = new FeatureFlagService(); 