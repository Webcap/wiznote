import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useContext, useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    Switch,
    TouchableOpacity,
    View
} from 'react-native';
import { styles } from '../../styles/SettingsStyles';
import { RoleBadge } from '../../components/RoleBadge';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useAuth } from '../../hooks/useAuth';
import { useNotes } from '../../hooks/useNotes';
import { useThemeColor } from '../../hooks/useThemeColor';
import { subscriptionManagementService } from '../../services/SubscriptionManagementService';

import { ThemeContext, ThemePreference, ThemeUpdateContext } from '../../ThemeContext';
import { AudioAPIExplorer } from '../../components/AudioAPIExplorer';
import { AudioImportTest } from '../../components/AudioImportTest';
import { AudioModuleDebug } from '../../components/AudioModuleDebug';
import { Logo } from '../../components/Logo';
import { PermissionTest } from '../../components/PermissionTest';
import { featureFlagService } from '../../services/FeatureFlagService';
import { featureCacheService } from '../../services/FeatureCacheService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { DeleteAccountModal } from '../../components/DeleteAccountModal';

// Import web components
import { UserSidebar } from '../../components/web/UserSidebar';
import { WebLayout } from '../../components/web/WebLayout';

export default function SettingsScreen() {
  const { 
    signOut, 
    user, 
    isAuthenticated, 
    isLoading, 
    updatePreferences, 
    isAdmin,
    isSupport
  } = useAuth();
  const { notes } = useNotes(user?.id || '');
  const { showSnackbar } = useSnackbar();
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [autoKeyDetails, setAutoKeyDetails] = useState(true);
  const [autoAISummaries, setAutoAISummaries] = useState(true);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const theme = useContext(ThemeContext);
  const setTheme = useContext(ThemeUpdateContext);
  const router = useRouter();

  const currentUser = user;

  console.log('SettingsScreen: Current user:', currentUser?.id);
  console.log('SettingsScreen: isAuthenticated:', isAuthenticated);
  console.log('SettingsScreen: isLoading:', isLoading);
  console.log('SettingsScreen: Current theme:', theme);

  // Let the main layout handle navigation - no need for local navigation logic
  
  // Load subscription details when user changes
  const loadSubscriptionDetails = async () => {
    if (user?.id) {
      setSubscriptionLoading(true);
      try {
        const subscription = await subscriptionManagementService.getCurrentSubscription(user.id);
        setSubscriptionDetails(subscription);
      } catch (error) {
        console.error('Error loading subscription details:', error);
      } finally {
        setSubscriptionLoading(false);
      }
    }
  };

  // Monitor authentication state changes for debugging
  useEffect(() => {
    console.log('SettingsScreen: Auth state changed - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user?.id);
  }, [isAuthenticated, isLoading, user]);

  // Load subscription details when user changes
  useEffect(() => {
    loadSubscriptionDetails();
  }, [user?.id]);

  // Load user preferences when user changes
  useEffect(() => {
    if (user?.preferences) {
      setNotifications(user.preferences.notifications ?? true);
      setAutoSync(user.preferences.autoSync ?? true);
      setAutoKeyDetails(user.preferences.autoKeyDetails ?? true);
      setAutoAISummaries(user.preferences.autoAISummaries ?? true);
    }
  }, [user?.preferences]);

  const handleDeleteAccountSuccess = () => {
    // After successful deletion, the user will be signed out automatically
    // Navigate to login screen
    if (Platform.OS === 'web') {
      window.location.href = '/';
    } else {
      router.replace('/(auth)/login');
    }
  };

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
              console.log('🔄 SettingsScreen: Starting sign out process...');
              console.log('📊 SettingsScreen: Current user before sign out:', user?.id);
              console.log('📊 SettingsScreen: isAuthenticated before sign out:', isAuthenticated);
              console.log('📊 SettingsScreen: isLoading before sign out:', isLoading);
              
              // Call sign out
              await signOut();
              
              console.log('✅ SettingsScreen: Sign out completed');
              console.log('📊 SettingsScreen: isAuthenticated after sign out:', isAuthenticated);
              console.log('📊 SettingsScreen: isLoading after sign out:', isLoading);
              console.log('📊 SettingsScreen: user after sign out:', user);
              
              // Force navigation to login screen immediately
              console.log('🔄 SettingsScreen: Navigating to login screen...');
              
              // Try multiple navigation approaches with retries
              let navigationSuccess = false;
              
              // First attempt
              try {
                router.replace('/(auth)/login');
                navigationSuccess = true;
              } catch (navError) {
                console.error('❌ SettingsScreen: First navigation attempt failed:', navError);
              }
              
              // Second attempt with delay if first failed
              if (!navigationSuccess) {
                setTimeout(() => {
                  try {
                    router.replace('/(auth)/login');
                  } catch (navError2) {
                    console.error('❌ SettingsScreen: Second navigation attempt failed:', navError2);
                    // Final fallback: try to navigate to root
                    try {
                      router.replace('/');
                    } catch (fallbackError) {
                      console.error('❌ SettingsScreen: All navigation attempts failed:', fallbackError);
                    }
                  }
                }, 500);
              }
              
              // Additional fallback navigation after a delay
              setTimeout(() => {
                console.log('🔄 SettingsScreen: Fallback navigation to login...');
                try {
                  router.replace('/(auth)/login');
                } catch (timeoutError) {
                  console.error('❌ SettingsScreen: Timeout navigation error:', timeoutError);
                }
              }, 1000);
              
              // Force page reload on web as ultimate fallback
              if (Platform.OS === 'web') {
                setTimeout(() => {
                  console.log('🔄 SettingsScreen: Force reloading page on web...');
                  window.location.href = '/';
                }, 2000);
              }
              
            } catch (error) {
              console.error('❌ SettingsScreen: Sign out error:', error);
              
              // Check if it's an AuthSessionMissingError - this is actually a successful sign out
              if (error instanceof Error && (
                error.message?.includes('Auth session missing') || 
                error.message?.includes('AuthSessionMissingError') ||
                error.name === 'AuthSessionMissingError'
              )) {
                console.log('ℹ️ SettingsScreen: Auth session missing error detected, treating as successful sign out');
                // Navigate to login screen anyway since the user is effectively signed out
                try {
                  router.replace('/(auth)/login');
                } catch (navError) {
                  console.error('❌ SettingsScreen: Navigation error after auth session missing:', navError);
                }
                return;
              }
              
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        },
      ]
    );
  };



  const getStats = () => {
    const totalNotes = notes?.length || 0;
    const pinnedNotes = notes?.filter(note => note.isPinned).length || 0;
    const archivedNotes = notes?.filter(note => note.isArchived).length || 0;
    const totalTags = new Set(notes?.flatMap(note => note.tags || []) || []).size;

    return { totalNotes, pinnedNotes, archivedNotes, totalTags };
  };

  const stats = getStats();

  // Theme selection handler
  const handleThemeChange = async (newTheme: ThemePreference) => {
    console.log('SettingsScreen: Changing theme from', theme, 'to', newTheme);
    setTheme(newTheme);
    try {
      await updatePreferences({ theme: newTheme });
      console.log('SettingsScreen: Theme preference updated successfully');
    } catch (error) {
      console.error('SettingsScreen: Error updating theme preference:', error);
    }
  };

  // AI feature preference handlers
  const handleAutoKeyDetailsChange = async (value: boolean) => {
    setAutoKeyDetails(value);
    try {
      await updatePreferences({ autoKeyDetails: value });
      console.log('SettingsScreen: Auto key details preference updated successfully');
    } catch (error) {
      console.error('SettingsScreen: Error updating auto key details preference:', error);
    }
  };

  const handleAutoAISummariesChange = async (value: boolean) => {
    setAutoAISummaries(value);
    try {
      await updatePreferences({ autoAISummaries: value });
      console.log('SettingsScreen: Auto AI summaries preference updated successfully');
    } catch (error) {
      console.error('SettingsScreen: Error updating auto AI summaries preference:', error);
    }
  };

  const iconColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({}, 'backgroundSecondary');
  const cardText = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accentPrimary');

  console.log('SettingsScreen: Theme colors - cardBg:', cardBg, 'cardText:', cardText, 'borderColor:', borderColor);



  // Web-specific sign out handler
  const handleWebSignOut = async () => {
    try {
      console.log('🔄 SettingsScreen: Web sign out starting...');
      await signOut();
      console.log('✅ SettingsScreen: Web sign out completed');
      
      // Force page reload on web to ensure clean state
      if (Platform.OS === 'web') {
        console.log('🔄 SettingsScreen: Force reloading page on web...');
        // Use setTimeout to ensure the sign out completes before reload
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      } else {
        console.log('🔄 SettingsScreen: Navigating to login on mobile...');
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('❌ SettingsScreen: Web sign out error:', error);
      
      // Check if it's an AuthSessionMissingError - this is actually a successful sign out
      if (error instanceof Error && (
        error.message?.includes('Auth session missing') || 
        error.message?.includes('AuthSessionMissingError') ||
        error.name === 'AuthSessionMissingError'
      )) {
        console.log('ℹ️ SettingsScreen: Web auth session missing error detected, treating as successful sign out');
        // Force page reload on web to ensure clean state
        if (Platform.OS === 'web') {
          console.log('🔄 SettingsScreen: Force reloading page on web after auth session missing...');
          setTimeout(() => {
            window.location.href = '/';
          }, 100);
        } else {
          console.log('🔄 SettingsScreen: Navigating to login on mobile after auth session missing...');
          router.replace('/(auth)/login');
        }
        return;
      }
      
      // Even if there's an error, try to navigate away
      console.log('🔄 SettingsScreen: Attempting navigation despite error...');
      if (Platform.OS === 'web') {
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      } else {
        router.replace('/(auth)/login');
      }
    }
  };

  const checkPremiumStatus = () => {
    if (subscriptionDetails) {
      const currentPeriodEnd = subscriptionDetails.currentPeriodEnd ? new Date(subscriptionDetails.currentPeriodEnd) : null;
      const currentPeriodStart = subscriptionDetails.currentPeriodStart ? new Date(subscriptionDetails.currentPeriodStart) : null;
      
      let message = `Premium Status: Active\nPlan: ${subscriptionDetails.planName}\nInterval: ${subscriptionDetails.planInterval}`;
      
      if (currentPeriodEnd) {
        message += `\nCurrent Period Ends: ${currentPeriodEnd.toLocaleDateString()}`;
      }
      
      if (currentPeriodStart) {
        message += `\nCurrent Period Started: ${currentPeriodStart.toLocaleDateString()}`;
      }
      
      if (Platform.OS === 'web') {
        alert('Premium Status\n\n' + message);
      } else {
        Alert.alert('Premium Status', message);
      }
    } else {
      const message = 'You are not currently a premium user.\n\nUpgrade to unlock all features!';
      
      if (Platform.OS === 'web') {
        alert('Premium Status\n\n' + message);
      } else {
        Alert.alert(
          'Premium Status', 
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Upgrade', 
              onPress: () => {
                // You can add navigation to premium upgrade page here
                Alert.alert('Upgrade', 'Premium upgrade functionality coming soon!');
              }
            }
          ]
        );
      }
    }
  };





  // Web layout
  if (Platform.OS === 'web') {

    if (isLoading) {
      return (
        <WebLayout
          title="Settings"
          subtitle="Manage your account"
          sidebar={
            <UserSidebar
              activePage="settings"
            />
          }
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
        sidebar={
          <UserSidebar
            activePage="settings"
          />
        }
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
            <View style={[styles.profileCard, { backgroundColor: cardBg }] }>
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
                          <TouchableOpacity style={[styles.editProfileButton, { backgroundColor: accentColor }]}>
              <ThemedText style={[styles.editProfileText, { color: '#FFFFFF' }]}>Edit</ThemedText>
            </TouchableOpacity>
            </View>
          </View>

          {/* Premium Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Premium</ThemedText>
            <View style={[styles.profileCard, { backgroundColor: cardBg }] }>
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
              <View style={[styles.statCard, { backgroundColor: cardBg }] }>
                <ThemedText style={styles.statNumber}>{stats.totalNotes}</ThemedText>
                <ThemedText style={styles.statLabel}>Total Notes</ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: cardBg }] }>
                <ThemedText style={styles.statNumber}>{stats.pinnedNotes}</ThemedText>
                <ThemedText style={styles.statLabel}>Pinned</ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: cardBg }] }>
                <ThemedText style={styles.statNumber}>{stats.archivedNotes}</ThemedText>
                <ThemedText style={styles.statLabel}>Archived</ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: cardBg }] }>
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

          {/* Role-Specific Settings */}
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
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/payment-debug')}
              >
                <Ionicons name="bug" size={20} color={iconColor} />
                <ThemedText style={styles.actionButtonText}>Payment Debug</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={borderColor} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="analytics" size={20} color={iconColor} />
                <ThemedText style={styles.actionButtonText}>Analytics Dashboard</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={borderColor} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="people" size={20} color={iconColor} />
                <ThemedText style={styles.actionButtonText}>User Management</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={borderColor} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="settings" size={20} color={iconColor} />
                <ThemedText style={styles.actionButtonText}>System Settings</ThemedText>
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
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="ticket" size={20} color={iconColor} />
                <ThemedText style={styles.actionButtonText}>Ticket Management</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={borderColor} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="time" size={20} color={iconColor} />
                <ThemedText style={styles.actionButtonText}>Availability Settings</ThemedText>
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
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="download" size={20} color={iconColor} />
              <ThemedText style={styles.actionButtonText}>Export Notes</ThemedText>
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
            {/* App Logo */}
            <View style={styles.logoSection}>
              <Logo size={80} />
              <ThemedText style={styles.appName}>WizNote</ThemedText>

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
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="information-circle" size={20} color={iconColor} />
              <ThemedText style={styles.actionButtonText}>About Notez</ThemedText>
              <Ionicons name="chevron-forward" size={20} color={borderColor} />
            </TouchableOpacity>
          </View>

          {/* Admin Debug Tools */}
          {isAdmin() && __DEV__ && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Admin Debug Tools</ThemedText>
              
              {/* Clear Feature Cache Button */}
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#FF9800', marginBottom: 10 }]}
                onPress={async () => {
                  try {
                    console.log('🧹 Clearing feature flag cache...');
                    await featureCacheService.invalidate('feature_flags');
                    await featureFlagService.clearLocalCache();
                    await featureFlagService.forceReloadFromSupabase();
                    
                    const message = '✅ Feature cache cleared! Please ' + (Platform.OS === 'web' ? 'refresh the page' : 'restart the app') + ' to see changes.';
                    
                    if (Platform.OS === 'web') {
                      showSnackbar(message, 'success', 4000);
                    } else {
                      Alert.alert('Success', message);
                    }
                    console.log('✅ Feature flag cache cleared successfully');
                  } catch (error) {
                    console.error('❌ Error clearing cache:', error);
                    const errorMsg = `Failed to clear cache: ${error instanceof Error ? error.message : String(error)}`;
                    if (Platform.OS === 'web') {
                      showSnackbar(errorMsg, 'error', 4000);
                    } else {
                      Alert.alert('Error', errorMsg);
                    }
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

  // Mobile layout (existing code)
  // Show loading state while authentication is being determined
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
          <View style={[styles.profileCard, { backgroundColor: cardBg }] }>
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
            <TouchableOpacity style={[styles.editProfileButton, { backgroundColor: accentColor }]}>
              <ThemedText style={[styles.editProfileText, { color: '#FFFFFF' }]}>Edit</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        {/* Premium Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Premium</ThemedText>
          <View style={[styles.profileCard, { backgroundColor: cardBg }] }>
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
            <View style={[styles.statCard, { backgroundColor: cardBg }] }>
              <ThemedText style={styles.statNumber}>{stats.totalNotes}</ThemedText>
              <ThemedText style={styles.statLabel}>Total Notes</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }] }>
              <ThemedText style={styles.statNumber}>{stats.pinnedNotes}</ThemedText>
              <ThemedText style={styles.statLabel}>Pinned</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }] }>
              <ThemedText style={styles.statNumber}>{stats.archivedNotes}</ThemedText>
              <ThemedText style={styles.statLabel}>Archived</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }] }>
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
        {/* Admin Settings - Mobile */}
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
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/payment-debug')}
            >
              <Ionicons name="bug" size={20} color={iconColor} />
              <ThemedText style={styles.actionButtonText}>Payment Debug</ThemedText>
              <Ionicons name="chevron-forward" size={20} color={borderColor} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="analytics" size={20} color={iconColor} />
              <ThemedText style={styles.actionButtonText}>Analytics Dashboard</ThemedText>
              <Ionicons name="chevron-forward" size={20} color={borderColor} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="people" size={20} color={iconColor} />
              <ThemedText style={styles.actionButtonText}>User Management</ThemedText>
              <Ionicons name="chevron-forward" size={20} color={borderColor} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="settings" size={20} color={iconColor} />
              <ThemedText style={styles.actionButtonText}>System Settings</ThemedText>
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
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="download" size={20} color={iconColor} />
            <ThemedText style={styles.actionButtonText}>Export Notes</ThemedText>
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
          {/* App Logo */}
          <View style={styles.logoSection}>
            <Logo size={80} />
            <ThemedText style={styles.appName}>WizNote</ThemedText>
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
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="information-circle" size={20} color={iconColor} />
            <ThemedText style={styles.actionButtonText}>About WizNote</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={borderColor} />
          </TouchableOpacity>
        </View>
        {/* Admin Debug Tools */}
        {isAdmin() && __DEV__ && (
          <View style={[styles.section, { paddingBottom: 50 }]}>
            <ThemedText style={styles.sectionTitle}>Admin Debug Tools</ThemedText>
            
            {/* Clear Feature Cache Button */}
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FF9800', marginBottom: 10 }]}
              onPress={async () => {
                try {
                  console.log('🧹 Clearing feature flag cache...');
                  await featureCacheService.invalidate('feature_flags');
                  await featureFlagService.clearLocalCache();
                  await featureFlagService.forceReloadFromSupabase();
                  
                  const message = '✅ Feature cache cleared! Please ' + (Platform.OS === 'web' ? 'refresh the page' : 'restart the app') + ' to see changes.';
                  
                  if (Platform.OS === 'web') {
                    showSnackbar(message, 'success', 4000);
                  } else {
                    Alert.alert('Success', message);
                  }
                  console.log('✅ Feature flag cache cleared successfully');
                } catch (error) {
                  console.error('❌ Error clearing cache:', error);
                  const errorMsg = `Failed to clear cache: ${error instanceof Error ? error.message : String(error)}`;
                  if (Platform.OS === 'web') {
                    showSnackbar(errorMsg, 'error', 4000);
                  } else {
                    Alert.alert('Error', errorMsg);
                  }
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
