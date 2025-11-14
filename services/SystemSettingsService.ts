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
  async getSettings(forceRefresh: boolean = false): Promise<SystemSettings> {
    const now = Date.now();
    
    // Return cached settings if still valid (unless force refresh)
    if (!forceRefresh && this.cachedSettings && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      console.log('SystemSettingsService: Returning cached settings');
      return this.cachedSettings;
    }

    try {
      console.log('SystemSettingsService: Fetching settings from database (forceRefresh:', forceRefresh, ')');

      // Query the database - try multiple approaches to ensure we get the field
      let { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 'default')
        .single();
      
      // CRITICAL: Normalize data - Supabase sometimes returns an array even with .single()
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
      
      // CRITICAL: If google_sign_in_enabled is missing, the column might not exist or RLS is blocking it
      // Try a direct query for just that field
      if (!error && data && typeof data === 'object' && data !== null && data.google_sign_in_enabled === undefined) {
        console.error('SystemSettingsService: ⚠️ google_sign_in_enabled field is MISSING from response!');
        console.error('SystemSettingsService: Available fields:', Object.keys(data));
        
        // Try querying just that field to see if it exists
        const { data: fieldCheck, error: fieldError } = await supabase
          .rpc('get_system_setting', { setting_key: 'google_sign_in_enabled' })
          .single();
        
        if (!fieldError && fieldCheck) {
          console.log('SystemSettingsService: RPC query returned:', fieldCheck);
        } else {
          // Fallback: Try selecting just that field
          const { data: directField, error: directError } = await supabase
            .from('system_settings')
            .select('google_sign_in_enabled')
            .eq('id', 'default')
            .single();
          
          // Normalize directField if it's an array
          const normalizedDirectField = Array.isArray(directField) ? directField[0] : directField;
          
          if (!directError && normalizedDirectField && normalizedDirectField.google_sign_in_enabled !== undefined) {
            console.log('SystemSettingsService: Direct field query succeeded:', normalizedDirectField);
            data.google_sign_in_enabled = normalizedDirectField.google_sign_in_enabled;
          } else {
            console.error('SystemSettingsService: ⚠️ Column google_sign_in_enabled may not exist in database!');
            console.error('SystemSettingsService: Direct field query error:', directError);
            // Set it to null so we can handle it explicitly
            data.google_sign_in_enabled = null;
          }
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

      // Log raw data from database BEFORE any processing
      try {
        console.log('SystemSettingsService: Raw data from database (FULL OBJECT):', JSON.stringify(data, null, 2));
        console.log('SystemSettingsService: Raw data keys:', Object.keys(data));
      } catch (logError) {
        console.warn('SystemSettingsService: Could not stringify data for logging:', logError);
        console.log('SystemSettingsService: Raw data type:', typeof data, 'isArray:', Array.isArray(data));
      }
      
      // CRITICAL: Check if google_sign_in_enabled field exists and what its value is
      const hasGoogleSignInField = 'google_sign_in_enabled' in data;
      const googleSignInRawValue = data.google_sign_in_enabled;
      console.log('SystemSettingsService: CRITICAL DEBUG - google_sign_in_enabled:', {
        exists: hasGoogleSignInField,
        rawValue: googleSignInRawValue,
        type: typeof googleSignInRawValue,
        isFalse: googleSignInRawValue === false,
        isTrue: googleSignInRawValue === true,
        isNull: googleSignInRawValue === null,
        isUndefined: googleSignInRawValue === undefined,
        strictFalse: googleSignInRawValue === false,
        strictTrue: googleSignInRawValue === true,
        stringValue: String(googleSignInRawValue),
        jsonValue: JSON.stringify(googleSignInRawValue),
        allFields: Object.keys(data).filter(k => k.includes('google') || k.includes('sign')),
      });
      
      console.log('SystemSettingsService: Raw data from database:', {
        google_sign_in_enabled: {
          value: data.google_sign_in_enabled,
          type: typeof data.google_sign_in_enabled,
          isFalse: data.google_sign_in_enabled === false,
          isTrue: data.google_sign_in_enabled === true,
          isNull: data.google_sign_in_enabled === null,
          isUndefined: data.google_sign_in_enabled === undefined,
          strictEqual: data.google_sign_in_enabled === false ? 'FALSE' : data.google_sign_in_enabled === true ? 'TRUE' : data.google_sign_in_enabled === null ? 'NULL' : data.google_sign_in_enabled === undefined ? 'UNDEFINED' : 'OTHER',
          hasProperty: 'google_sign_in_enabled' in data,
        },
        rate_limit_enabled: {
          value: data.rate_limit_enabled,
          type: typeof data.rate_limit_enabled,
          isFalse: data.rate_limit_enabled === false,
          isTrue: data.rate_limit_enabled === true,
        },
        mfa_enabled: {
          value: data.mfa_enabled,
          type: typeof data.mfa_enabled,
          isFalse: data.mfa_enabled === false,
          isTrue: data.mfa_enabled === true,
        },
      });

      // Helper function to safely get boolean values (preserves false, uses default for null/undefined)
      // Handles: boolean, string "true"/"false", null, undefined
      const getBoolean = (value: any, defaultValue: boolean, fieldName?: string): boolean => {
        // Explicitly check for null and undefined first
        if (value === null || value === undefined) {
          if (fieldName === 'google_sign_in_enabled') {
            console.log(`SystemSettingsService: getBoolean(${fieldName}) - value is null/undefined, using default: ${defaultValue}`);
          }
          return defaultValue;
        }
        
        // Handle actual boolean values first (most common case)
        if (typeof value === 'boolean') {
          if (fieldName === 'google_sign_in_enabled') {
            console.log(`SystemSettingsService: getBoolean(${fieldName}) - value is boolean: ${value}, returning: ${value}`);
          }
          return value; // Return as-is, preserving false
        }
        
        // Handle string booleans from database (case-insensitive)
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase().trim();
          // Explicitly handle "false", "f", "0", "no", "n" as false
          if (lowerValue === 'false' || lowerValue === 'f' || lowerValue === '0' || lowerValue === 'no' || lowerValue === 'n' || lowerValue === '') {
            if (fieldName === 'google_sign_in_enabled') {
              console.log(`SystemSettingsService: getBoolean(${fieldName}) - value is string: "${value}" (lowercase: "${lowerValue}"), explicitly returning false`);
            }
            return false;
          }
          // Handle "true", "t", "1", "yes", "y" as true
          const result = lowerValue === 'true' || lowerValue === 't' || lowerValue === '1' || lowerValue === 'yes' || lowerValue === 'y';
          if (fieldName === 'google_sign_in_enabled') {
            console.log(`SystemSettingsService: getBoolean(${fieldName}) - value is string: "${value}" (lowercase: "${lowerValue}"), result: ${result}`);
          }
          return result;
        }
        
        // Handle number (0/1)
        if (typeof value === 'number') {
          const result = value !== 0;
          if (fieldName === 'google_sign_in_enabled') {
            console.log(`SystemSettingsService: getBoolean(${fieldName}) - value is number: ${value}, result: ${result}`);
          }
          return result;
        }
        
        // Fallback to Boolean conversion (shouldn't happen for proper booleans)
        const result = Boolean(value);
        if (fieldName === 'google_sign_in_enabled') {
          console.log(`SystemSettingsService: getBoolean(${fieldName}) - fallback conversion, value:`, value, `result: ${result}`);
        }
        return result;
      };

      // Map database fields to camelCase
      // Note: Explicitly handle booleans to preserve false values
      let settings: SystemSettings;
      try {
        settings = {
          id: data.id,
          emailVerificationRequired: getBoolean(data.email_verification_required, true),
          mfaEnabled: getBoolean(data.mfa_enabled, false),
          mfaRequiredForAdmin: getBoolean(data.mfa_required_for_admin, false),
          accountLockoutEnabled: getBoolean(data.account_lockout_enabled, true),
          accountLockoutAttempts: data.account_lockout_attempts ?? 5,
          accountLockoutDurationMinutes: data.account_lockout_duration_minutes ?? 30,
          sessionTimeoutHours: data.session_timeout_hours ?? 24,
          passwordMinLength: data.password_min_length ?? 8,
          passwordRequireSpecialChars: getBoolean(data.password_require_special_chars, true),
          rateLimitEnabled: getBoolean(data.rate_limit_enabled, true),
          rateLimitAuthAttempts: data.rate_limit_auth_attempts ?? 5,
          rateLimitAuthWindowMinutes: data.rate_limit_auth_window_minutes ?? 15,
          rateLimitApiRequests: data.rate_limit_api_requests ?? 100,
          rateLimitApiWindowMinutes: data.rate_limit_api_window_minutes ?? 1,
          csrfProtectionEnabled: getBoolean(data.csrf_protection_enabled, true),
          csrfOriginCheckEnabled: getBoolean(data.csrf_origin_check_enabled, true),
          csrfTokenExpiryMinutes: data.csrf_token_expiry_minutes ?? 60,
          maintenanceMode: getBoolean(data.maintenance_mode, false),
          newUserRegistrationEnabled: getBoolean(data.new_user_registration_enabled, true),
          // CRITICAL: Directly handle google_sign_in_enabled - handle ALL possible cases
          googleSignInEnabled: (() => {
          // First check if field exists in response
          const fieldExists = 'google_sign_in_enabled' in data;
          const rawValue = data.google_sign_in_enabled;
          
          console.error('🔴 SystemSettingsService: googleSignInEnabled DIRECT MAPPING:', {
            fieldExists,
            rawValue,
            rawValueType: typeof rawValue,
            isStrictFalse: rawValue === false,
            isStrictTrue: rawValue === true,
            isNull: rawValue === null,
            isUndefined: rawValue === undefined,
            stringRep: String(rawValue),
            jsonRep: JSON.stringify(rawValue),
            allDataKeys: Object.keys(data),
            dataHasGoogle: Object.keys(data).some(k => k.includes('google')),
          });
          
          // If field doesn't exist, the column might not be in the database
          if (!fieldExists) {
            console.error('🔴 SystemSettingsService: google_sign_in_enabled field DOES NOT EXIST in response!');
            console.error('🔴 SystemSettingsService: This means the column may not exist in the database table.');
            console.error('🔴 SystemSettingsService: Please run the migration: database/add-google-signin-setting.sql');
            // Return default, but this is a problem
            return true;
          }
          
          // Field exists but is null/undefined - this shouldn't happen with NOT NULL constraint
          if (rawValue === null || rawValue === undefined) {
            console.error('🔴 SystemSettingsService: google_sign_in_enabled is NULL/UNDEFINED (should not happen with NOT NULL constraint)');
            return true; // Default
          }
          
          // If it's already a boolean, use it directly (THIS IS THE CORRECT CASE)
          if (typeof rawValue === 'boolean') {
            console.log('✅ SystemSettingsService: google_sign_in_enabled is boolean:', rawValue);
            return rawValue; // This should preserve false correctly
          }
          
          // If it's a string, convert it
          if (typeof rawValue === 'string') {
            const lower = rawValue.toLowerCase().trim();
            if (lower === 'false' || lower === 'f' || lower === '0' || lower === 'no' || lower === 'n') {
              console.log('✅ SystemSettingsService: google_sign_in_enabled string converted to false:', rawValue);
              return false;
            }
            const result = lower === 'true' || lower === 't' || lower === '1' || lower === 'yes' || lower === 'y';
            console.log('✅ SystemSettingsService: google_sign_in_enabled string converted:', rawValue, '->', result);
            return result;
          }
          
          // If it's a number, 0 = false
          if (typeof rawValue === 'number') {
            const result = rawValue !== 0;
            console.log('✅ SystemSettingsService: google_sign_in_enabled number converted:', rawValue, '->', result);
            return result;
          }
          
          // Fallback - should not reach here
          const result = Boolean(rawValue);
          console.error('🔴 SystemSettingsService: google_sign_in_enabled fallback conversion (unexpected type):', rawValue, '->', result);
          return result;
        })(),
        updatedBy: data.updated_by,
        updatedAt: this.parseDate(data.updated_at) ?? new Date(),
        createdAt: this.parseDate(data.created_at) ?? new Date(),
      };
      } catch (mappingError) {
        console.error('SystemSettingsService: Error mapping settings from database:', mappingError);
        console.error('SystemSettingsService: Falling back to default settings');
        return this.getDefaultSettings();
      }

      // Log all boolean values to help debug
      console.log('SystemSettingsService: Mapped settings from database:', {
        booleans: {
          emailVerificationRequired: {
            raw: data.email_verification_required,
            type: typeof data.email_verification_required,
            mapped: settings.emailVerificationRequired,
          },
          mfaEnabled: {
            raw: data.mfa_enabled,
            type: typeof data.mfa_enabled,
            mapped: settings.mfaEnabled,
          },
          googleSignInEnabled: {
            raw: data.google_sign_in_enabled,
            type: typeof data.google_sign_in_enabled,
            mapped: settings.googleSignInEnabled,
            isFalse: data.google_sign_in_enabled === false,
            isTrue: data.google_sign_in_enabled === true,
            strictEqual: data.google_sign_in_enabled === false ? 'FALSE' : data.google_sign_in_enabled === true ? 'TRUE' : 'OTHER',
          },
          rateLimitEnabled: {
            raw: data.rate_limit_enabled,
            type: typeof data.rate_limit_enabled,
            mapped: settings.rateLimitEnabled,
          },
          newUserRegistrationEnabled: {
            raw: data.new_user_registration_enabled,
            type: typeof data.new_user_registration_enabled,
            mapped: settings.newUserRegistrationEnabled,
          },
        },
        numbers: {
          rateLimitAuthAttempts: {
            raw: data.rate_limit_auth_attempts,
            mapped: settings.rateLimitAuthAttempts,
          },
          rateLimitAuthWindowMinutes: {
            raw: data.rate_limit_auth_window_minutes,
            mapped: settings.rateLimitAuthWindowMinutes,
          },
        }
      });
      
      // Explicitly log googleSignInEnabled to catch any issues
      console.log('SystemSettingsService: googleSignInEnabled DEBUG:', {
        rawValue: data.google_sign_in_enabled,
        rawType: typeof data.google_sign_in_enabled,
        rawStrictFalse: data.google_sign_in_enabled === false,
        rawStrictTrue: data.google_sign_in_enabled === true,
        getBooleanResult: getBoolean(data.google_sign_in_enabled, true),
        finalValue: settings.googleSignInEnabled,
        finalType: typeof settings.googleSignInEnabled,
      });

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
        console.log('SystemSettingsService: Setting google_sign_in_enabled:', {
          value: updates.googleSignInEnabled,
          type: typeof updates.googleSignInEnabled,
          isFalse: updates.googleSignInEnabled === false,
          isTrue: updates.googleSignInEnabled === true,
        });
        dbUpdates.google_sign_in_enabled = Boolean(updates.googleSignInEnabled); // Explicitly convert to boolean
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

      console.log('SystemSettingsService: Update successful, updated row:', updateData[0]);
      console.log('SystemSettingsService: Updated row google_sign_in_enabled:', {
        value: updateData[0]?.google_sign_in_enabled,
        type: typeof updateData[0]?.google_sign_in_enabled,
        isFalse: updateData[0]?.google_sign_in_enabled === false,
        isTrue: updateData[0]?.google_sign_in_enabled === true,
      });

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

