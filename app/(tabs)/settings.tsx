import { useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useNotes } from '../../hooks/useNotes';
import { subscriptionManagementService } from '../../services/SubscriptionManagementService';
import { ThemeContext, ThemeUpdateContext } from '../../ThemeContext';
import { SettingsMobile } from '../../components/settings/SettingsMobile';
import { SettingsWeb } from '../../components/settings/SettingsWeb';

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
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [autoKeyDetails, setAutoKeyDetails] = useState(true);
  const [autoAISummaries, setAutoAISummaries] = useState(true);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true); // Start as true to show loading state initially
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const theme = useContext(ThemeContext);
  const setTheme = useContext(ThemeUpdateContext);
  const router = useRouter();

  // Load subscription details
  const loadSubscriptionDetails = async () => {
    if (user?.id) {
      setSubscriptionLoading(true);
      try {
        const subscription = await subscriptionManagementService.getCurrentSubscription(user.id);
        setSubscriptionDetails(subscription);
      } catch (error) {
        console.error('Error loading subscription details:', error);
        // On error, set subscriptionDetails to null but keep loading as false
        setSubscriptionDetails(null);
      } finally {
        setSubscriptionLoading(false);
      }
    } else {
      // If no user, set loading to false immediately
      setSubscriptionLoading(false);
      setSubscriptionDetails(null);
    }
  };

  // Load subscription details when user changes
  useEffect(() => {
    if (!isLoading && user) {
      // Only load if auth is not loading and user exists
      loadSubscriptionDetails();
    } else if (!isLoading && !user) {
      // If auth finished loading and no user, set loading to false
      setSubscriptionLoading(false);
      setSubscriptionDetails(null);
    }
  }, [user?.id, isLoading]);

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
    if (Platform.OS === 'web') {
      window.location.href = '/';
    } else {
      router.replace('/(auth)/login');
    }
  };

  const getStats = () => {
    const totalNotes = notes?.length || 0;
    const pinnedNotes = notes?.filter(note => note.isPinned).length || 0;
    const archivedNotes = notes?.filter(note => note.isArchived).length || 0;
    const totalTags = new Set(notes?.flatMap(note => note.tags || []) || []).size;

    return { totalNotes, pinnedNotes, archivedNotes, totalTags };
  };

  const stats = getStats();

  const commonProps = {
    user,
    isAuthenticated,
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
  };

  // Render web or mobile version based on platform
  if (Platform.OS === 'web') {
    return <SettingsWeb {...commonProps} isSupport={isSupport} />;
  }

  return <SettingsMobile {...commonProps} />;
}
