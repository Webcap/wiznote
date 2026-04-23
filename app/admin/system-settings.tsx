import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { WebLayout } from '../../components/web/WebLayout';
import { AdminSidebar } from '../../components/web/AdminSidebar';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  systemSettingsService,
  SystemSettings,
  SystemSettingsAuditLog,
} from '../../services/SystemSettingsService';

export default function SystemSettingsScreen() {
  const router = useRouter();
  const { user, hasPermission, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<SystemSettingsAuditLog[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const accentWarning = useThemeColor({}, 'accentWarning');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  const iconColor = useThemeColor({}, 'icon');

  const checkAdminAccess = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      router.back();
      return;
    }

    // Check if user has admin role OR canManageSystemSettings permission
    const isAdmin = hasRole('admin');
    const canManage = hasPermission('canManageSystemSettings');

    if (!isAdmin && !canManage) {
      Alert.alert('Unauthorized', 'You do not have permission to access system settings');
      router.back();
      return;
    }
  }, [user, hasRole, hasPermission, router]);

  useEffect(() => {
    checkAdminAccess();
    loadSettings();
  }, [checkAdminAccess]);

  // Debug: Log when settings.googleSignInEnabled changes
  useEffect(() => {
    if (settings) {
      console.log('SystemSettingsScreen: settings.googleSignInEnabled changed:', {
        value: settings.googleSignInEnabled,
        type: typeof settings.googleSignInEnabled,
        isFalse: settings.googleSignInEnabled === false,
        isTrue: settings.googleSignInEnabled === true,
        stringified: String(settings.googleSignInEnabled),
      });
    }
  }, [settings?.googleSignInEnabled]);

  const loadSettings = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      // Clear cache and force refresh to ensure we get fresh data from database
      systemSettingsService.clearCache();
      const currentSettings = await systemSettingsService.getSettings(true);
      console.log('SystemSettingsScreen: Loaded settings:', {
        rateLimitAuthAttempts: currentSettings.rateLimitAuthAttempts,
        rateLimitAuthWindowMinutes: currentSettings.rateLimitAuthWindowMinutes,
        googleSignInEnabled: {
          value: currentSettings.googleSignInEnabled,
          type: typeof currentSettings.googleSignInEnabled,
          isFalse: currentSettings.googleSignInEnabled === false,
          isTrue: currentSettings.googleSignInEnabled === true,
          strictEqual: currentSettings.googleSignInEnabled === false ? 'FALSE' : currentSettings.googleSignInEnabled === true ? 'TRUE' : 'OTHER',
        },
        mfaEnabled: {
          value: currentSettings.mfaEnabled,
          type: typeof currentSettings.mfaEnabled,
        },
        rateLimitEnabled: {
          value: currentSettings.rateLimitEnabled,
          type: typeof currentSettings.rateLimitEnabled,
        },
      });
      
      // Explicitly log the state that will be set
      console.log('SystemSettingsScreen: About to set state with googleSignInEnabled:', {
        value: currentSettings.googleSignInEnabled,
        type: typeof currentSettings.googleSignInEnabled,
        willSetToFalse: currentSettings.googleSignInEnabled === false,
      });
      // Force state update with fresh settings
      setSettings({ ...currentSettings });
      // Reset hasChanges when loading fresh settings
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load system settings');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const loadAuditLogs = async () => {
    try {
      const logs = await systemSettingsService.getAuditLogs(50);
      setAuditLogs(logs);
      setShowAuditLogs(true);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      Alert.alert('Error', 'Failed to load audit logs');
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);

      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        setSaving(false);
        return;
      }

      // Verify permission before saving
      const isAdmin = hasRole('admin');
      const canManage = hasPermission('canManageSystemSettings');

      if (!isAdmin && !canManage) {
        Alert.alert('Unauthorized', 'You do not have permission to update system settings');
        setSaving(false);
        return;
      }

      console.log('SystemSettingsScreen: Attempting to save settings:', {
        userId: user.id,
        isAdmin,
        canManage,
        settingsCount: Object.keys(settings).length,
        googleSignInEnabled: {
          value: settings.googleSignInEnabled,
          type: typeof settings.googleSignInEnabled,
          isFalse: settings.googleSignInEnabled === false,
          isTrue: settings.googleSignInEnabled === true,
        },
        rateLimitEnabled: {
          value: settings.rateLimitEnabled,
          type: typeof settings.rateLimitEnabled,
          isFalse: settings.rateLimitEnabled === false,
          isTrue: settings.rateLimitEnabled === true,
        },
        mfaEnabled: {
          value: settings.mfaEnabled,
          type: typeof settings.mfaEnabled,
          isFalse: settings.mfaEnabled === false,
          isTrue: settings.mfaEnabled === true,
        },
      });

      // Pass user role and permissions to avoid RLS blocking issues
      const updatesToSave = {
        emailVerificationRequired: settings.emailVerificationRequired,
        mfaEnabled: settings.mfaEnabled,
        mfaRequiredForAdmin: settings.mfaRequiredForAdmin,
        accountLockoutEnabled: settings.accountLockoutEnabled,
        accountLockoutAttempts: settings.accountLockoutAttempts,
        accountLockoutDurationMinutes: settings.accountLockoutDurationMinutes,
        sessionTimeoutHours: settings.sessionTimeoutHours,
        passwordMinLength: settings.passwordMinLength,
        passwordRequireSpecialChars: settings.passwordRequireSpecialChars,
        rateLimitEnabled: settings.rateLimitEnabled,
        rateLimitAuthAttempts: settings.rateLimitAuthAttempts,
        rateLimitAuthWindowMinutes: settings.rateLimitAuthWindowMinutes,
        rateLimitApiRequests: settings.rateLimitApiRequests,
        rateLimitApiWindowMinutes: settings.rateLimitApiWindowMinutes,
        maintenanceMode: settings.maintenanceMode,
        newUserRegistrationEnabled: settings.newUserRegistrationEnabled,
        googleSignInEnabled: settings.googleSignInEnabled,
        sunsetShutdownDate: settings.sunsetShutdownDate,
      };
      
      console.log('SystemSettingsScreen: Updates to save (before sending):', {
        googleSignInEnabled: {
          value: updatesToSave.googleSignInEnabled,
          type: typeof updatesToSave.googleSignInEnabled,
          isFalse: updatesToSave.googleSignInEnabled === false,
          isTrue: updatesToSave.googleSignInEnabled === true,
        },
      });
      
      const result = await systemSettingsService.updateSettings(
        updatesToSave,
        user.id,
        undefined, // reason
        user.role, // userRole - pass from UI to avoid RLS issues
        user.permissions // userPermissions - pass from UI to avoid RLS issues
      );

      console.log('SystemSettingsScreen: Save result:', result);

      if (result.success) {
        console.log('SystemSettingsScreen: Settings saved successfully');
        
        // Clear cache and force reload to get fresh data
        systemSettingsService.clearCache();
        console.log('SystemSettingsScreen: Cache cleared, waiting for database to commit...');
        
        // Longer delay to ensure database transaction has fully committed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Force refresh to bypass cache - explicitly clear cache again before fetching
        systemSettingsService.clearCache();
        console.log('SystemSettingsScreen: Fetching fresh settings from database...');
        const freshSettings = await systemSettingsService.getSettings(true);
        console.log('SystemSettingsScreen: Reloaded fresh settings after save:', {
          googleSignInEnabled: {
            value: freshSettings.googleSignInEnabled,
            type: typeof freshSettings.googleSignInEnabled,
            isFalse: freshSettings.googleSignInEnabled === false,
            isTrue: freshSettings.googleSignInEnabled === true,
          },
          mfaEnabled: freshSettings.mfaEnabled,
          rateLimitEnabled: freshSettings.rateLimitEnabled,
        });
        
        // Update state with fresh settings - create a new object to force React to re-render
        const newSettings = { ...freshSettings };
        console.log('SystemSettingsScreen: Setting state with newSettings.googleSignInEnabled:', {
          value: newSettings.googleSignInEnabled,
          type: typeof newSettings.googleSignInEnabled,
          isFalse: newSettings.googleSignInEnabled === false,
        });
        setSettings(newSettings);
        setHasChanges(false);
        
        Alert.alert('Success', 'System settings updated successfully');
      } else {
        console.error('SystemSettingsScreen: Save failed:', result.error);
        const errorMessage = result.error || 'Failed to update settings';
        Alert.alert(
          'Error Saving Settings',
          errorMessage + '\n\nPlease check:\n1. You have admin access or canManageSystemSettings permission\n2. RLS policies are correctly configured\n3. Check browser console for detailed error logs',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
      setHasChanges(true);
    }
  };

  if (loading) {
    return (
      <WebLayout
        sidebar={<AdminSidebar activePage="system-settings" />}
        header={
          <ThemedView style={styles.header}>
            <ThemedText type="title">System Settings</ThemedText>
            <ThemedText style={styles.subtitle}>
              Configure security and system-wide settings
            </ThemedText>
          </ThemedView>
        }
      >
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={accentPrimary} />
          <ThemedText style={styles.loadingText}>Loading system settings...</ThemedText>
        </ThemedView>
      </WebLayout>
    );
  }

  if (!settings) {
    return (
      <WebLayout
        sidebar={<AdminSidebar activePage="system-settings" />}
        header={
          <ThemedView style={styles.header}>
            <ThemedText type="title">System Settings</ThemedText>
          </ThemedView>
        }
      >
        <ThemedView style={styles.centerContainer}>
          <ThemedText style={styles.errorText}>Failed to load settings</ThemedText>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton, { backgroundColor: accentPrimary }]} 
            onPress={() => loadSettings()}
          >
            <ThemedText style={styles.buttonTextWhite}>Retry</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </WebLayout>
    );
  }

  return (
    <WebLayout
      sidebar={<AdminSidebar activePage="system-settings" />}
      header={
        <ThemedView style={styles.header}>
          <ThemedText type="title">System Settings</ThemedText>
          <ThemedText style={styles.subtitle}>
            Configure security and system-wide settings
          </ThemedText>
        </ThemedView>
      }
    >
      <ScrollView style={styles.content}>
        {hasChanges && (
          <ThemedView style={[styles.changesBanner, { backgroundColor: accentWarning + '20', borderColor: accentWarning }]}>
            <ThemedText style={[styles.changesText, { color: accentWarning }]}>
              You have unsaved changes
            </ThemedText>
          </ThemedView>
        )}

        {/* Security Settings Section */}
        <ThemedView style={[styles.section, { backgroundColor: cardBg }]}>
          <ThemedText style={styles.sectionTitle}>🔐 Security Settings</ThemedText>

        <SettingToggle
          label="Email Verification Required"
          description="Require new users to verify their email before accessing the app"
          value={settings.emailVerificationRequired}
          onChange={(value) => updateSetting('emailVerificationRequired', value)}
          warning={!settings.emailVerificationRequired}
        />

        <SettingToggle
          label="Multi-Factor Authentication"
          description="Enable MFA/2FA support for enhanced account security"
          value={settings.mfaEnabled}
          onChange={(value) => updateSetting('mfaEnabled', value)}
        />

        {settings.mfaEnabled && (
          <SettingToggle
            label="Require MFA for Admins"
            description="Force all admin and support users to use MFA"
            value={settings.mfaRequiredForAdmin}
            onChange={(value) => updateSetting('mfaRequiredForAdmin', value)}
            indent
          />
        )}

        <SettingToggle
          label="Account Lockout"
          description="Lock accounts after repeated failed login attempts"
          value={settings.accountLockoutEnabled}
          onChange={(value) => updateSetting('accountLockoutEnabled', value)}
          warning={!settings.accountLockoutEnabled}
        />

        {settings.accountLockoutEnabled && (
          <>
            <SettingNumber
              label="Lockout Attempts"
              description="Number of failed attempts before lockout"
              value={settings.accountLockoutAttempts}
              onChange={(value) => updateSetting('accountLockoutAttempts', value)}
              min={3}
              max={10}
              indent
            />

            <SettingNumber
              label="Lockout Duration (minutes)"
              description="How long accounts remain locked"
              value={settings.accountLockoutDurationMinutes}
              onChange={(value) =>
                updateSetting('accountLockoutDurationMinutes', value)
              }
              min={5}
              max={120}
              indent
            />
          </>
        )}

        <SettingNumber
          label="Session Timeout (hours)"
          description="Auto logout users after this period of inactivity"
          value={settings.sessionTimeoutHours}
          onChange={(value) => updateSetting('sessionTimeoutHours', value)}
          min={1}
          max={168}
        />

        <SettingNumber
          label="Password Minimum Length"
          description="Minimum required password length"
          value={settings.passwordMinLength}
          onChange={(value) => updateSetting('passwordMinLength', value)}
          min={6}
          max={20}
        />

        <SettingToggle
          label="Require Special Characters"
          description="Passwords must contain special characters (!@#$%)"
          value={settings.passwordRequireSpecialChars}
          onChange={(value) => updateSetting('passwordRequireSpecialChars', value)}
        />
        </ThemedView>

        {/* Rate Limiting Section */}
        <ThemedView style={[styles.section, { backgroundColor: cardBg }]}>
          <ThemedText style={styles.sectionTitle}>⚡ Rate Limiting</ThemedText>

        <SettingToggle
          label="Enable Rate Limiting"
          description="Protect against brute force and API abuse"
          value={settings.rateLimitEnabled}
          onChange={(value) => updateSetting('rateLimitEnabled', value)}
          warning={!settings.rateLimitEnabled}
        />

        {settings.rateLimitEnabled && (
          <>
            <SettingNumber
              label="Auth Attempts"
              description="Max login attempts per window"
              value={settings.rateLimitAuthAttempts}
              onChange={(value) => updateSetting('rateLimitAuthAttempts', value)}
              min={3}
              max={20}
              indent
            />

            <SettingNumber
              label="Auth Window (minutes)"
              description="Time window for auth rate limiting"
              value={settings.rateLimitAuthWindowMinutes}
              onChange={(value) =>
                updateSetting('rateLimitAuthWindowMinutes', value)
              }
              min={5}
              max={60}
              indent
            />

            <SettingNumber
              label="API Requests Per Minute"
              description="Max API requests per user per minute"
              value={settings.rateLimitApiRequests}
              onChange={(value) => updateSetting('rateLimitApiRequests', value)}
              min={10}
              max={1000}
              indent
            />
          </>
        )}
        </ThemedView>

        {/* System Features Section */}
        <ThemedView style={[styles.section, { backgroundColor: cardBg }]}>
          <ThemedText style={styles.sectionTitle}>⚙️ System Features</ThemedText>

        <SettingToggle
          label="Maintenance Mode"
          description="Put system in read-only mode (emergency only)"
          value={settings.maintenanceMode}
          onChange={(value) => updateSetting('maintenanceMode', value)}
          warning={settings.maintenanceMode}
        />

        <SettingToggle
          label="New User Registration"
          description="Allow new users to create accounts"
          value={settings.newUserRegistrationEnabled}
          onChange={(value) =>
            updateSetting('newUserRegistrationEnabled', value)
          }
        />

        <SettingToggle
          key={`google-sign-in-${settings.googleSignInEnabled}`}
          label="Google Sign-In"
          description="Enable Google Sign-In and Sign-Up for all users"
          value={Boolean(settings.googleSignInEnabled)}
          onChange={(value) =>
            updateSetting('googleSignInEnabled', value)
          }
        />
        </ThemedView>

        {/* Sunsetting Section */}
        <ThemedView style={[styles.section, { backgroundColor: cardBg }]}>
          <ThemedText style={styles.sectionTitle}>🌅 Sunsetting</ThemedText>

          <SettingToggle
            label="Sunset Mode Active"
            description="Enable platform-wide decommissioning (show notices, block new notes/signups)"
            value={settings.sunsetModeEnabled}
            onChange={(value) => updateSetting('sunsetModeEnabled', value)}
            warning={settings.sunsetModeEnabled}
          />

          <View style={{ marginTop: 10 }}>
            <SettingText
              label="Shutdown Date"
              description="Target date for final platform shutdown (YYYY-MM-DD)"
              value={settings.sunsetShutdownDate.toISOString().split('T')[0]}
              onChange={(value) => {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  updateSetting('sunsetShutdownDate', date);
                }
              }}
            />
          </View>
        </ThemedView>

        {/* Action Buttons */}
        <ThemedView style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.button, 
              styles.primaryButton, 
              { backgroundColor: saving || !hasChanges ? textSecondary : accentPrimary }
            ]}
            onPress={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.buttonTextWhite}>
                {hasChanges ? 'Save Changes' : 'No Changes'}
              </ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { borderColor: accentPrimary }]}
            onPress={loadAuditLogs}
          >
            <ThemedText style={[styles.buttonText, { color: accentPrimary }]}>
              View Audit Logs
            </ThemedText>
          </TouchableOpacity>

          {hasChanges && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: textSecondary }]}
              onPress={() => loadSettings()}
            >
              <ThemedText style={[styles.buttonText, { color: textSecondary }]}>
                Discard Changes
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>

        {/* Audit Logs Section */}
        {showAuditLogs && auditLogs.length > 0 && (
          <ThemedView style={[styles.section, { backgroundColor: cardBg }]}>
            <ThemedText style={styles.sectionTitle}>📋 Recent Changes</ThemedText>
            {auditLogs.slice(0, 10).map((log) => (
              <ThemedView key={log.id} style={styles.auditLog}>
                <ThemedText style={styles.auditLogKey}>{log.settingKey}</ThemedText>
                <ThemedText style={[styles.auditLogChange, { color: textSecondary }]}>
                  {log.oldValue} → {log.newValue}
                </ThemedText>
                <ThemedText style={[styles.auditLogMeta, { color: textSecondary }]}>
                  {log.changedByEmail} • {log.changedAt && !isNaN(new Date(log.changedAt).getTime())
                    ? new Date(log.changedAt).toLocaleString()
                    : 'Unknown date'}
                </ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        )}

        <ThemedView style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: textSecondary }]}>
            ⚠️ Changes affect all users immediately. Use with caution.
          </ThemedText>
          <ThemedText style={[styles.footerText, { color: textSecondary }]}>
            Last updated: {settings.updatedAt && !isNaN(settings.updatedAt.getTime()) 
              ? settings.updatedAt.toLocaleString() 
              : 'Unknown'}
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </WebLayout>
  );
}

