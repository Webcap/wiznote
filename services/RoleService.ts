import { supabase } from '../lib/supabase';
import {
    UserPermissions,
    UserPreferences,
    UserRole,
    getDefaultPermissions,
    getDefaultRolePreferences,
    getRoleColor,
    getRoleDisplayName,
    getRoleIcon
} from '../types/User';

export interface RoleAssignment {
  userId: string;
  role: UserRole;
  assignedBy?: string;
  assignedAt: Date;
  reason?: string;
}

export interface RoleChangeLog {
  id: string;
  userId: string;
  oldRole: UserRole;
  newRole: UserRole;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

export class RoleService {
  private errorHandler?: (error: string, type: 'error' | 'warning' | 'info') => void;

  constructor() {}

  setErrorHandler(handler: (error: string, type: 'error' | 'warning' | 'info') => void) {
    this.errorHandler = handler;
  }

  private handleError(error: unknown, context: string) {
    const errorMessage = error instanceof Error ? error.message : `Unknown error in ${context}`;
    console.error(`RoleService: ${context} error:`, error);
    this.errorHandler?.(errorMessage, 'error');
    throw new Error(errorMessage);
  }

  /**
   * Determine user role based on email domain
   */
  determineUserRole(email: string): UserRole {
    if (!email) return 'user';
    
    const domain = email.toLowerCase().split('@')[1];
    console.log('RoleService: Checking domain for role assignment:', domain);
    
    // WizNote domain assignments
    if (domain === 'wiznote.app') {
      console.log('RoleService: WizNote domain detected - assigning admin role');
      return 'admin';
    }
    
    if (domain === 'support.wiznote.app' || domain === 'help.wiznote.app') {
      console.log('RoleService: Support domain detected - assigning support role');
      return 'support';
    }
    
    // You can add more domain-based role assignments here
    // if (domain === 'partner.wiznote.app') return 'support';
    // if (domain === 'dev.wiznote.app') return 'admin';
    
    console.log('RoleService: Standard domain - assigning user role');
    return 'user';
  }

  /**
   * Force assign a role to a user (admin only)
   * This bypasses domain-based role assignment
   */
  async forceAssignRole(userId: string, newRole: UserRole, assignedBy: string, reason?: string): Promise<void> {
    try {
      console.log(`RoleService: Force assigning role '${newRole}' to user ${userId}`);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Log the role change
      await this.logRoleChange(userId, 'user', newRole, assignedBy, reason || 'Force role assignment');

      console.log(`RoleService: Successfully force assigned role '${newRole}' to user ${userId}`);
    } catch (error) {
      this.handleError(error, 'Force Assign Role');
    }
  }

  /**
   * Get default permissions for a role
   */
  getDefaultPermissions(role: UserRole): UserPermissions {
    return getDefaultPermissions(role);
  }

  /**
   * Get default preferences for a role
   */
  getDefaultRolePreferences(role: UserRole) {
    return getDefaultRolePreferences(role);
  }

  /**
   * Get role display information
   */
  getRoleInfo(role: UserRole) {
    return {
      displayName: getRoleDisplayName(role),
      color: getRoleColor(role),
      icon: getRoleIcon(role),
    };
  }

  /**
   * Assign a role to a user
   */
  async assignRole(userId: string, role: UserRole, assignedBy?: string, reason?: string): Promise<void> {
    try {
      console.log(`RoleService: Assigning role '${role}' to user ${userId}`);

      // Get current user profile
      const { data: currentProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const oldRole = currentProfile?.role || 'user';

      // Update user profile with new role and permissions
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          role: role,
          permissions: getDefaultPermissions(role),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // Log the role change
      await this.logRoleChange(userId, oldRole, role, assignedBy || 'system', reason);

      console.log(`RoleService: Successfully assigned role '${role}' to user ${userId}`);
    } catch (error) {
      this.handleError(error, 'Assign Role');
    }
  }

  /**
   * Update user role based on email domain
   */
  async updateRoleByDomain(userId: string, email: string): Promise<boolean> {
    try {
      const expectedRole = this.determineUserRole(email);
      
      // Get current user profile
      const { data: currentProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const currentRole = currentProfile?.role || 'user';

      // Only update if role has changed
      if (currentRole !== expectedRole) {
        console.log(`RoleService: Updating user role from '${currentRole}' to '${expectedRole}' based on domain`);
        await this.assignRole(userId, expectedRole, 'system', 'Domain-based role assignment');
        return true;
      }

      return false;
    } catch (error) {
      this.handleError(error, 'Update Role By Domain');
      return false;
    }
  }

  /**
   * Get user role and permissions
   */
  async getUserRole(userId: string): Promise<{ role: UserRole; permissions: UserPermissions } | null> {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, permissions')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return {
        role: profile.role as UserRole,
        permissions: profile.permissions || getDefaultPermissions(profile.role as UserRole),
      };
    } catch (error) {
      this.handleError(error, 'Get User Role');
      return null;
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: string, permission: keyof UserPermissions): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);
      if (!userRole) return false;

