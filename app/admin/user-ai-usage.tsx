import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    Switch
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../hooks/useAuth';
import { useThemeColor } from '../../hooks/useThemeColor';
import { supabase } from '../../lib/supabase';
import { UserFeatureUsage } from '../../types/FeatureLimits';
import { featureLimitService, UsageHistoryRecord } from '../../services/FeatureLimitService';

// Import web components
import { AdminSidebar } from '../../components/web/AdminSidebar';
import { WebLayout } from '../../components/web/WebLayout';
import { UnifiedUsageDisplay } from '../../components/UnifiedUsageDisplay';

interface UserInfo {
  id: string;
  email: string;
  displayName: string | null;
  isRestricted: boolean;
  restrictionReason: string | null;
  multiplier: number;
}

interface DashboardData {
  topUsers: Array<{ userId: string; totalUsage: number; displayName: string | null; email: string | null; isPremium: boolean }>;
  restrictedUsers: Array<{ userId: string; displayName: string | null; email: string | null; reason: string | null; multiplier: number }>;
}

export default function UserAIUsageScreen() {
  const { isAdmin } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [userUsage, setUserUsage] = useState<UserFeatureUsage[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [usageHistory, setUsageHistory] = useState<UsageHistoryRecord[]>([]);

  // Theme colors
  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1A1A1A' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({ light: '#F5F6FA', dark: '#282828' }, 'backgroundSecondary');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#333333' }, 'border');
  const accentColor = useThemeColor({}, 'accentPrimary');

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoadingDashboard(true);
      const [topUsers, restricted] = await Promise.all([
        featureLimitService.getTopAIUsers(10),
        featureLimitService.getRestrictedUsers()
      ]);
      setDashboardData({ topUsers, restrictedUsers: restricted });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin()) {
      loadDashboard();
    }
  }, [isAdmin, loadDashboard]);

  const handleUserSelect = (userId: string) => {
    setSearchQuery(userId);
    // Trigger search for this ID
    setSearchQuery(userId);
    setTimeout(() => {
      // Small delay to ensure state update if needed, though handleSearch uses searchQuery from state
      // Actually we should just call a search function directly with the ID
      searchById(userId);
    }, 0);
  };

  const searchById = async (userId: string) => {
    try {
      setIsSearching(true);
      setCurrentUser(null);
      setUserUsage([]);

      // Fetch user profile and restriction details directly
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, email, display_name, is_restricted, restriction_reason, custom_ai_limit_multiplier')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) {
        showSnackbar('User profile not found', 'error');
        return;
      }
      
      setCurrentUser({
        id: profile.id,
        email: profile.email || 'No email',
        displayName: profile.display_name,
        isRestricted: profile.is_restricted || false,
        restrictionReason: profile.restriction_reason || null,
        multiplier: profile.custom_ai_limit_multiplier || 1.0,
      });

      const usage = await featureLimitService.getUserFeatureUsageSummary(profile.id);
      const aiUsage = usage.filter(u => u.featureId.startsWith('ai_') || (featureLimitService as any).limits?.[u.featureId]?.category === 'ai');
      setUserUsage(aiUsage);
      
      // 4. Fetch usage history
      const history = await featureLimitService.getUsageHistory(profile.id);
      setUsageHistory(history);
    } catch (error) {
      showSnackbar('Error loading user details', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      setCurrentUser(null);
      setUserUsage([]);

      // 1. Search for user by email or ID using the RPC function we found earlier
      const { data: searchResults, error: searchError } = await supabase.rpc('search_users_by_email_or_name', {
        search_query: searchQuery.trim()
      });

      if (searchError) throw searchError;
      if (!searchResults || searchResults.length === 0) {
        showSnackbar('No user found matching that criteria', 'error');
        return;
      }

      const user = searchResults[0]; // Take the first match
      
      // 2. Fetch full profile and restriction details
      const restrictions = await featureLimitService.getUserRestrictions(user.id);
      
      setCurrentUser({
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        isRestricted: restrictions.isRestricted,
        restrictionReason: restrictions.reason,
        multiplier: restrictions.multiplier,
      });

      // 3. Fetch all usage features for this user
      const usage = await featureLimitService.getUserFeatureUsageSummary(user.id);
      
      // Filter for AI features only
      const aiUsage = usage.filter(u => {
        const feature = (featureLimitService as any).limits?.[u.featureId];
        return feature?.category === 'ai' || u.featureId.startsWith('ai_');
      });

      setUserUsage(aiUsage);
      
      // 4. Fetch usage history
      const history = await featureLimitService.getUsageHistory(user.id);
      setUsageHistory(history);
      
    } catch (error) {
      console.error('Error searching user:', error);
      showSnackbar('Failed to fetch user data', 'error');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, showSnackbar]);

  const toggleRestriction = async () => {
    if (!currentUser) return;

    try {
      setIsUpdating(true);
      const newRestrictedStatus = !currentUser.isRestricted;
      
      await featureLimitService.updateUserRestriction(
        currentUser.id,
        newRestrictedStatus,
        newRestrictedStatus ? 'Automated restriction' : undefined
      );

      setCurrentUser(prev => prev ? { ...prev, isRestricted: newRestrictedStatus } : null);
      showSnackbar(`User ${newRestrictedStatus ? 'restricted' : 'unrestricted'} successfully`, 'success');
      
      // Refresh usage to see updated limits
      const usage = await featureLimitService.getUserFeatureUsageSummary(currentUser.id);
      const aiUsage = usage.filter(u => u.featureId.startsWith('ai_') || (featureLimitService as any).limits?.[u.featureId]?.category === 'ai');
      setUserUsage(aiUsage);

    } catch (error) {
      console.error('Error updating restriction:', error);
      showSnackbar('Failed to update user restriction', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const updateMultiplier = async (val: string) => {
    if (!currentUser) return;
    const num = parseFloat(val);
    if (isNaN(num)) return;

    try {
      setIsUpdating(true);
      await featureLimitService.updateUserRestriction(
        currentUser.id,
        currentUser.isRestricted,
        currentUser.restrictionReason || undefined,
        num
      );

      setCurrentUser(prev => prev ? { ...prev, multiplier: num } : null);
      showSnackbar('Limit multiplier updated', 'success');
      
      // Refresh usage
      const usage = await featureLimitService.getUserFeatureUsageSummary(currentUser.id);
      setUserUsage(usage.filter(u => u.featureId.startsWith('ai_')));
    } catch (error) {
      showSnackbar('Failed to update multiplier', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isAdmin()) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.unauthorizedContainer}>
          <Ionicons name="lock-closed" size={64} color="#FF6B6B" />
          <ThemedText style={styles.unauthorizedTitle}>Access Denied</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const content = (
    <ScrollView style={styles.content}>
      <View style={[styles.searchSection, { backgroundColor: cardBg, borderColor }]}>
        <ThemedText style={styles.label}>Lookup User</ThemedText>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { color: textColor, borderColor }]}
            placeholder="Search by email or display name..."
            placeholderTextColor={mutedTextColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity 
            style={[styles.searchButton, { backgroundColor: accentColor }]}
            onPress={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Ionicons name="search" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {!currentUser && !isSearching && (
        <View style={styles.dashboardContainer}>
          <View style={styles.dashboardGrid}>
             <View style={[styles.dashboardCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.cardHeader, { borderBottomColor: borderColor }]}>
                  <Ionicons name="trending-up" size={20} color={accentColor} />
                  <ThemedText style={styles.cardTitle}>Trending AI Users</ThemedText>
                </View>
                {isLoadingDashboard ? (
                  <ActivityIndicator style={styles.loader} />
                ) : dashboardData?.topUsers.length ? (
                  dashboardData.topUsers.map((user, idx) => (
                    <TouchableOpacity 
                      key={user.userId} 
                      style={[styles.listItem, idx < (dashboardData?.topUsers.length - 1) && { borderBottomColor: borderColor }]}
                      onPress={() => handleUserSelect(user.userId)}
                    >
                      <View style={styles.itemInfo}>
                        <ThemedText style={styles.itemName}>{user.displayName || 'Unknown User'}</ThemedText>
                        <ThemedText style={[styles.itemSub, { color: mutedTextColor }]}>{user.email}</ThemedText>
                      </View>
                      <View style={styles.itemValue}>
                         <ThemedText style={[styles.usageText, { color: accentColor }]}>{user.totalUsage} items</ThemedText>
                         {user.isPremium && <View style={styles.premiumTag}><ThemedText style={styles.tagText}>PRO</ThemedText></View>}
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <ThemedText style={styles.emptyText}>No AI usage found</ThemedText>
                )}
             </View>

             <View style={[styles.dashboardCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.cardHeader, { borderBottomColor: borderColor }]}>
                  <Ionicons name="shield-outline" size={20} color="#FF4757" />
                  <ThemedText style={styles.cardTitle}>Restricted Accounts</ThemedText>
                </View>
                {isLoadingDashboard ? (
                  <ActivityIndicator style={styles.loader} />
                ) : dashboardData?.restrictedUsers.length ? (
                  dashboardData.restrictedUsers.map((user, idx) => (
                    <TouchableOpacity 
                      key={user.userId} 
                      style={[styles.listItem, idx < (dashboardData?.restrictedUsers.length - 1) && { borderBottomColor: borderColor }]}
                      onPress={() => handleUserSelect(user.userId)}
                    >
                      <View style={styles.itemInfo}>
                        <ThemedText style={styles.itemName}>{user.displayName || 'Unnamed User'}</ThemedText>
                        <ThemedText style={[styles.itemSub, { color: mutedTextColor }]}>{user.reason || 'Restricted'}</ThemedText>
                      </View>
                      <View style={styles.itemValue}>
                        <ThemedText style={styles.multiplierTag}>{user.multiplier}x</ThemedText>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <ThemedText style={styles.emptyText}>No restricted accounts</ThemedText>
                )}
             </View>
          </View>
        </View>
      )}

      {currentUser && (
        <View style={styles.userResult}>
          <View style={[styles.profileCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.profileHeader}>
              <View style={styles.userAvatar}>
                <ThemedText style={styles.avatarText}>
                  {(currentUser.displayName || currentUser.email).charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.userNameInfo}>
                <ThemedText style={styles.userName}>{currentUser.displayName || 'Unnamed User'}</ThemedText>
                <ThemedText style={[styles.userEmail, { color: mutedTextColor }]}>{currentUser.email}</ThemedText>
                <ThemedText style={[styles.userId, { color: mutedTextColor }]}>ID: {currentUser.id}</ThemedText>
              </View>
              <View style={styles.statusBadgeContainer}>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: currentUser.isRestricted ? '#FF4757' : '#2ED573' }
                ]}>
                  <ThemedText style={styles.statusBadgeText}>
                    {currentUser.isRestricted ? 'RESTRICTED' : 'NORMAL'}
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.managementRow}>
              <View style={styles.managementControl}>
                <ThemedText style={styles.controlLabel}>Restrict AI Access</ThemedText>
                <Switch
                  value={currentUser.isRestricted}
                  onValueChange={toggleRestriction}
                  disabled={isUpdating}
                  trackColor={{ false: '#767577', true: '#FF4757' }}
                />
              </View>
              <View style={styles.managementControl}>
                <ThemedText style={styles.controlLabel}>Limit Multiplier</ThemedText>
                <View style={styles.multiplierInputContainer}>
                  <TextInput
                    style={[styles.multiplierInput, { color: textColor, borderColor }]}
                    keyboardType="numeric"
                    value={currentUser.multiplier.toString()}
                    onChangeText={(val) => {
                      if (val.match(/^[0-9.]*$/)) {
                         setCurrentUser(prev => prev ? { ...prev, multiplier: parseFloat(val) || 0 } : null);
                      }
                    }}
                    onBlur={() => updateMultiplier(currentUser.multiplier.toString())}
                  />
                  <ThemedText style={styles.multiplierHint}>x</ThemedText>
                </View>
              </View>
            </View>
          </View>

          <ThemedText style={styles.sectionTitle}>AI Feature Usage</ThemedText>
          {userUsage.length > 0 ? (
            <UnifiedUsageDisplay 
              features={userUsage.map(u => ({
                featureId: u.featureId,
                featureName: u.featureId.replace(/_/g, ' ').toUpperCase(),
                description: '',
                category: 'ai',
                currentUsage: u.currentPeriod.usage,
                userLimit: u.currentPeriod.limit,
                remaining: u.currentPeriod.remaining as number, // Cast for display
                usagePercentage: typeof u.currentPeriod.limit === 'number' ? Math.round((u.currentPeriod.usage / u.currentPeriod.limit) * 100) : 0,
                isUnlimited: u.currentPeriod.limit === 'unlimited',
                canUse: true,
                isActive: true,
                period: u.currentPeriod.period,
                limitType: u.currentPeriod.limitType,
                requiresUpgrade: false
              }))}
              showUpgradeButton={false}
            />
          ) : (
            <View style={[styles.emptyUsage, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="sparkles-outline" size={48} color={mutedTextColor} />
              <ThemedText style={[styles.emptyText, { color: mutedTextColor }]}>No AI usage data recorded for this user.</ThemedText>
            </View>
          )}

          <ThemedText style={styles.sectionTitle}>AI Usage Last 30 Days</ThemedText>
          <View style={[styles.historyCard, { backgroundColor: cardBg, borderColor }]}>
            {usageHistory.length > 0 ? (
              <View style={styles.table}>
                <View style={[styles.tableHeader, { borderBottomColor: borderColor }]}>
                  <ThemedText style={[styles.columnHeader, { flex: 2 }]}>Date</ThemedText>
                  <ThemedText style={[styles.columnHeader, { flex: 3 }]}>Feature</ThemedText>
                  <ThemedText style={[styles.columnHeader, { flex: 1, textAlign: 'right' }]}>Usage</ThemedText>
                </View>
                {usageHistory.map((item, idx) => (
                  <View 
                    key={`${item.date}-${item.featureId}-${idx}`} 
                    style={[styles.tableRow, idx < (usageHistory.length - 1) && { borderBottomColor: borderColor }]}
                  >
                    <ThemedText style={[styles.columnText, { flex: 2 }]}>{item.date}</ThemedText>
                    <ThemedText style={[styles.columnText, { flex: 3 }]}>{item.featureId.replace(/_/g, ' ')}</ThemedText>
                    <ThemedText style={[styles.columnText, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>
                      {item.usageCount}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyHistory}>
                <Ionicons name="calendar-outline" size={32} color={mutedTextColor} />
                <ThemedText style={[styles.emptyText, { color: mutedTextColor }]}>No activity recorded in the last 30 days.</ThemedText>
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="User AI Usage"
        subtitle="Admin Management"
        sidebar={<AdminSidebar activePage="user-ai-usage" />}
      >
        {content}
      </WebLayout>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mobileHeader}>
         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText type="title">User AI Usage</ThemedText>
      </View>
      {content}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unauthorizedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  searchSection: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userResult: {
    gap: 20,
  },
  profileCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6A5ACD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userNameInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
  },
  userId: {
    fontSize: 12,
    opacity: 0.6,
  },
  statusBadgeContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  managementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  managementControl: {
    flex: 1,
    gap: 10,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  multiplierInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multiplierInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  multiplierHint: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  dashboardContainer: {
    marginBottom: 40,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  dashboardCard: {
    flex: 1,
    minWidth: 350,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  loader: {
    padding: 40,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
  },
  itemValue: {
    alignItems: 'flex-end',
    gap: 4,
  },
  usageText: {
    fontSize: 14,
    fontWeight: '700',
  },
  premiumTag: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  multiplierTag: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    color: '#FF4757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    padding: 30,
    textAlign: 'center',
    opacity: 0.5,
    fontSize: 14,
  },
  emptyUsage: {
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 16,
  },
  historyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 40,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  columnText: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  emptyHistory: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
});