// Helper Components
interface SettingToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  warning?: boolean;
  indent?: boolean;
}

function SettingToggle({
  label,
  description,
  value,
  onChange,
  warning,
  indent,
}: SettingToggleProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  const backgroundTertiary = useThemeColor({}, 'backgroundTertiary');

  return (
    <ThemedView style={[styles.setting, indent && styles.settingIndent]}>
      <ThemedView style={styles.settingInfo}>
        <ThemedText style={[styles.settingLabel, warning && { color: accentDanger }]}>
          {label}
          {warning && ' ⚠️'}
        </ThemedText>
        <ThemedText style={[styles.settingDescription, { color: textSecondary }]}>
          {description}
        </ThemedText>
      </ThemedView>
      <Switch
        key={`switch-${value}`}
        value={Boolean(value)}
        onValueChange={onChange}
        trackColor={{ false: '#767577', true: accentSuccess }}
        thumbColor={Platform.OS === 'ios' ? '#fff' : value ? '#fff' : '#f4f3f4'}
      />
    </ThemedView>
  );
}

interface SettingNumberProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  indent?: boolean;
}

function SettingNumber({
  label,
  description,
  value,
  onChange,
  min = 1,
  max = 999,
  indent,
}: SettingNumberProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const backgroundTertiary = useThemeColor({}, 'backgroundTertiary');

  const handleChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    }
  };

  return (
    <ThemedView style={[styles.setting, indent && styles.settingIndent]}>
      <ThemedView style={styles.settingInfo}>
        <ThemedText style={styles.settingLabel}>{label}</ThemedText>
        <ThemedText style={[styles.settingDescription, { color: textSecondary }]}>
          {description} ({min}-{max})
        </ThemedText>
      </ThemedView>
      <TextInput
        style={[styles.numberInput, { backgroundColor: backgroundTertiary, color: textColor }]}
        value={String(value)}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={3}
      />
    </ThemedView>
  );
}

