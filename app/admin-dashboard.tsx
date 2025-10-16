import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { AdminSidebar } from '../components/web/AdminSidebar';
import { WebLayout } from '../components/web/WebLayout';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { featureFlagService } from '../services/FeatureFlagService';
import { featureLimitService } from '../services/FeatureLimitService';
// Old premium plan service removed - using enhanced plans system now

export default function AdminDashboardScreen() {
  const { user, isAdmin, isAuthenticated, isLoading, getAllUsers } = useAuth();
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalNotes: 0,
    premiumUsers: 0,
    supportTickets: 0,
    systemHealth: 'Good'
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [premiumSystemStatus, setPremiumSystemStatus] = useState<'loading' | 'needs-init' | 'ready'>('loading');
  // Monitoring state
  const [monitoring, setMonitoring] = useState<{
    ready?: boolean;
    checks?: any;
    lastUpdated?: Date;
    error?: string | null;
    stripeGuardian?: {
      status: 'ready' | 'error' | 'unknown';
      uptime?: number;
      timestamp?: string;
    };
    isLoading?: boolean;
  }>({});

  // Subscription sync state
  const [subscriptionSync, setSubscriptionSync] = useState<{
    isRunning?: boolean;
    lastSyncTime?: string;
    syncCount?: number;
    intervalMinutes?: number;
    isSyncing?: boolean;
  }>({});

  const iconColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({}, 'backgroundSecondary');
  const borderColor = useThemeColor({}, 'border');
  const accentWarning = useThemeColor({}, 'accentWarning');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin())) {
      console.log('AdminDashboard: User not admin, redirecting...');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, isAdmin, router]);

  // Fetch real user data for admin dashboard
  const fetchUserStats = useCallback(async () => {
    if (isAdmin()) {
      try {
        setIsLoadingStats(true);
        console.log('AdminDashboard: Fetching user statistics...');
        
        const users = await getAllUsers();
        console.log('AdminDashboard: Fetched users:', users.length);
        
        // Calculate real statistics
        const totalUsers = users.length;
        const activeUsers = users.filter(u => {
          try {
            const lastLogin = new Date(u.lastLoginAt || new Date());
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return lastLogin > thirtyDaysAgo;
          } catch (error) {
            console.error('Error parsing lastLoginAt:', error);
            return false;
          }
        }).length;
        const premiumUsers = users.filter(u => u.premium?.isActive).length;
        
        // Fetch real outstanding support tickets count
        let outstandingTickets = 0;
        try {
          const { supportService } = await import('../services/SupportService');
          const tickets = await supportService.getAllSupportTickets();
          outstandingTickets = tickets.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
        } catch (error) {
          console.error('Error fetching tickets:', error);
        }
        
        setStats({
          totalUsers,
          activeUsers,
          totalNotes: 0, // Removed - not displayed
          premiumUsers,
          supportTickets: outstandingTickets,
          systemHealth: 'Good'
        });
        
        console.log('AdminDashboard: Updated stats:', {
          totalUsers,
          activeUsers,
          premiumUsers
        });
      } catch (error) {
        console.error('AdminDashboard: Error fetching user stats:', error);
        // Fallback to default data if there's an error
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          totalNotes: 0,
          premiumUsers: 0,
          supportTickets: 0,
          systemHealth: 'Error'
        });
      } finally {
        setIsLoadingStats(false);
      }
    }
  }, [isAdmin, getAllUsers]);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  // Enhanced plans system is already initialized
  const checkPremiumSystemStatus = useCallback(async () => {
    if (isAdmin()) {
      try {
        // Enhanced plans system is ready by default
        setPremiumSystemStatus('ready');
      } catch (error) {
        console.error('Error checking enhanced plans system status:', error);
        setPremiumSystemStatus('ready'); // Default to ready
      }
    }
  }, [isAdmin]);

  // Fetch subscription sync status
  const fetchSubscriptionSyncStatus = useCallback(async () => {
    try {
      const guardianUrl = process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL || 'https://api.webcap.media/api';
      const syncRes = await fetch(`${guardianUrl}/sync-status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData.ok && syncData.sync) {
          setSubscriptionSync(syncData.sync);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription sync status:', error);
    }
  }, []);

  // Trigger manual subscription sync
  const triggerManualSync = useCallback(async () => {
    try {
      setSubscriptionSync(prev => ({ ...prev, isSyncing: true }));
      
      const guardianUrl = process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL || 'https://api.webcap.media/api';
      const syncRes = await fetch(`${guardianUrl}/sync-status`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      });
      
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (Platform.OS === 'web') {
          showSnackbar('✅ Subscription sync triggered successfully!', 'success', 4000);
        } else {
          Alert.alert('Success', 'Subscription sync triggered successfully!');
        }
        
        // Wait a moment then refresh status
        setTimeout(() => {
          fetchSubscriptionSyncStatus();
        }, 2000);
      } else {
        throw new Error('Failed to trigger sync');
      }
    } catch (error) {
      console.error('Error triggering manual sync:', error);
      if (Platform.OS === 'web') {
        showSnackbar('❌ Failed to trigger sync. Please try again.', 'error', 6000);
      } else {
        Alert.alert('Error', 'Failed to trigger sync. Please try again.');
      }
    } finally {
      setSubscriptionSync(prev => ({ ...prev, isSyncing: false }));
    }
  }, [fetchSubscriptionSyncStatus, showSnackbar]);

  // Simple monitoring fetcher
  const fetchMonitoring = useCallback(async () => {
    try {
      setMonitoring(prev => ({ ...prev, isLoading: true }));
      
      const base = (process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
      const readyRes = await fetch(`${base}/ready`).then(r => r.json()).catch(() => null);
      const ok = !!readyRes && readyRes.ok;
      
      // Check Stripe Guardian status
      let stripeGuardianStatus: { status: 'ready' | 'error' | 'unknown'; uptime?: number; timestamp?: string } = { status: 'unknown' };
      try {
        // Cross-platform timeout solution
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const guardianUrl = process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL || 'https://api.webcap.media/api';
        const guardianRes = await fetch(`${guardianUrl}/ready`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Clear timeout if request completes
        
        if (guardianRes.ok) {
          const guardianData = await guardianRes.json();
          stripeGuardianStatus = {
            status: guardianData.ok ? 'ready' : 'error',
            uptime: guardianData.uptime,
            timestamp: guardianData.timestamp
          };
          
          // Extract subscription sync info from ready check
          if (guardianData.subscriptionSync) {
            setSubscriptionSync(guardianData.subscriptionSync);
          }
        } else {
          stripeGuardianStatus = { status: 'error' };
        }
      } catch (guardianError: unknown) {
        console.error('Error checking Stripe Guardian:', guardianError);
        if (guardianError instanceof Error && guardianError.name === 'AbortError') {
          stripeGuardianStatus = { status: 'error' };
        } else {
          stripeGuardianStatus = { status: 'error' };
        }
      }
      
      setMonitoring({
        ready: ok,
        checks: readyRes?.checks,
        lastUpdated: new Date(),
        error: null,
        stripeGuardian: stripeGuardianStatus,
        isLoading: false,
      });
      
      // Also fetch subscription sync status
      fetchSubscriptionSyncStatus();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Monitoring fetch failed';
      setMonitoring(prev => ({ 
        ...prev, 
        error: errorMessage, 
        lastUpdated: new Date(),
        isLoading: false 
      }));
    }
  }, [fetchSubscriptionSyncStatus]);

  // Mobile-specific function to check Stripe Guardian status
  const checkStripeGuardianStatus = useCallback(async () => {
    try {
      let stripeGuardianStatus: { status: 'ready' | 'error' | 'unknown'; uptime?: number; timestamp?: string } = { status: 'unknown' };
      
      // Cross-platform timeout solution
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const guardianUrl = process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL || 'https://api.webcap.media/api';
      const guardianRes = await fetch(`${guardianUrl}/ready`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // Clear timeout if request completes
      
      if (guardianRes.ok) {
        const guardianData = await guardianRes.json();
        stripeGuardianStatus = {
          status: guardianData.ok ? 'ready' : 'error',
          uptime: guardianData.uptime,
          timestamp: guardianData.timestamp
        };
        
        // Extract subscription sync info from ready check
        if (guardianData.subscriptionSync) {
          setSubscriptionSync(guardianData.subscriptionSync);
        }
      } else {
        stripeGuardianStatus = { status: 'error' };
      }
      
      setMonitoring(prev => ({
        ...prev,
        stripeGuardian: stripeGuardianStatus as { status: 'ready' | 'error' | 'unknown'; uptime?: number; timestamp?: string },
        lastUpdated: new Date(),
        error: null
      }));
      
      // Also fetch subscription sync status separately
      fetchSubscriptionSyncStatus();
    } catch (guardianError: unknown) {
      console.error('Error checking Stripe Guardian:', guardianError);
      const stripeGuardianStatus: { status: 'ready' | 'error' | 'unknown'; uptime?: number; timestamp?: string } = { status: 'error' };
      
      setMonitoring(prev => ({
        ...prev,
        stripeGuardian: stripeGuardianStatus,
        lastUpdated: new Date(),
        error: 'Failed to check Stripe Guardian status'
      }));
    }
  }, [fetchSubscriptionSyncStatus]);

  useEffect(() => {
    if (isAdmin()) {
      if (Platform.OS === 'web') {
        // On web, fetch full monitoring including webhook system
        fetchMonitoring();
        
        // Set up periodic refresh every 2 minutes
        const interval = setInterval(fetchMonitoring, 2 * 60 * 1000);
        
        return () => clearInterval(interval);
      } else {
        // On mobile, only check Stripe Guardian status
        checkStripeGuardianStatus();
      }
    }
  }, [fetchMonitoring, checkStripeGuardianStatus, isAdmin]);

  // Enhanced plans system is already initialized
  const handleInitializePremiumSystem = async () => {
    try {
      console.log('AdminDashboard: Enhanced plans system is already initialized');
      setPremiumSystemStatus('ready');
      Alert.alert('Info', 'Enhanced plans system is ready!');
      console.log('AdminDashboard: Enhanced plans system is ready');
    } catch (error) {
      console.error('Error with enhanced plans system:', error);
      Alert.alert('Info', 'Enhanced plans system is ready but encountered an error.');
    }
  };



  useEffect(() => {
    checkPremiumSystemStatus();
  }, [checkPremiumSystemStatus]);

  const handleWebHome = () => {
    router.push('/(tabs)');
  };

  const handleWebCreateNote = () => {
    router.push('/create');
  };

  const handleWebSearch = () => {
    router.push('/search');
  };

  const handleUserManagement = () => {
    router.push('/user-management');
  };

  const handleSystemSettings = () => {
    router.push('/admin/system-settings');
  };

  const handleAnalytics = () => {
    router.push('/admin/analytics');
  };

  const handleSupportTools = () => {
    router.push('/admin/support');
  };

  const handleSecurityDashboard = () => {
    router.push('/admin/security-dashboard');
  };

  const handleFeatureManagement = () => {
    router.push('/admin/feature-management');
  };

  const handlePremiumSettings = () => {
    router.push('/admin/enhanced-plans');
  };

  const handleFeatureLimits = () => {
    router.push('/admin/feature-limits');
  };

  const handleInitializeFeatureLimits = async () => {
    try {
      console.log('AdminDashboard: Initializing feature limits...');
      await featureLimitService.initializeDefaultLimits();
      
      if (Platform.OS === 'web') {
        showSnackbar('Feature limits initialized with defaults successfully!', 'success', 4000);
      } else {
        Alert.alert('Success', 'Feature limits initialized with defaults successfully!');
      }
      
      console.log('AdminDashboard: Feature limits initialized successfully');
    } catch (error) {
      console.error('Error initializing feature limits:', error);
      
      if (Platform.OS === 'web') {
        showSnackbar('Failed to initialize feature limits. Please try again.', 'error', 6000);
      } else {
        Alert.alert('Error', 'Failed to initialize feature limits. Please try again.');
      }
    }
  };

  const refreshFeatureLimits = useCallback(async () => {
    try {
      console.log('AdminDashboard: Refreshing feature limits...');
      await featureLimitService.getFeatureLimits();
      if (Platform.OS === 'web') {
        showSnackbar('Feature limits refreshed successfully!', 'success', 4000);
      } else {
        Alert.alert('Success', 'Feature limits refreshed successfully!');
      }
      console.log('AdminDashboard: Feature limits refreshed successfully');
    } catch (error) {
      console.error('AdminDashboard: Error refreshing feature limits:', error);
      if (Platform.OS === 'web') {
        showSnackbar('Failed to refresh feature limits. Please try again.', 'error', 6000);
      } else {
        Alert.alert('Error', 'Failed to refresh feature limits. Please try again.');
      }
    }
  }, [showSnackbar]);


  // Show loading or redirect if not admin
  if (isLoading || isLoadingStats) {
    return (
      <WebLayout
        sidebar={
          <AdminSidebar activePage="dashboard" />
        }
        header={
          <View style={styles.webHeader}>
            <ThemedText type="title">Admin Dashboard</ThemedText>
            <ThemedText style={styles.webLoadingText}>
              {isLoading ? 'Loading...' : 'Fetching statistics...'}
            </ThemedText>
          </View>
        }
      >
        <View style={styles.webLoadingContainer}>
          <ThemedText style={styles.webLoadingText}>
            {isLoading ? 'Loading admin dashboard...' : 'Fetching user statistics...'}
          </ThemedText>
        </View>
      </WebLayout>
    );
  }

  if (!isAuthenticated || !isAdmin()) {
    return null; // Will redirect in useEffect
  }



  return (
    <WebLayout
      sidebar={
        <AdminSidebar activePage="dashboard" />
      }
      header={
        <View style={styles.webHeader}>
          <ThemedText type="title">Admin Dashboard</ThemedText>
          <View style={styles.webHeaderRight}>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={refreshFeatureLimits}
            >
              <Ionicons 
                name="settings" 
                size={20} 
                color={iconColor} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={fetchUserStats}
              disabled={isLoadingStats}
            >
              <Ionicons 
                name="refresh" 
                size={20} 
                color={isLoadingStats ? '#999' : iconColor} 
              />
            </TouchableOpacity>
            <ThemedText style={styles.webHeaderSubtitle}>
              Welcome back, {user?.displayName || 'Admin'}
            </ThemedText>
          </View>
        </View>
      }
    >
      <ScrollView style={styles.webContent}>
        {/* Quick Stats */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>System Overview</ThemedText>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <View style={styles.statHeader}>
                <Ionicons name="people" size={24} color="#6A5ACD" />
                <ThemedText style={styles.statNumber}>{stats.totalUsers}</ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Total Users</ThemedText>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <View style={styles.statHeader}>
                <Ionicons name="person" size={24} color="#3CB371" />
                <ThemedText style={styles.statNumber}>{stats.activeUsers}</ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Active Users</ThemedText>
            </View>
            
            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: cardBg }]}
              onPress={() => router.push('/admin/support')}
            >
              <View style={styles.statHeader}>
                <Ionicons name="mail-unread" size={24} color="#FF8C00" />
                <ThemedText style={styles.statNumber}>{stats.supportTickets}</ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Outstanding Tickets</ThemedText>
              <ThemedText style={[styles.statSubtext, { color: textSecondaryColor }]}>
                Pending + In Progress
              </ThemedText>
            </TouchableOpacity>
            
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <View style={styles.statHeader}>
                <Ionicons name="star" size={24} color="#FFD700" />
                <ThemedText style={styles.statNumber}>{stats.premiumUsers}</ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Premium Users</ThemedText>
            </View>
            
            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: cardBg }]}
              onPress={() => router.push('/admin/analytics')}
            >
              <View style={styles.statHeader}>
                <Ionicons name="analytics" size={24} color="#9C27B0" />
                <ThemedText style={styles.statNumber}>📊</ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Feature Analytics</ThemedText>
              <ThemedText style={[styles.statSubtext, { color: textSecondaryColor }]}>
                View detailed insights
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium System Initialization - Show when needed */}
        {premiumSystemStatus === 'needs-init' && (
          <View style={styles.section}>
            <View style={[styles.initializeCard, { backgroundColor: accentWarning + '20' }]}>
              <View style={styles.initializeHeader}>
                <Ionicons name="rocket" size={32} color={accentWarning} />
                <View style={styles.initializeText}>
                  <ThemedText style={[styles.initializeTitle, { color: textColor }]}>
                    Premium System Not Initialized
                  </ThemedText>
                  <ThemedText style={[styles.initializeSubtitle, { color: textSecondaryColor }]}>
                    Set up the default premium plans and settings to enable premium features
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.initializeButton, { backgroundColor: accentPrimary }]}
                onPress={handleInitializePremiumSystem}
              >
                <Ionicons name="rocket" size={20} color="white" />
                <ThemedText style={styles.initializeButtonText}>
                  Initialize Premium System
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Premium System Status Loading */}
        {premiumSystemStatus === 'loading' && (
          <View style={styles.section}>
            <View style={[styles.initializeCard, { backgroundColor: cardBg }]}>
              <View style={styles.initializeHeader}>
                <Ionicons name="hourglass" size={32} color={textSecondaryColor} />
                <View style={styles.initializeText}>
                  <ThemedText style={[styles.initializeTitle, { color: textColor }]}>
                    Checking Premium System...
                  </ThemedText>
                  <ThemedText style={[styles.initializeSubtitle, { color: textSecondaryColor }]}>
                    Please wait while we check the premium system status
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Admin Actions */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: cardBg }]}
              onPress={handleUserManagement}
            >
              <Ionicons name="people" size={32} color="#6A5ACD" />
              <ThemedText style={styles.actionTitle}>User Management</ThemedText>
              <ThemedText style={styles.actionSubtitle}>Manage user accounts and permissions</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: cardBg }]}
              onPress={handleSecurityDashboard}
            >
              <Ionicons name="shield-checkmark" size={32} color="#EF4444" />
              <ThemedText style={styles.actionTitle}>Security Dashboard</ThemedText>
              <ThemedText style={styles.actionSubtitle}>Monitor security events and threats</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: cardBg }]}
              onPress={handleAnalytics}
            >
              <Ionicons name="analytics" size={32} color="#3CB371" />
              <ThemedText style={styles.actionTitle}>Analytics</ThemedText>
              <ThemedText style={styles.actionSubtitle}>View system analytics and reports</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: cardBg }]}
              onPress={handleSupportTools}
            >
              <Ionicons name="headset" size={32} color="#FF8C00" />
              <ThemedText style={styles.actionTitle}>Support Tools</ThemedText>
              <ThemedText style={styles.actionSubtitle}>Access support and moderation tools</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: cardBg }]}
              onPress={handleFeatureManagement}
            >
              <Ionicons name="settings" size={32} color="#6A5ACD" />
              <ThemedText style={styles.actionTitle}>Feature Management</ThemedText>
              <ThemedText style={styles.actionSubtitle}>Manage feature availability and settings</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: cardBg }]}
              onPress={handlePremiumSettings}
            >
              <Ionicons name="diamond" size={32} color="#FFD700" />
              <ThemedText style={styles.actionTitle}>Premium Settings</ThemedText>
              <ThemedText style={styles.actionSubtitle}>Manage pricing and premium plans</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: cardBg }]}
              onPress={handleFeatureLimits}
            >
              <Ionicons name="speedometer" size={32} color="#9C27B0" />
              <ThemedText style={styles.actionTitle}>Feature Limits</ThemedText>
              <ThemedText style={styles.actionSubtitle}>Manage feature usage limits and restrictions. Use the refresh button in the header to see updates.</ThemedText>
            </TouchableOpacity>
            
                          <TouchableOpacity 
                style={[styles.actionCard, { backgroundColor: cardBg }]}
                onPress={handleInitializeFeatureLimits}
              >
                <Ionicons name="refresh" size={32} color="#4CAF50" />
                <ThemedText style={styles.actionTitle}>Initialize Feature Limits</ThemedText>
                <ThemedText style={styles.actionSubtitle}>Set up default feature limits and restrictions</ThemedText>
              </TouchableOpacity>


            
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: cardBg }]}
              onPress={handleSystemSettings}
            >
              <Ionicons name="settings" size={32} color="#FF6B6B" />
              <ThemedText style={styles.actionTitle}>System Settings</ThemedText>
              <ThemedText style={styles.actionSubtitle}>Configure system-wide settings</ThemedText>
            </TouchableOpacity>
            
                         <TouchableOpacity 
               style={[styles.actionCard, { backgroundColor: cardBg }]}
               onPress={async () => {
                 try {
                   console.log('AdminDashboard: Syncing features with defaults...');
                   await featureFlagService.syncWithDefaults();
                   
                   if (Platform.OS === 'web') {
                     showSnackbar('Features synced with defaults successfully!', 'success', 4000);
                   } else {
                     Alert.alert('Success', 'Features synced with defaults successfully');
                   }
                   
                   console.log('AdminDashboard: Features synced successfully');
                 } catch (error) {
                   console.error('AdminDashboard: Error syncing features:', error);
                   
                   if (Platform.OS === 'web') {
                     showSnackbar(`Failed to sync features: ${error instanceof Error ? error.message : String(error)}`, 'error', 6000);
                   } else {
                     Alert.alert('Error', `Failed to sync features: ${error instanceof Error ? error.message : String(error)}`);
                   }
                 }
               }}
             >
              <Ionicons name="sync" size={32} color="#4CAF50" />
              <ThemedText style={styles.actionTitle}>Sync Features</ThemedText>
              <ThemedText style={styles.actionSubtitle}>Sync with default feature definitions</ThemedText>
            </TouchableOpacity>

          </View>
        </View>

        {/* Debug Auth Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Debug Tools</ThemedText>
          <View style={[styles.debugCard, { backgroundColor: cardBg }]}>
            <View style={styles.debugHeader}>
              <Ionicons name="bug" size={24} color="#FF8C00" />
              <ThemedText style={styles.debugTitle}>Authentication Debug</ThemedText>
            </View>
            <View style={styles.debugContent}>
              <TouchableOpacity 
                style={[styles.debugButton, { backgroundColor: '#FF8C00' }]} 
                onPress={() => {
                  console.log('AdminDashboard: Debug auth button pressed');
                  console.log('AdminDashboard: Current user:', user);
                  console.log('AdminDashboard: isAuthenticated:', isAuthenticated);
                  console.log('AdminDashboard: isLoading:', isLoading);
                  console.log('AdminDashboard: isAdmin():', isAdmin());
                  Alert.alert(
                    'Auth Debug Info',
                    `User ID: ${user?.id || 'null'}\nEmail: ${user?.email || 'null'}\nRole: ${user?.role || 'null'}\nAuthenticated: ${isAuthenticated}\nLoading: ${isLoading}\nIs Admin: ${isAdmin()}`,
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Ionicons name="information-circle" size={20} color="#FFFFFF" />
                <ThemedText style={[styles.debugButtonText, { color: '#FFFFFF' }]}>
                  Debug Auth State
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.debugButton, { backgroundColor: '#6A5ACD' }]} 
                onPress={() => {
                  console.log('AdminDashboard: Refresh auth state');
                  // Force a refresh of the auth state
                  window.location.reload();
                }}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <ThemedText style={[styles.debugButtonText, { color: '#FFFFFF' }]}>
                  Refresh Auth State
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* System Health & Monitoring - Merged Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>System Health & Monitoring</ThemedText>
            <View style={styles.healthHeaderActions}>
              {monitoring.isLoading && (
                <View style={styles.loadingIndicator}>
                  <Ionicons name="sync" size={16} color={iconColor} />
                </View>
              )}
              <TouchableOpacity 
                style={styles.refreshButton} 
                onPress={Platform.OS === 'web' ? fetchMonitoring : checkStripeGuardianStatus}
              >
                <Ionicons name="refresh" size={18} color={iconColor} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Mobile-specific notice */}
          {Platform.OS !== 'web' && (
            <View style={[styles.mobileNotice, { backgroundColor: cardBg + '80' }]}>
              <Ionicons name="information-circle" size={16} color={textSecondaryColor} />
              <ThemedText style={[styles.mobileNoticeText, { color: textSecondaryColor }]}>
                Mobile: Only Stripe Guardian status is available. Full system monitoring requires web access.
              </ThemedText>
            </View>
          )}
          
          {/* Overall Health Indicator */}
          <View style={styles.overallHealthContainer}>
            <View style={[
              styles.overallHealthIndicator, 
              { 
                backgroundColor: Platform.OS === 'web' ?
                  ((monitoring.ready && monitoring.stripeGuardian?.status === 'ready') ? '#3CB371' : 
                   (monitoring.ready || monitoring.stripeGuardian?.status === 'ready') ? '#FFA500' : '#FF6B6B') :
                  (monitoring.stripeGuardian?.status === 'ready' ? '#3CB371' : 
                   monitoring.stripeGuardian?.status === 'error' ? '#FF6B6B' : '#FFA500')
              }
            ]}>
              <Ionicons 
                name={
                  Platform.OS === 'web' ?
                    ((monitoring.ready && monitoring.stripeGuardian?.status === 'ready') ? 'checkmark-circle' : 
                     (monitoring.ready || monitoring.stripeGuardian?.status === 'ready') ? 'alert-circle' : 'close-circle') :
                    (monitoring.stripeGuardian?.status === 'ready' ? 'checkmark-circle' : 'alert-circle')
                } 
                size={24} 
                color="white" 
              />
              <ThemedText style={styles.overallHealthText}>
                {Platform.OS === 'web' ?
                  ((monitoring.ready && monitoring.stripeGuardian?.status === 'ready') ? 'All Systems Operational' : 
                   (monitoring.ready || monitoring.stripeGuardian?.status === 'ready') ? 'Partial System Issues' : 'Critical Issues Detected') :
                  (monitoring.stripeGuardian?.status === 'ready' ? 'Stripe Guardian Operational' : 
                   monitoring.stripeGuardian?.status === 'error' ? 'Stripe Guardian Issues' : 'Stripe Guardian Unknown')
                }
              </ThemedText>
            </View>
          </View>
          
          <View style={[styles.healthCard, { backgroundColor: cardBg }]}>
            <View style={styles.healthDetails}>
              {/* Outstanding Tickets */}
              <TouchableOpacity 
                style={styles.healthItem}
                onPress={() => router.push('/admin/support')}
              >
                <View style={styles.healthValueContainer}>
                  <Ionicons 
                    name="mail" 
                    size={16} 
                    color={stats.supportTickets > 0 ? accentWarning : '#3CB371'} 
                  />
                  <ThemedText style={styles.healthLabel}>Outstanding Tickets</ThemedText>
                </View>
                <View style={styles.healthValueContainer}>
                  <ThemedText style={[
                    styles.healthValue,
                    { color: stats.supportTickets > 0 ? accentWarning : '#3CB371' }
                  ]}>
                    {stats.supportTickets}
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={textSecondaryColor} />
                </View>
              </TouchableOpacity>
              
              {/* Database Connection */}
              <View style={styles.healthItem}>
                <View style={styles.healthValueContainer}>
                  <Ionicons 
                    name="server" 
                    size={16} 
                    color={monitoring.checks?.supabase ? '#3CB371' : '#FF6B6B'} 
                  />
                  <ThemedText style={styles.healthLabel}>Database (Supabase)</ThemedText>
                </View>
                <View style={styles.healthValueContainer}>
                  <Ionicons 
                    name={monitoring.checks?.supabase ? 'checkmark-circle' : 'close-circle'} 
                    size={16} 
                    color={monitoring.checks?.supabase ? '#3CB371' : '#FF6B6B'} 
                  />
                  <ThemedText style={[
                    styles.healthValue, 
                    { color: monitoring.checks?.supabase ? '#3CB371' : '#FF6B6B' }
                  ]}>
                    {monitoring.checks?.supabase ? 'Connected' : 'Unknown'}
                  </ThemedText>
                </View>
              </View>
              
              {/* Stripe Integration */}
              <View style={styles.healthItem}>
                <View style={styles.healthValueContainer}>
                  <Ionicons 
                    name="card" 
                    size={16} 
                    color={monitoring.checks?.stripe ? '#3CB371' : '#FF6B6B'} 
                  />
                  <ThemedText style={styles.healthLabel}>Stripe Integration</ThemedText>
                </View>
                <View style={styles.healthValueContainer}>
                  <Ionicons 
                    name={monitoring.checks?.stripe ? 'checkmark-circle' : 'close-circle'} 
                    size={16} 
                    color={monitoring.checks?.stripe ? '#3CB371' : '#FF6B6B'} 
                  />
                  <ThemedText style={[
                    styles.healthValue, 
                    { color: monitoring.checks?.stripe ? '#3CB371' : '#FF6B6B' }
                  ]}>
                    {monitoring.checks?.stripe ? 'Active' : 'Unknown'}
                  </ThemedText>
                </View>
              </View>
              
              {/* Stripe Guardian */}
              <View style={styles.healthItem}>
                <View style={styles.healthValueContainer}>
                  <Ionicons 
                    name="shield-checkmark" 
                    size={16} 
                    color={monitoring.stripeGuardian?.status === 'ready' ? '#3CB371' : '#FF6B6B'} 
                  />
                  <ThemedText style={styles.healthLabel}>Stripe Guardian</ThemedText>
                </View>
                <View style={styles.healthValueContainer}>
                  <Ionicons 
                    name={monitoring.stripeGuardian?.status === 'ready' ? 'checkmark-circle' : 'close-circle'} 
                    size={16} 
                    color={monitoring.stripeGuardian?.status === 'ready' ? '#3CB371' : '#FF6B6B'} 
                  />
                  <ThemedText style={[
                    styles.healthValue, 
                    { color: monitoring.stripeGuardian?.status === 'ready' ? '#3CB371' : '#FF6B6B' }
                  ]}>
                    {monitoring.stripeGuardian?.status === 'ready' ? 'Active' : 
                     monitoring.stripeGuardian?.status === 'error' ? 'Error' : 'Unknown'}
                  </ThemedText>
                </View>
              </View>
              
              {/* Guardian Uptime (if available) */}
              {monitoring.stripeGuardian?.uptime && (
                <View style={styles.healthItem}>
                  <View style={styles.healthValueContainer}>
                    <Ionicons name="time" size={16} color={textSecondaryColor} />
                    <ThemedText style={styles.healthLabel}>Guardian Uptime</ThemedText>
                  </View>
                  <ThemedText style={styles.healthValue}>
                    {Math.floor(monitoring.stripeGuardian.uptime / 3600)}h {Math.floor((monitoring.stripeGuardian.uptime % 3600) / 60)}m
                  </ThemedText>
                </View>
              )}
              
              {/* Webhook System */}
              {Platform.OS === 'web' && (
                <View style={styles.healthItem}>
                  <View style={styles.healthValueContainer}>
                    <Ionicons 
                      name="git-network" 
                      size={16} 
                      color={monitoring.ready ? '#3CB371' : '#FF6B6B'} 
                    />
                    <ThemedText style={styles.healthLabel}>Webhook System</ThemedText>
                  </View>
                  <View style={styles.healthValueContainer}>
                    <Ionicons 
                      name={monitoring.ready ? 'checkmark-circle' : 'close-circle'} 
                      size={16} 
                      color={monitoring.ready ? '#3CB371' : '#FF6B6B'} 
                    />
                    <ThemedText style={[
                      styles.healthValue, 
                      { color: monitoring.ready ? '#3CB371' : '#FF6B6B' }
                    ]}>
                      {monitoring.ready ? 'Ready' : 'Not Ready'}
                    </ThemedText>
                  </View>
                </View>
              )}
              
              {/* Service Role Key */}
              <View style={styles.healthItem}>
                <View style={styles.healthValueContainer}>
                  <Ionicons 
                    name="key" 
                    size={16} 
                    color={monitoring.checks?.env?.SUPABASE_SERVICE_ROLE_KEY ? '#3CB371' : '#FF6B6B'} 
                  />
                  <ThemedText style={styles.healthLabel}>Service Role Key</ThemedText>
                </View>
                <View style={styles.healthValueContainer}>
                  <Ionicons 
                    name={monitoring.checks?.env?.SUPABASE_SERVICE_ROLE_KEY ? 'checkmark-circle' : 'close-circle'} 
                    size={16} 
                    color={monitoring.checks?.env?.SUPABASE_SERVICE_ROLE_KEY ? '#3CB371' : '#FF6B6B'} 
                  />
                  <ThemedText style={[
                    styles.healthValue, 
                    { color: monitoring.checks?.env?.SUPABASE_SERVICE_ROLE_KEY ? '#3CB371' : '#FF6B6B' }
                  ]}>
                    {monitoring.checks?.env?.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Missing'}
                  </ThemedText>
                </View>
              </View>
              
              {/* Active Premium Users */}
              <View style={styles.healthItem}>
                <View style={styles.healthValueContainer}>
                  <Ionicons 
                    name="diamond" 
                    size={16} 
                    color="#FFD700" 
                  />
                  <ThemedText style={styles.healthLabel}>Premium Subscriptions</ThemedText>
                </View>
                <ThemedText style={styles.healthValue}>
                  {stats.premiumUsers} active
                </ThemedText>
              </View>
              
              {/* Total Users */}
              <View style={styles.healthItem}>
                <View style={styles.healthValueContainer}>
                  <Ionicons 
                    name="people" 
                    size={16} 
                    color="#6A5ACD" 
                  />
                  <ThemedText style={styles.healthLabel}>User Base</ThemedText>
                </View>
                <ThemedText style={styles.healthValue}>
                  {stats.totalUsers} total ({stats.activeUsers} active)
                </ThemedText>
              </View>
            </View>
            
            {/* Subscription Sync Status */}
            {subscriptionSync && subscriptionSync.isRunning !== undefined && (
              <View style={[styles.syncSection, { backgroundColor: cardBg + '80', marginTop: 16 }]}>
                <View style={styles.syncHeader}>
                  <Ionicons name="sync" size={20} color="#4CAF50" />
                  <ThemedText style={styles.syncTitle}>Automatic Subscription Sync</ThemedText>
                </View>
                
                <View style={styles.healthDetails}>
                  <View style={styles.healthItem}>
                    <ThemedText style={styles.healthLabel}>Sync Status</ThemedText>
                    <View style={styles.healthValueContainer}>
                      <Ionicons 
                        name={subscriptionSync.isRunning ? 'checkmark-circle' : 'close-circle'} 
                        size={16} 
                        color={subscriptionSync.isRunning ? '#4CAF50' : '#FF6B6B'} 
                      />
                      <ThemedText style={[
                        styles.healthValue, 
                        { color: subscriptionSync.isRunning ? '#4CAF50' : '#FF6B6B' }
                      ]}>
                        {subscriptionSync.isRunning ? 'Running' : 'Stopped'}
                      </ThemedText>
                    </View>
                  </View>
                  
                  {subscriptionSync.intervalMinutes && (
                    <View style={styles.healthItem}>
                      <ThemedText style={styles.healthLabel}>Sync Interval</ThemedText>
                      <ThemedText style={styles.healthValue}>
                        Every {subscriptionSync.intervalMinutes} min
                      </ThemedText>
                    </View>
                  )}
                  
                  {subscriptionSync.lastSyncTime && (
                    <View style={styles.healthItem}>
                      <ThemedText style={styles.healthLabel}>Last Sync</ThemedText>
                      <ThemedText style={styles.healthValue}>
                        {new Date(subscriptionSync.lastSyncTime).toLocaleTimeString()}
                      </ThemedText>
                    </View>
                  )}
                  
                  {subscriptionSync.syncCount !== undefined && (
                    <View style={styles.healthItem}>
                      <ThemedText style={styles.healthLabel}>Total Syncs</ThemedText>
                      <ThemedText style={styles.healthValue}>
                        {subscriptionSync.syncCount}
                      </ThemedText>
                    </View>
                  )}
                </View>
                
                {/* Manual Sync Button */}
                <TouchableOpacity
                  style={[
                    styles.manualSyncButton,
                    { 
                      backgroundColor: subscriptionSync.isSyncing ? '#999' : accentPrimary,
                      opacity: subscriptionSync.isSyncing ? 0.6 : 1
                    }
                  ]}
                  onPress={triggerManualSync}
                  disabled={subscriptionSync.isSyncing}
                >
                  <Ionicons 
                    name={subscriptionSync.isSyncing ? "hourglass" : "sync"} 
                    size={20} 
                    color="white" 
                  />
                  <ThemedText style={styles.manualSyncButtonText}>
                    {subscriptionSync.isSyncing ? 'Syncing...' : 'Trigger Manual Sync'}
                  </ThemedText>
                </TouchableOpacity>
                
                {/* Sync Info */}
                <View style={[styles.helpTextContainer, { marginTop: 12 }]}>
                  <Ionicons name="information-circle" size={16} color={textSecondaryColor} />
                  <ThemedText style={[styles.helpText, { color: textSecondaryColor }]}>
                    Automatic sync runs every {subscriptionSync.intervalMinutes || 60} minutes to check and update subscription statuses from Stripe. Use manual sync to force an immediate check.
                  </ThemedText>
                </View>
              </View>
            )}
            
            {/* Last Update Timestamp */}
            {monitoring.lastUpdated && (
              <View style={styles.healthItem}>
                <ThemedText style={[styles.healthLabel, { marginTop: 16, opacity: 0.6 }]}>
                  Last system check: {monitoring.lastUpdated.toLocaleTimeString()}
                </ThemedText>
              </View>
            )}
            
            {/* Error Display */}
            {monitoring.error && (
              <View style={[styles.errorContainer, { backgroundColor: '#FF6B6B20', marginTop: 16 }]}>
                <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
                <ThemedText style={[styles.errorText, { color: '#FF6B6B' }]}>
                  {monitoring.error}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 40,
    paddingBottom: 30,
    gap: 20,
  },
  webHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  webHeaderSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  webContent: {
    flex: 1,
    paddingHorizontal: 0,
  },
  webLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webLoadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  statSubtext: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    minWidth: 250,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  healthCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  healthStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  healthHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  loadingIndicator: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  healthDetails: {
    gap: 12,
  },
  healthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  healthValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  healthValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  initializeCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    marginTop: 20,
    marginBottom: 20,
  },
  initializeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  initializeText: {
    flex: 1,
  },
  initializeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  initializeSubtitle: {
    fontSize: 14,
  },
  initializeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  initializeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugContent: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    minWidth: 180,
  },
  debugButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  helpTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 20,
  },
  overallHealthContainer: {
    marginBottom: 16,
  },
  overallHealthLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  overallHealthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  overallHealthText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  mobileNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  mobileNoticeText: {
    fontSize: 13,
    lineHeight: 20,
  },
  syncSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  syncTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  manualSyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  manualSyncButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
}); 