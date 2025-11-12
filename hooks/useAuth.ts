import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { BetterAuthService } from '../services/BetterAuthService';
import { supabaseNoteStorage } from '../services/SupabaseNoteStorage';
import { AuthState, LoginCredentials, SignupCredentials, User, UserPreferences, UserRole } from '../types/User';
import { authInitializationService, InitializationProgress } from '../services/AuthInitializationService';

// Create a single instance of BetterAuthService
let betterAuthService: BetterAuthService | null = null;
if (typeof window !== 'undefined' || Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    betterAuthService = new BetterAuthService();
  } catch (error) {
    console.error('Failed to create BetterAuthService:', error);
  }
}

type AuthStateListener = (state: AuthState) => void;
const authStateListeners = new Set<AuthStateListener>();
let globalAuthState: AuthState = {
  user: null,
  isLoading: true,
  error: null,
};
let hasGlobalAuthInitialized = false;

type ConnectionState = {
  isOnline: boolean;
  lastSyncTime: number;
  pendingOperations: number;
};

type IsInitializingListener = (value: boolean) => void;
type InitializationProgressListener = (progress: InitializationProgress | null) => void;
type ConnectionStateListener = (state: ConnectionState) => void;

let globalIsInitializing = false;
let globalInitializationProgress: InitializationProgress | null = null;
let globalConnectionState: ConnectionState = {
  isOnline: true,
  lastSyncTime: Date.now(),
  pendingOperations: 0,
};

const isInitializingListeners = new Set<IsInitializingListener>();
const initializationProgressListeners = new Set<InitializationProgressListener>();
const connectionStateListeners = new Set<ConnectionStateListener>();

const setGlobalIsInitializing = (value: boolean) => {
  globalIsInitializing = value;
  isInitializingListeners.forEach(listener => {
    try {
      listener(value);
    } catch (error) {
      console.error('useAuth: Error notifying isInitializing listener:', error);
    }
  });
};

const setGlobalInitializationProgress = (progress: InitializationProgress | null) => {
  globalInitializationProgress = progress;
  initializationProgressListeners.forEach(listener => {
    try {
      listener(progress);
    } catch (error) {
      console.error('useAuth: Error notifying initialization progress listener:', error);
    }
  });
};

const setGlobalConnectionState = (
  update: ConnectionState | ((prev: ConnectionState) => ConnectionState)
) => {
  const nextState =
    typeof update === 'function'
      ? (update as (prev: ConnectionState) => ConnectionState)(globalConnectionState)
      : update;

  globalConnectionState = nextState;
  connectionStateListeners.forEach(listener => {
    try {
      listener(nextState);
    } catch (error) {
      console.error('useAuth: Error notifying connection state listener:', error);
    }
  });
};