interface SettingTextProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  indent?: boolean;
}

function SettingText({
  label,
  description,
  value,
  onChange,
  indent,
}: SettingTextProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const backgroundTertiary = useThemeColor({}, 'backgroundTertiary');

  return (
    <ThemedView style={[styles.setting, indent && styles.settingIndent]}>
      <ThemedView style={styles.settingInfo}>
        <ThemedText style={styles.settingLabel}>{label}</ThemedText>
        <ThemedText style={[styles.settingDescription, { color: textSecondary }]}>
          {description}
        </ThemedText>
      </ThemedView>
      <TextInput
        style={[styles.textInput, { backgroundColor: backgroundTertiary, color: textColor }]}
        value={value}
        onChangeText={onChange}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 0,
    paddingTop: 40,
    paddingBottom: 30,
    gap: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
    gap: 16,
  },
  changesBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  changesText: {
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  section: {
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  setting: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    marginBottom: 12,
  },
  settingIndent: {
    paddingLeft: 20,
    opacity: 0.9,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  numberInput: {
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    minWidth: 70,
    textAlign: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  textInput: {
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    minWidth: 150,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  actions: {
    padding: 20,
    gap: 12,
    marginTop: 16,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    borderWidth: 2,
    // borderColor set dynamically
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start' as const,
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  buttonTextWhite: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  auditLog: {
    paddingVertical: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  auditLogKey: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  auditLogChange: {
    fontSize: 13,
    marginTop: 2,
  },
  auditLogMeta: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  footer: {
    padding: 20,
    marginTop: 32,
    gap: 12,
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    opacity: 0.9,
  },
});
