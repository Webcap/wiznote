import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, Switch, TouchableOpacity, View, Alert } from 'react-native';
import { styles } from '../../styles/SettingsStyles';
import { RoleBadge } from '../RoleBadge';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '../../hooks/useThemeColor';
import { ThemePreference } from '../../ThemeContext';
import { Logo } from '../Logo';
import { featureFlagService } from '../../services/FeatureFlagService';
import { featureCacheService } from '../../services/FeatureCacheService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { DeleteAccountModal } from '../DeleteAccountModal';
import { AudioAPIExplorer } from '../AudioAPIExplorer';
import { AudioImportTest } from '../AudioImportTest';
import { AudioModuleDebug } from '../AudioModuleDebug';
import { PermissionTest } from '../PermissionTest';
import { WebLayout } from '../web/WebLayout';
import { UserSidebar } from '../web/UserSidebar';
import { getAppVersion } from '../../utils/appVersion';

interface SettingsWebProps {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: () => boolean;
  isSupport: () => boolean;
  signOut: () => Promise<void>;
  updatePreferences: (preferences: any) => Promise<void>;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  notifications: boolean;
  setNotifications: (value: boolean) => void;
  autoSync: boolean;
  setAutoSync: (value: boolean) => void;
  autoKeyDetails: boolean;
  setAutoKeyDetails: (value: boolean) => void;
  autoAISummaries: boolean;
  setAutoAISummaries: (value: boolean) => void;
  subscriptionDetails: any;
  subscriptionLoading: boolean;
  stats: {
    totalNotes: number;
    pinnedNotes: number;
    archivedNotes: number;
    totalTags: number;
  };
  showDeleteAccountModal: boolean;
  setShowDeleteAccountModal: (value: boolean) => void;
  handleDeleteAccountSuccess: () => void;
}

