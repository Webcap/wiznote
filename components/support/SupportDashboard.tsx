import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { FeatureLimitDebugInfo, LimitOverride, supportService, UserFeatureStatus, UserProfile } from '../../services/SupportService';
import BulkUserManagement from './BulkUserManagement';
import RealTimeMonitoring from './RealTimeMonitoring';
import SupportAnalytics from './SupportAnalytics';

interface SupportDashboardProps {
  supportAgentId: string;
}

export default function SupportDashboard({ supportAgentId }: SupportDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userFeatureStatus, setUserFeatureStatus] = useState<UserFeatureStatus | null>(null);
  const [activeOverrides, setActiveOverrides] = useState<LimitOverride[]>([]);
  const [debugInfo, setDebugInfo] = useState<FeatureLimitDebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'search' | 'user-details' | 'overrides' | 'debug' | 'real-time' | 'bulk-management' | 'analytics'>('search');

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  const accentWarning = useThemeColor({}, 'accentWarning');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const borderColor = useThemeColor({}, 'border');

  const handleUserSelect = (userId: string) => {
    // In a real implementation, you'd fetch user details
    console.log('Selected user:', userId);
    setSelectedUser({
      id: userId,
      email: 'user@example.com',
      displayName: 'Example User',
      premium: {
        isActive: true,
        planName: 'Premium',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
      createdAt: new Date(),
      lastActive: new Date(),
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const user = await supportService.searchUser(searchQuery);
      if (user) {
        setSelectedUser(user);
      } else {
        Alert.alert('No Users Found', 'No users found matching your search criteria.');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Failed to search for users.');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedUser) return;
    
    const reason = await promptReason();
    if (!reason) return;
    
    try {
      await supportService.grantTemporaryAccess(
        selectedUser.id,
        'feature_limit_override',
        {
          duration: '24hours',
          reason,
          supportAgentId
        }
      );
      
      Alert.alert('Success', 'Temporary access granted successfully.');
      // Refresh user status
      const status = await supportService.getUserFeatureStatus(selectedUser.id);
      setUserFeatureStatus(status);
    } catch (error) {
      console.error('Grant access error:', error);
      Alert.alert('Error', 'Failed to grant temporary access.');
    }
  };

  const grantAccess = async (featureId: string, limit: number, hours: number, reason: string) => {
    if (!selectedUser) return;
    
    try {
      await supportService.grantTemporaryAccess(
        selectedUser.id,
        featureId,
        {
          duration: '24hours',
          reason,
          supportAgentId
        }
      );
      
      Alert.alert('Success', 'Temporary access granted successfully.');
      // Refresh user status
      const status = await supportService.getUserFeatureStatus(selectedUser.id);
      setUserFeatureStatus(status);
    } catch (error) {
      console.error('Grant access error:', error);
      Alert.alert('Error', 'Failed to grant temporary access.');
    }
  };

  const promptReason = (): Promise<string> => {
    return new Promise((resolve) => {
      Alert.prompt(
        'Reason for Override',
        'Please provide a reason for granting temporary access:',
        [
          { text: 'Cancel', onPress: () => resolve(''), style: 'cancel' },
          { text: 'OK', onPress: (reason?: string) => resolve(reason || '') },
        ],
        'plain-text'
      );
    });
  };

  const handleRevokeOverride = async (overrideId: string) => {
    try {
      await supportService.revokeOverride(overrideId, 'Manual revocation by support agent');
      Alert.alert('Success', 'Temporary access revoked successfully.');
      // Refresh overrides
      const overrides = await supportService.getActiveOverrides(selectedUser?.id || '');
      setActiveOverrides(overrides);
    } catch (error) {
      console.error('Revoke override error:', error);
      Alert.alert('Error', 'Failed to revoke temporary access.');
    }
  };

  const handleDebugFeature = async () => {
    if (!selectedUser) return;
    
    try {
      const debugInfo = await supportService.debugFeatureLimit(selectedUser.id, 'feature_limit_override');
      setDebugInfo(debugInfo);
      setCurrentView('debug');
    } catch (error) {
      console.error('Debug error:', error);
      Alert.alert('Error', 'Failed to debug feature limits.');
    }
  };

  const handleForceRefresh = async () => {
    if (!selectedUser) return;
    
    try {
      await supportService.forceRefreshUserLimits(selectedUser.id);
      Alert.alert('Success', 'User limits refreshed successfully.');
      // Refresh user status
      const status = await supportService.getUserFeatureStatus(selectedUser.id);
      setUserFeatureStatus(status);
    } catch (error) {
      console.error('Force refresh error:', error);
      Alert.alert('Error', 'Failed to refresh user limits.');
    }
  };

  const renderSearchView = () => (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.searchContainer, { backgroundColor: backgroundSecondary }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: backgroundColor, borderColor: borderColor }]}>
          <Ionicons name="search" size={20} color={textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search users by email..."
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: accentPrimary }]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.navigationContainer, { backgroundColor: backgroundSecondary, marginTop: 20 }]}>
        <Text style={[styles.navigationTitle, { color: textColor }]}>Quick Access</Text>
        
        <View style={styles.navigationGrid}>
          <TouchableOpacity
            style={[styles.navCard, { backgroundColor: backgroundColor, borderColor: borderColor }]}
            onPress={() => setCurrentView('real-time')}
          >
            <Ionicons name="pulse" size={32} color={accentPrimary} />
            <Text style={[styles.navCardTitle, { color: textColor }]}>Real-Time Monitoring</Text>
            <Text style={[styles.navCardSubtitle, { color: textSecondary }]}>Live system monitoring</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navCard, { backgroundColor: backgroundColor, borderColor: borderColor }]}
            onPress={() => setCurrentView('bulk-management')}
          >
            <Ionicons name="people" size={32} color={accentPrimary} />
            <Text style={[styles.navCardTitle, { color: textColor }]}>Bulk Management</Text>
            <Text style={[styles.navCardSubtitle, { color: textSecondary }]}>Manage multiple users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navCard, { backgroundColor: backgroundColor, borderColor: borderColor }]}
            onPress={() => setCurrentView('analytics')}
          >
            <Ionicons name="analytics" size={32} color={accentPrimary} />
            <Text style={[styles.navCardTitle, { color: textColor }]}>Analytics</Text>
            <Text style={[styles.navCardSubtitle, { color: textSecondary }]}>Performance metrics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navCard, { backgroundColor: backgroundColor, borderColor: borderColor }]}
            onPress={() => setCurrentView('debug')}
          >
            <Ionicons name="bug" size={32} color={accentPrimary} />
            <Text style={[styles.navCardTitle, { color: textColor }]}>Debug Tools</Text>
            <Text style={[styles.navCardSubtitle, { color: textSecondary }]}>Troubleshoot issues</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderUserDetailsView = () => (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentView('search')}
        >
          <Ionicons name="arrow-back" size={24} color={accentPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>User Details</Text>
      </View>

      {selectedUser && (
        <ScrollView style={styles.content}>
          <View style={[styles.userCard, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
            <Text style={[styles.userEmail, { color: textColor }]}>{selectedUser.email}</Text>
            <Text style={[styles.userPlan, { color: textSecondary }]}>
              Plan: {selectedUser.premium?.planName || 'Free'}
            </Text>
            <Text style={[styles.userInfo, { color: textSecondary }]}>
              Created: {selectedUser.createdAt.toLocaleDateString()}
            </Text>
            <Text style={[styles.userInfo, { color: textSecondary }]}>
              Last Active: {selectedUser.lastActive.toLocaleDateString()}
            </Text>
          </View>

          {userFeatureStatus && (
            <View style={[styles.statusCard, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
              <Text style={[styles.statusTitle, { color: textColor }]}>Feature Status</Text>
              {userFeatureStatus.limits.map((limit: any, index: number) => {
                const usage = userFeatureStatus.currentUsage[limit.featureId] || 0;
                const remaining = userFeatureStatus.remainingQuota[limit.featureId] || 0;
                const isLimitReached = usage >= (limit.freeUserLimit === 'unlimited' ? Infinity : limit.freeUserLimit);
                
                return (
                  <View key={index} style={styles.featureRow}>
                    <Text style={[styles.featureName, { color: textColor }]}>{limit.featureName}</Text>
                    <Text style={[styles.featureUsage, { color: textSecondary }]}>
                      {usage} / {limit.freeUserLimit === 'unlimited' ? '∞' : limit.freeUserLimit}
                    </Text>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: isLimitReached ? accentDanger : accentSuccess }
                    ]} />
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: accentPrimary }]}
              onPress={handleGrantAccess}
            >
              <Text style={styles.actionButtonText}>Grant Temporary Access</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: accentWarning }]}
              onPress={handleDebugFeature}
            >
              <Text style={styles.actionButtonText}>Debug Feature Limits</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: accentSuccess }]}
              onPress={handleForceRefresh}
            >
              <Text style={styles.actionButtonText}>Force Refresh Limits</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );

  const renderOverridesView = () => (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentView('user-details')}
        >
          <Ionicons name="arrow-back" size={24} color={accentPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>Active Overrides</Text>
      </View>

      <ScrollView style={styles.content}>
        {activeOverrides.length === 0 ? (
          <View style={styles.noData}>
            <Text style={[styles.noDataText, { color: textSecondary }]}>No active overrides</Text>
          </View>
        ) : (
          activeOverrides.map((override, index) => (
            <View key={index} style={[styles.overrideCard, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
              <Text style={[styles.overrideFeature, { color: textColor }]}>{override.featureId}</Text>
              <Text style={[styles.overrideLimit, { color: textSecondary }]}>
                Limit: {override.currentLimit} (was {override.originalLimit})
              </Text>
              <Text style={[styles.overrideExpiry, { color: textSecondary }]}>
                Expires: {override.expiresAt.toLocaleDateString()}
              </Text>
              <Text style={[styles.overrideReason, { color: textSecondary }]}>
                Reason: {override.reason}
              </Text>
              
              <TouchableOpacity
                style={[styles.revokeButton, { backgroundColor: accentDanger }]}
                onPress={() => handleRevokeOverride(override.id)}
              >
                <Text style={styles.revokeButtonText}>Revoke</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderDebugView = () => (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentView('user-details')}
        >
          <Ionicons name="arrow-back" size={24} color={accentPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>Feature Debug Info</Text>
      </View>

      {debugInfo && (
        <ScrollView style={styles.content}>
          <View style={[styles.debugCard, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
            <Text style={[styles.debugTitle, { color: textColor }]}>Debug Information</Text>
            <Text style={[styles.debugText, { color: textSecondary }]}>
              Debug Info: {JSON.stringify(debugInfo, null, 2)}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );

  const renderPhase2View = () => {
    switch (currentView) {
      case 'real-time':
        return (
          <View style={[styles.container, { backgroundColor }]}>
            <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentView('search')}
              >
                <Ionicons name="arrow-back" size={24} color={accentPrimary} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: textColor }]}>Real-Time Monitoring</Text>
            </View>
            <RealTimeMonitoring onUserSelect={handleUserSelect} />
          </View>
        );
      
      case 'bulk-management':
        return (
          <View style={[styles.container, { backgroundColor }]}>
            <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentView('search')}
              >
                <Ionicons name="arrow-back" size={24} color={accentPrimary} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: textColor }]}>Bulk User Management</Text>
            </View>
            <BulkUserManagement onUserSelect={handleUserSelect} />
          </View>
        );
      
      case 'analytics':
        return (
          <View style={[styles.container, { backgroundColor }]}>
            <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentView('search')}
              >
                <Ionicons name="arrow-back" size={24} color={accentPrimary} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: textColor }]}>Support Analytics</Text>
            </View>
            <SupportAnalytics />
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {currentView === 'search' && renderSearchView()}
      {currentView === 'user-details' && renderUserDetailsView()}
      {currentView === 'overrides' && renderOverridesView()}
      {currentView === 'debug' && renderDebugView()}
      {(currentView === 'real-time' || currentView === 'bulk-management' || currentView === 'analytics') && renderPhase2View()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  searchButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationContainer: {
    padding: 20,
  },
  navigationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  navigationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  navCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  navCardSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userEmail: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  userPlan: {
    fontSize: 16,
    marginBottom: 4,
  },
  userInfo: {
    fontSize: 14,
    marginBottom: 2,
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  featureName: {
    flex: 1,
    fontSize: 16,
  },
  featureUsage: {
    fontSize: 14,
    marginRight: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noData: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noDataText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  overrideCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overrideFeature: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  overrideLimit: {
    fontSize: 14,
    marginBottom: 4,
  },
  overrideExpiry: {
    fontSize: 14,
    marginBottom: 4,
  },
  overrideReason: {
    fontSize: 14,
    marginBottom: 16,
  },
  revokeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  revokeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  debugCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  debugText: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
});
