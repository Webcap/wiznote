export type UserRole = 'admin' | 'user' | 'support';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: Date;
  lastLoginAt: Date;
  preferences: UserPreferences;
  premium?: {
    isActive: boolean;
    planId: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    trialStart?: Date;
    trialEnd?: Date;
    status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
    type?: 'yearly' | 'weekly' | 'monthly' | null;
    renewedAt?: Date;
    expiresAt?: Date;
    updatedAt?: Date;
  };
  // Role-specific permissions and settings
  permissions?: UserPermissions;
  // Support-specific fields
  supportInfo?: SupportInfo;
}

export interface UserPermissions {
  canManageUsers: boolean;
  canAccessAdminPanel: boolean;
  canViewAnalytics: boolean;
  canManageContent: boolean;
  canAccessSupportTools: boolean;
  canViewUserData: boolean;
  canManageSystemSettings: boolean;
}

export interface SupportInfo {
  assignedTickets: string[];
  supportLevel: 'tier1' | 'tier2' | 'tier3';
  specializations: string[];
  availability: {
    isAvailable: boolean;
    schedule?: {
      startTime: string;
      endTime: string;
      timezone: string;
    };
  };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  autoSync: boolean;
  notifications: boolean;
  autoKeyDetails: boolean;
  autoAISummaries: boolean;
  // Role-specific preferences
  adminPreferences?: AdminPreferences;
  supportPreferences?: SupportPreferences;
}

export interface AdminPreferences {
  dashboardLayout: 'compact' | 'detailed';
  defaultView: 'users' | 'analytics' | 'content' | 'system';
  notifications: {
    newUserSignup: boolean;
    systemAlerts: boolean;
    contentModeration: boolean;
    supportEscalations: boolean;
  };
}

export interface SupportPreferences {
  ticketQueueView: 'all' | 'assigned' | 'unassigned';
  autoAssignTickets: boolean;
  notificationSettings: {
    newTickets: boolean;
    ticketUpdates: boolean;
    escalations: boolean;
  };
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  displayName?: string;
  role?: UserRole;
}

// Role-based utility functions
export const getDefaultPermissions = (role: UserRole): UserPermissions => {
  switch (role) {
    case 'admin':
      return {
        canManageUsers: true,
        canAccessAdminPanel: true,
        canViewAnalytics: true,
        canManageContent: true,
        canAccessSupportTools: true,
        canViewUserData: true,
        canManageSystemSettings: true,
      };
    case 'support':
      return {
        canManageUsers: false,
        canAccessAdminPanel: false,
        canViewAnalytics: false,
        canManageContent: false,
        canAccessSupportTools: true,
        canViewUserData: true,
        canManageSystemSettings: false,
      };
    case 'user':
    default:
      return {
        canManageUsers: false,
        canAccessAdminPanel: false,
        canViewAnalytics: false,
        canManageContent: false,
        canAccessSupportTools: false,
        canViewUserData: false,
        canManageSystemSettings: false,
      };
  }
};

export const getDefaultRolePreferences = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return {
        adminPreferences: {
          dashboardLayout: 'detailed',
          defaultView: 'users',
          notifications: {
            newUserSignup: true,
            systemAlerts: true,
            contentModeration: true,
            supportEscalations: true,
          },
        },
      };
    case 'support':
      return {
        supportPreferences: {
          ticketQueueView: 'assigned',
          autoAssignTickets: true,
          notificationSettings: {
            newTickets: true,
            ticketUpdates: true,
            escalations: true,
          },
        },
      };
    default:
      return {};
  }
};

// Role display utility functions
export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'support':
      return 'Support';
    case 'user':
      return 'User';
    default:
      return 'User';
  }
};

export const getRoleColor = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return '#FF6B6B'; // Red
    case 'support':
      return '#FF8C00'; // Orange
    case 'user':
      return '#3CB371'; // Green
    default:
      return '#6A5ACD'; // Purple
  }
};

export const getRoleIcon = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'shield';
    case 'support':
      return 'headset';
    case 'user':
      return 'person';
    default:
      return 'person';
  }
}; 