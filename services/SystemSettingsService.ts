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
  // Sunsetting Settings
  sunsetModeEnabled: boolean;
  sunsetShutdownDate: Date;
  landingSunsetBannerEnabled: boolean;
  sunsetReminder10Sent: boolean;
  // Customizable Headers
  landingHeaderTitle: string | null;
  landingHeaderSubtitle: string | null;
  loginHeaderTitle: string | null;
  loginHeaderSubtitle: string | null;
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
  sunsetModeEnabled?: boolean;
  sunsetShutdownDate?: Date;
  landingSunsetBannerEnabled?: boolean;
  sunsetReminder10Sent?: boolean;
  landingHeaderTitle?: string | null;
  landingHeaderSubtitle?: string | null;
  loginHeaderTitle?: string | null;
  loginHeaderSubtitle?: string | null;
}

export class SystemSettingsService {
  private static instance: SystemSettingsService;
  private cachedSettings: SystemSettings | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute cache
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): SystemSettingsService {
    if (__DEV__) console.log('SystemSettingsService: Getting instance...');
    if (!SystemSettingsService.instance) {
      SystemSettingsService.instance = new SystemSettingsService();
    }
    return SystemSettingsService.instance;
  }

  // Listener management
  addListener(listener: () => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: () => void) {
    this.listeners.delete(listener);
  }

  private notifyListeners() {
    if (__DEV__) console.log(`SystemSettingsService: Notifying ${this.listeners.size} listeners...`);
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (e) {
        console.error('SystemSettingsService: Error in listener:', e);
      }
    });
  }

  /**
   * Get current system settings synchronously (from cache)
   */
  getSettingsSync(): SystemSettings | null {
    return this.cachedSettings;
  }

  /**
   * Get current system settings (with caching)
   */
  async getSettings(forceRefresh: boolean = false): Promise<SystemSettings> {
    if (__DEV__) console.log('SystemSettingsService: getSettings called (forceRefresh:', forceRefresh, ')');
    const now = Date.now();
    
    // Return cached settings if still valid (unless force refresh)
    if (!forceRefresh && this.cachedSettings && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      console.log('SystemSettingsService: Returning cached settings');
      return this.cachedSettings;
    }

    try {
      if (__DEV__) console.log('SystemSettingsService: Starting database fetch...');
      
      let { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 'default')
        .single();

      if (error) {
        if (__DEV__) console.error('SystemSettingsService: Fetch error:', error);
        
        if (error.code === 'PGRST116') {
          // Normalize data - Supabase sometimes returns an array even with .single()
        }
      }

      // If data is an array, extract the first element
      if (!error && data && Array.isArray(data)) {
        console.warn('SystemSettingsService: ⚠️ Query returned array instead of object, extracting first element');
        if (data.length > 0) {
          data = data[0];
        } else {
          console.error('SystemSettingsService: ⚠️ Query returned empty array!');
          return this.getDefaultSettings();
        }
      }
      
      // If new columns are missing, try a direct query for those specific fields
      if (!error && data && typeof data === 'object' && data !== null && 
          (data.google_sign_in_enabled === undefined || data.sunset_mode_enabled === undefined)) {
        if (__DEV__) {
          console.warn('SystemSettingsService: New columns (google_sign_in or sunset_mode) missing, attempting direct query');
        }
        
        // Fallback: Try selecting the specific fields explicitly
        const { data: directFields, error: directError } = await supabase
          .from('system_settings')
          .select('google_sign_in_enabled, sunset_mode_enabled, sunset_shutdown_date, landing_sunset_banner_enabled, landing_header_title, landing_header_subtitle, login_header_title, login_header_subtitle')
          .eq('id', 'default')
          .single();
        
        // Normalize directFields if it's an array
        const normalizedFields: any = Array.isArray(directFields) ? directFields[0] : directFields;
        
        if (!directError && normalizedFields) {
          if (normalizedFields.google_sign_in_enabled !== undefined) {
            data.google_sign_in_enabled = normalizedFields.google_sign_in_enabled;
          }
          if (normalizedFields.sunset_mode_enabled !== undefined) {
            data.sunset_mode_enabled = normalizedFields.sunset_mode_enabled;
          }
          if (normalizedFields.sunset_shutdown_date !== undefined) {
            data.sunset_shutdown_date = normalizedFields.sunset_shutdown_date;
          }
          if (normalizedFields.landing_sunset_banner_enabled !== undefined) {
            data.landing_sunset_banner_enabled = normalizedFields.landing_sunset_banner_enabled;
          }
          if (normalizedFields.landing_header_title !== undefined) {
            data.landing_header_title = normalizedFields.landing_header_title;
          }
          if (normalizedFields.landing_header_subtitle !== undefined) {
            data.landing_header_subtitle = normalizedFields.landing_header_subtitle;
          }
          if (normalizedFields.login_header_title !== undefined) {
            data.login_header_title = normalizedFields.login_header_title;
          }
          if (normalizedFields.login_header_subtitle !== undefined) {
            data.login_header_subtitle = normalizedFields.login_header_subtitle;
          }
        } else {
          if (__DEV__) {
            console.warn('SystemSettingsService: Direct query for new columns failed or returned no results');
          }
          // Set to null so they can be handled by defaults in the mapping logic
          if (data.google_sign_in_enabled === undefined) data.google_sign_in_enabled = null;
          if (data.sunset_mode_enabled === undefined) data.sunset_mode_enabled = null;
        }
      }

      if (error) {
        console.error('SystemSettingsService: Error fetching settings:', error);
        // Return safe defaults if table doesn't exist or other error
        return this.getDefaultSettings();
      }

      if (!data || typeof data !== 'object') {
        console.warn('SystemSettingsService: No settings found or invalid data type, using defaults');
        return this.getDefaultSettings();
      }

      // Log raw data from database in development only
      if (__DEV__) {
        try {
          console.log('SystemSettingsService: Fetched settings from database');
        } catch (logError) {
          // Silent fail for logging
        }
      }

      // Use class method to safely get boolean values
      

      // Map database fields to camelCase
      // Note: Explicitly handle booleans to preserve false values
      let settings: SystemSettings;
      try {
        if (__DEV__) {
          console.log('SystemSettingsService: Mapping database data to settings object. Raw sunset field:', data.sunset_mode_enabled);
        }

        settings = {
          id: data.id,
          emailVerificationRequired: this.getBoolean(data.email_verification_required, true),
          mfaEnabled: this.getBoolean(data.mfa_enabled, false),
          mfaRequiredForAdmin: this.getBoolean(data.mfa_required_for_admin, false),
          accountLockoutEnabled: this.getBoolean(data.account_lockout_enabled, true),
          accountLockoutAttempts: data.account_lockout_attempts ?? 5,
          accountLockoutDurationMinutes: data.account_lockout_duration_minutes ?? 30,
          sessionTimeoutHours: data.session_timeout_hours ?? 24,
          passwordMinLength: data.password_min_length ?? 8,
          passwordRequireSpecialChars: this.getBoolean(data.password_require_special_chars, true),
          rateLimitEnabled: this.getBoolean(data.rate_limit_enabled, true),
          rateLimitAuthAttempts: data.rate_limit_auth_attempts ?? 5,
          rateLimitAuthWindowMinutes: data.rate_limit_auth_window_minutes ?? 15,
          rateLimitApiRequests: data.rate_limit_api_requests ?? 100,
          rateLimitApiWindowMinutes: data.rate_limit_api_window_minutes ?? 1,
          csrfProtectionEnabled: this.getBoolean(data.csrf_protection_enabled, true),
          csrfOriginCheckEnabled: this.getBoolean(data.csrf_origin_check_enabled, true),
          csrfTokenExpiryMinutes: data.csrf_token_expiry_minutes ?? 60,
          maintenanceMode: this.getBoolean(data.maintenance_mode, false),
          newUserRegistrationEnabled: this.getBoolean(data.new_user_registration_enabled, true),
          // Handle google_sign_in_enabled field
          googleSignInEnabled: (() => {
          const fieldExists = 'google_sign_in_enabled' in data;
          const rawValue = data.google_sign_in_enabled;
          
          // If field doesn't exist, the column might not be in the database
          if (!fieldExists) {
            if (__DEV__) {
              console.warn('SystemSettingsService: google_sign_in_enabled field missing - column may not exist in database');
            }
            return true; // Default
          }
          
          // Field exists but is null/undefined - this shouldn't happen with NOT NULL constraint
          if (rawValue === null || rawValue === undefined) {
            if (__DEV__) {
              console.warn('SystemSettingsService: google_sign_in_enabled is NULL/UNDEFINED (should not happen with NOT NULL constraint)');
            }
            return true; // Default
          }
          
          // If it's already a boolean, use it directly
          if (typeof rawValue === 'boolean') {
            return rawValue;
          }
          
          // If it's a string, convert it
          if (typeof rawValue === 'string') {
            const lower = rawValue.toLowerCase().trim();
            if (lower === 'false' || lower === 'f' || lower === '0' || lower === 'no' || lower === 'n') {
              return false;
            }
            return lower === 'true' || lower === 't' || lower === '1' || lower === 'yes' || lower === 'y';
          }
          
          // If it's a number, 0 = false
          if (typeof rawValue === 'number') {
            return rawValue !== 0;
          }
          
          // Fallback - should not reach here
          const result = Boolean(rawValue);
          if (__DEV__) {
            console.warn('SystemSettingsService: google_sign_in_enabled unexpected type:', typeof rawValue, '->', result);
          }
          return result;
        })(),
        sunsetModeEnabled: this.getBoolean(data.sunset_mode_enabled, false),
        sunsetShutdownDate: this.getDate(data.sunset_shutdown_date, new Date('2026-05-23')),
        landingSunsetBannerEnabled: this.getBoolean(data.landing_sunset_banner_enabled, false),
        sunsetReminder10Sent: this.getBoolean(data.sunset_reminder_10_sent, false),
        landingHeaderTitle: data.landing_header_title ?? null,
        landingHeaderSubtitle: data.landing_header_subtitle ?? null,
        loginHeaderTitle: data.login_header_title ?? null,
        loginHeaderSubtitle: data.login_header_subtitle ?? null,
        updatedBy: data.updated_by,
        updatedAt: this.getDate(data.updated_at, new Date()),
        createdAt: this.getDate(data.created_at, new Date()),
      };

        if (__DEV__) {
          console.log('SystemSettingsService: Mapping complete. sunsetModeEnabled:', settings.sunsetModeEnabled);
        }
        
        console.log('SystemSettingsService: ✅ Settings successfully loaded and mapped');
      } catch (mappingError) {
        console.error('SystemSettingsService: Error mapping settings from database:', mappingError);
        console.error('SystemSettingsService: Falling back to default settings');
        return this.getDefaultSettings();
      }

      // Settings mapped successfully - no need for verbose logging in production

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
   * Safely parse a date value from the database
   */
  private parseDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }

  /**
   * Safely parse a date with a default value
   */
  private getDate(value: unknown, defaultValue: Date): Date {
    return this.parseDate(value) ?? defaultValue;
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
      sunsetModeEnabled: false,
      sunsetShutdownDate: new Date('2026-05-23'),
      landingSunsetBannerEnabled: false,
      sunsetReminder10Sent: false,
      landingHeaderTitle: null,
      landingHeaderSubtitle: null,
      loginHeaderTitle: null,
      loginHeaderSubtitle: null,
      updatedBy: null,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
  }

  /**
   * Helper: Parse boolean from database value
   */
  private getBoolean(value: any, defaultValue: boolean, fieldName?: string): boolean {
    if (value === null || value === undefined) {
      if (fieldName === 'google_sign_in_enabled' && __DEV__) {
        console.log(`SystemSettingsService: getBoolean(${fieldName}) - value is null/undefined, using default: ${defaultValue}`);
      }
      return defaultValue;
    }
    
    if (typeof value === 'boolean') return value;
    
    if (typeof value === 'number') return value !== 0;
    
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'false' || lowerValue === 'f' || lowerValue === '0' || lowerValue === 'no' || lowerValue === 'n' || lowerValue === '') {
        return false;
      }
      return lowerValue === 'true' || lowerValue === 't' || lowerValue === '1' || lowerValue === 'yes' || lowerValue === 'y';
    }
    
    return Boolean(value);
  }

  /**
   * Update system settings (admin only)
   */
  async updateSettings(
    updates: UpdateSystemSettingsParams,
    userId: string,
    reason?: string,
    userRole?: string,
    userPermissions?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('SystemSettingsService: Updating settings:', updates);

      // Verify user has permission (admin role OR canManageSystemSettings permission)
      // First, get the current session to ensure we're checking the right user
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      
      if (!sessionUser || sessionUser.id !== userId) {
        console.error('SystemSettingsService: User ID mismatch:', {
          sessionUserId: sessionUser?.id,
          providedUserId: userId,
        });
        return {
          success: false,
          error: 'User session mismatch. Please sign in again.',
        };
      }

      // Use provided role/permissions, or try to query from database
      let isAdmin = false;
      let canManageSystemSettings = false;
      let userEmail = sessionUser.email || 'unknown';

      if (userRole !== undefined) {
        // Use provided role and permissions (preferred - avoids RLS issues)
        isAdmin = userRole === 'admin';
        
        if (userPermissions) {
          try {
            const permissions = typeof userPermissions === 'string' 
              ? JSON.parse(userPermissions) 
              : userPermissions;
            canManageSystemSettings = permissions?.canManageSystemSettings === true;
          } catch (e) {
            console.warn('SystemSettingsService: Error parsing provided permissions:', e);
          }
        }
        
        console.log('SystemSettingsService: Using provided role/permissions:', {
          isAdmin,
          canManageSystemSettings,
          userRole,
          hasPermissions: !!userPermissions,
          userEmail,
        });
      } else {
        // Fallback: Try to query from database (may be blocked by RLS)
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role, email, permissions')
          .eq('id', sessionUser.id)
          .single();

        console.log('SystemSettingsService: User profile query result:', {
          hasProfile: !!userProfile,
          profileError: profileError?.message,
          userId,
          profile: userProfile ? {
            role: userProfile.role,
            email: userProfile.email,
            permissions: userProfile.permissions,
            permissionsType: typeof userProfile.permissions,
            permissionsIsString: typeof userProfile.permissions === 'string',
          } : null,
        });

        if (profileError || !userProfile) {
          console.error('SystemSettingsService: Profile error:', {
            error: profileError,
            userId,
          });
          return {
            success: false,
            error: `User profile not found: ${profileError?.message || 'No profile data'}`,
          };
        }

        userEmail = userProfile.email || 'unknown';
        isAdmin = userProfile.role === 'admin';
        
        if (userProfile.permissions) {
          try {
            const permissions = typeof userProfile.permissions === 'string' 
              ? JSON.parse(userProfile.permissions) 
              : userProfile.permissions;
            
            console.log('SystemSettingsService: Parsed permissions:', {
              raw: userProfile.permissions,
              parsed: permissions,
              canManageSystemSettings: permissions?.canManageSystemSettings,
              isTrue: permissions?.canManageSystemSettings === true,
            });
            
            canManageSystemSettings = permissions?.canManageSystemSettings === true;
          } catch (e) {
            console.warn('SystemSettingsService: Error parsing permissions:', e);
          }
        }
      }

      console.log('SystemSettingsService: Permission check result:', {
        isAdmin,
        canManageSystemSettings,
        userRole: userRole || 'unknown',
        authorized: isAdmin || canManageSystemSettings,
      });

      if (!isAdmin && !canManageSystemSettings) {
        // ✅ Log unauthorized admin action attempt
        const { logAdminAction } = await import('../lib/auth');
        await logAdminAction(
          'admin.action.system_settings',
          userId,
          userEmail,
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
          error: 'Unauthorized: Only admins or users with canManageSystemSettings permission can update system settings',
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
        dbUpdates.google_sign_in_enabled = Boolean(updates.googleSignInEnabled);
      }
      if (updates.sunsetModeEnabled !== undefined) {
        dbUpdates.sunset_mode_enabled = Boolean(updates.sunsetModeEnabled);
      }
      if (updates.sunsetShutdownDate !== undefined) {
        const newDate = updates.sunsetShutdownDate.toISOString();
        dbUpdates.sunset_shutdown_date = newDate;
        
        // Auto-reset reminder flags if the date has changed
        // We fetch current settings to compare
        const currentSettings = await this.getSettings();
        const currentDate = currentSettings.sunsetShutdownDate.toISOString();
        
        if (newDate !== currentDate) {
          console.log('SystemSettingsService: Shutdown date changed, resetting reminder flags');
          dbUpdates.sunset_reminder_10_sent = false;
        }
      }
      if (updates.landingSunsetBannerEnabled !== undefined) {
        dbUpdates.landing_sunset_banner_enabled = Boolean(updates.landingSunsetBannerEnabled);
      }
      if (updates.sunsetReminder10Sent !== undefined) {
        // Only update if it wasn't already set to false by the date change logic above
        if (dbUpdates.sunset_reminder_10_sent !== false) {
          dbUpdates.sunset_reminder_10_sent = Boolean(updates.sunsetReminder10Sent);
        }
      }
      if (updates.landingHeaderTitle !== undefined) {
        dbUpdates.landing_header_title = updates.landingHeaderTitle;
      }
      if (updates.landingHeaderSubtitle !== undefined) {
        dbUpdates.landing_header_subtitle = updates.landingHeaderSubtitle;
      }
      if (updates.loginHeaderTitle !== undefined) {
        dbUpdates.login_header_title = updates.loginHeaderTitle;
      }
      if (updates.loginHeaderSubtitle !== undefined) {
        dbUpdates.login_header_subtitle = updates.loginHeaderSubtitle;
      }

      // Log what we're about to update
      console.log('SystemSettingsService: Preparing to update with:', {
        fields: Object.keys(dbUpdates),
        updateCount: Object.keys(dbUpdates).length,
        hasUpdates: Object.keys(dbUpdates).length > 1, // More than just updated_by
        dbUpdates: {
          ...dbUpdates,
          // Log boolean values explicitly
          google_sign_in_enabled: dbUpdates.google_sign_in_enabled !== undefined ? {
            value: dbUpdates.google_sign_in_enabled,
            type: typeof dbUpdates.google_sign_in_enabled,
            isFalse: dbUpdates.google_sign_in_enabled === false,
            isTrue: dbUpdates.google_sign_in_enabled === true,
          } : 'not included',
          rate_limit_enabled: dbUpdates.rate_limit_enabled !== undefined ? {
            value: dbUpdates.rate_limit_enabled,
            type: typeof dbUpdates.rate_limit_enabled,
            isFalse: dbUpdates.rate_limit_enabled === false,
            isTrue: dbUpdates.rate_limit_enabled === true,
          } : 'not included',
        },
      });

      // Ensure we have actual updates (not just updated_by)
      const actualUpdates = Object.keys(dbUpdates).filter(key => key !== 'updated_by');
      if (actualUpdates.length === 0) {
        console.warn('SystemSettingsService: No actual settings to update');
        return {
          success: false,
          error: 'No settings were changed',
        };
      }

      const { data: updateData, error: updateError } = await supabase
        .from('system_settings')
        .update(dbUpdates)
        .eq('id', 'default')
        .select();

      if (updateError) {
        console.error('SystemSettingsService: Error updating settings:', {
          error: updateError,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
          dbUpdates: Object.keys(dbUpdates),
        });
        return {
          success: false,
          error: updateError.message || 'Failed to update system settings',
        };
      }

      if (!updateData || updateData.length === 0) {
        console.error('SystemSettingsService: Update succeeded but no data returned');
        // This might indicate RLS blocking the update
        return {
          success: false,
          error: 'Update may have been blocked by security policies. Please verify you have admin access or canManageSystemSettings permission.',
        };
      }

      if (__DEV__) {
        console.log('SystemSettingsService: Update successful');
      }

      // Clear cache
      this.clearCache();

      // ✅ Log successful system settings change
      const { logAdminAction } = await import('../lib/auth');
      await logAdminAction(
        'admin.action.system_settings',
        userId,
        userEmail,
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
   * Trigger the sunset reminder email process
   */
  async triggerSunsetReminder(days: number, testOnly: boolean = false): Promise<{
    success: boolean;
    message: string;
    stats?: { success: number; errors: number; daysReported: number };
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found');
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://wiznote.app';
      const response = await fetch(`${apiUrl}/.netlify/functions/send-sunset-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          days,
          testOnly,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to trigger reminder (${response.status})`);
      }

      // Clear cache if it was an official reminder (to update the sunsetReminder10Sent flag)
      if (!testOnly && days <= 10) {
        this.clearCache();
      }

      return {
        success: true,
        message: result.message || 'Reminder process completed',
        stats: {
          success: result.success || 0,
          errors: result.errors || 0,
          daysReported: result.daysReported || days,
        },
      };
    } catch (error) {
      console.error('SystemSettingsService: Error triggering sunset reminder:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
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
        changedAt: this.parseDate(log.changed_at) ?? new Date(),
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
    this.notifyListeners();
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

