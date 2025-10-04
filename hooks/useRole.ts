import { useCallback, useEffect, useState } from 'react';
import { roleService } from '../services/RoleService';
import { UserPermissions, UserRole } from '../types/User';
import { useAuth } from './useAuth';

export interface UseRoleReturn {
  // Current user role info
  role: UserRole | null;
  permissions: UserPermissions | null;
  isAdmin: boolean;
  isSupport: boolean;
  isUser: boolean;
  
  // Role checking functions
  hasPermission: (permission: keyof UserPermissions) => boolean;
  canAccess: (requiredRole: UserRole) => boolean;
  
  // Role management (admin only)
  assignRole: (userId: string, role: UserRole, reason?: string) => Promise<void>;
  getUsersByRole: (role: UserRole) => Promise<Array<{ id: string; email: string; displayName?: string }>>;
  getRoleStatistics: () => Promise<Record<UserRole, number>>;
  
  // Role info
  getRoleInfo: (role: UserRole) => { displayName: string; color: string; icon: string };
  getRoleHierarchy: () => Record<UserRole, number>;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

export function useRole(): UseRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user role and permissions
  const loadUserRole = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userRole = await roleService.getUserRole(userId);
      if (userRole) {
        setRole(userRole.role);
        setPermissions(userRole.permissions);
      } else {
        setRole('user');
        setPermissions(roleService.getDefaultPermissions('user'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user role');
      console.error('useRole: Error loading user role:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load role when user changes
  useEffect(() => {
    if (user?.id) {
      loadUserRole(user.id);
    } else {
      setRole(null);
      setPermissions(null);
      setIsLoading(false);
    }
  }, [user?.id, loadUserRole]);

  // Permission checking
  const hasPermission = useCallback((permission: keyof UserPermissions): boolean => {
    return permissions?.[permission] || false;
  }, [permissions]);

  // Role-based access control
  const canAccess = useCallback((requiredRole: UserRole): boolean => {
    if (!role) return false;
    
    const hierarchy = roleService.getRoleHierarchy();
    const userLevel = hierarchy[role] || 0;
    const requiredLevel = hierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  }, [role]);

  // Role assignment (admin only)
  const assignRole = useCallback(async (userId: string, newRole: UserRole, reason?: string) => {
    if (!user?.id || !hasPermission('canManageUsers')) {
      throw new Error('Insufficient permissions to assign roles');
    }
    
    await roleService.assignRole(userId, newRole, user.id, reason);
    
    // Reload current user's role if they assigned a role to themselves
    if (userId === user.id) {
      await loadUserRole(user.id);
    }
  }, [user?.id, hasPermission, loadUserRole]);

  // Get users by role (admin only)
  const getUsersByRole = useCallback(async (role: UserRole) => {
    if (!hasPermission('canManageUsers')) {
      throw new Error('Insufficient permissions to view users by role');
    }
    
    return await roleService.getUsersByRole(role);
  }, [hasPermission]);

  // Get role statistics (admin only)
  const getRoleStatistics = useCallback(async () => {
    if (!hasPermission('canViewAnalytics')) {
      throw new Error('Insufficient permissions to view role statistics');
    }
    
    return await roleService.getRoleStatistics();
  }, [hasPermission]);

  // Role info utilities
  const getRoleInfo = useCallback((role: UserRole) => {
    return roleService.getRoleInfo(role);
  }, []);

  const getRoleHierarchy = useCallback(() => {
    return roleService.getRoleHierarchy();
  }, []);

  return {
    // Current user role info
    role,
    permissions,
    isAdmin: role === 'admin',
    isSupport: role === 'support',
    isUser: role === 'user',
    
    // Role checking functions
    hasPermission,
    canAccess,
    
    // Role management (admin only)
    assignRole,
    getUsersByRole,
    getRoleStatistics,
    
    // Role info
    getRoleInfo,
    getRoleHierarchy,
    
    // Loading states
    isLoading,
    error,
  };
} 