      return userRole.permissions[permission] || false;
    } catch (error) {
      this.handleError(error, 'Check Permission');
      return false;
    }
  }

  /**
   * Check if user has admin role
   */
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);
      return userRole?.role === 'admin';
    } catch (error) {
      this.handleError(error, 'Check Admin Role');
      return false;
    }
  }

  /**
   * Check if user has support role
   */
  async isSupport(userId: string): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);
      return userRole?.role === 'support';
    } catch (error) {
      this.handleError(error, 'Check Support Role');
      return false;
    }
  }

  /**
   * Get all users with a specific role
   */
  async getUsersByRole(role: UserRole): Promise<Array<{ id: string; email: string; displayName?: string }>> {
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('id, display_name')
        .eq('role', role);

      if (error) {
        throw error;
      }

      // Get user emails from auth.users
      const userIds = profiles?.map(p => p.id) || [];
      const users: Array<{ id: string; email: string; displayName?: string }> = [];

      for (const profile of profiles || []) {
        const { data: user } = await supabase.auth.admin.getUserById(profile.id);
        if (user.user) {
          users.push({
            id: profile.id,
            email: user.user.email || '',
            displayName: profile.display_name,
          });
        }
      }

      return users;
    } catch (error) {
      this.handleError(error, 'Get Users By Role');
      return [];
    }
  }

  /**
   * Get role statistics
   */
  async getRoleStatistics(): Promise<Record<UserRole, number>> {
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('role');

      if (error) {
        throw error;
      }

      const stats: Record<UserRole, number> = {
        admin: 0,
        support: 0,
        user: 0,
      };

      profiles?.forEach(profile => {
        const role = profile.role as UserRole;
        if (role in stats) {
          stats[role]++;
        }
      });

      return stats;
    } catch (error) {
      this.handleError(error, 'Get Role Statistics');
      return { admin: 0, support: 0, user: 0 };
    }
  }

  /**
   * Log role changes for audit trail
   */
  private async logRoleChange(
    userId: string, 
    oldRole: UserRole, 
    newRole: UserRole, 
    changedBy: string, 
    reason?: string
  ): Promise<void> {
    try {
      // Create role_change_logs table if it doesn't exist
      // This would be part of your database schema
      const roleChangeLog: Omit<RoleChangeLog, 'id'> = {
        userId,
        oldRole,
        newRole,
        changedBy,
        changedAt: new Date(),
        reason,
      };

      // Note: You'll need to create the role_change_logs table in your schema
      // For now, we'll just log to console
      console.log('RoleService: Role change logged:', roleChangeLog);
    } catch (error) {
      console.error('RoleService: Error logging role change:', error);
      // Don't throw error for logging failures
    }
  }

  /**
   * Validate role assignment
   */
  validateRoleAssignment(userId: string, newRole: UserRole, assignedBy?: string): boolean {
    // Add validation logic here
    // For example, only admins can assign admin roles
    // Or prevent role escalation without proper authorization
    
    if (newRole === 'admin' && assignedBy) {
      // Check if the person assigning the role is an admin
      // This would require checking the assignedBy user's role
      return true; // Simplified for now
    }

    return true;
  }

  /**
   * Get role hierarchy
   */
  getRoleHierarchy(): Record<UserRole, number> {
    return {
      admin: 3,
      support: 2,
      user: 1,
    };
  }

  /**
   * Check if role can be assigned by current user
   */
  canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
    const hierarchy = this.getRoleHierarchy();
    const assignerLevel = hierarchy[assignerRole] || 0;
    const targetLevel = hierarchy[targetRole] || 0;

    // Can only assign roles at or below your own level
    return assignerLevel >= targetLevel;
  }
}

// Export singleton instance
export const roleService = new RoleService(); 