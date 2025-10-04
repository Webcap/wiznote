// Firebase AuthService has been removed from this project.
// Authentication is now handled by Supabase/Better Auth.
// This file is kept for compatibility but should be removed if no longer needed.

export const authService = {
  initialize: async () => {
    console.log('AuthService: Firebase removed, using Supabase auth');
    return Promise.resolve();
  },
  getCurrentUser: async () => null,
  signIn: async () => {
    throw new Error('Firebase AuthService has been removed. Use Supabase auth instead.');
  },
  signUp: async () => {
    throw new Error('Firebase AuthService has been removed. Use Supabase auth instead.');
  },
  signOut: async () => {
    console.log('AuthService: Firebase removed, using Supabase auth');
    return Promise.resolve();
  },
  destroy: () => {
    console.log('AuthService: Firebase removed, using Supabase auth');
  },
  setErrorHandler: () => {},
  setAuthStateChangeHandler: () => {},
  getAuthState: () => ({
    isOnline: true,
    lastSyncTime: Date.now(),
    pendingOperations: [],
  }),
  isOnline: () => true,
  syncPendingOperations: async () => Promise.resolve(),
}; 