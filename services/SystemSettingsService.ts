import { supabase } from '../lib/supabase';

export interface SystemSettings {
  id: string;
  // Security Settings
  emailVerificationRequired: boolean;
  mfaEnabled: boolean;
  mfaRequiredForAdmin: boolean;
  accountLockoutEnabled: boolean;
  accountLockoutAttempts: number;
  accountLockoutDurationMinutes: number;
  sessionTimeoutHours: number;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  // Rate Limiting
  rateLimitEnabled: boolean;
  rateLimitAuthAttempts: number;
  rateLimitAuthWindowMinutes: number;
  rateLimitApiRequests: number;
  rateLimitApiWindowMinutes: number;
  // CSRF Protection
  csrfProtectionEnabled: boolean;
  csrfOriginCheckEnabled: boolean;
  csrfTokenExpiryMinutes: number;
  // Feature Flags
  maintenanceMode: boolean;
  newUserRegistrationEnabled: boolean;
  googleSignInEnabled: boolean;
  // Audit
  updatedBy: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export interface SystemSettingsAuditLog {
  id: string;
  settingKey: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  changedByEmail: string | null;
  changedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  reason: string | null;
}

export interface UpdateSystemSettingsParams {
  emailVerificationRequired?: boolean;
  mfaEnabled?: boolean;
  mfaRequiredForAdmin?: boolean;
  accountLockoutEnabled?: boolean;
  accountLockoutAttempts?: number;
  accountLockoutDurationMinutes?: number;
  sessionTimeoutHours?: number;
  passwordMinLength?: number;
  passwordRequireSpecialChars?: boolean;
  rateLimitEnabled?: boolean;
  rateLimitAuthAttempts?: number;
  rateLimitAuthWindowMinutes?: number;
  rateLimitApiRequests?: number;
  rateLimitApiWindowMinutes?: number;
  csrfProtectionEnabled?: boolean;
  csrfOriginCheckEnabled?: boolean;
  csrfTokenExpiryMinutes?: number;
  maintenanceMode?: boolean;
  newUserRegistrationEnabled?: boolean;
  googleSignInEnabled?: boolean;
}

class SystemSettingsService {
  private static instance: SystemSettingsService;
  private cachedSettings: SystemSettings | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  private constructor() {}

  static getInstance(): SystemSettingsService {
    if (!SystemSettingsService.instance) {
      SystemSettingsService.instance = new SystemSettingsService();
    }
    return SystemSettingsService.instance;
  }

