import { Platform } from 'react-native';
import { featureFlagService } from './FeatureFlagService';
import { featureLimitService } from './FeatureLimitService';
import { supabase } from '../lib/supabase';
import { User } from '../types/User';

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

      // Build full user object from profile
      const fullUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        displayName: userProfile.display_name || supabaseUser.email?.split('@')[0],
        photoURL: supabaseUser.user_metadata?.avatar_url,
        role: userProfile.role,
        createdAt: userProfile.created_at ? new Date(userProfile.created_at) : new Date(),
        lastLoginAt: userProfile.last_login_at ? new Date(userProfile.last_login_at) : new Date(),
        preferences: userProfile.preferences,
        premium: userProfile.premium,
        permissions: userProfile.permissions,
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
      if (!fullUser.preferences) {
        console.warn('AuthInitializationService: Preferences not found in profile, setting defaults');
        fullUser.preferences = {
          theme: 'auto',
          language: 'en',
          autoSync: true,
          notifications: true,
        };
      }

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

