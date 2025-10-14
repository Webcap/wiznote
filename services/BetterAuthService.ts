import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { LoginCredentials, SignupCredentials, User, UserPreferences, UserRole } from '../types/User';
import {
    cacheSession,
    clearCachedSession,
    debounce,
    getCachedSession,
    isLocalStorageAvailable,
    isWeb,
    throttle
} from '../utils/webSessionUtils';
import { roleService } from './RoleService';

export class BetterAuthService {
  private currentUser: User | null = null;
  private onError?: (error: string, type: 'error' | 'warning' | 'info') => void;
  private onAuthStateChange?: (user: User | null) => void;
  private isRecoveringSession = false;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 3;
  private authStateListenerInitialized = false;
  private sessionRestorationPromise: Promise<void> | null = null;
  private isSigningOut = false; // Flag to prevent session recovery during sign out

  constructor() {
    this.initializeAuthStateListener();
    
    // Start session restoration immediately
    this.sessionRestorationPromise = this.restoreSession();
  }

  private initializeAuthStateListener() {
    // Listen for auth state changes with debouncing for web
    let authStateChangeTimeout: NodeJS.Timeout | null = null;
    
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 BetterAuthService: Auth state changed:', event, session?.user?.id, 'currentUser:', this.currentUser?.id);
      
      // Debounce auth state changes on web to prevent rapid firing
      if (Platform.OS === 'web' && authStateChangeTimeout) {
        clearTimeout(authStateChangeTimeout);
      }
      
      authStateChangeTimeout = setTimeout(async () => {
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('🔄 BetterAuthService: Handling SIGNED_IN event');
            await this.handleSignInOrSignUp(session.user);
          } else if (event === 'SIGNED_OUT') {
            console.log('🔄 BetterAuthService: Handling SIGNED_OUT event');
            this.isSigningOut = false; // Reset sign out flag
            // Ensure user is cleared when signed out
            this.currentUser = null;
            if (this.onAuthStateChange) {
              console.log('🔄 BetterAuthService: Notifying listeners of sign out');
              this.onAuthStateChange(null);
            }
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            // Handle token refresh - this often happens on page refresh
            console.log('🔄 BetterAuthService: Token refreshed, ensuring user is loaded...');
            if (!this.currentUser || this.currentUser.id !== session.user.id) {
              await this.handleSignInOrSignUp(session.user);
            }
          } else if (event === 'INITIAL_SESSION' && session?.user) {
            // Handle initial session load (e.g., on page refresh)
            // But only if we're not in the middle of signing out
            if (!this.isSigningOut) {
              console.log('🔄 BetterAuthService: Initial session detected, loading user...');
              await this.handleSignInOrSignUp(session.user);
            } else {
              console.log('🔄 BetterAuthService: Ignoring initial session during sign out');
            }
          } else if (event === 'USER_UPDATED' && session?.user) {
            // Handle user updates
            console.log('🔄 BetterAuthService: User updated, refreshing user data...');
            await this.handleSignInOrSignUp(session.user);
          }
        } catch (error) {
          console.error('❌ BetterAuthService: Error handling auth state change:', error);
        }
      }, Platform.OS === 'web' ? 100 : 0); // 100ms debounce on web
    });
    
    // Mark auth state listener as initialized
    this.authStateListenerInitialized = true;
    
    // Set up periodic session refresh for both web and mobile
    this.setupSessionRefresh();
    
    // Set up web-specific page visibility handling
    if (Platform.OS === 'web') {
      this.setupWebPageVisibilityHandling();
    } else {
      // Set up mobile app state handling
      this.setupMobileAppStateHandling();
    }
  }

  private async handleSignInOrSignUp(supabaseUser: any) {
    try {
      console.log('Handling sign in/sign up for user:', supabaseUser.id);
      
      // Check cache first on web
      if (Platform.OS === 'web' && isLocalStorageAvailable()) {
        const cachedUser = getCachedSession();
        if (cachedUser && cachedUser.id === supabaseUser.id) {
          console.log('Using cached user data for faster loading');
          this.currentUser = cachedUser;
          if (this.onAuthStateChange) {
            this.onAuthStateChange(cachedUser);
          }
          // Update last login in background
          this.updateLastLogin(supabaseUser.id).catch(console.error);
          return;
        }
      }
      
      // Try to load existing user profile
      let userProfile = await this.loadUserProfile(supabaseUser.id);
      
      if (!userProfile) {
        // No profile exists - this could be a new OAuth user or a user who hasn't completed sign-up
        console.log('No user profile found, checking if this is a new OAuth user...');
        
        // Check if this is a new OAuth user (has email but no profile)
        if (supabaseUser.email && supabaseUser.user_metadata) {
          console.log('Creating new user profile for OAuth user:', supabaseUser.id);
          try {
            userProfile = await this.createUserProfile(supabaseUser);
          } catch (profileError) {
            console.error('Failed to create user profile:', profileError);
            // Create a minimal profile as fallback
            userProfile = await this.createMinimalUserProfile(supabaseUser);
          }
        } else {
          console.error('No user profile found for user:', supabaseUser.id);
          console.error('User must sign up first to create a profile');
          throw new Error('User profile not found. Please sign up first.');
        }
      } else {
        console.log('Existing profile found, loading user data...');
      }
      
      // Create user object from profile
      const user: User = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        displayName: userProfile.displayName || supabaseUser.email?.split('@')[0],
        photoURL: supabaseUser.user_metadata?.avatar_url,
        role: userProfile.role,
        createdAt: userProfile.createdAt,
        lastLoginAt: userProfile.lastLoginAt,
        preferences: userProfile.preferences,
        premium: userProfile.premium,
        permissions: userProfile.permissions,
        supportInfo: userProfile.supportInfo,
      };

      // Update current user
      this.currentUser = user;
      
      // Cache user data on web for faster subsequent loads
      if (isWeb && isLocalStorageAvailable()) {
        cacheSession(user);
      }
      
      // Update last login
      await this.updateLastLogin(supabaseUser.id);
      
      // Notify listeners
      if (this.onAuthStateChange) {
        this.onAuthStateChange(user);
      }
      
      console.log('User handled successfully:', user.id);
      
    } catch (error) {
      console.error('Error handling sign in/sign up:', error);
      this.handleError(error, 'Sign In/Sign Up');
    }
  }

  private async handleSignIn(supabaseUser: any) {
    try {
      console.log('Handling sign in for user:', supabaseUser.id);
      
      // Check cache first on web
      if (Platform.OS === 'web' && isLocalStorageAvailable()) {
        const cachedUser = getCachedSession();
        if (cachedUser && cachedUser.id === supabaseUser.id) {
          console.log('Using cached user data for faster loading');
          this.currentUser = cachedUser;
          if (this.onAuthStateChange) {
            this.onAuthStateChange(cachedUser);
          }
          // Update last login in background
          this.updateLastLogin(supabaseUser.id).catch(console.error);
          return;
        }
      }
      
      // Load existing user profile (don't create new ones during sign-in)
      const userProfile = await this.loadUserProfile(supabaseUser.id);
      
      if (!userProfile) {
        console.error('No user profile found for user:', supabaseUser.id);
        console.error('User must sign up first to create a profile');
        throw new Error('User profile not found. Please sign up first.');
      }
      
      console.log('Existing profile found, loading user data...');
      
      // Create user object from existing profile
      const user: User = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        displayName: userProfile.displayName || supabaseUser.email?.split('@')[0],
        photoURL: supabaseUser.user_metadata?.avatar_url,
        role: userProfile.role,
        createdAt: userProfile.createdAt,
        lastLoginAt: userProfile.lastLoginAt,
        preferences: userProfile.preferences,
        premium: userProfile.premium,
        permissions: userProfile.permissions,
        supportInfo: userProfile.supportInfo,
      };

      // Update current user
      this.currentUser = user;
      
      // Cache user data on web for faster subsequent loads
      if (isWeb && isLocalStorageAvailable()) {
        cacheSession(user);
      }
      
      // Update last login
      await this.updateLastLogin(supabaseUser.id);
      
      // Notify listeners
      if (this.onAuthStateChange) {
        this.onAuthStateChange(user);
      }
      
      console.log('User signed in successfully:', user.id);
      
    } catch (error) {
      console.error('Error handling sign in:', error);
      this.handleError(error, 'Sign In');
    }
  }

  private async handleSignOut() {
    try {
      console.log('🔄 BetterAuthService: Handling sign out...');
      
      // Clear current user
      this.currentUser = null;
      
      // Clear cached session on web
      if (isWeb && isLocalStorageAvailable()) {
        clearCachedSession();
      }
      
      // Clear Supabase session from local storage more aggressively
      if (Platform.OS === 'web') {
        try {
          // Clear all Supabase-related storage
          if (typeof window !== 'undefined' && window.localStorage) {
            const keysToRemove = [];
            for (let i = 0; i < window.localStorage.length; i++) {
              const key = window.localStorage.key(i);
              if (key && key.includes('supabase')) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => {
              console.log('🗑️ BetterAuthService: Removing localStorage key:', key);
              window.localStorage.removeItem(key);
            });
          }
          
          // Also clear sessionStorage
          if (typeof window !== 'undefined' && window.sessionStorage) {
            const sessionKeysToRemove = [];
            for (let i = 0; i < window.sessionStorage.length; i++) {
              const key = window.sessionStorage.key(i);
              if (key && key.includes('supabase')) {
                sessionKeysToRemove.push(key);
              }
            }
            sessionKeysToRemove.forEach(key => {
              console.log('🗑️ BetterAuthService: Removing sessionStorage key:', key);
              window.sessionStorage.removeItem(key);
            });
          }
        } catch (storageError) {
          console.warn('⚠️ BetterAuthService: Error clearing storage:', storageError);
        }
      }
      
      // Reset recovery state
      this.isRecoveringSession = false;
      this.recoveryAttempts = 0;
      
      // Reset session restoration promise
      this.sessionRestorationPromise = null;
      
      // Reset sign out flag
      this.isSigningOut = false;
      
      // Notify listeners immediately
      if (this.onAuthStateChange) {
        console.log('🔄 BetterAuthService: Notifying auth state change listeners (user: null)');
        this.onAuthStateChange(null);
      }
      
      console.log('✅ BetterAuthService: User signed out successfully');
      
    } catch (error) {
      console.error('❌ BetterAuthService: Error handling sign out:', error);
      this.handleError(error, 'Sign Out');
    }
  }

  async signIn(credentials: LoginCredentials): Promise<User> {
    try {
      console.log('Signing in with credentials...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('No user returned from sign in');
      }

      // Check if email verification is required per system settings
      const { shouldRequireEmailVerification } = await import('../lib/auth');
      const requireEmailVerification = await shouldRequireEmailVerification();
      
      // If email verification is required but user hasn't verified their email, reject sign-in
      if (requireEmailVerification && !data.user.email_confirmed_at) {
        console.log('Sign-in blocked: Email verification required but not completed');
        throw new Error('Email not confirmed. Please check your email inbox and click the verification link before signing in.');
      }

      console.log('Email verification check passed:', {
        required: requireEmailVerification,
        confirmed: !!data.user.email_confirmed_at
      });

      // For regular sign-in, use the handleSignIn method that doesn't create profiles
      await this.handleSignIn(data.user);
      return this.currentUser!;
      
    } catch (error) {
      console.error('Error signing in:', error);
      this.handleError(error, 'Sign In');
    }
  }

  async signUp(credentials: SignupCredentials): Promise<User> {
    try {
      console.log('Signing up with credentials...');
      
      // Import the helper function to check email verification requirement
      const { shouldRequireEmailVerification } = await import('../lib/auth');
      const requireEmailVerification = await shouldRequireEmailVerification();
      
      console.log('Email verification required:', requireEmailVerification);
      
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            display_name: credentials.displayName,
          },
          emailRedirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/callback`
            : undefined,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('No user returned from sign up');
      }

      // Create user profile immediately after successful sign-up (even if email verification is required)
      // This ensures the profile exists when the user verifies their email and tries to sign in
      console.log('Creating user profile for new user:', data.user.id);
      const userProfile = await this.createUserProfile(data.user);

      // If email verification is required, inform user to check their email
      if (requireEmailVerification && !data.user.email_confirmed_at) {
        console.log('Email verification required - user must confirm email before accessing account');
        console.log('User profile created successfully, waiting for email verification');
        throw new Error('Please check your email to verify your account before signing in.');
      }
      
      // Create user object
      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        displayName: userProfile.displayName || data.user.email?.split('@')[0],
        photoURL: data.user.user_metadata?.avatar_url,
        role: userProfile.role,
        createdAt: userProfile.createdAt,
        lastLoginAt: userProfile.lastLoginAt,
        preferences: userProfile.preferences,
        premium: userProfile.premium,
        permissions: userProfile.permissions,
        supportInfo: userProfile.supportInfo,
      };

      // Update current user
      this.currentUser = user;
      
      // Cache user data on web
      if (isWeb && isLocalStorageAvailable()) {
        cacheSession(user);
      }
      
      // Notify listeners
      if (this.onAuthStateChange) {
        this.onAuthStateChange(user);
      }
      
      console.log('User signed up successfully:', user.id);
      return user;
      
    } catch (error) {
      console.error('Error signing up:', error);
      this.handleError(error, 'Sign Up');
    }
  }

  async signInWithGoogle(): Promise<User> {
    try {
      console.log('Signing in with Google...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/callback`
            : undefined,
        },
      });

      if (error) {
        throw error;
      }

      // For OAuth, we need to wait for the redirect
      if (data.url) {
        // On web, redirect to OAuth provider
        if (typeof window !== 'undefined') {
          window.location.href = data.url;
        }
        // On mobile, the OAuth flow will handle the redirect
      }

      // The auth state change listener will handle the rest
      return this.currentUser!;
      
    } catch (error) {
      console.error('Error signing in with Google:', error);
      this.handleError(error, 'Google Sign In');
    }
  }

  async signOut(): Promise<void> {
    try {
      console.log('🔄 BetterAuthService: Starting sign out process...');
      
      // Set flag to prevent session recovery during sign out
      this.isSigningOut = true;
      
      // Clear local state first to prevent session recovery
      console.log('🔄 BetterAuthService: Clearing local state first...');
      await this.handleSignOut();
      
      // Check if there's an active session before attempting to sign out
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('ℹ️ BetterAuthService: No active session found, local state already cleared');
        return;
      }
      
      console.log('🔄 BetterAuthService: Active session found, signing out from Supabase...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        // Check if it's an AuthSessionMissingError
        if (error.message?.includes('Auth session missing') || error.message?.includes('AuthSessionMissingError')) {
          console.log('ℹ️ BetterAuthService: Auth session already missing, local state already cleared');
          return;
        }
        console.error('❌ BetterAuthService: Supabase sign out error:', error);
        // Don't throw error since we already cleared local state
        console.log('ℹ️ BetterAuthService: Continuing with local state cleared despite Supabase error');
        return;
      }

      console.log('✅ BetterAuthService: Supabase sign out successful');
      
      // Force clear any remaining session data
      if (Platform.OS === 'web') {
        try {
          // Force clear the session by setting it to empty tokens
          await supabase.auth.setSession({ access_token: '', refresh_token: '' });
        } catch (clearError) {
          console.log('ℹ️ BetterAuthService: Error clearing session (expected):', clearError);
        }
      }
      
    } catch (error) {
      console.error('❌ BetterAuthService: Error during sign out:', error);
      
      // If it's an AuthSessionMissingError, treat it as a successful sign out
      if (error instanceof Error && (
        error.message?.includes('Auth session missing') || 
        error.message?.includes('AuthSessionMissingError') ||
        error.name === 'AuthSessionMissingError'
      )) {
        console.log('ℹ️ BetterAuthService: Auth session missing error detected, local state already cleared');
        return;
      }
      
      // For other errors, local state is already cleared, so just log the error
      console.log('ℹ️ BetterAuthService: Local state cleared despite error during Supabase sign out');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      console.log('BetterAuthService: Getting current user...');
      
      // If we already have a current user, return it
      if (this.currentUser) {
        console.log('BetterAuthService: Returning cached current user');
        return this.currentUser;
      }
      
      // Wait for session restoration to complete if it's in progress
      if (this.sessionRestorationPromise) {
        console.log('BetterAuthService: Waiting for session restoration to complete...');
        await this.sessionRestorationPromise;
        this.sessionRestorationPromise = null;
        
        // Check if session restoration found a user
        if (this.currentUser) {
          console.log('BetterAuthService: Session restoration found user');
          return this.currentUser;
        }
      }
      
      // Wait for auth state listener to be initialized (max 2 seconds)
      if (!this.authStateListenerInitialized) {
        console.log('BetterAuthService: Waiting for auth state listener to initialize...');
        let attempts = 0;
        while (!this.authStateListenerInitialized && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }
      
      // Get session with retry logic for mobile
      let session = null;
      let error = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`BetterAuthService: Attempting to get session (attempt ${attempt}/3)...`);
          const result = await supabase.auth.getSession();
          session = result.data.session;
          error = result.error;
          
          if (session?.user || !error) {
            break; // Success or no error, exit retry loop
          }
          
          if (attempt < 3) {
            console.log(`BetterAuthService: Session attempt ${attempt} failed, retrying in 500ms...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (sessionError) {
          error = sessionError;
          if (attempt < 3) {
            console.log(`BetterAuthService: Session attempt ${attempt} threw error, retrying in 500ms...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (error) {
        console.error('Error getting session after retries:', error);
        return null;
      }

      if (session?.user) {
        console.log('BetterAuthService: Found session user:', session.user.id);
        
        const userProfile = await this.loadUserProfile(session.user.id);
        if (userProfile) {
          console.log('BetterAuthService: Loaded user profile successfully');
          const user = {
            id: session.user.id,
            email: session.user.email || '',
            displayName: userProfile.displayName || session.user.email?.split('@')[0],
            photoURL: session.user.user_metadata?.avatar_url,
            role: userProfile.role,
            createdAt: userProfile.createdAt,
            lastLoginAt: userProfile.lastLoginAt,
            preferences: userProfile.preferences,
            premium: userProfile.premium,
            permissions: userProfile.permissions,
            supportInfo: userProfile.supportInfo,
          };
          
          // Cache the current user
          this.currentUser = user;
          
          return user;
        } else {
          console.log('BetterAuthService: No user profile found, creating minimal profile');
          // Create a minimal profile as fallback
          const minimalProfile = await this.createMinimalUserProfile(session.user);
          const user = {
            id: session.user.id,
            email: session.user.email || '',
            displayName: minimalProfile.displayName || session.user.email?.split('@')[0],
            photoURL: session.user.user_metadata?.avatar_url,
            role: minimalProfile.role,
            createdAt: minimalProfile.createdAt,
            lastLoginAt: minimalProfile.lastLoginAt,
            preferences: minimalProfile.preferences,
            premium: minimalProfile.premium,
            permissions: minimalProfile.permissions,
            supportInfo: minimalProfile.supportInfo,
          };
          
          // Cache the current user
          this.currentUser = user;
          
          return user;
        }
      } else {
        console.log('BetterAuthService: No session found');
        this.currentUser = null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  private async loadUserProfile(userId: string): Promise<any | null> {
    try {
      console.log('BetterAuthService: Loading user profile for:', userId);
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - profile doesn't exist
          console.log('BetterAuthService: No user profile found for:', userId);
          return null;
        }
        console.error('BetterAuthService: Error loading user profile:', error);
        return null;
      }
      
      console.log('BetterAuthService: User profile loaded successfully');
      return profile;
      
    } catch (error) {
      console.error('BetterAuthService: Exception loading user profile:', error);
      return null;
    }
  }

  private async createUserProfile(supabaseUser: any): Promise<any> {
    try {
      console.log('Creating user profile for:', supabaseUser.id);
      console.log('User metadata:', supabaseUser.user_metadata);
      
      // First, check if a profile already exists to preserve any manually assigned roles
      const existingProfile = await this.loadUserProfile(supabaseUser.id);
      if (existingProfile) {
        console.log('Profile already exists, preserving existing role:', existingProfile.role);
        return existingProfile;
      }
      
      // Use RoleService to determine role based on email domain
      const userRole = roleService.determineUserRole(supabaseUser.email);
      console.log('Assigned role based on domain:', userRole);
      
      const profileData = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        display_name: supabaseUser.user_metadata?.display_name || supabaseUser.email?.split('@')[0],
        role: userRole,
        preferences: {
          theme: 'auto',
          language: 'en',
          autoSync: true,
          notifications: true,
          ...roleService.getDefaultRolePreferences(userRole),
        },
        premium: {
          isActive: false,
          type: null,
        },
        permissions: roleService.getDefaultPermissions(userRole),
        last_login_at: new Date().toISOString(),
      };

      console.log('Profile data to insert:', profileData);
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Failed to create user profile:', error);
        
        // If profile already exists (409 conflict), try to load it
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          console.log('Profile already exists, loading existing profile...');
          const existingProfile = await this.loadUserProfile(supabaseUser.id);
          if (existingProfile) {
            return existingProfile;
          }
        }
        
        // If RLS is blocking, try to create a minimal profile
        if (error.code === '42501') {
          console.log('RLS blocked profile creation, trying alternative approach...');
          return this.createMinimalUserProfile(supabaseUser);
        }
        
        throw new Error(`Failed to create user profile: ${error.message}`);
      }

      console.log('✅ User profile created successfully:', profile.id);
      
      // Create Stripe customer for the new user
      // try {
      //   await this.createStripeCustomer(supabaseUser.id, supabaseUser.email);
      // } catch (stripeError) {
      //   console.warn('Failed to create Stripe customer during profile creation:', stripeError);
      //   // Don't fail the profile creation if Stripe customer creation fails
      // }
      
      return profile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  private async createMinimalUserProfile(supabaseUser: any): Promise<any> {
    try {
      console.log('Creating minimal user profile as fallback...');
      
      // First, check if a profile already exists to preserve any manually assigned roles
      const existingProfile = await this.loadUserProfile(supabaseUser.id);
      if (existingProfile) {
        console.log('Profile already exists, preserving existing role in minimal profile:', existingProfile.role);
        return existingProfile;
      }
      
      // Use RoleService to determine role based on email domain
      const userRole = roleService.determineUserRole(supabaseUser.email);
      console.log('Assigned role for minimal profile:', userRole);
      
      // Create a minimal profile object without database insertion
      const minimalProfile = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        display_name: supabaseUser.user_metadata?.display_name || supabaseUser.email?.split('@')[0],
        role: userRole,
        preferences: {
          theme: 'auto',
          language: 'en',
          autoSync: true,
          notifications: true,
          ...roleService.getDefaultRolePreferences(userRole),
        },
        premium: {
          isActive: false,
          type: null,
        },
        permissions: roleService.getDefaultPermissions(userRole),
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('Minimal profile created successfully with role:', userRole);
      
      // Create Stripe customer for the new user (async, don't wait for it)
      // this.createStripeCustomer(supabaseUser.id, supabaseUser.email).catch(error => {
      //   console.warn('Failed to create Stripe customer for minimal profile:', error);
      // });
      
      return minimalProfile;
    } catch (error) {
      console.error('Error creating minimal user profile:', error);
      throw error;
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('Error updating last login:', error);
      }
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  // private async createStripeCustomer(userId: string, email: string): Promise<void> {
  //   try {
  //     console.log('Creating Stripe customer for user:', userId, 'with email:', email);
      
  //     // Check if user already has a Stripe customer ID
  //     const { data: userProfile, error: profileError } = await supabase
  //       .from('user_profiles')
  //       .select('stripe_customer_id')
  //       .eq('id', userId)
  //       .single();

  //     if (profileError) {
  //       console.error('Error checking user profile for Stripe customer:', profileError);
  //       return;
  //     }

  //     if (userProfile?.stripe_customer_id) {
  //       console.log('User already has Stripe customer ID:', userProfile.stripe_customer_id);
  //       return;
  //     }

  //     // Call the webhook server to create Stripe customer
  //     const webhookBaseUrl = process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL || 'http://127.0.0.1:3001';
  //     const response = await fetch(`${webhookBaseUrl}/stripe/create-customer`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         userId,
  //         email,
  //       }),
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json().catch(() => ({}));
  //       throw new Error(`Failed to create Stripe customer: ${response.status} ${errorData.error || response.statusText}`);
  //     }

  //     const result = await response.json();
  //     console.log('✅ Stripe customer created successfully:', result.customerId);
      
  //   } catch (error) {
  //     console.error('Error creating Stripe customer:', error);
  //     throw error;
  //   }
  // }

  private setupSessionRefresh() {
    // Refresh session every 30 minutes to keep it alive
    setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('BetterAuthService: Refreshing session...');
          await supabase.auth.refreshSession();
        }
      } catch (error) {
        console.error('Error refreshing session:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    // For mobile, also set up app state change handling
    if (typeof window === 'undefined') {
      this.setupMobileAppStateHandling();
    }
  }

  private setupWebPageVisibilityHandling() {
    try {
      // Only run on web platform
      if (Platform.OS !== 'web') {
        console.log('BetterAuthService: Skipping web page visibility handling on mobile');
        return;
      }

      // Use throttled visibility handler
      const throttledVisibilityHandler = throttle(async () => {
        try {
          // Page became visible, check session only if we don't have a current user
          if (!this.currentUser) {
            console.log('BetterAuthService: Page became visible, checking session...');
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              console.log('BetterAuthService: Found session on page visibility, restoring...');
              await this.handleSignIn(session.user);
            }
          }
        } catch (error) {
          console.error('Error checking session on visibility change:', error);
        }
      }, 2000); // 2 second throttle
      
      // Use debounced visibility handler
      const debouncedVisibilityHandler = debounce(async () => {
        if (typeof document !== 'undefined' && !document.hidden) {
          await throttledVisibilityHandler();
        }
      }, 500); // 500ms debounce
      
      // Add event listener for page visibility changes
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', debouncedVisibilityHandler);
      }
      
      console.log('BetterAuthService: Web page visibility handling set up with optimizations');
    } catch (error) {
      console.error('Error setting up web page visibility handling:', error);
    }
  }

  private setupMobileAppStateHandling() {
    try {
      // Import AppState dynamically to avoid issues on web
      const { AppState } = require('react-native');
      
      let appState = AppState.currentState;
      let lastActiveTime = Date.now();
      
      AppState.addEventListener('change', async (nextAppState: string) => {
        console.log('BetterAuthService: App state changed from', appState, 'to', nextAppState);
        
        if (appState.match(/inactive|background/) && nextAppState === 'active') {
          // App came to foreground, check and restore session if needed
          console.log('BetterAuthService: App became active, checking session...');
          
          // Add a longer delay for mobile to ensure the app is fully active
          const delay = Math.min(1000, Math.max(500, Date.now() - lastActiveTime));
          await new Promise(resolve => setTimeout(resolve, delay));
          
          try {
            // Check if we have a current user first
            if (!this.currentUser) {
              console.log('BetterAuthService: No current user, attempting session restoration...');
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                console.log('BetterAuthService: Found session on app activation, restoring...');
                await this.handleSignIn(session.user);
              } else {
                console.log('BetterAuthService: No session found on app activation');
              }
            } else {
              console.log('BetterAuthService: Current user exists, validating session...');
              // Validate current user to ensure session is still valid
              const isValid = await this.validateCurrentUser();
              if (!isValid) {
                console.log('BetterAuthService: Current user invalid, attempting to restore...');
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                  await this.handleSignIn(session.user);
                }
              }
            }
          } catch (error) {
            console.error('Error restoring session on app activation:', error);
          }
        }
        
        appState = nextAppState;
        if (nextAppState === 'active') {
          lastActiveTime = Date.now();
        }
      });
      
      console.log('BetterAuthService: Mobile app state handling set up successfully');
    } catch (error) {
      console.error('Error setting up mobile app state handling:', error);
    }
  }

  setErrorHandler(callback: (error: string, type: 'error' | 'warning' | 'info') => void) {
    this.onError = callback;
  }

  setAuthStateChangeHandler(callback: (user: User | null) => void) {
    this.onAuthStateChange = callback;
  }

  // Check if the service is ready for use
  isReady(): boolean {
    return this.authStateListenerInitialized;
  }

  // Get the current session restoration status
  getSessionRestorationStatus(): 'idle' | 'in-progress' | 'completed' | 'failed' {
    if (this.sessionRestorationPromise) {
      return 'in-progress';
    }
    if (this.currentUser) {
      return 'completed';
    }
    return 'idle';
  }

  // Admin methods
  async getAllUsers(): Promise<User[]> {
    try {
      // Check if current user is admin
      if (!this.currentUser || this.currentUser.role !== 'admin') {
        throw new Error('Admin access required');
      }

      // Get profiles from user_profiles table (email should be stored here)
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Sample profile data:', profiles[0]);
      
      return (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email || '',
        displayName: profile.display_name,
        role: profile.role,
        premium: profile.premium,
        permissions: profile.permissions,
        preferences: profile.preferences || {
          theme: 'auto',
          language: 'en',
          autoSync: true,
          notifications: true,
          autoKeyDetails: false,
          autoAISummaries: false,
        },
        lastLoginAt: profile.last_login_at ? new Date(profile.last_login_at) : new Date(),
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at),
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  async updateUserRole(userId: string, newRole: string): Promise<void> {
    try {
      // Check if current user is admin
      if (!this.currentUser || this.currentUser.role !== 'admin') {
        throw new Error('Admin access required');
      }

      // Use RoleService to force assign the role (this bypasses domain-based assignment)
      await roleService.forceAssignRole(userId, newRole as UserRole, this.currentUser.id, 'Admin role update');
      
      console.log(`Successfully updated user ${userId} role to ${newRole}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      console.log('BetterAuthService: Updating preferences for user:', this.currentUser.id);
      console.log('BetterAuthService: New preferences:', preferences);

      // Merge with existing preferences
      const currentPreferences = this.currentUser.preferences || {};
      const updatedPreferences = { ...currentPreferences, ...preferences };

      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentUser.id);

      if (error) {
        console.error('Error updating preferences:', error);
        throw error;
      }

      // Update local user state
      this.currentUser = {
        ...this.currentUser,
        preferences: updatedPreferences
      };

      // Notify auth state change
      if (this.onAuthStateChange) {
        this.onAuthStateChange(this.currentUser);
      }

      console.log('BetterAuthService: Preferences updated successfully');
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  private async restoreSession() {
    try {
      console.log('BetterAuthService: Attempting to restore session...');
      
      // Add timeout for session restoration to prevent hanging
      // Mobile needs more time due to slower network and app state changes
      const timeoutMs = Platform.OS === 'web' ? 8000 : 15000;
      const sessionPromise = this.performSessionRestoration();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Session restoration timeout (${timeoutMs}ms)`)), timeoutMs)
      );
      
      await Promise.race([sessionPromise, timeoutPromise]);
      console.log('BetterAuthService: Session restoration completed');
    } catch (error) {
      console.error('Error restoring session:', error);
      // Don't throw error to prevent app from crashing
      // On mobile, try to recover gracefully
      if (Platform.OS !== 'web') {
        console.log('BetterAuthService: Mobile session restoration failed, will retry on next app activation');
      }
    }
  }

  private async performSessionRestoration() {
    try {
      // Try to get session with retry logic
      let session = null;
      let error = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`BetterAuthService: Session restoration attempt ${attempt}/3...`);
          const result = await supabase.auth.getSession();
          session = result.data.session;
          error = result.error;
          
          if (session?.user || !error) {
            break; // Success or no error, exit retry loop
          }
          
          if (attempt < 3) {
            console.log(`BetterAuthService: Session restoration attempt ${attempt} failed, retrying in 1s...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (sessionError) {
          error = sessionError;
          if (attempt < 3) {
            console.log(`BetterAuthService: Session restoration attempt ${attempt} threw error, retrying in 1s...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (error) {
        console.error('Error during session restoration:', error);
        // Clear any stale user data
        this.currentUser = null;
        if (this.onAuthStateChange) {
          this.onAuthStateChange(null);
        }
        return;
      }
      
      if (session?.user) {
        console.log('BetterAuthService: Found stored session, restoring user...');
        // Verify the user still exists in the database before restoring
        try {
          const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id, role, preferences, premium')
            .eq('id', session.user.id)
            .single();
          
          if (profileError || !userProfile) {
            console.error('User profile not found during session restoration:', profileError);
            // Clear the invalid session
            await supabase.auth.signOut();
            this.currentUser = null;
            if (this.onAuthStateChange) {
              this.onAuthStateChange(null);
            }
            return;
          }
          
          // User exists, proceed with restoration
          await this.handleSignIn(session.user);
        } catch (profileError) {
          console.error('Error verifying user profile during session restoration:', profileError);
          // Clear the invalid session
          await supabase.auth.signOut();
          this.currentUser = null;
          if (this.onAuthStateChange) {
            this.onAuthStateChange(null);
          }
        }
      } else {
        console.log('BetterAuthService: No stored session found');
        // Ensure user is cleared when no session exists
        this.currentUser = null;
        if (this.onAuthStateChange) {
          this.onAuthStateChange(null);
        }
      }
    } catch (error) {
      console.error('Error during session restoration:', error);
      // Clear any stale user data on error
      this.currentUser = null;
      if (this.onAuthStateChange) {
        this.onAuthStateChange(null);
      }
    }
  }

  // Force refresh session for mobile recovery
  async forceRefreshSession(): Promise<User | null> {
    try {
      console.log('BetterAuthService: Force refreshing session...');
      
      // Clear current user to force fresh load
      this.currentUser = null;
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Try to get fresh session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('BetterAuthService: Found fresh session, loading user...');
        await this.handleSignIn(session.user);
        return this.currentUser;
      } else {
        console.log('BetterAuthService: No fresh session found');
        return null;
      }
    } catch (error) {
      console.error('BetterAuthService: Error force refreshing session:', error);
      return null;
    }
  }

  // Validate current user exists in database
  async validateCurrentUser(): Promise<boolean> {
    try {
      if (!this.currentUser?.id) {
        console.log('BetterAuthService: No current user to validate');
        return false;
      }

      console.log('BetterAuthService: Validating current user:', this.currentUser.id);
      
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', this.currentUser.id)
        .single();

      if (error || !userProfile) {
        console.error('BetterAuthService: User validation failed:', error);
        // Clear the invalid user
        this.currentUser = null;
        if (this.onAuthStateChange) {
          this.onAuthStateChange(null);
        }
        return false;
      }

      console.log('BetterAuthService: User validation successful');
      return true;
    } catch (error) {
      console.error('BetterAuthService: Error validating user:', error);
      return false;
    }
  }

  // Get current user with validation
  async getCurrentUserWithValidation(): Promise<User | null> {
    // First validate the current user
    const isValid = await this.validateCurrentUser();
    
    if (!isValid) {
      console.log('BetterAuthService: Current user validation failed, returning null');
      return null;
    }
    
    return this.currentUser;
  }

  private handleError(error: unknown, context: string = 'Authentication'): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`BetterAuthService: ${context} error:`, error);
    
    if (this.onError) {
      this.onError(errorMessage, 'error');
    }
    
    throw new Error(`${context}: ${errorMessage}`);
  }
}

// Export singleton instance - lazy initialization
let _betterAuthService: BetterAuthService | null = null;

export const betterAuthService = {
  get instance() {
    if (!_betterAuthService) {
      _betterAuthService = new BetterAuthService();
    }
    return _betterAuthService;
  },
  // Proxy all methods to the instance
  signUp: (credentials: SignupCredentials) => betterAuthService.instance.signUp(credentials),
  signIn: (credentials: LoginCredentials) => betterAuthService.instance.signIn(credentials),
  signOut: () => betterAuthService.instance.signOut(),
  getCurrentUser: () => betterAuthService.instance.getCurrentUser(),
  setErrorHandler: (callback: (error: string, type: 'error' | 'warning' | 'info') => void) => betterAuthService.instance.setErrorHandler(callback),
  setAuthStateChangeHandler: (callback: (user: User | null) => void) => betterAuthService.instance.setAuthStateChangeHandler(callback),
  updatePreferences: (preferences: Partial<UserPreferences>) => betterAuthService.instance.updatePreferences(preferences),
  getCurrentUserWithValidation: () => betterAuthService.instance.getCurrentUserWithValidation(),
}; 