  /**
   * Get current system settings (with caching)
   */
  async getSettings(): Promise<SystemSettings> {
    const now = Date.now();
    
    // Return cached settings if still valid
    if (this.cachedSettings && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cachedSettings;
    }

    try {
      console.log('SystemSettingsService: Fetching settings from database');

      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 'default')
        .single();

      if (error) {
        console.error('SystemSettingsService: Error fetching settings:', error);
        // Return safe defaults if table doesn't exist or other error
        return this.getDefaultSettings();
      }

      if (!data) {
        console.warn('SystemSettingsService: No settings found, using defaults');
        return this.getDefaultSettings();
      }

      // Map database fields to camelCase
      const settings: SystemSettings = {
        id: data.id,
        emailVerificationRequired: data.email_verification_required,
        mfaEnabled: data.mfa_enabled,
        mfaRequiredForAdmin: data.mfa_required_for_admin,
        accountLockoutEnabled: data.account_lockout_enabled,
        accountLockoutAttempts: data.account_lockout_attempts,
        accountLockoutDurationMinutes: data.account_lockout_duration_minutes,
        sessionTimeoutHours: data.session_timeout_hours,
        passwordMinLength: data.password_min_length,
        passwordRequireSpecialChars: data.password_require_special_chars,
        rateLimitEnabled: data.rate_limit_enabled,
        rateLimitAuthAttempts: data.rate_limit_auth_attempts,
        rateLimitAuthWindowMinutes: data.rate_limit_auth_window_minutes,
        rateLimitApiRequests: data.rate_limit_api_requests,
        rateLimitApiWindowMinutes: data.rate_limit_api_window_minutes,
        csrfProtectionEnabled: data.csrf_protection_enabled ?? true,
        csrfOriginCheckEnabled: data.csrf_origin_check_enabled ?? true,
        csrfTokenExpiryMinutes: data.csrf_token_expiry_minutes ?? 60,
        maintenanceMode: data.maintenance_mode,
        newUserRegistrationEnabled: data.new_user_registration_enabled,
        googleSignInEnabled: data.google_sign_in_enabled ?? true,
        updatedBy: data.updated_by,
        updatedAt: new Date(data.updated_at),
        createdAt: new Date(data.created_at),
      };

      // Update cache
      this.cachedSettings = settings;
      this.cacheTimestamp = now;

      return settings;
    } catch (error) {
      console.error('SystemSettingsService: Unexpected error:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Get default settings (fallback)
   */
  private getDefaultSettings(): SystemSettings {
    return {
      id: 'default',
      emailVerificationRequired: true, // Secure default
      mfaEnabled: false,
      mfaRequiredForAdmin: false,
      accountLockoutEnabled: true, // Secure default
      accountLockoutAttempts: 5,
      accountLockoutDurationMinutes: 30,
      sessionTimeoutHours: 24,
      passwordMinLength: 8,
      passwordRequireSpecialChars: true,
      rateLimitEnabled: true, // Secure default
      rateLimitAuthAttempts: 5,
      rateLimitAuthWindowMinutes: 15,
      rateLimitApiRequests: 100,
      rateLimitApiWindowMinutes: 1,
      csrfProtectionEnabled: true, // Secure default
      csrfOriginCheckEnabled: true, // Secure default
      csrfTokenExpiryMinutes: 60, // 1 hour default
      maintenanceMode: false,
      newUserRegistrationEnabled: true,
      googleSignInEnabled: true,
      updatedBy: null,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
  }

  /**
   * Update system settings (admin only)
   */
  async updateSettings(
    updates: UpdateSystemSettingsParams,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('SystemSettingsService: Updating settings:', updates);

      // Verify user is admin
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, email')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile || userProfile.role !== 'admin') {
        // ✅ Log unauthorized admin action attempt
        const { logAdminAction } = await import('../lib/auth');
        await logAdminAction(
          'admin.action.system_settings',
          userId,
          userProfile?.email || 'unknown',
          undefined,
          undefined,
          { 
            unauthorized: true,
            attempted_updates: Object.keys(updates),
            error: 'Unauthorized access attempt'
          }
        );
        
        return {
          success: false,
          error: 'Unauthorized: Only admins can update system settings',
        };
      }

      // Map camelCase to snake_case for database
      const dbUpdates: any = {
        updated_by: userId,
      };

      if (updates.emailVerificationRequired !== undefined) {
        dbUpdates.email_verification_required = updates.emailVerificationRequired;
      }
      if (updates.mfaEnabled !== undefined) {
        dbUpdates.mfa_enabled = updates.mfaEnabled;
      }
      if (updates.mfaRequiredForAdmin !== undefined) {
        dbUpdates.mfa_required_for_admin = updates.mfaRequiredForAdmin;
      }
      if (updates.accountLockoutEnabled !== undefined) {
        dbUpdates.account_lockout_enabled = updates.accountLockoutEnabled;
      }
      if (updates.accountLockoutAttempts !== undefined) {
        dbUpdates.account_lockout_attempts = updates.accountLockoutAttempts;
      }
      if (updates.accountLockoutDurationMinutes !== undefined) {
        dbUpdates.account_lockout_duration_minutes = updates.accountLockoutDurationMinutes;
      }
      if (updates.sessionTimeoutHours !== undefined) {
        dbUpdates.session_timeout_hours = updates.sessionTimeoutHours;
      }
      if (updates.passwordMinLength !== undefined) {
        dbUpdates.password_min_length = updates.passwordMinLength;
      }
      if (updates.passwordRequireSpecialChars !== undefined) {
        dbUpdates.password_require_special_chars = updates.passwordRequireSpecialChars;
      }
      if (updates.rateLimitEnabled !== undefined) {
        dbUpdates.rate_limit_enabled = updates.rateLimitEnabled;
      }
      if (updates.rateLimitAuthAttempts !== undefined) {
        dbUpdates.rate_limit_auth_attempts = updates.rateLimitAuthAttempts;
      }
      if (updates.rateLimitAuthWindowMinutes !== undefined) {
        dbUpdates.rate_limit_auth_window_minutes = updates.rateLimitAuthWindowMinutes;
      }
      if (updates.rateLimitApiRequests !== undefined) {
        dbUpdates.rate_limit_api_requests = updates.rateLimitApiRequests;
      }
      if (updates.rateLimitApiWindowMinutes !== undefined) {
        dbUpdates.rate_limit_api_window_minutes = updates.rateLimitApiWindowMinutes;
      }
      if (updates.csrfProtectionEnabled !== undefined) {
        dbUpdates.csrf_protection_enabled = updates.csrfProtectionEnabled;
      }
      if (updates.csrfOriginCheckEnabled !== undefined) {
        dbUpdates.csrf_origin_check_enabled = updates.csrfOriginCheckEnabled;
      }
      if (updates.csrfTokenExpiryMinutes !== undefined) {
        dbUpdates.csrf_token_expiry_minutes = updates.csrfTokenExpiryMinutes;
      }
      if (updates.maintenanceMode !== undefined) {
        dbUpdates.maintenance_mode = updates.maintenanceMode;
      }
      if (updates.newUserRegistrationEnabled !== undefined) {
        dbUpdates.new_user_registration_enabled = updates.newUserRegistrationEnabled;
      }
      if (updates.googleSignInEnabled !== undefined) {
        dbUpdates.google_sign_in_enabled = updates.googleSignInEnabled;
      }

      const { error: updateError } = await supabase
        .from('system_settings')
        .update(dbUpdates)
        .eq('id', 'default');

      if (updateError) {
        console.error('SystemSettingsService: Error updating settings:', updateError);
        return {
          success: false,
          error: updateError.message,
        };
      }

      // Clear cache
      this.clearCache();

      // ✅ Log successful system settings change
      const { logAdminAction } = await import('../lib/auth');
      await logAdminAction(
        'admin.action.system_settings',
        userId,
        userProfile.email,
        undefined,
        undefined,
        { 
          settings_updated: Object.keys(updates),
          reason: reason || 'No reason provided',
          changes: updates
        }
      );

      console.log('SystemSettingsService: Settings updated successfully');
      return { success: true };
    } catch (error) {
      console.error('SystemSettingsService: Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get audit logs for settings changes
   */
  async getAuditLogs(limit: number = 100): Promise<SystemSettingsAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('system_settings_audit')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('SystemSettingsService: Error fetching audit logs:', error);
        return [];
      }

      return (data || []).map(log => ({
        id: log.id,
        settingKey: log.setting_key,
        oldValue: log.old_value,
        newValue: log.new_value,
        changedBy: log.changed_by,
        changedByEmail: log.changed_by_email,
        changedAt: new Date(log.changed_at),
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        reason: log.reason,
      }));
    } catch (error) {
      console.error('SystemSettingsService: Error in getAuditLogs:', error);
      return [];
    }
  }

  /**
   * Check if a specific security feature is enabled
   */
  async isFeatureEnabled(feature: keyof SystemSettings): Promise<boolean> {
    const settings = await this.getSettings();
    const value = settings[feature];
    return typeof value === 'boolean' ? value : false;
  }

  /**
   * Clear the settings cache (force refresh on next call)
   */
  clearCache(): void {
    this.cachedSettings = null;
    this.cacheTimestamp = 0;
    console.log('SystemSettingsService: Cache cleared');
  }

  /**
   * Helper: Check if email verification is required
   */
  async isEmailVerificationRequired(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.emailVerificationRequired;
  }

  /**
   * Helper: Check if MFA is enabled
   */
  async isMfaEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.mfaEnabled;
  }