export const useAuth = () => {
  const [authState, setAuthStateLocal] = useState<AuthState>(globalAuthState);

  const authStateRef = useRef<AuthState>(globalAuthState);
  const localListenerRef = useRef<AuthStateListener>();

  const notifyAuthStateChange = useCallback((state: AuthState, skipListener?: AuthStateListener | null) => {
    authStateListeners.forEach(listener => {
      if (!skipListener || listener !== skipListener) {
        try {
          listener(state);
        } catch (listenerError) {
          console.error('useAuth: Error notifying auth state listener:', listenerError);
        }
      }
    });
  }, []);

  const setAuthState = useCallback(
    (update: AuthState | ((prev: AuthState) => AuthState)) => {
      const nextState =
        typeof update === 'function' ? (update as (prev: AuthState) => AuthState)(globalAuthState) : update;

      globalAuthState = nextState;
      authStateRef.current = nextState;

      if (localListenerRef.current) {
        localListenerRef.current(nextState);
      } else {
        setAuthStateLocal(nextState);
      }

      notifyAuthStateChange(nextState, localListenerRef.current ?? null);
    },
    [notifyAuthStateChange]
  );

  const hasInitializedRef = useRef(false);

  const [isInitializing, setIsInitializingLocal] = useState(globalIsInitializing);
  const [initializationProgress, setInitializationProgressLocal] = useState<InitializationProgress | null>(globalInitializationProgress);
  const [connectionState, setConnectionStateLocal] = useState<ConnectionState>(globalConnectionState);

  // Use ref to access current auth state without causing dependency issues
  useEffect(() => {
    const listener: AuthStateListener = (state: AuthState) => {
      authStateRef.current = state;
      setAuthStateLocal(state);
    };

    localListenerRef.current = listener;
    authStateListeners.add(listener);

    // Ensure local state stays in sync with the latest global state on mount
    listener(globalAuthState);

    return () => {
      authStateListeners.delete(listener);
      if (localListenerRef.current === listener) {
        localListenerRef.current = undefined;
      }
    };
  }, []);

  useEffect(() => {
    const handleIsInitializing: IsInitializingListener = value => {
      setIsInitializingLocal(value);
    };

    isInitializingListeners.add(handleIsInitializing);
    handleIsInitializing(globalIsInitializing);

    return () => {
      isInitializingListeners.delete(handleIsInitializing);
    };
  }, []);

  useEffect(() => {
    const handleInitializationProgress: InitializationProgressListener = progress => {
      setInitializationProgressLocal(progress);
    };

    initializationProgressListeners.add(handleInitializationProgress);
    handleInitializationProgress(globalInitializationProgress);

    return () => {
      initializationProgressListeners.delete(handleInitializationProgress);
    };
  }, []);

  useEffect(() => {
    const handleConnectionState: ConnectionStateListener = state => {
      setConnectionStateLocal(state);
    };

    connectionStateListeners.add(handleConnectionState);
    handleConnectionState(globalConnectionState);

    return () => {
      connectionStateListeners.delete(handleConnectionState);
    };
  }, []);

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
      
      if (user) {
        // Check if user is initialized
        const isInitialized = betterAuthService.isUserInitialized();
        setGlobalIsInitializing(!isInitialized);
        
        // Only update loading state to false if we have a definitive auth state
        setAuthState(prev => ({
          ...prev,
          user,
          isLoading: false, // Auth state change indicates we have a definitive answer
          error: null,
        }));
      } else {
        // No user - not initializing
        setGlobalIsInitializing(false);
        setGlobalInitializationProgress(null);
        setAuthState(prev => ({
          ...prev,
          user: null,
          isLoading: false,
          error: null,
        }));
      }
    };

    // Set up progress handler
    betterAuthService.setProgressHandler((progress) => {
      setGlobalInitializationProgress(progress);
      setGlobalIsInitializing(progress.stage !== 'complete');
      
      if (progress.stage === 'complete') {
        // Check if user is now initialized
        if (betterAuthService.isUserInitialized()) {
          setGlobalIsInitializing(false);
          
          // Force refresh of user data when initialization completes
          // This ensures UI components get the updated user with premium/admin info
          if (betterAuthService.currentUser) {
            // Trigger auth state change with updated user to force UI re-render
            const currentUser = betterAuthService.currentUser;
            if (authStateChangeHandlerRef.current) {
              authStateChangeHandlerRef.current(currentUser);
            }
          }
        }
      }
    });

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
      setGlobalConnectionState({
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
    if (!authState.isLoading) {
      return;
    }

    let isCancelled = false;

    const recoveryTimer = setTimeout(async () => {
      if (isCancelled || !authStateRef.current.isLoading) {
        return;
      }

      console.log('useAuth: Auth loading timeout, attempting crash recovery...');
      
      try {
        if (!betterAuthService) {
          throw new Error('BetterAuthService not available');
        }

        const userPromise = betterAuthService.getCurrentUser();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('User loading timeout')), 10000)
        );
        
        const user = await Promise.race([userPromise, timeoutPromise]) as User | null;
        
        if (!authStateRef.current.isLoading) {
          return;
        }

        if (user) {
          console.log('useAuth: Crash recovery successful, user found');
          setAuthState({
            user,
            isLoading: false,
            error: null,
          });
        } else if (!authStateRef.current.user) {
          console.log('useAuth: Crash recovery found no user');
          setAuthState({
            user: null,
            isLoading: false,
            error: null,
          });
        } else {
          console.log('useAuth: Crash recovery timeout, but user already exists');
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
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: null,
          }));
        }
      }
    }, 30000);

    return () => {
      isCancelled = true;
      clearTimeout(recoveryTimer);
    };
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
      setGlobalConnectionState({
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
      setGlobalConnectionState({
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
        setGlobalConnectionState({
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
      setGlobalConnectionState({
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
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!authState.user?.permissions) return false;
      const value = (authState.user.permissions as any)[permission];
      if (value === true) return true;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      if (typeof value === 'number') {
        return value === 1;
      }
      return false;
    },
    [authState.user]
  );

  // Check if user has specific role (only if user data is fully loaded)
  const hasRole = useCallback(
    (role: UserRole): boolean => {
      if (!authState.user || authState.user.role === undefined || authState.user.role === null) {
        return false;
      }

      const userRole =
        typeof authState.user.role === 'string'
          ? authState.user.role.trim().toLowerCase()
          : authState.user.role;

      return userRole === role;
    },
    [authState.user]
  );

  // Check if user is admin
  const isAdmin = useCallback((): boolean => {
    if (!authState.user) {
      return false;
    }

    if (hasRole('admin')) {
      return true;
    }

    return hasPermission('canAccessAdminPanel');
  }, [authState.user, hasRole, hasPermission]);

  // Check if user is support
  const isSupport = useCallback((): boolean => {
    if (!authState.user) {
      return false;
    }

    if (hasRole('support')) {
      return true;
    }

    return hasPermission('canAccessSupportTools');
  }, [authState.user, hasRole, hasPermission]);

  // Check if user is premium (only if user data is fully loaded)
  const isPremium = useCallback((): boolean => {
    // Don't return true if user data is incomplete or still initializing
    if (isInitializing || !authState.user) {
      return false;
    }
    // Ensure we have full user data (premium info should be loaded)
    if (authState.user.premium === undefined) {
      return false;
    }
    return authState.user.premium?.isActive === true;
  }, [authState.user, isInitializing]);

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
    if (hasInitializedRef.current || hasGlobalAuthInitialized) {
      hasInitializedRef.current = true;
      return;
    }

    hasInitializedRef.current = true;
    hasGlobalAuthInitialized = true;

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
    isAuthenticated: !!authState.user && !isInitializing,
    isInitializing: isInitializing,
    initializationProgress: initializationProgress,
    
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