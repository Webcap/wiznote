import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';

interface BulkUserManagementProps {
  onUserSelect?: (userId: string) => void;
}

interface UserListItem {
  id: string;
  email: string;
  displayName?: string;
  isSelected: boolean;
  plan: string;
  lastActive: Date;
  featureCount: number;
}

export default function BulkUserManagement({ onUserSelect }: BulkUserManagementProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCount, setSelectedCount] = useState(0);
  const [bulkAction, setBulkAction] = useState<'none' | 'upgrade' | 'downgrade' | 'suspend' | 'delete'>('none');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

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

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you'd fetch users from the database
      // For now, we'll create mock data
      const mockUsers: UserListItem[] = [
        {
          id: 'user1',
          email: 'john.doe@example.com',
          displayName: 'John Doe',
          isSelected: false,
          plan: 'Premium',
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          featureCount: 15,
        },
        {
          id: 'user2',
          email: 'jane.smith@example.com',
          displayName: 'Jane Smith',
          isSelected: false,
          plan: 'Free',
          lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          featureCount: 8,
        },
        {
          id: 'user3',
          email: 'bob.wilson@example.com',
          displayName: 'Bob Wilson',
          isSelected: false,
          plan: 'Premium',
          lastActive: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          featureCount: 22,
        },
        {
          id: 'user4',
          email: 'alice.brown@example.com',
          displayName: 'Alice Brown',
          isSelected: false,
          plan: 'Free',
          lastActive: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          featureCount: 3,
        },
        {
          id: 'user5',
          email: 'charlie.davis@example.com',
          displayName: 'Charlie Davis',
          isSelected: false,
          plan: 'Premium',
          lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          featureCount: 18,
        },
      ];

      setUsers(mockUsers);
      setFilteredUsers(mockUsers);
    } catch (error) {
      console.error('BulkUserManagement: Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter users based on search query and show selected only
  useEffect(() => {
    let filtered = users;
    
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    if (showSelectedOnly) {
      filtered = filtered.filter(user => user.isSelected);
    }
    
    setFilteredUsers(filtered);
  }, [users, searchQuery, showSelectedOnly]);

  // Update selected count
  useEffect(() => {
    const count = users.filter(user => user.isSelected).length;
    setSelectedCount(count);
  }, [users]);

  // Initial load
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId 
          ? { ...user, isSelected: !user.isSelected }
          : user
      )
    );
  };

  // Select all users
  const selectAllUsers = () => {
    setUsers(prevUsers => 
      prevUsers.map(user => ({ ...user, isSelected: true }))
    );
  };

  // Deselect all users
  const deselectAllUsers = () => {
    setUsers(prevUsers => 
      prevUsers.map(user => ({ ...user, isSelected: false }))
    );
  };

  // Execute bulk action
  const executeBulkAction = async () => {
    const selectedUsers = users.filter(user => user.isSelected);
    
    if (selectedUsers.length === 0) {
      Alert.alert('No Users Selected', 'Please select users to perform bulk actions');
      return;
    }

    let actionMessage = '';
    let confirmMessage = '';

    switch (bulkAction) {
      case 'upgrade':
        actionMessage = 'Upgrade Users';
        confirmMessage = `Are you sure you want to upgrade ${selectedUsers.length} users to Premium?`;
        break;
      case 'downgrade':
        actionMessage = 'Downgrade Users';
        confirmMessage = `Are you sure you want to downgrade ${selectedUsers.length} users to Free?`;
        break;
      case 'suspend':
        actionMessage = 'Suspend Users';
        confirmMessage = `Are you sure you want to suspend ${selectedUsers.length} users?`;
        break;
      case 'delete':
        actionMessage = 'Delete Users';
        confirmMessage = `Are you sure you want to permanently delete ${selectedUsers.length} users? This action cannot be undone.`;
        break;
      default:
        return;
    }

    Alert.alert(
      actionMessage,
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: bulkAction === 'delete' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              // In a real implementation, you'd perform the bulk action
              console.log(`Executing bulk action: ${bulkAction} for ${selectedUsers.length} users`);
              
              // Simulate API call
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              Alert.alert(
                'Success',
                `Successfully processed ${selectedUsers.length} users`,
                [{ text: 'OK' }]
              );
              
              // Reset selection
              deselectAllUsers();
              setBulkAction('none');
            } catch (error) {
              console.error('BulkUserManagement: Error executing bulk action:', error);
              Alert.alert('Error', 'Failed to execute bulk action');
            }
          },
        },
      ]
    );
  };

  // Get plan color
  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Premium':
        return accentSuccess;
      case 'Free':
        return textSecondary;
      default:
        return accentPrimary;
    }
  };

  // Get last active status
  const getLastActiveStatus = (lastActive: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return { text: 'Just now', color: accentSuccess };
    } else if (diffInHours < 24) {
      return { text: `${Math.floor(diffInHours)}h ago`, color: accentWarning };
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return { text: `${diffInDays}d ago`, color: accentDanger };
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={accentPrimary} />
        <Text style={[styles.loadingText, { color: textSecondary }]}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
        <Text style={[styles.title, { color: textColor }]}>Bulk User Management</Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          {users.length} total users • {selectedCount} selected
        </Text>
      </View>

      {/* Search and Filters */}
      <View style={[styles.searchContainer, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
        <View style={[styles.searchInputContainer, { backgroundColor, borderColor: borderColor }]}>
          <Ionicons name="search" size={20} color={textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search users by email or name..."
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filterContainer}>
          <View style={styles.filterOption}>
            <Text style={[styles.filterLabel, { color: textColor }]}>Show Selected Only</Text>
            <Switch
              value={showSelectedOnly}
              onValueChange={setShowSelectedOnly}
              trackColor={{ false: borderColor, true: accentPrimary }}
              thumbColor="white"
            />
          </View>
        </View>
      </View>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <View style={[styles.bulkActionsContainer, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
          <Text style={[styles.bulkActionsTitle, { color: textColor }]}>Bulk Actions ({selectedCount} users)</Text>
          
          <View style={styles.bulkActionsRow}>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: accentSuccess }]}
              onPress={() => setBulkAction('upgrade')}
            >
              <Ionicons name="arrow-up" size={16} color="white" />
              <Text style={styles.bulkActionButtonText}>Upgrade</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: accentWarning }]}
              onPress={() => setBulkAction('downgrade')}
            >
              <Ionicons name="arrow-down" size={16} color="white" />
              <Text style={styles.bulkActionButtonText}>Downgrade</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: accentWarning }]}
              onPress={() => setBulkAction('suspend')}
            >
              <Ionicons name="pause" size={16} color="white" />
              <Text style={styles.bulkActionButtonText}>Suspend</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: accentDanger }]}
              onPress={() => setBulkAction('delete')}
            >
              <Ionicons name="trash" size={16} color="white" />
              <Text style={styles.bulkActionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>

          {bulkAction !== 'none' && (
            <View style={[styles.bulkActionConfirm, { borderTopColor: borderColor }]}>
              <Text style={[styles.bulkActionConfirmText, { color: textColor }]}>
                Ready to {bulkAction} {selectedCount} users
              </Text>
              <View style={styles.bulkActionConfirmButtons}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: borderColor }]}
                  onPress={() => setBulkAction('none')}
                >
                  <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: getPlanColor(bulkAction === 'upgrade' ? 'Premium' : 'Free') }]}
                  onPress={executeBulkAction}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Selection Controls */}
      <View style={[styles.selectionControls, { backgroundColor: backgroundSecondary }]}>
        <TouchableOpacity
          style={[styles.selectionButton, { backgroundColor: borderColor }]}
          onPress={selectAllUsers}
        >
          <Text style={[styles.selectionButtonText, { color: textColor }]}>Select All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.selectionButton, { backgroundColor: borderColor }]}
          onPress={deselectAllUsers}
        >
          <Text style={[styles.selectionButtonText, { color: textColor }]}>Deselect All</Text>
        </TouchableOpacity>
      </View>

      {/* Users List */}
      <ScrollView style={styles.usersList}>
        {filteredUsers.length === 0 ? (
          <View style={styles.noUsers}>
            <Ionicons name="people-outline" size={48} color={textSecondary} />
            <Text style={[styles.noUsersText, { color: textSecondary }]}>
              {searchQuery ? 'No users found matching your search' : 'No users available'}
            </Text>
          </View>
        ) : (
          filteredUsers.map(user => (
            <View key={user.id} style={[styles.userItem, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
              <View style={styles.userItemLeft}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => toggleUserSelection(user.id)}
                >
                  <Ionicons
                    name={user.isSelected ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={user.isSelected ? accentPrimary : textSecondary}
                  />
                </TouchableOpacity>
                
                <View style={styles.userInfo}>
                  <Text style={[styles.userEmail, { color: textColor }]}>{user.email}</Text>
                  {user.displayName && (
                    <Text style={[styles.userDisplayName, { color: textSecondary }]}>{user.displayName}</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.userItemRight}>
                <View style={styles.userStats}>
                  <View style={[styles.planBadge, { backgroundColor: getPlanColor(user.plan) }]}>
                    <Text style={styles.planText}>{user.plan}</Text>
                  </View>
                  
                  <Text style={[styles.featureCount, { color: textSecondary }]}>
                    {user.featureCount} features
                  </Text>
                  
                  <Text style={[styles.lastActive, { color: getLastActiveStatus(user.lastActive).color }]}>
                    {getLastActiveStatus(user.lastActive).text}
                  </Text>
                </View>
                
                {onUserSelect && (
                  <TouchableOpacity
                    style={[styles.viewUserButton, { backgroundColor: accentPrimary }]}
                    onPress={() => onUserSelect(user.id)}
                  >
                    <Text style={styles.viewUserButtonText}>View</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchContainer: {
    padding: 20,
    borderBottomWidth: 1,
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
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
  },
  bulkActionsContainer: {
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bulkActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  bulkActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  bulkActionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  bulkActionConfirm: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  bulkActionConfirmText: {
    fontSize: 14,
    marginBottom: 12,
  },
  bulkActionConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  selectionControls: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  selectionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  usersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  noUsers: {
    alignItems: 'center',
    padding: 32,
  },
  noUsersText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
  },
  userDisplayName: {
    fontSize: 14,
    marginTop: 2,
  },
  userItemRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  userStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  featureCount: {
    fontSize: 12,
  },
  lastActive: {
    fontSize: 12,
    fontWeight: '500',
  },
  viewUserButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewUserButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});