  /**
   * Helper: Check if rate limiting is enabled
   */
  async isRateLimitEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.rateLimitEnabled;
  }

  /**
   * Helper: Get rate limit configuration for authentication
   */
  async getAuthRateLimitConfig(): Promise<{
    enabled: boolean;
    attempts: number;
    windowMinutes: number;
  }> {
    const settings = await this.getSettings();
    return {
      enabled: settings.rateLimitEnabled,
      attempts: settings.rateLimitAuthAttempts,
      windowMinutes: settings.rateLimitAuthWindowMinutes,
    };
  }

  /**
   * Helper: Get account lockout configuration
   */
  async getAccountLockoutConfig(): Promise<{
    enabled: boolean;
    attempts: number;
    durationMinutes: number;
  }> {
    const settings = await this.getSettings();
    return {
      enabled: settings.accountLockoutEnabled,
      attempts: settings.accountLockoutAttempts,
      durationMinutes: settings.accountLockoutDurationMinutes,
    };
  }

  /**
   * Helper: Check if CSRF protection is enabled
   */
  async isCsrfEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.csrfProtectionEnabled;
  }

  /**
   * Helper: Check if CSRF origin verification is enabled
   */
  async isCsrfOriginCheckEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.csrfOriginCheckEnabled;
  }

  /**
   * Helper: Get CSRF configuration
   */
  async getCsrfConfig(): Promise<{
    enabled: boolean;
    originCheckEnabled: boolean;
    tokenExpiryMinutes: number;
  }> {
    const settings = await this.getSettings();
    return {
      enabled: settings.csrfProtectionEnabled,
      originCheckEnabled: settings.csrfOriginCheckEnabled,
      tokenExpiryMinutes: settings.csrfTokenExpiryMinutes,
    };
  }

  /**
   * Helper: Check if Google Sign-In is enabled
   */
  async isGoogleSignInEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.googleSignInEnabled;
  }
}

// Export singleton instance
export const systemSettingsService = SystemSettingsService.getInstance();

