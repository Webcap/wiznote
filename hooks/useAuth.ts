import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { BetterAuthService } from '../services/BetterAuthService';
import { supabaseNoteStorage } from '../services/SupabaseNoteStorage';
import { AuthState, LoginCredentials, SignupCredentials, User, UserPreferences, UserRole } from '../types/User';

// Create a single instance of BetterAuthService
let betterAuthService: BetterAuthService | null = null;
if (typeof window !== 'undefined' || Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    betterAuthService = new BetterAuthService();
  } catch (error) {
    console.error('Failed to create BetterAuthService:', error);
  }
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });
  
  const [connectionState, setConnectionState] = useState({
    isOnline: true,
    lastSyncTime: Date.now(),
    pendingOperations: 0,
  });

  // Use ref to access current auth state without causing dependency issues
  const authStateRef = useRef(authState);
  authStateRef.current = authState;

  // Ensure connectionState is always defined
  const safeConnectionState = connectionState || {
    isOnline: true,
    lastSyncTime: Date.now(),
    pendingOperations: 0,
  };

  const authStateChangeHandlerRef = useRef<((user: User | null) => void) | undefined>(undefined);

  // Set up error handler for BetterAuthService
  useEffect(() => {
    if (!betterAuthService) {
      console.log('useAuth: BetterAuthService not available, skipping initialization');
      setAuthState({
        user: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    betterAuthService.setErrorHandler((message: string, type: 'error' | 'warning' | 'info') => {
      // Update auth state with error
      setAuthState(prev => ({
        ...prev,
        error: message,
        isLoading: false,
      }));
      
      // Log error for debugging
      console.error('Auth error:', message, 'Type:', type);
    });

    // Set up auth state change handler
    authStateChangeHandlerRef.current = (user: User | null) => {
      console.log(`useAuth: Auth state change - user: ${user ? user.id : 'null'}`);
      // Only update loading state to false if we have a definitive auth state
      setAuthState(prev => ({
        ...prev,
        user,
        isLoading: false, // Auth state change indicates we have a definitive answer
        error: null,
      }));
    };

    if (authStateChangeHandlerRef.current) {
      betterAuthService.setAuthStateChangeHandler(authStateChangeHandlerRef.current);
    }

    // Cleanup on unmount
    return () => {
      // BetterAuthService doesn't need explicit cleanup
    };
  }, []);

  // Load current user on mount
  const loadCurrentUser = useCallback(async () => {
    try {
      if (!betterAuthService) {
        console.log('useAuth: BetterAuthService not available, cannot load current user');
        setAuthState({
          user: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Reduce timeout for mobile to fail faster and not block the UI
      const timeoutMs = Platform.OS === 'web' ? 10000 : 8000; // 8 seconds for mobile, 10 for web
      const userPromise = betterAuthService.getCurrentUser();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('User loading timeout')), timeoutMs)
      );
      
      const user = await Promise.race([userPromise, timeoutPromise]) as User | null;
      
      // Only update state if we actually got a user or confirmed no user
      // Don't update if auth state change handler already set the user
      if (user) {
        console.log('useAuth: Loaded user from getCurrentUser');
        setAuthState({
          user,
          isLoading: false,
          error: null,
        });
      } else if (!authStateRef.current.user) {
        // Only set to loading=false if no user exists and wasn't set by auth state change
        console.log('useAuth: No user found, clearing loading state');
        setAuthState({
          user: null,
          isLoading: false,
          error: null,
        });
      } else {
        // User was set by auth state change handler, just update loading
        console.log('useAuth: User already set by auth state change, just updating loading state');
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }

      // Update connection state (simplified for now)
      setConnectionState({
        isOnline: true,
        lastSyncTime: Date.now(),
        pendingOperations: 0,
      });
    } catch (error) {
      console.error('useAuth: Error loading current user:', error);
      // Don't clear user on timeout if one is already set by auth state change
      if (!authStateRef.current.user) {
        setAuthState({
          user: null,
          isLoading: false,
          error: error instanceof Error && error.message.includes('timeout') ? 'Connection timeout. Please try again.' : 'Failed to load user session',
        });
      } else {
        // User was set by auth state change handler, just update loading
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: null,
        }));
      }
    }
  }, []);

  // Add crash recovery mechanism
  useEffect(() => {
    const handleCrashRecovery = async () => {
      try {
        // If we're in a loading state for too long, try to recover
        if (authState.isLoading) {
          const recoveryTimer = setTimeout(async () => {
            console.log('useAuth: Auth loading timeout, attempting crash recovery...');
            
            try {
              // Try to get current user with timeout
              if (!betterAuthService) {
                throw new Error('BetterAuthService not available');
              }
              
              const userPromise = betterAuthService.getCurrentUser();
              const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('User loading timeout')), 10000)
              );
              
              const user = await Promise.race([userPromise, timeoutPromise]) as User | null;
              
              if (user) {
                console.log('useAuth: Crash recovery successful, user found');
                setAuthState({
                  user,
                  isLoading: false,
                  error: null,
                });
              } else if (!authStateRef.current.user) {
                // Only clear user if one doesn't already exist
                console.log('useAuth: Crash recovery found no user');
                setAuthState({
                  user: null,
                  isLoading: false,
                  error: null,
                });
              } else {
                console.log('useAuth: Crash recovery timeout, but user already exists');
                // Keep existing user, just set loading to false
                setAuthState(prev => ({
                  ...prev,
                  isLoading: false,
                  error: null,
                }));
              }
            } catch (error) {
              console.error('useAuth: Crash recovery failed:', error);
              if (!authStateRef.current.user) {
                setAuthState({
                  user: null,
                  isLoading: false,
                  error: 'Failed to restore session. Please sign in again.',
                });
              } else {
                // Keep existing user on error
                setAuthState(prev => ({
                  ...prev,
                  isLoading: false,
                  error: null,
                }));
              }
            }
          }, 30000); // Reduced to 30 seconds for faster failure (allows 2-3 retry attempts with 8s timeouts)
          
          return () => clearTimeout(recoveryTimer);
        }
      } catch (error) {
        console.error('useAuth: Error in crash recovery setup:', error);
      }
    };

    handleCrashRecovery();
  }, [authState.isLoading]);

  // Refresh user data from Supabase
  const refreshUser = useCallback(async () => {
    try {
      if (!betterAuthService) {
        console.log('useAuth: BetterAuthService not available, cannot refresh user');
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Authentication service not available',
        }));
        return;
      }

      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Add timeout to prevent hanging
      const userPromise = betterAuthService.getCurrentUser();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('User refresh timeout')), 10000)
      );
      
      const user = await Promise.race([userPromise, timeoutPromise]) as User | null;
      
      setAuthState({
        user,
        isLoading: false,
        error: null,
      });

      // Update connection state
      setConnectionState({
        isOnline: true,
        lastSyncTime: Date.now(),
        pendingOperations: 0,
      });
    } catch (error) {
      console.error('useAuth: Error refreshing user:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to refresh user data',
      }));
    }
  }, []);

  // Validate current user exists in database - use ref to avoid dependency issues
  const validateCurrentUser = useCallback(async (): Promise<boolean> => {
    try {
      if (!betterAuthService) {
        console.log('useAuth: BetterAuthService not available, cannot validate user');
        return false;
      }

      const currentUser = authStateRef.current.user;
      if (!currentUser?.id) {
        console.log('useAuth: No current user to validate');
        return false;
      }

      console.log('useAuth: Validating current user:', currentUser.id);
      
      // Use the BetterAuthService validation method
      const isValid = await betterAuthService.validateCurrentUser();
      
      if (!isValid) {
        // Update auth state to reflect invalid user
        setAuthState(prev => ({
          ...prev,
          user: null,
          error: 'Session expired. Please sign in again.',
        }));
      }
      
      return isValid;
    } catch (error) {
      console.error('useAuth: Error validating user:', error);
      setAuthState(prev => ({
        ...prev,
        user: null,
        error: 'Failed to validate user session',
      }));
      return false;
    }
  }, [betterAuthService]); // Remove authState.user?.id dependency

  // Get current user with validation - use ref to avoid dependency issues
  const getCurrentUserWithValidation = useCallback(async (): Promise<User | null> => {
    const isValid = await validateCurrentUser();
    return isValid ? authStateRef.current.user : null;
  }, [validateCurrentUser]);

  // Sign up with improved error handling
  const signUp = useCallback(async (credentials: SignupCredentials) => {
    try {
      if (!betterAuthService) {
        throw new Error('Authentication service not available');
      }

      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      const user = await betterAuthService.signUp(credentials);
      
      setAuthState({
        user,
        isLoading: false,
        error: null,
      });
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign up';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  // Sign in with improved error handling
  const signIn = useCallback(async (credentials: LoginCredentials) => {
    try {
      if (!betterAuthService) {
        throw new Error('Authentication service not available');
      }

      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      const user = await betterAuthService.signIn(credentials);
      
      setAuthState({
        user,
        isLoading: false,
        error: null,
      });
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      if (!betterAuthService) {
        throw new Error('Authentication service not available');
      }

      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      const user = await betterAuthService.signInWithGoogle();
      
      setAuthState({
        user,
        isLoading: false,
        error: null,
      });
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      console.log('🔄 useAuth: Starting sign out process...');
      
      if (!betterAuthService) {
        throw new Error('Authentication service not available');
      }

      // Set loading state
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('🔄 useAuth: Calling BetterAuthService signOut...');
      await betterAuthService.signOut();
      
      console.log('✅ useAuth: BetterAuthService signOut completed, clearing local state...');
      
      // Clear SupabaseNoteStorage user to stop real-time subscriptions
      try {
        console.log('🔄 useAuth: Clearing SupabaseNoteStorage user...');
        supabaseNoteStorage.clearUser();
        console.log('✅ useAuth: SupabaseNoteStorage user cleared successfully');
      } catch (cleanupError) {
        console.warn('⚠️ useAuth: Error clearing SupabaseNoteStorage user:', cleanupError);
        // Don't fail sign out if cleanup fails
      }
      
      // Clear auth state
      setAuthState({
        user: null,
        isLoading: false,
        error: null,
      });

      // Reset connection state
      setConnectionState({
        isOnline: true,
        lastSyncTime: Date.now(),
        pendingOperations: 0,
      });
      
      console.log('✅ useAuth: Sign out completed successfully');
      
    } catch (error) {
      console.error('❌ useAuth: Sign out error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      
      // Check if it's an AuthSessionMissingError - treat as successful sign out
      if (error instanceof Error && (
        error.message?.includes('Auth session missing') || 
        error.message?.includes('AuthSessionMissingError') ||
        error.name === 'AuthSessionMissingError'
      )) {
        console.log('ℹ️ useAuth: Auth session missing error detected, treating as successful sign out');
        
        // Clear SupabaseNoteStorage user even on auth session missing error
        try {
          console.log('🔄 useAuth: Clearing SupabaseNoteStorage user after auth session missing error...');
          supabaseNoteStorage.clearUser();
          console.log('✅ useAuth: SupabaseNoteStorage user cleared successfully after auth session missing error');
        } catch (cleanupError) {
          console.warn('⚠️ useAuth: Error clearing SupabaseNoteStorage user after auth session missing error:', cleanupError);
        }
        
        // Still clear the auth state even if there was an error
        setAuthState({
          user: null,
          isLoading: false,
          error: null,
        });
        
        // Reset connection state
        setConnectionState({
          isOnline: true,
          lastSyncTime: Date.now(),
          pendingOperations: 0,
        });
        return; // Don't throw the error
      }
      
      // For other errors, set error state but still try to clear user
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        user: null, // Still clear user even on error
      }));
      
      // Clear SupabaseNoteStorage user even on other errors
      try {
        console.log('🔄 useAuth: Clearing SupabaseNoteStorage user after other error...');
        supabaseNoteStorage.clearUser();
        console.log('✅ useAuth: SupabaseNoteStorage user cleared successfully after other error');
      } catch (cleanupError) {
        console.warn('⚠️ useAuth: Error clearing SupabaseNoteStorage user after other error:', cleanupError);
      }
      
      // Reset connection state
      setConnectionState({
        isOnline: true,
        lastSyncTime: Date.now(),
        pendingOperations: 0,
      });
      
      throw error;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // Check if user has specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!authState.user?.permissions) return false;
    return (authState.user.permissions as any)[permission] === true;
  }, [authState.user]);

  // Check if user has specific role
  const hasRole = useCallback((role: UserRole): boolean => {
    return authState.user?.role === role;
  }, [authState.user]);

  // Check if user is admin
  const isAdmin = useCallback((): boolean => {
    return hasRole('admin');
  }, [hasRole]);

  // Check if user is support
  const isSupport = useCallback((): boolean => {
    return hasRole('support');
  }, [hasRole]);

  // Check if user is premium
  const isPremium = useCallback((): boolean => {
    return authState.user?.premium?.isActive === true;
  }, [authState.user]);

  // Get all users (admin only)
  const getAllUsers = useCallback(async (): Promise<User[]> => {
    if (!betterAuthService) {
      throw new Error('BetterAuthService not available');
    }
    
    if (!isAdmin()) {
      throw new Error('Admin access required');
    }
    
    try {
      return await betterAuthService.getAllUsers();
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }, [isAdmin]);

  // Update user role (admin only)
  const updateUserRole = useCallback(async (userId: string, newRole: UserRole): Promise<void> => {
    if (!betterAuthService) {
      throw new Error('BetterAuthService not available');
    }
    
    if (!isAdmin()) {
      throw new Error('Admin access required');
    }
    
    try {
      await betterAuthService.updateUserRole(userId, newRole);
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }, [isAdmin]);

  // Force refresh session and user data
  const forceRefreshSession = useCallback(async (): Promise<User | null> => {
    try {
      if (!betterAuthService) {
        console.log('useAuth: BetterAuthService not available, cannot force refresh session');
        return null;
      }

      console.log('useAuth: Force refreshing session...');
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Clear current user and force a fresh session restoration
      setAuthState(prev => ({ ...prev, user: null }));
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try to load current user again
      await loadCurrentUser();
      
      console.log('useAuth: Session refresh complete, user:', authStateRef.current.user?.id);
      return authStateRef.current.user;
    } catch (error) {
      console.error('useAuth: Error force refreshing session:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to refresh session',
      }));
      return null;
    }
  }, [betterAuthService, loadCurrentUser]);

  // Initialize auth on mount with timeout
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('useAuth: Initializing auth...');
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Wait for BetterAuthService to be available (max 3 seconds)
        let attempts = 0;
        while (!betterAuthService && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!betterAuthService) {
          console.error('useAuth: BetterAuthService not available after waiting');
          setAuthState({
            user: null,
            isLoading: false,
            error: 'Authentication service not available',
          });
          return;
        }
        
        // Add timeout to prevent hanging
        const authPromise = loadCurrentUser();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth initialization timeout')), 15000)
        );
        
        await Promise.race([authPromise, timeoutPromise]);
        console.log('useAuth: Auth initialization complete');
      } catch (error) {
        console.error('useAuth: Error initializing auth:', error);
        setAuthState({
          user: null,
          isLoading: false,
          error: null,
        });
      }
    };

    initializeAuth();
  }, []); // Remove loadCurrentUser dependency to prevent infinite loops

  return {
    // Auth state
    user: authState.user,
    isLoading: authState.isLoading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    
    // Connection state - ensure these are always defined
    isOnline: safeConnectionState?.isOnline ?? true,
    lastSyncTime: safeConnectionState?.lastSyncTime ?? Date.now(),
    pendingOperations: safeConnectionState?.pendingOperations ?? 0,
    
    // Auth methods
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    loadCurrentUser,
    refreshUser,
    clearError,
    
    // User preferences
    updatePreferences: useCallback(async (preferences: Partial<UserPreferences>) => {
      if (!betterAuthService) {
        throw new Error('BetterAuthService not available');
      }
      return await betterAuthService.updatePreferences(preferences);
    }, []),
    
    // User profile
    updateProfile: useCallback(async (updates: { displayName?: string; email?: string }) => {
      if (!betterAuthService) {
        throw new Error('BetterAuthService not available');
      }
      await betterAuthService.updateProfile(updates);
      // Refresh user data after profile update
      await refreshUser();
    }, [refreshUser]),
    
    // Password update
    updatePassword: useCallback(async (currentPassword: string, newPassword: string) => {
      if (!betterAuthService) {
        throw new Error('BetterAuthService not available');
      }
      return await betterAuthService.updatePassword(currentPassword, newPassword);
    }, []),
    
    // Permission checks
    hasPermission,
    hasRole,
    isAdmin,
    isSupport,
    isPremium,
    
    // Admin methods
    getAllUsers,
    updateUserRole,
    
    // User validation methods
    validateCurrentUser,
    getCurrentUserWithValidation,
    
    // Session management
    forceRefreshSession,
  };
}; 