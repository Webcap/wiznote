import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { RoleBadge } from '../components/RoleBadge';
import { ThemedText } from '../components/ThemedText';
import { AdminSidebar } from '../components/web/AdminSidebar';
import { WebLayout } from '../components/web/WebLayout';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { simpleUsageService } from '../services/SimpleUsageService';
import { subscriptionManagementService } from '../services/SubscriptionManagementService';
import { User, UserRole } from '../types/User';

interface UserWithStats extends User {
  usageStats?: {
    totalUsage: number;
    featuresUsed: number;
    lastActive: Date;
  };
  subscriptionStatus?: {
    isActive: boolean;
    planType: string;
    nextBilling: Date;
  };
  isBanned?: boolean;
}

interface BulkAction {
  type: 'role' | 'ban' | 'unban' | 'resetUsage' | 'delete';
  label: string;
  icon: string;
  color: string;
}

export default function UserManagementScreen() {
  const { user, isAdmin, isAuthenticated, isLoading, getAllUsers, updateUserRole } = useAuth();
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  
  // State management
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithStats[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'banned'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'createdAt' | 'lastLogin'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Loading states
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  
  // UI states
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'table'>('list');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Theme colors
  const iconColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#F5F6FA', dark: '#282828' }, 'backgroundSecondary');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#333333' }, 'backgroundTertiary');
  const inputBg = useThemeColor({ light: '#F5F6FA', dark: '#282828' }, 'backgroundSecondary');
  const inputText = useThemeColor({}, 'text');

  // Available features for usage reset
  const availableFeatures = [
    { id: 'ai_summaries', name: 'AI Summaries', description: 'Reset AI summaries usage' },
    { id: 'ai_key_details', name: 'AI Key Details', description: 'Reset AI key details usage' },
    { id: 'ai_name_generation', name: 'AI Name Generation', description: 'Reset AI name generation usage' },
  ];

  // Bulk actions configuration
  const bulkActions: BulkAction[] = [
    { type: 'role', label: 'Change Role', icon: 'shield', color: '#6A5ACD' },
    { type: 'ban', label: 'Ban Users', icon: 'ban', color: '#DC3545' },
    { type: 'unban', label: 'Unban Users', icon: 'checkmark-circle', color: '#28A745' },
    { type: 'resetUsage', label: 'Reset Usage', icon: 'refresh', color: '#FFC107' },
    { type: 'delete', label: 'Delete Users', icon: 'trash', color: '#DC3545' },
  ];

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin())) {
      console.log('UserManagement: User not admin, redirecting...');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, isAdmin, router]);

  // Fetch users with enhanced data
  const fetchUsers = useCallback(async () => {
    if (!isAdmin()) return;

    try {
      setIsLoadingUsers(true);
      console.log('UserManagement: Fetching users...');
      
      const allUsers = await getAllUsers();
      
      // Enhance users with additional stats
      const enhancedUsers: UserWithStats[] = await Promise.all(
        allUsers.map(async (user) => {
          try {
            // Get usage stats
            const usageData = await simpleUsageService.getAllUsage(user.id);
            const totalUsage = Object.values(usageData).reduce((sum: number, feature: any) => 
              sum + (feature?.currentUsage || 0), 0);
            const featuresUsed = Object.values(usageData).filter((feature: any) => 
              feature?.currentUsage > 0).length;

            return {
              ...user,
              usageStats: {
                totalUsage,
                featuresUsed,
                lastActive: user.lastLoginAt || user.createdAt,
              },
              subscriptionStatus: {
                isActive: user.premium?.isActive || false,
                planType: user.premium?.type || 'Free',
                nextBilling: user.premium?.currentPeriodEnd ? new Date(user.premium.currentPeriodEnd) : new Date(),
              }
            };
          } catch (error) {
            console.warn(`Failed to get stats for user ${user.id}:`, error);
            return user;
          }
        })
      );

      setUsers(enhancedUsers);
      setFilteredUsers(enhancedUsers);
      
      console.log('UserManagement: Fetched users:', enhancedUsers.length);
    } catch (error) {
      console.error('UserManagement: Error fetching users:', error);
      showSnackbar('Failed to load users', 'error', 6000);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isAdmin, getAllUsers, showSnackbar]);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter and sort users
  const processedUsers = useMemo(() => {
    let filtered = users;
    
    // Apply filters
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        switch (statusFilter) {
          case 'active':
            return user.usageStats?.lastActive && 
                   new Date().getTime() - user.usageStats.lastActive.getTime() < 30 * 24 * 60 * 60 * 1000;
          case 'inactive':
            return !user.usageStats?.lastActive || 
                   new Date().getTime() - user.usageStats.lastActive.getTime() >= 30 * 24 * 60 * 60 * 1000;
          case 'banned':
            return user.isBanned;
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.displayName || '';
          bValue = b.displayName || '';
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'lastLogin':
          aValue = a.lastLoginAt || a.createdAt;
          bValue = b.lastLoginAt || b.createdAt;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [users, searchQuery, roleFilter, statusFilter, sortBy, sortOrder]);

  // Update filtered users when processed users change
  useEffect(() => {
    setFilteredUsers(processedUsers);
  }, [processedUsers]);

  // Bulk action handlers
  const handleBulkAction = useCallback(async (action: BulkAction['type']) => {
    if (selectedUsers.size === 0) {
      showSnackbar('No users selected', 'warning', 3000);
      return;
    }

    const selectedUserIds = Array.from(selectedUsers);
    
    try {
      setIsPerformingAction(true);
      
      switch (action) {
        case 'role':
          // Show role selection modal
          showSnackbar('Role change modal would open here', 'info', 3000);
          break;
          
        case 'ban':
          if (Platform.OS === 'web') {
            const confirmed = confirm(`Ban ${selectedUsers.size} selected users?`);
            if (!confirmed) return;
          }
          // Implement ban logic
          showSnackbar(`Banned ${selectedUsers.size} users`, 'success', 3000);
          break;
          
        case 'unban':
          // Implement unban logic
          showSnackbar(`Unbanned ${selectedUsers.size} users`, 'success', 3000);
          break;
          
        case 'resetUsage':
          // Implement usage reset logic
          showSnackbar(`Reset usage for ${selectedUsers.size} users`, 'success', 3000);
          break;
          
        case 'delete':
          if (Platform.OS === 'web') {
            const confirmed = confirm(`Permanently delete ${selectedUsers.size} selected users? This action cannot be undone.`);
            if (!confirmed) return;
          }
          // Implement delete logic
          showSnackbar(`Deleted ${selectedUsers.size} users`, 'success', 3000);
          break;
      }
      
      // Clear selection after action
      setSelectedUsers(new Set());
      setShowBulkActions(false);
      
    } catch (error) {
      console.error('Error performing bulk action:', error);
      showSnackbar('Failed to perform bulk action', 'error', 6000);
    } finally {
      setIsPerformingAction(false);
    }
  }, [selectedUsers, showSnackbar]);

  // Individual action handlers
  const handleRoleUpdate = useCallback(async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
      
      showSnackbar(`User role updated to ${newRole}`, 'success', 4000);
    } catch (error) {
      console.error('Error updating user role:', error);
      showSnackbar('Failed to update user role', 'error', 6000);
    }
  }, [updateUserRole, showSnackbar]);

  const handleResetUsage = useCallback(async (userId: string, featureId: string, featureName: string) => {
    try {
      await simpleUsageService.resetUsage(userId, featureId);
      
      if (selectedUser?.id === userId) {
        // Refresh user data
        const updatedUser = users.find(u => u.id === userId);
        if (updatedUser) setSelectedUser(updatedUser);
      }
      
      showSnackbar(`Reset ${featureName} usage successfully`, 'success', 4000);
    } catch (error) {
      console.error('Error resetting usage:', error);
      showSnackbar(`Failed to reset ${featureName} usage`, 'error', 6000);
    }
  }, [simpleUsageService, selectedUser, users, showSnackbar]);

  const handleResetAllUsage = useCallback(async (userId: string) => {
    try {
      await simpleUsageService.resetAllUsage(userId);
      
      if (selectedUser?.id === userId) {
        const updatedUser = users.find(u => u.id === userId);
        if (updatedUser) setSelectedUser(updatedUser);
      }
      
      showSnackbar('Reset all usage successfully', 'success', 4000);
    } catch (error) {
      console.error('Error resetting all usage:', error);
      showSnackbar('Failed to reset all usage', 'error', 6000);
    }
  }, [simpleUsageService, selectedUser, users, showSnackbar]);

  const handleCancelSubscription = useCallback(async (userId: string) => {
    try {
      const result = await subscriptionManagementService.cancelSubscription(userId);
      
      if (result.success) {
        showSnackbar('Subscription cancelled successfully', 'success', 4000);
        fetchUsers(); // Refresh to get updated subscription status
      } else {
        showSnackbar(result.message || 'Failed to cancel subscription', 'error', 6000);
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      showSnackbar('Failed to cancel subscription', 'error', 6000);
    }
  }, [subscriptionManagementService, showSnackbar, fetchUsers]);

  // Selection handlers
  const handleUserSelect = useCallback((user: UserWithStats) => {
    setSelectedUser(selectedUser?.id === user.id ? null : user);
  }, [selectedUser]);

  const handleUserSelection = useCallback((userId: string, selected: boolean) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  }, [selectedUsers.size, filteredUsers]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => 
      u.usageStats?.lastActive && 
      new Date().getTime() - u.usageStats.lastActive.getTime() < 30 * 24 * 60 * 60 * 1000
    ).length;
    const premium = users.filter(u => u.subscriptionStatus?.isActive).length;
    const banned = users.filter(u => u.isBanned).length;
    
    return { total, active, premium, banned };
  }, [users]);

  // Loading state
  if (isLoading || isLoadingUsers) {
    return (
      <WebLayout
        sidebar={<AdminSidebar activePage="users" />}
        header={
          <View style={styles.webHeader}>
            <ThemedText type="title">User Management</ThemedText>
            <ThemedText style={styles.webLoadingText}>
              {isLoading ? 'Loading...' : 'Fetching users...'}
            </ThemedText>
          </View>
        }
      >
        <View style={styles.webLoadingContainer}>
          <ThemedText style={styles.webLoadingText}>
            {isLoading ? 'Loading user management...' : 'Fetching users...'}
          </ThemedText>
        </View>
      </WebLayout>
    );
  }

  if (!isAuthenticated || !isAdmin()) {
    return null;
  }

  return (
    <WebLayout
      sidebar={<AdminSidebar activePage="users" />}
      header={
        <View style={styles.webHeader}>
          <ThemedText type="title">User Management</ThemedText>
          <View style={styles.webHeaderRight}>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={fetchUsers}
              disabled={isLoadingUsers}
            >
              <Ionicons 
                name="refresh" 
                size={20} 
                color={isLoadingUsers ? '#999' : iconColor} 
              />
            </TouchableOpacity>
            <ThemedText style={styles.webHeaderSubtitle}>
              {filteredUsers.length} of {users.length} users
            </ThemedText>
          </View>
        </View>
      }
    >
      <ScrollView style={styles.webContent}>
        {/* Enhanced Statistics */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>User Statistics</ThemedText>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <ThemedText style={styles.statNumber}>{stats.total}</ThemedText>
              <ThemedText style={styles.statLabel}>Total Users</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <ThemedText style={styles.statNumber}>{stats.active}</ThemedText>
              <ThemedText style={styles.statLabel}>Active (30d)</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <ThemedText style={styles.statNumber}>{stats.premium}</ThemedText>
              <ThemedText style={styles.statLabel}>Premium</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <ThemedText style={styles.statNumber}>{stats.banned}</ThemedText>
              <ThemedText style={styles.statLabel}>Banned</ThemedText>
            </View>
          </View>
        </View>

        {/* Enhanced Filters and Controls */}
        <View style={styles.section}>
          <View style={styles.filtersHeader}>
            <ThemedText style={styles.sectionTitle}>Filters & Controls</ThemedText>
            <View style={styles.viewControls}>
              <TouchableOpacity
                style={[styles.viewButton, viewMode === 'list' && styles.activeViewButton]}
                onPress={() => setViewMode('list')}
              >
                <Ionicons name="list" size={16} color={viewMode === 'list' ? '#fff' : iconColor} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewButton, viewMode === 'grid' && styles.activeViewButton]}
                onPress={() => setViewMode('grid')}
              >
                <Ionicons name="grid" size={16} color={viewMode === 'grid' ? '#fff' : iconColor} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewButton, viewMode === 'table' && styles.activeViewButton]}
                onPress={() => setViewMode('table')}
              >
                <Ionicons name="tablet-portrait" size={16} color={viewMode === 'table' ? iconColor : iconColor} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.filtersContainer}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={iconColor} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { backgroundColor: inputBg, color: inputText }]}
                placeholder="Search users by name or email..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            
            <View style={styles.filtersRow}>
              <View style={styles.filterGroup}>
                <ThemedText style={styles.filterLabel}>Role:</ThemedText>
                <View style={styles.filterButtons}>
                  {(['all', 'admin', 'support', 'user'] as const).map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.filterButton,
                        roleFilter === role && styles.activeFilterButton
                      ]}
                      onPress={() => setRoleFilter(role)}
                    >
                      <ThemedText style={[
                        styles.filterButtonText,
                        roleFilter === role && styles.activeFilterButtonText
                      ]}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.filterGroup}>
                <ThemedText style={styles.filterLabel}>Status:</ThemedText>
                <View style={styles.filterButtons}>
                  {(['all', 'active', 'inactive', 'banned'] as const).map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterButton,
                        statusFilter === status && styles.activeFilterButton
                      ]}
                      onPress={() => setStatusFilter(status)}
                    >
                      <ThemedText style={[
                        styles.filterButtonText,
                        statusFilter === status && styles.activeFilterButtonText
                      ]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            
            <View style={styles.sortContainer}>
              <ThemedText style={styles.filterLabel}>Sort by:</ThemedText>
              <View style={styles.sortControls}>
                <TouchableOpacity
                  style={styles.sortSelect}
                  onPress={() => {
                    // Toggle sort options
                    setSortBy(sortBy === 'createdAt' ? 'lastLogin' : 'createdAt');
                  }}
                >
                  <ThemedText style={styles.sortSelectText}>
                    {sortBy === 'createdAt' ? 'Created Date' : 
                     sortBy === 'lastLogin' ? 'Last Login' : 
                     sortBy === 'name' ? 'Name' : 
                     sortBy === 'email' ? 'Email' : 'Role'}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={16} color={iconColor} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.sortOrderButton}
                  onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <Ionicons 
                    name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                    size={16} 
                    color={iconColor} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <View style={styles.section}>
            <View style={styles.bulkActionsHeader}>
              <ThemedText style={styles.sectionTitle}>
                Bulk Actions ({selectedUsers.size} selected)
              </ThemedText>
              <TouchableOpacity
                style={styles.clearSelectionButton}
                onPress={() => setSelectedUsers(new Set())}
              >
                <ThemedText style={styles.clearSelectionText}>Clear Selection</ThemedText>
              </TouchableOpacity>
            </View>
            
            <View style={styles.bulkActionsGrid}>
              {bulkActions.map(action => (
                <TouchableOpacity
                  key={action.type}
                  style={[styles.bulkActionButton, { backgroundColor: action.color }]}
                  onPress={() => handleBulkAction(action.type)}
                  disabled={isPerformingAction}
                >
                  <Ionicons name={action.icon as any} size={20} color="#FFFFFF" />
                  <ThemedText style={styles.bulkActionText}>{action.label}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Users List */}
        <View style={styles.section}>
          <View style={styles.usersHeader}>
            <ThemedText style={styles.sectionTitle}>Users</ThemedText>
            <View style={styles.usersControls}>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={handleSelectAll}
              >
                <ThemedText style={styles.selectAllText}>
                  {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                </ThemedText>
              </TouchableOpacity>
              
              {selectedUsers.size > 0 && (
                <TouchableOpacity
                  style={styles.bulkActionsToggle}
                  onPress={() => setShowBulkActions(!showBulkActions)}
                >
                  <ThemedText style={styles.bulkActionsToggleText}>
                    {showBulkActions ? 'Hide' : 'Show'} Bulk Actions
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <View style={styles.usersList}>
            {filteredUsers.map(user => (
              <View
                key={user.id}
                style={[
                  styles.userCard,
                  { backgroundColor: cardBg },
                  selectedUser?.id === user.id && styles.selectedUserCard
                ]}
              >
                {/* User Header with Selection */}
                <View style={styles.userHeader}>
                  <TouchableOpacity
                    style={styles.userSelectionCheckbox}
                    onPress={() => handleUserSelection(user.id, !selectedUsers.has(user.id))}
                  >
                    <Ionicons 
                      name={selectedUsers.has(user.id) ? 'checkbox' : 'square-outline'} 
                      size={20} 
                      color={selectedUsers.has(user.id) ? '#6A5ACD' : iconColor} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.userInfo}
                    onPress={() => handleUserSelect(user)}
                  >
                    <View style={styles.userAvatar}>
                      <Ionicons name="person" size={24} color={iconColor} />
                    </View>
                    <View style={styles.userDetails}>
                      <ThemedText style={styles.userName}>
                        {user.displayName || 'No Name'}
                      </ThemedText>
                      <ThemedText style={styles.userEmail}>{user.email}</ThemedText>
                      <View style={styles.userMeta}>
                        <ThemedText style={styles.userMetaText}>
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </ThemedText>
                        <ThemedText style={styles.userMetaText}>
                          Last active: {user.usageStats?.lastActive ? 
                            new Date(user.usageStats.lastActive).toLocaleDateString() : 'Never'}
                        </ThemedText>
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.userStatus}>
                    <RoleBadge role={user.role} size="small" />
                    {user.subscriptionStatus?.isActive && (
                      <View style={styles.premiumBadge}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <ThemedText style={styles.premiumText}>Premium</ThemedText>
                      </View>
                    )}
                  </View>
                </View>
                
                {/* User Actions (shown when selected) */}
                {selectedUser?.id === user.id && (
                  <View style={styles.userActions}>
                    {/* Quick Actions */}
                    <View style={styles.quickActions}>
                      <ThemedText style={styles.actionsTitle}>Quick Actions:</ThemedText>
                      <View style={styles.quickActionsRow}>
                        <TouchableOpacity
                          style={[styles.quickActionButton, { backgroundColor: '#6A5ACD' }]}
                          onPress={() => handleResetAllUsage(user.id)}
                        >
                          <Ionicons name="refresh" size={16} color="#FFFFFF" />
                          <ThemedText style={styles.quickActionText}>Reset All Usage</ThemedText>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.quickActionButton, { backgroundColor: '#DC3545' }]}
                          onPress={() => handleCancelSubscription(user.id)}
                        >
                          <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                          <ThemedText style={styles.quickActionText}>Cancel Subscription</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {/* Role Management */}
                    <View style={styles.roleSection}>
                      <ThemedText style={styles.actionsTitle}>Change Role:</ThemedText>
                      <View style={styles.roleButtons}>
                        {(['user', 'support', 'admin'] as UserRole[]).map(role => (
                          <TouchableOpacity
                            key={role}
                            style={[
                              styles.roleButton,
                              user.role === role && styles.currentRoleButton
                            ]}
                            onPress={() => handleRoleUpdate(user.id, role)}
                          >
                            <ThemedText style={[
                              styles.roleButtonText,
                              user.role === role && styles.currentRoleButtonText
                            ]}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    
                    {/* Usage Management */}
                    <View style={styles.usageSection}>
                      <ThemedText style={styles.actionsTitle}>Usage Management:</ThemedText>
                      <View style={styles.usageStats}>
                        <View style={styles.usageStat}>
                          <ThemedText style={styles.usageStatLabel}>Total Usage:</ThemedText>
                          <ThemedText style={styles.usageStatValue}>
                            {user.usageStats?.totalUsage || 0}
                          </ThemedText>
                        </View>
                        <View style={styles.usageStat}>
                          <ThemedText style={styles.usageStatLabel}>Features Used:</ThemedText>
                          <ThemedText style={styles.usageStatValue}>
                            {user.usageStats?.featuresUsed || 0}
                          </ThemedText>
                        </View>
                      </View>
                      
                      <View style={styles.featureResetButtons}>
                        {availableFeatures.map(feature => (
                          <TouchableOpacity
                            key={feature.id}
                            style={styles.resetFeatureButton}
                            onPress={() => handleResetUsage(user.id, feature.id, feature.name)}
                          >
                            <ThemedText style={styles.resetFeatureButtonText}>
                              Reset {feature.name}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ))}
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 120,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  
  // Filters and Controls
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewControls: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  activeViewButton: {
    backgroundColor: '#6A5ACD',
    borderColor: '#6A5ACD',
  },
  filtersContainer: {
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 24,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  activeFilterButton: {
    backgroundColor: '#6A5ACD',
    borderColor: '#6A5ACD',
  },
  filterButtonText: {
    fontSize: 14,
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortControls: {
    flexDirection: 'row',
    gap: 8,
  },
  sortSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sortSelectText: {
    fontSize: 14,
  },
  sortOrderButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  
  // Bulk Actions
  bulkActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearSelectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  clearSelectionText: {
    fontSize: 14,
    color: '#666',
  },
  bulkActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 140,
  },
  bulkActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Users List
  usersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  usersControls: {
    flexDirection: 'row',
    gap: 12,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectAllText: {
    fontSize: 14,
    color: '#6A5ACD',
  },
  bulkActionsToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#6A5ACD',
  },
  bulkActionsToggleText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectedUserCard: {
    borderColor: '#6A5ACD',
    borderWidth: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userSelectionCheckbox: {
    padding: 4,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  userMetaText: {
    fontSize: 12,
    opacity: 0.5,
  },
  userStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  premiumText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  
  // User Actions
  userActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 16,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  
  // Quick Actions
  quickActions: {
    gap: 8,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Role Management
  roleSection: {
    gap: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  currentRoleButton: {
    backgroundColor: '#6A5ACD',
    borderColor: '#6A5ACD',
  },
  roleButtonText: {
    fontSize: 12,
  },
  currentRoleButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Usage Management
  usageSection: {
    gap: 8,
  },
  usageStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  usageStat: {
    flexDirection: 'row',
    gap: 8,
  },
  usageStatLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  usageStatValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  featureResetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resetFeatureButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#F5F6FA',
  },
  resetFeatureButtonText: {
    fontSize: 12,
    color: '#333',
  },
}); 