import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Platform, ScrollView, Switch, TouchableOpacity, View, Alert, Modal, Image } from 'react-native';
import { styles } from '../../styles/SettingsStyles';
import { RoleBadge } from '../RoleBadge';
import { ThemedText } from '../ThemedText';
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
  const { language, changeLanguage } = useLanguage();
  const { t, i18n: i18nInstance } = useTranslation();
  const iconColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({}, 'backgroundSecondary');
  const cardText = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  
  // Language configuration with flags
  const languages = [
    { code: 'en', name: t('settings.english'), flagUrl: 'https://raw.githubusercontent.com/hampusborgos/country-flags/main/svg/us.svg' },
    { code: 'es', name: t('settings.spanish'), flagUrl: 'https://raw.githubusercontent.com/hampusborgos/country-flags/main/svg/es.svg' },
  ];
  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  // Re-render when language changes
  const [, setForceUpdate] = useState(0);
  useEffect(() => {
    // This will trigger a re-render when language changes
    const listener = (lng: string) => {
      console.log('🟢 SettingsWeb: languageChanged event received, language:', lng);
      setForceUpdate(prev => prev + 1);
    };
    i18nInstance.on('languageChanged', listener);
    return () => {
      i18nInstance.off('languageChanged', listener);
    };
  }, [i18nInstance]);

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

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      console.log('🔵 SettingsWeb: Starting language change to:', newLanguage);
      console.log('🔵 SettingsWeb: Current language before:', language);
      await changeLanguage(newLanguage);
      console.log('🔵 SettingsWeb: changeLanguage completed');
      console.log('🔵 SettingsWeb: Current language after:', language);
      console.log('🔵 SettingsWeb: i18n language:', i18nInstance.language);
      await updatePreferences({ language: newLanguage });
      console.log('🔵 SettingsWeb: Preferences updated');
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  if (isLoading) {
    return (
      <WebLayout
        title={t('settings.settings')}
        subtitle={t('settings.manageYourAccount')}
        sidebar={<UserSidebar activePage="settings" />}
        header={
          <View style={styles.webHeader}>
            <ThemedText type="title">{t('settings.settings')}</ThemedText>
            <ThemedText style={styles.webLoadingText}>{t('common.loading')}</ThemedText>
          </View>
        }
      >
        <View style={styles.webLoadingContainer}>
          <ThemedText style={styles.webLoadingText}>{t('common.loading')} {t('settings.settings')}...</ThemedText>
        </View>
      </WebLayout>
    );
  }

  return (
    <WebLayout
      title={t('settings.settings')}
      subtitle={t('settings.manageYourAccount')}
      sidebar={<UserSidebar activePage="settings" />}
      header={
        <View style={styles.webHeader}>
          <ThemedText type="title">{t('settings.settings')}</ThemedText>
        </View>
      }
    >
      <ScrollView key={language} style={styles.webContent}>
        {/* User Profile */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('settings.profile')}</ThemedText>
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
              <ThemedText style={[styles.editProfileText, { color: '#FFFFFF' }]}>{t('settings.edit')}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('settings.premium')}</ThemedText>
          <View style={[styles.profileCard, { backgroundColor: cardBg }]}>
            <View>
              <ThemedText style={{ fontWeight: 'bold', fontSize: 16 }}>
                {t('settings.status')}: {currentUser?.premium?.isActive ? t('settings.active') : t('settings.inactive')}
              </ThemedText>
              <ThemedText style={{ color: '#A0A0A0', fontSize: 14 }}>
                {currentUser?.premium?.isActive ? (
                  subscriptionDetails ? `${subscriptionDetails.planName}` : `${currentUser?.premium?.type || 'Premium'}`
                ) : t('settings.upgradeToUnlock')}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('settings.statistics')}</ThemedText>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <ThemedText style={styles.statNumber}>{stats.totalNotes}</ThemedText>
              <ThemedText style={styles.statLabel}>{t('settings.totalNotes')}</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <ThemedText style={styles.statNumber}>{stats.pinnedNotes}</ThemedText>
              <ThemedText style={styles.statLabel}>{t('settings.pinned')}</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <ThemedText style={styles.statNumber}>{stats.archivedNotes}</ThemedText>
              <ThemedText style={styles.statLabel}>{t('settings.archived')}</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <ThemedText style={styles.statNumber}>{stats.totalTags}</ThemedText>
              <ThemedText style={styles.statLabel}>{t('settings.tags')}</ThemedText>
            </View>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('settings.preferences')}</ThemedText>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="color-palette" size={20} color="#6A5ACD" />
              <ThemedText style={styles.preferenceLabel}>{t('settings.theme')}</ThemedText>
            </View>
            <TouchableOpacity
              onPress={() => setShowThemePicker(true)}
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
                {theme === 'light' ? t('settings.lightTheme') : theme === 'dark' ? t('settings.darkTheme') : t('settings.systemTheme')}
              </ThemedText>
              <Ionicons name="chevron-down" size={20} color={borderColor} />
            </TouchableOpacity>
          </View>
          
          {/* Theme Picker Modal */}
          <Modal
            visible={showThemePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowThemePicker(false)}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              activeOpacity={1}
              onPress={() => setShowThemePicker(false)}
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
                  {t('settings.theme')}
                </ThemedText>
                {['light', 'dark', 'auto'].map(option => (
                  <TouchableOpacity
                    key={option}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: theme === option ? accentColor : 'transparent',
                      marginBottom: 8,
                      gap: 12,
                    }}
                    onPress={() => {
                      handleThemeChange(option as ThemePreference);
                      setShowThemePicker(false);
                    }}
                  >
                    <ThemedText
                      style={{
                        flex: 1,
                        color: theme === option ? '#fff' : cardText,
                        fontWeight: '500',
                        fontSize: 16,
                      }}
                    >
                      {option === 'light' ? t('settings.lightTheme') : option === 'dark' ? t('settings.darkTheme') : t('settings.systemTheme')}
                    </ThemedText>
                    {theme === option && (
                      <Ionicons name="checkmark" size={20} color={theme === option ? '#fff' : cardText} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image source={{ uri: currentLanguage.flagUrl }} style={{ width: 20, height: 15, borderRadius: 2 }} />
                <ThemedText style={{ color: cardText, fontWeight: '500', fontSize: 14 }}>
                  {currentLanguage.name}
                </ThemedText>
              </View>
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
                {languages.map(lang => (
                  <TouchableOpacity
                    key={lang.code}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: language === lang.code ? accentColor : 'transparent',
                      marginBottom: 8,
                      gap: 12,
                    }}
                    onPress={() => {
                      handleLanguageChange(lang.code);
                      setShowLanguagePicker(false);
                    }}
                  >
                    <Image source={{ uri: lang.flagUrl }} style={{ width: 24, height: 18, borderRadius: 2 }} />
                    <ThemedText
                      style={{
                        flex: 1,
                        color: language === lang.code ? '#fff' : cardText,
                        fontWeight: '500',
                        fontSize: 16,
                      }}
                    >
                      {lang.name}
                    </ThemedText>
                    {language === lang.code && (
                      <Ionicons name="checkmark" size={20} color={language === lang.code ? '#fff' : cardText} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="key" size={20} color="#6A5ACD" />
              <ThemedText style={styles.preferenceLabel}>{t('settings.autoKeyDetails')}</ThemedText>
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
              <ThemedText style={styles.preferenceLabel}>{t('settings.autoAISummaries')}</ThemedText>
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
            <ThemedText style={styles.sectionTitle}>{t('settings.adminSettings')}</ThemedText>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin-dashboard')}
            >
              <Ionicons name="shield" size={20} color={iconColor} />
              <ThemedText style={styles.actionButtonText}>{t('settings.adminDashboard')}</ThemedText>
              <Ionicons name="chevron-forward" size={20} color={borderColor} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin/feature-management')}
            >
              <Ionicons name="settings" size={20} color={iconColor} />
              <ThemedText style={styles.actionButtonText}>{t('settings.featureManagement')}</ThemedText>
              <Ionicons name="chevron-forward" size={20} color={borderColor} />
            </TouchableOpacity>
          </View>
        )}

        {isSupport() && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Support Settings</ThemedText>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin/support')}
            >
              <Ionicons name="headset" size={20} color={iconColor} />
              <ThemedText style={styles.actionButtonText}>Support Dashboard</ThemedText>
              <Ionicons name="chevron-forward" size={20} color={borderColor} />
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('settings.actions')}</ThemedText>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/subscription-management')}
          >
            <Ionicons name="card" size={20} color={iconColor} />
            <ThemedText style={styles.actionButtonText}>{t('settings.manageSubscription')}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/simple-usage')}
          >
            <Ionicons name="analytics" size={20} color={iconColor} />
            <ThemedText style={styles.actionButtonText}>{t('settings.usageStatistics')}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/archived')}
          >
            <Ionicons name="archive" size={20} color={iconColor} />
            <ThemedText style={styles.actionButtonText}>{t('settings.archivedNotes')} ({stats.archivedNotes})</ThemedText>
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
            <ThemedText style={styles.actionButtonText}>{t('settings.helpSupport')}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/changelog')}
          >
            <Ionicons name="list" size={20} color={iconColor} />
            <ThemedText style={styles.actionButtonText}>{t('settings.changelog')}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/about')}
          >
            <Ionicons name="information-circle" size={20} color={iconColor} />
            <ThemedText style={styles.actionButtonText}>{t('settings.aboutWizNote')}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
        </View>

        {/* Admin Debug Tools */}
        {isAdmin() && __DEV__ && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>{t('settings.adminDebugTools')}</ThemedText>
            
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
                🧹 {t('settings.clearFeatureCache')}
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
          <ThemedText style={styles.sectionTitle}>{t('settings.dangerZone')}</ThemedText>
          <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleWebSignOut}>
            <Ionicons name="log-out" size={20} color="#FF6B6B" />
            <ThemedText style={[styles.actionButtonText, styles.dangerText]}>{t('settings.signOut')}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]} 
            onPress={() => setShowDeleteAccountModal(true)}
          >
            <Ionicons name="trash" size={20} color="#FF6B6B" />
            <ThemedText style={[styles.actionButtonText, styles.dangerText]}>{t('settings.deleteAccount')}</ThemedText>
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

