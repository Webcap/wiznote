import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, Switch, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles/SettingsStyles';
import { RoleBadge } from '../RoleBadge';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useThemeColor } from '../../hooks/useThemeColor';
import { ThemePreference } from '../../ThemeContext';
import { Logo } from '../Logo';
import { featureFlagService } from '../../services/FeatureFlagService';
import { featureCacheService } from '../../services/FeatureCacheService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from '../../hooks/useTranslation';
import { DeleteAccountModal } from '../DeleteAccountModal';
import { AudioAPIExplorer } from '../AudioAPIExplorer';
import { AudioImportTest } from '../AudioImportTest';
import { AudioModuleDebug } from '../AudioModuleDebug';
import { PermissionTest } from '../PermissionTest';
import { getAppVersion } from '../../utils/appVersion';

interface SettingsMobileProps {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: () => boolean;
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

export function SettingsMobile({
  user,
  isLoading,
  isAdmin,
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
}: SettingsMobileProps) {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { language, changeLanguage } = useLanguage();
  const { t, i18n: i18nInstance } = useTranslation();
  const iconColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({}, 'backgroundSecondary');
  const cardText = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  
  // Re-render when language changes
  const [, setForceUpdate] = useState(0);
  useEffect(() => {
    // This will trigger a re-render when language changes
    const listener = () => {
      setForceUpdate(prev => prev + 1);
    };
    i18nInstance.on('languageChanged', listener);
    return () => {
      i18nInstance.off('languageChanged', listener);
    };
  }, [i18nInstance]);

  const currentUser = user;
  const appVersion = getAppVersion();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Sign out error:', error);
              if (error instanceof Error && error.message?.includes('Auth session missing')) {
                router.replace('/(auth)/login');
                return;
              }
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        },
      ]
    );
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

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      console.log('Settings: Changing language to', newLanguage);
      await changeLanguage(newLanguage);
      console.log('Settings: Language changed successfully');
      await updatePreferences({ language: newLanguage });
      console.log('Settings: Preferences updated');
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading settings...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        style={{ backgroundColor: 'transparent' }}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        </View>

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
                Status: {subscriptionDetails ? 'Active' : 'Inactive'}
              </ThemedText>
              <ThemedText style={{ color: '#A0A0A0', fontSize: 14 }}>
                {subscriptionDetails ? (
                  subscriptionLoading ? 'Loading...' : `${subscriptionDetails.planName} (${subscriptionDetails.planInterval})`
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
              <ThemedText style={styles.preferenceLabel}>{t('settings.theme')}</ThemedText>
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
                    {option === 'light' ? t('settings.lightTheme') : option === 'dark' ? t('settings.darkTheme') : t('settings.systemTheme')}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="language" size={20} color="#6A5ACD" />
              <ThemedText style={styles.preferenceLabel}>{t('settings.language')}</ThemedText>
            </View>
            <TouchableOpacity
              onPress={() => setShowLanguagePicker(true)}
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: borderColor,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                minWidth: 120,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <ThemedText style={{ color: cardText, fontWeight: '500', fontSize: 14 }}>
                {language === 'en' ? t('settings.english') : t('settings.spanish')}
              </ThemedText>
              <Ionicons name="chevron-down" size={20} color={borderColor} />
            </TouchableOpacity>
          </View>
          
          {/* Language Picker Modal */}
          <Modal
            visible={showLanguagePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowLanguagePicker(false)}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              activeOpacity={1}
              onPress={() => setShowLanguagePicker(false)}
            >
              <View
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 16,
                  padding: 20,
                  minWidth: 280,
                  maxWidth: '90%',
                }}
                onStartShouldSetResponder={() => true}
              >
                <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
                  {t('settings.language')}
                </ThemedText>
                {['en', 'es'].map(lang => (
                  <TouchableOpacity
                    key={lang}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: language === lang ? accentColor : 'transparent',
                      marginBottom: 8,
                    }}
                    onPress={() => {
                      handleLanguageChange(lang);
                      setShowLanguagePicker(false);
                    }}
                  >
                    <ThemedText
                      style={{
                        color: language === lang ? '#fff' : cardText,
                        fontWeight: '500',
                        fontSize: 16,
                      }}
                    >
                      {lang === 'en' ? t('settings.english') : t('settings.spanish')}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
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
          <View style={[styles.section, { paddingBottom: 50 }]}>
            <ThemedText style={styles.sectionTitle}>Admin Debug Tools</ThemedText>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FF9800', marginBottom: 10 }]}
              onPress={async () => {
                try {
                  await featureCacheService.invalidate('feature_flags');
                  await featureFlagService.clearLocalCache();
                  await featureFlagService.forceReloadFromSupabase();
                  
                  Alert.alert('Success', 'Feature cache cleared! Please restart the app.');
                } catch (error) {
                  console.error('Error clearing cache:', error);
                  Alert.alert('Error', 'Failed to clear cache');
                }
              }}
            >
              <Ionicons name="trash" size={20} color="white" />
              <ThemedText style={[styles.actionButtonText, { color: 'white' }]}>
                🧹 Clear Feature Cache
              </ThemedText>
            </TouchableOpacity>
            
            <ScrollView 
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={{ marginVertical: 10 }}
              contentContainerStyle={{ paddingHorizontal: 10 }}
            >
              <View style={[styles.profileCard, { backgroundColor: cardBg, marginRight: 20, minWidth: 280 }]}>
                <PermissionTest />
              </View>
              <View style={[styles.profileCard, { backgroundColor: cardBg, marginRight: 20, minWidth: 280 }]}>
                <AudioModuleDebug />
              </View>
              <View style={[styles.profileCard, { backgroundColor: cardBg, marginRight: 20, minWidth: 280 }]}>
                <AudioImportTest />
              </View>
              <View style={[styles.profileCard, { backgroundColor: cardBg, marginRight: 20, minWidth: 280 }]}>
                <AudioAPIExplorer />
              </View>
            </ScrollView>
          </View>
        )}

        {/* Danger Zone */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Danger Zone</ThemedText>
          <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleSignOut}>
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
      </ScrollView>

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
    </ThemedView>
  );
}

