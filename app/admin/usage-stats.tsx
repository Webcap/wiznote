import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../hooks/useAuth';
import { useThemeColor } from '../../hooks/useThemeColor';
import { supabase } from '../../lib/supabase';

// Import web components
import { AdminSidebar } from '../../components/web/AdminSidebar';
import { WebLayout } from '../../components/web/WebLayout';

interface UsageStats {
  totalUsers: number;
  totalUsage: number;
  averageUsage: number;
  topUsers: { userId: string; usage: number; displayName: string | null }[];
}

export default function UsageStatsScreen() {
  const { isAdmin } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState('ai_summaries');
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Get theme colors
  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1A1A1A' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({ light: '#F5F6FA', dark: '#282828' }, 'backgroundSecondary');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#333333' }, 'background');
  const borderBottomColor = useThemeColor({ light: '#E5E7EB', dark: '#333333' }, 'background');

  // Load usage stats - moved before conditional return to follow Rules of Hooks
  useEffect(() => {
    if (!isAdmin) return; // Skip if not admin
    
    const loadUsageStats = async () => {
      try {
        setIsLoading(true);
        
        // Get all usage data for the selected feature
        const { data: allUsage, error } = await supabase
          .from('user_feature_usage')
          .select('user_id, usage_count, usage_duration, usage_storage')
          .eq('feature_id', selectedFeature);
        
        if (error) {
          throw error;
        }
        
        // Determine the correct usage field based on feature type
        const getUsageValue = (record: any) => {
          if (selectedFeature === 'voice_recording') {
            return record.usage_duration || 0; // Duration in minutes
          } else if (selectedFeature === 'note_storage') {
            return record.usage_storage || 0; // Storage in bytes
          } else {
            return record.usage_count || 0; // Count-based features
          }
        };
        
        // Calculate stats
        const totalUsage = allUsage.reduce((sum, record) => sum + getUsageValue(record), 0);
        const totalUsers = allUsage.length;
        const averageUsage = totalUsers > 0 ? totalUsage / totalUsers : 0;
        
        // Get top users with user details
        const topUsersData = allUsage
          .map(record => ({
            user_id: record.user_id,
            usage: getUsageValue(record)
          }))
          .sort((a, b) => b.usage - a.usage)
          .slice(0, 10);
        
        // Fetch user details for top users - try user_profiles first, then fallback to users table
        const userIds = topUsersData.map(record => record.user_id);
        console.log('User IDs from usage data:', userIds);
        
        // First try to get user profiles
        let { data: userProfiles, error: userError } = await supabase
          .from('user_profiles')
          .select('id, display_name')
          .in('id', userIds);
        
        console.log('User profiles query result:', { userProfiles, userError });
        
        if (userError) {
          console.warn('Failed to fetch user profiles:', userError);
          userProfiles = [];
        }
        
        // Also try to get all user profiles to see what's available
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from('user_profiles')
          .select('id, display_name')
          .limit(5);
        
        console.log('All profiles sample:', { allProfiles, allProfilesError });
        
        // Create map for quick lookup
        const userProfileMap = new Map();
        
        if (userProfiles) {
          userProfiles.forEach(profile => {
            userProfileMap.set(profile.id, profile);
          });
        }
        
        // Map usage data with user details
        const topUsers = topUsersData.map(record => {
          const userProfile = userProfileMap.get(record.user_id);
          
          const result = {
            userId: record.user_id,
            usage: record.usage,
            displayName: userProfile?.display_name || null
          };
          
          console.log(`User ${record.user_id}:`, {
            profile: userProfile,
            final: result
          });
          
          return result;
        });
        
        const stats: UsageStats = {
          totalUsers,
          totalUsage,
          averageUsage,
          topUsers
        };
        
        setUsageStats(stats);
      } catch (error) {
        console.error('Error loading usage stats:', error);
        if (Platform.OS === 'web') {
          showSnackbar('Failed to load usage statistics', 'error', 4000);
        } else {
          Alert.alert('Error', 'Failed to load usage statistics');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUsageStats();
  }, [selectedFeature, selectedPeriod, isAdmin, showSnackbar]);

  // Check if user is admin
  if (!isAdmin) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.unauthorizedContainer}>
          <Ionicons name="lock-closed" size={64} color="#FF6B6B" />
          <ThemedText style={styles.unauthorizedTitle}>
            Access Denied
          </ThemedText>
          <ThemedText style={styles.unauthorizedSubtitle}>
            You don&apos;t have permission to access this page
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const formatDuration = (value: number) => {
    // For voice recording, value is in minutes
    if (selectedFeature === 'voice_recording') {
      const hours = Math.floor(value / 60);
      const minutes = Math.floor(value % 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes} minutes`;
      }
    }
    
    // For note storage, value is in bytes
    if (selectedFeature === 'note_storage') {
      const mb = (value / (1024 * 1024)).toFixed(2);
      const gb = (value / (1024 * 1024 * 1024)).toFixed(2);
      
      if (parseFloat(gb) >= 1) {
        return `${gb} GB`;
      } else {
        return `${mb} MB`;
      }
    }
    
    // For count-based features, treat value as count
    const isCountBasedFeature = ['ai_name_generating', 'ai_summaries', 'ai_key_details', 'ai_transcription', 'ai_flashcards', 'advanced_search', 'note_export', 'custom_themes', 'priority_support', 'real_time_sync'].includes(selectedFeature);
    if (isCountBasedFeature) {
      return `${Math.round(value)} uses`;
    }
    
    // Default: treat as count
    return `${Math.round(value)}`;
  };



  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="Usage Statistics"
        subtitle="Admin Dashboard"
        sidebar={
          <AdminSidebar activePage="usage-stats" />
        }
        header={
          <View style={[styles.webHeader, { backgroundColor }]}>
            <TouchableOpacity style={styles.webBackButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#6A5ACD" />
              <ThemedText style={styles.webBackText}>Back</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.webHeaderTitle}>Usage Statistics</ThemedText>
            <View style={styles.webHeaderRight}>
              <TouchableOpacity 
                style={[styles.webBackButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                onPress={() => router.push('/admin/support')}
              >
                <Ionicons name="headset" size={20} color="#6A5ACD" />
                <ThemedText style={styles.webBackText}>Support</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.webHeaderSubtitle}>
                Monitor feature usage across users
              </ThemedText>
            </View>
          </View>
        }
      >
        <ScrollView style={[styles.webContent, { backgroundColor }]}>
          {isLoading ? (
            <View style={[styles.loadingContainer, { backgroundColor }]}>
              <ThemedText>Loading usage statistics...</ThemedText>
            </View>
          ) : (
            <View style={[styles.statsContainer, { backgroundColor }]}>
              {/* Feature and Period Selector */}
              <View style={styles.selectorContainer}>
                <View style={styles.selectorGroup}>
                  <ThemedText style={styles.selectorLabel}>Feature:</ThemedText>
                  <View style={styles.buttonGroup}>
                                         {['voice_recording', 'ai_transcription', 'ai_summaries', 'ai_name_generating', 'ai_key_details'].map((feature) => (
                      <TouchableOpacity
                        key={feature}
                        style={[
                          styles.selectorButton,
                          { 
                            backgroundColor: selectedFeature === feature ? '#6A5ACD' : 'transparent',
                            borderColor: selectedFeature === feature ? '#6A5ACD' : '#6A5ACD',
                          }
                        ]}
                        onPress={() => setSelectedFeature(feature)}
                      >
                        <ThemedText style={[
                          styles.selectorButtonText,
                          { color: selectedFeature === feature ? '#FFFFFF' : '#6A5ACD' }
                        ]}>
                          {feature.replace('_', ' ').toUpperCase()}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.selectorGroup}>
                  <ThemedText style={styles.selectorLabel}>Period:</ThemedText>
                  <View style={styles.buttonGroup}>
                    {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                      <TouchableOpacity
                        key={period}
                        style={[
                          styles.selectorButton,
                          { 
                            backgroundColor: selectedPeriod === period ? '#6A5ACD' : 'transparent',
                            borderColor: selectedPeriod === period ? '#6A5ACD' : '#6A5ACD',
                          }
                        ]}
                        onPress={() => setSelectedPeriod(period)}
                      >
                        <ThemedText style={[
                          styles.selectorButtonText,
                          { color: selectedPeriod === period ? '#FFFFFF' : '#6A5ACD' }
                        ]}>
                          {period.toUpperCase()}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Usage Statistics */}
              {usageStats && (
                <View style={styles.statsGrid}>
                  <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                    <ThemedText style={[styles.statValue, { color: textColor }]}>
                      {usageStats.totalUsers}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: mutedTextColor }]}>
                      Total Users
                    </ThemedText>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                    <ThemedText style={[styles.statValue, { color: textColor }]}>
                      {formatDuration(usageStats.totalUsage)}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: mutedTextColor }]}>
                      Total Usage
                    </ThemedText>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                    <ThemedText style={[styles.statValue, { color: textColor }]}>
                      {formatDuration(usageStats.averageUsage)}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: mutedTextColor }]}>
                      Average Usage
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Top Users */}
              {usageStats && usageStats.topUsers.length > 0 && (
                <View style={styles.topUsersContainer}>
                  <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
                    Top Users by Usage
                  </ThemedText>
                  <View style={styles.topUsersList}>
                    {usageStats.topUsers.map((user, index) => (
                      <View key={user.userId} style={[styles.userRow, { borderBottomColor }]}>
                        <View style={styles.userRank}>
                          <ThemedText style={[styles.rankNumber, { color: textColor }]}>
                            #{index + 1}
                          </ThemedText>
                        </View>
                        <View style={styles.userInfo}>
                          <ThemedText style={[styles.userId, { color: textColor }]}>
                            {user.displayName || `User ${user.userId.slice(0, 8)}...`}
                          </ThemedText>
                        </View>
                        <View style={styles.userUsage}>
                          <ThemedText style={[styles.usageValue, { color: textColor }]}>
                            {formatDuration(user.usage)}
                          </ThemedText>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#6A5ACD" />
        </TouchableOpacity>
        <ThemedText type="title">Usage Statistics</ThemedText>
      </View>

      <ScrollView style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ThemedText>Loading usage statistics...</ThemedText>
          </View>
        ) : (
          <View style={styles.statsContainer}>
            {/* Mobile implementation would go here */}
            <ThemedText>Usage statistics for {selectedFeature}</ThemedText>
            {usageStats && (
              <View>
                <ThemedText>Total Users: {usageStats.totalUsers}</ThemedText>
                <ThemedText>Total Usage: {formatDuration(usageStats.totalUsage)}</ThemedText>
                <ThemedText>Average Usage: {formatDuration(usageStats.averageUsage)}</ThemedText>
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
    paddingVertical: 40,
  },
  unauthorizedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  unauthorizedSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  statsContainer: {
    gap: 24,
  },
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 40,
    paddingBottom: 30,
    gap: 20,
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 0,
    minWidth: 80,
  },
  webBackText: {
    fontSize: 14,
    fontWeight: '500',
  },
  webHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginLeft: 20,
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
  webContent: {
    flex: 1,
    padding: 20,
  },
  selectorContainer: {
    gap: 16,
  },
  selectorGroup: {
    gap: 8,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 80,
  },
  selectorButtonText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  topUsersContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  topUsersList: {
    gap: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderBottomWidth: 1,
  },
  userRank: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userId: {
    fontSize: 14,
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  userUsage: {
    alignItems: 'flex-end',
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 