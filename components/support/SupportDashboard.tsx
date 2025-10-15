import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { FeatureLimitDebugInfo, LimitOverride, supportService, UserFeatureStatus, UserProfile } from '../../services/SupportService';
import BulkUserManagement from './BulkUserManagement';
import RealTimeMonitoring from './RealTimeMonitoring';
import SupportAnalytics from './SupportAnalytics';
import UserDeletionTool from './UserDeletionTool';
import PremiumManagement from './PremiumManagement';

interface SupportDashboardProps {
  supportAgentId: string;
}

export default function SupportDashboard({ supportAgentId }: SupportDashboardProps) {
  const { showSnackbar } = useSnackbar();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userFeatureStatus, setUserFeatureStatus] = useState<UserFeatureStatus | null>(null);
  const [activeOverrides, setActiveOverrides] = useState<LimitOverride[]>([]);
  const [debugInfo, setDebugInfo] = useState<FeatureLimitDebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'search' | 'user-details' | 'overrides' | 'debug' | 'real-time' | 'bulk-management' | 'analytics' | 'tickets' | 'user-deletion'>('search');
  const [supportTickets, setSupportTickets] = useState<any[]>([]);

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

  const handleUserSelect = async (userId: string) => {
    console.log('SupportDashboard: Selecting user:', userId);
    setLoading(true);
    
    try {
      // First try to search by user ID directly
      const user = await supportService.searchUser(userId);
      
      if (user) {
        console.log('SupportDashboard: User found:', user);
        setSelectedUser(user);
        setCurrentView('user-details');
        
        // Also load the user's feature status
        try {
          const status = await supportService.getUserFeatureStatus(userId);
          setUserFeatureStatus(status);
          console.log('SupportDashboard: User feature status loaded');
        } catch (statusError) {
          console.warn('SupportDashboard: Could not load user feature status:', statusError);
        }
        
        if (Platform.OS === 'web') {
          showSnackbar(`✅ User loaded: ${user.email || user.displayName || userId}`, 'success', 3000);
        }
      } else {
        console.warn('SupportDashboard: No user found for ID:', userId);
        if (Platform.OS === 'web') {
          showSnackbar('User not found', 'error', 4000);
        } else {
          Alert.alert('User Not Found', 'Could not find user details.');
        }
      }
    } catch (error) {
      console.error('SupportDashboard: Error selecting user:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to load user details';
      
      if (Platform.OS === 'web') {
        showSnackbar(`Error: ${errorMsg}`, 'error', 6000);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    console.log('SupportDashboard: Starting search for:', searchQuery);
    setLoading(true);
    try {
      const user = await supportService.searchUser(searchQuery);
      console.log('SupportDashboard: Search result:', user);
      
      if (user) {
        console.log('SupportDashboard: User found, switching to details view');
        setSelectedUser(user);
        setCurrentView('user-details'); // Switch to user details view
        
        if (Platform.OS === 'web') {
          showSnackbar(`✅ User found: ${user.email}`, 'success');
        }
      } else {
        console.log('SupportDashboard: No user found');
        if (Platform.OS === 'web') {
          showSnackbar('No users found matching your search criteria', 'error');
        } else {
          Alert.alert('No Users Found', 'No users found matching your search criteria.');
        }
      }
    } catch (error) {
      console.error('SupportDashboard: Search error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to search for users';
      if (Platform.OS === 'web') {
        showSnackbar(`Search Error: ${errorMsg}`, 'error');
      } else {
        Alert.alert('Search Error', errorMsg);
      }
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

          <TouchableOpacity
            style={[styles.navCard, { backgroundColor: backgroundColor, borderColor: borderColor }]}
            onPress={async () => {
              setLoading(true);
              try {
                const tickets = await supportService.getAllSupportTickets();
                setSupportTickets(tickets);
                setCurrentView('tickets');
              } catch (error) {
                console.error('Error loading tickets:', error);
                Alert.alert('Error', 'Failed to load support tickets');
              } finally {
                setLoading(false);
              }
            }}
          >
            <Ionicons name="mail" size={32} color={accentDanger} />
            <Text style={[styles.navCardTitle, { color: textColor }]}>Support Tickets</Text>
            <Text style={[styles.navCardSubtitle, { color: textSecondary }]}>View all tickets</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navCard, { backgroundColor: backgroundColor, borderColor: borderColor }]}
            onPress={() => setCurrentView('user-deletion')}
          >
            <Ionicons name="trash-bin" size={32} color={accentDanger} />
            <Text style={[styles.navCardTitle, { color: textColor }]}>Account Deletion</Text>
            <Text style={[styles.navCardSubtitle, { color: textSecondary }]}>Process deletion requests</Text>
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

          {/* Premium Management Section */}
          <PremiumManagement
            user={selectedUser}
            supportAgentId={supportAgentId}
            onPremiumUpdated={async () => {
              // Refresh user data after premium changes
              const updatedUser = await supportService.searchUser(selectedUser.email);
              if (updatedUser) {
                setSelectedUser(updatedUser);
              }
            }}
          />

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

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    console.log('Updating ticket:', ticketId, 'to status:', newStatus);
    setUpdatingTicket(ticketId);
    
    try {
      await supportService.updateTicketStatus(
        ticketId,
        newStatus as any,
        {
          assignedTo: supportAgentId,
          resolvedBy: newStatus === 'resolved' ? supportAgentId : undefined,
        }
      );
      
      console.log('Ticket updated successfully, refreshing list...');
      
      // Refresh tickets
      const tickets = await supportService.getAllSupportTickets();
      console.log('Tickets refreshed:', tickets.length);
      setSupportTickets(tickets);
      
      // Show success message
      const message = 'Ticket status updated successfully';
      if (Platform.OS === 'web') {
        showSnackbar(message, 'success', 3000);
      } else {
        Alert.alert('Success', message);
      }
    } catch (error) {
      console.error('Error updating ticket - Full error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', error ? Object.keys(error) : 'null');
      
      const errorMsg = error instanceof Error ? error.message : 'Failed to update ticket status';
      console.error('Error message:', errorMsg);
      
      if (Platform.OS === 'web') {
        showSnackbar(`Error: ${errorMsg}`, 'error', 8000);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setUpdatingTicket(null);
    }
  };

  const renderTicketsView = () => (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentView('search')}
        >
          <Ionicons name="arrow-back" size={24} color={accentPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>Support Tickets ({supportTickets.length})</Text>
      </View>

      <ScrollView style={styles.content}>
        {supportTickets.length === 0 ? (
          <View style={styles.noData}>
            <Ionicons name="mail-outline" size={64} color={textSecondary} />
            <Text style={[styles.noDataText, { color: textSecondary }]}>No support tickets yet</Text>
          </View>
        ) : (
          supportTickets.map((ticket, index) => (
            <View key={index} style={[styles.ticketCard, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
              <View style={styles.ticketHeader}>
                <View style={styles.ticketHeaderLeft}>
                  <View style={[
                    styles.typeBadge,
                    { backgroundColor: ticket.type === 'account_deletion' ? accentDanger : accentPrimary }
                  ]}>
                    <Text style={styles.typeBadgeText}>{ticket.type.toUpperCase()}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { 
                      backgroundColor: 
                        ticket.status === 'resolved' ? accentSuccess :
                        ticket.status === 'in_progress' ? accentWarning :
                        ticket.status === 'pending' ? accentPrimary :
                        textSecondary
                    }
                  ]}>
                    <Text style={styles.statusBadgeText}>{ticket.status.toUpperCase()}</Text>
                  </View>
                  <View style={[
                    styles.priorityBadge,
                    { 
                      backgroundColor: 
                        ticket.priority === 'high' || ticket.priority === 'urgent' ? accentDanger :
                        ticket.priority === 'medium' ? accentWarning :
                        textSecondary
                    }
                  ]}>
                    <Text style={styles.priorityBadgeText}>{ticket.priority.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
              
              <Text style={[styles.ticketSubject, { color: textColor }]}>{ticket.subject}</Text>
              <Text style={[styles.ticketEmail, { color: textSecondary }]}>From: {ticket.userEmail}</Text>
              <Text style={[styles.ticketId, { color: textSecondary }]}>Ticket ID: {ticket.id}</Text>
              
              {ticket.description && (
                <Text style={[styles.ticketDescription, { color: textSecondary }]} numberOfLines={3}>
                  {ticket.description}
                </Text>
              )}
              
              <Text style={[styles.ticketDate, { color: textSecondary }]}>
                Created: {ticket.createdAt.toLocaleString()}
              </Text>

              <View style={styles.ticketActions}>
                {ticket.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.ticketActionButton, { backgroundColor: accentWarning }]}
                    onPress={() => handleUpdateTicketStatus(ticket.id, 'in_progress')}
                    disabled={updatingTicket === ticket.id}
                  >
                    {updatingTicket === ticket.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.ticketActionButtonText}>Start Processing</Text>
                    )}
                  </TouchableOpacity>
                )}
                {ticket.status === 'in_progress' && (
                  <TouchableOpacity
                    style={[styles.ticketActionButton, { backgroundColor: accentSuccess }]}
                    onPress={() => handleUpdateTicketStatus(ticket.id, 'resolved')}
                    disabled={updatingTicket === ticket.id}
                  >
                    {updatingTicket === ticket.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.ticketActionButtonText}>Mark Resolved</Text>
                    )}
                  </TouchableOpacity>
                )}
                {ticket.status !== 'cancelled' && ticket.status !== 'resolved' && (
                  <TouchableOpacity
                    style={[styles.ticketActionButton, { backgroundColor: accentDanger }]}
                    onPress={() => handleUpdateTicketStatus(ticket.id, 'cancelled')}
                    disabled={updatingTicket === ticket.id}
                  >
                    {updatingTicket === ticket.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.ticketActionButtonText}>Cancel</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
      
      case 'tickets':
        return renderTicketsView();
      
      case 'user-deletion':
        return (
          <View style={[styles.container, { backgroundColor }]}>
            <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentView('search')}
              >
                <Ionicons name="arrow-back" size={24} color={accentPrimary} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: textColor }]}>Account Deletion Requests</Text>
            </View>
            <UserDeletionTool supportAgentId={supportAgentId} />
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
      {(currentView === 'real-time' || currentView === 'bulk-management' || currentView === 'analytics' || currentView === 'tickets' || currentView === 'user-deletion') && renderPhase2View()}
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
  ticketCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketHeaderLeft: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  ticketSubject: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  ticketEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  ticketId: {
    fontSize: 12,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  ticketDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  ticketDate: {
    fontSize: 12,
    marginBottom: 12,
  },
  ticketActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  ticketActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  ticketActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
