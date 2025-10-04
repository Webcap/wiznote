import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useRole } from '../hooks/useRole';
import { UserRole } from '../types/User';

export default function RoleManagement() {
  const { user } = useAuth();
  const { 
    role, 
    permissions, 
    isAdmin, 
    isSupport, 
    hasPermission, 
    canAccess,
    assignRole,
    getUsersByRole,
    getRoleStatistics,
    getRoleInfo,
    isLoading,
    error 
  } = useRole();

  const [usersByRole, setUsersByRole] = useState<Array<{ id: string; email: string; displayName?: string }>>([]);
  const [roleStats, setRoleStats] = useState<Record<UserRole, number>>({ admin: 0, support: 0, user: 0 });
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');

  useEffect(() => {
    if (isAdmin) {
      loadRoleData();
    }
  }, [isAdmin]);

  const loadRoleData = async () => {
    try {
      const [users, stats] = await Promise.all([
        getUsersByRole(selectedRole),
        getRoleStatistics()
      ]);
      setUsersByRole(users);
      setRoleStats(stats);
    } catch (err) {
      console.error('Error loading role data:', err);
    }
  };

  const handleAssignRole = async (userId: string, newRole: UserRole) => {
    try {
      await assignRole(userId, newRole, 'Role assignment via admin panel');
      Alert.alert('Success', `Role assigned successfully to ${newRole}`);
      loadRoleData(); // Refresh data
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to assign role');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading role information...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Role Management System</Text>
      
      {/* Current User Role Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Role Information</Text>
        <View style={styles.roleCard}>
          <Text style={styles.roleText}>Current Role: {role?.toUpperCase()}</Text>
          <Text style={styles.emailText}>Email: {user?.email}</Text>
          
          <View style={styles.roleIndicators}>
            <View style={[styles.roleIndicator, isAdmin && styles.adminIndicator]}>
              <Text style={styles.indicatorText}>Admin</Text>
            </View>
            <View style={[styles.roleIndicator, isSupport && styles.supportIndicator]}>
              <Text style={styles.indicatorText}>Support</Text>
            </View>
            <View style={[styles.roleIndicator, role === 'user' && styles.userIndicator]}>
              <Text style={styles.indicatorText}>User</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Permissions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Permissions</Text>
        <View style={styles.permissionsContainer}>
          {permissions && Object.entries(permissions).map(([permission, hasAccess]) => (
            <View key={permission} style={styles.permissionItem}>
              <Text style={styles.permissionText}>
                {permission.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </Text>
              <View style={[styles.permissionIndicator, hasAccess && styles.permissionGranted]}>
                <Text style={styles.permissionStatus}>
                  {hasAccess ? '✓' : '✗'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Role Access Control */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Access Control Test</Text>
        <View style={styles.accessContainer}>
          {(['user', 'support', 'admin'] as UserRole[]).map(testRole => (
            <View key={testRole} style={styles.accessItem}>
              <Text style={styles.accessText}>Can access {testRole} features:</Text>
              <View style={[styles.accessIndicator, canAccess(testRole) && styles.accessGranted]}>
                <Text style={styles.accessStatus}>
                  {canAccess(testRole) ? '✓' : '✗'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Admin Features */}
      {isAdmin && (
        <>
          {/* Role Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Role Statistics</Text>
            <View style={styles.statsContainer}>
              {Object.entries(roleStats).map(([roleName, count]) => (
                <View key={roleName} style={styles.statItem}>
                  <Text style={styles.statRole}>{roleName.toUpperCase()}</Text>
                  <Text style={styles.statCount}>{count}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Role Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Role Management</Text>
            
            {/* Role Selector */}
            <View style={styles.roleSelector}>
              {(['user', 'support', 'admin'] as UserRole[]).map(roleOption => (
                <TouchableOpacity
                  key={roleOption}
                  style={[styles.roleButton, selectedRole === roleOption && styles.selectedRoleButton]}
                  onPress={() => setSelectedRole(roleOption)}
                >
                  <Text style={[styles.roleButtonText, selectedRole === roleOption && styles.selectedRoleButtonText]}>
                    {roleOption.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Users by Role */}
            <Text style={styles.subsectionTitle}>Users with {selectedRole} role:</Text>
            <View style={styles.usersContainer}>
              {usersByRole.map(userItem => (
                <View key={userItem.id} style={styles.userItem}>
                  <Text style={styles.userEmail}>{userItem.email}</Text>
                  <Text style={styles.userName}>{userItem.displayName}</Text>
                  
                  {/* Role Assignment Buttons */}
                  <View style={styles.roleAssignmentButtons}>
                    {(['user', 'support', 'admin'] as UserRole[]).map(assignRole => (
                      <TouchableOpacity
                        key={assignRole}
                        style={[styles.assignButton, assignRole === selectedRole && styles.currentRoleButton]}
                        onPress={() => handleAssignRole(userItem.id, assignRole)}
                        disabled={assignRole === selectedRole}
                      >
                        <Text style={styles.assignButtonText}>
                          {assignRole === selectedRole ? 'Current' : `Make ${assignRole}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Support Features */}
      {isSupport && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support Tools</Text>
          <Text style={styles.supportText}>
            You have access to support tools and can view user data.
          </Text>
        </View>
      )}

      {/* Regular User Features */}
      {role === 'user' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Features</Text>
          <Text style={styles.userText}>
            You have access to standard user features.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#d32f2f',
  },
  roleCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emailText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  roleIndicators: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  roleIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  adminIndicator: {
    backgroundColor: '#ff6b6b',
  },
  supportIndicator: {
    backgroundColor: '#ff8c00',
  },
  userIndicator: {
    backgroundColor: '#3cb371',
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  permissionsContainer: {
    gap: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  permissionText: {
    fontSize: 14,
    color: '#333',
  },
  permissionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionGranted: {
    backgroundColor: '#4caf50',
  },
  permissionStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  accessContainer: {
    gap: 8,
  },
  accessItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  accessText: {
    fontSize: 14,
    color: '#333',
  },
  accessIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessGranted: {
    backgroundColor: '#4caf50',
  },
  accessStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statRole: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  roleSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
  },
  selectedRoleButton: {
    backgroundColor: '#2196f3',
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  selectedRoleButtonText: {
    color: 'white',
  },
  usersContainer: {
    gap: 12,
  },
  userItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  userName: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  roleAssignmentButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 4,
  },
  assignButton: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#2196f3',
    alignItems: 'center',
  },
  currentRoleButton: {
    backgroundColor: '#4caf50',
  },
  assignButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  supportText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  userText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
}); 