export function SettingsWeb({
  user,
  isLoading,
  isAdmin,
  isSupport,
  signOut,
  updatePreferences,
  theme,
  setTheme,
  notifications,
  setNotifications,
  autoSync,
  setAutoSync,
  autoKeyDetails,
  setAutoKeyDetails,
  autoAISummaries,
  setAutoAISummaries,
  subscriptionDetails,
  subscriptionLoading,
  stats,
  showDeleteAccountModal,
  setShowDeleteAccountModal,
  handleDeleteAccountSuccess,
}: SettingsWebProps) {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const iconColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({}, 'backgroundSecondary');
  const cardText = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const currentUser = user;
  const appVersion = getAppVersion();

  const handleWebSignOut = async () => {
    try {
      await signOut();
      if (Platform.OS === 'web') {
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      } else {
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Web sign out error:', error);
      if (error instanceof Error && error.message?.includes('Auth session missing')) {
        if (Platform.OS === 'web') {
          setTimeout(() => {
            window.location.href = '/';
          }, 100);
        } else {
          router.replace('/(auth)/login');
        }
        return;
      }
      if (Platform.OS === 'web') {
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      } else {
        router.replace('/(auth)/login');
      }
    }
  };

  const handleThemeChange = async (newTheme: ThemePreference) => {
    setTheme(newTheme);
    try {
      await updatePreferences({ theme: newTheme });
    } catch (error) {
      console.error('Error updating theme preference:', error);
    }
  };

  const handleAutoKeyDetailsChange = async (value: boolean) => {
    setAutoKeyDetails(value);
    try {
      await updatePreferences({ autoKeyDetails: value });
    } catch (error) {
      console.error('Error updating auto key details preference:', error);
    }
  };

  const handleAutoAISummariesChange = async (value: boolean) => {
    setAutoAISummaries(value);
    try {
      await updatePreferences({ autoAISummaries: value });
    } catch (error) {
      console.error('Error updating auto AI summaries preference:', error);
    }
  };

  if (isLoading) {
    return (
      <WebLayout
        title="Settings"
        subtitle="Manage your account"
        sidebar={<UserSidebar activePage="settings" />}
        header={
          <View style={styles.webHeader}>
            <ThemedText type="title">Settings</ThemedText>
            <ThemedText style={styles.webLoadingText}>Loading...</ThemedText>
          </View>
        }
      >
        <View style={styles.webLoadingContainer}>
          <ThemedText style={styles.webLoadingText}>Loading settings...</ThemedText>
        </View>
      </WebLayout>
    );
  }

  return (
    <WebLayout
      title="Settings"
      subtitle="Manage your account"
      sidebar={<UserSidebar activePage="settings" />}
      header={
        <View style={styles.webHeader}>
          <ThemedText type="title">Settings</ThemedText>
        </View>
      }
    >
      <ScrollView style={styles.webContent}>
        {/* User Profile */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Profile</ThemedText>
          <View style={[styles.profileCard, { backgroundColor: cardBg }]}>
            <View style={styles.profileInfo}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color={iconColor} />
              </View>
              <View style={styles.profileDetails}>
                <ThemedText style={styles.userName}>{currentUser?.displayName || 'User'}</ThemedText>
                <ThemedText style={styles.userEmail}>{currentUser?.email || 'user@example.com'}</ThemedText>
                {currentUser?.role && (
                  <View style={styles.roleContainer}>
                    <RoleBadge role={currentUser.role} size="small" />
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.editProfileButton, { backgroundColor: accentColor }]}
              onPress={() => router.push('/edit-profile')}
            >
              <ThemedText style={[styles.editProfileText, { color: '#FFFFFF' }]}>Edit</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Premium</ThemedText>
          <View style={[styles.profileCard, { backgroundColor: cardBg }]}>
            <View>
              <ThemedText style={{ fontWeight: 'bold', fontSize: 16 }}>
                Status: {currentUser?.premium?.isActive ? 'Active' : 'Inactive'}
              </ThemedText>
              <ThemedText style={{ color: '#A0A0A0', fontSize: 14 }}>
                {currentUser?.premium?.isActive ? (
                  subscriptionDetails ? `${subscriptionDetails.planName}` : `${currentUser?.premium?.type || 'Premium'}`
                ) : 'Upgrade to unlock all features!'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Statistics</ThemedText>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <ThemedText style={styles.statNumber}>{stats.totalNotes}</ThemedText>
              <ThemedText style={styles.statLabel}>Total Notes</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <ThemedText style={styles.statNumber}>{stats.pinnedNotes}</ThemedText>
              <ThemedText style={styles.statLabel}>Pinned</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <ThemedText style={styles.statNumber}>{stats.archivedNotes}</ThemedText>
              <ThemedText style={styles.statLabel}>Archived</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <ThemedText style={styles.statNumber}>{stats.totalTags}</ThemedText>
              <ThemedText style={styles.statLabel}>Tags</ThemedText>
            </View>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="color-palette" size={20} color="#6A5ACD" />
              <ThemedText style={styles.preferenceLabel}>Theme</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['light', 'dark', 'auto'].map(option => (
                <TouchableOpacity
                  key={option}
                  style={{
                    backgroundColor: theme === option ? accentColor : cardBg,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    marginHorizontal: 2,
                  }}
                  onPress={() => handleThemeChange(option as ThemePreference)}
                >
                  <ThemedText style={{ color: theme === option ? '#fff' : cardText, fontWeight: 'bold', fontSize: 14 }}>
                    {option === 'light' ? 'Light' : option === 'dark' ? 'Dark' : 'System'}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="notifications" size={20} color="#6A5ACD" />
              <ThemedText style={styles.preferenceLabel}>Notifications</ThemedText>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: borderColor, true: '#6A5ACD' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="cloud-upload" size={20} color="#6A5ACD" />
              <ThemedText style={styles.preferenceLabel}>Auto Sync</ThemedText>
            </View>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: borderColor, true: '#6A5ACD' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="key" size={20} color="#6A5ACD" />
              <ThemedText style={styles.preferenceLabel}>Auto Key Details</ThemedText>
            </View>
            <Switch
              value={autoKeyDetails}
              onValueChange={handleAutoKeyDetailsChange}
              trackColor={{ false: borderColor, true: '#6A5ACD' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="sparkles" size={20} color="#6A5ACD" />
              <ThemedText style={styles.preferenceLabel}>Auto AI Summaries</ThemedText>
            </View>
            <Switch
              value={autoAISummaries}
              onValueChange={handleAutoAISummariesChange}
              trackColor={{ false: borderColor, true: '#6A5ACD' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Admin Settings */}
        {isAdmin() && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Admin Settings</ThemedText>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin-dashboard')}
            >
              <Ionicons name="shield" size={20} color={iconColor} />
              <ThemedText style={styles.actionButtonText}>Admin Dashboard</ThemedText>
              <Ionicons name="chevron-forward" size={20} color={borderColor} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin/feature-management')}
            >
              <Ionicons name="settings" size={20} color={iconColor} />
              <ThemedText style={styles.actionButtonText}>Feature Management</ThemedText>
              <Ionicons name="chevron-forward" size={20} color={borderColor} />
            </TouchableOpacity>
          </View>
        )}

        {isSupport() && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Support Settings</ThemedText>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="headset" size={20} color={iconColor} />
              <ThemedText style={styles.actionButtonText}>Support Dashboard</ThemedText>
              <Ionicons name="chevron-forward" size={20} color={borderColor} />
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Actions</ThemedText>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/subscription-management')}
          >
            <Ionicons name="card" size={20} color={iconColor} />
            <ThemedText style={styles.actionButtonText}>Manage Subscription</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/simple-usage')}
          >
            <Ionicons name="analytics" size={20} color={iconColor} />
            <ThemedText style={styles.actionButtonText}>Usage Statistics</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/archived')}
          >
            <Ionicons name="archive" size={20} color={iconColor} />
            <ThemedText style={styles.actionButtonText}>Archived Notes ({stats.archivedNotes})</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
          
          <View style={styles.logoSection}>
            <Logo size={80} />
            <ThemedText style={styles.appName}>WizNote</ThemedText>
            <ThemedText style={[styles.appVersion, { color: textSecondary }]}>
              v{appVersion}
            </ThemedText>
          </View>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/help')}
          >
            <Ionicons name="help-circle" size={20} color={iconColor} />
            <ThemedText style={styles.actionButtonText}>Help & Support</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/changelog')}
          >
            <Ionicons name="list" size={20} color={iconColor} />
            <ThemedText style={styles.actionButtonText}>Changelog</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/about')}
          >
            <Ionicons name="information-circle" size={20} color={iconColor} />
            <ThemedText style={styles.actionButtonText}>About WizNote</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
        </View>

        {/* Admin Debug Tools */}
        {isAdmin() && __DEV__ && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Admin Debug Tools</ThemedText>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FF9800', marginBottom: 10 }]}
              onPress={async () => {
                try {
                  await featureCacheService.invalidate('feature_flags');
                  await featureFlagService.clearLocalCache();
                  await featureFlagService.forceReloadFromSupabase();
                  
                  showSnackbar('✅ Feature cache cleared! Please refresh the page.', 'success', 4000);
                } catch (error) {
                  console.error('Error clearing cache:', error);
                  showSnackbar(`Failed to clear cache: ${error instanceof Error ? error.message : String(error)}`, 'error', 4000);
                }
              }}
            >
              <Ionicons name="trash" size={20} color="white" />
              <ThemedText style={[styles.actionButtonText, { color: 'white' }]}>
                🧹 Clear Feature Cache
              </ThemedText>
            </TouchableOpacity>
            
            <View style={[styles.profileCard, { backgroundColor: cardBg }]}>
              <PermissionTest />
              <AudioModuleDebug />
              <AudioImportTest />
              <AudioAPIExplorer />
            </View>
          </View>
        )}

        {/* Danger Zone */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Danger Zone</ThemedText>
          <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleWebSignOut}>
            <Ionicons name="log-out" size={20} color="#FF6B6B" />
            <ThemedText style={[styles.actionButtonText, styles.dangerText]}>Sign Out</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]} 
            onPress={() => setShowDeleteAccountModal(true)}
          >
            <Ionicons name="trash" size={20} color="#FF6B6B" />
            <ThemedText style={[styles.actionButtonText, styles.dangerText]}>Delete Account</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
        </View>

        {/* Delete Account Modal */}
        {currentUser && (
          <DeleteAccountModal
            visible={showDeleteAccountModal}
            userId={currentUser.id}
            userEmail={currentUser.email || ''}
            onClose={() => setShowDeleteAccountModal(false)}
            onDeleteSuccess={handleDeleteAccountSuccess}
          />
        )}
      </ScrollView>
    </WebLayout>
  );
}

