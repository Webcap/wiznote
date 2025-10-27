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
import { validateSignIn, validateSignUp, validateEmail } from '../schemas/AuthSchema';
import { sanitizeEmail } from '../utils/sanitization';
// Pre-import auth functions to avoid dynamic import issues on mobile
import { 
  shouldRequireEmailVerification,
  checkAuthRateLimit,
  formatRateLimitError,
  logAuthEvent,
  terminateSession,
  shouldLockAccount,
  lockAccount,
  getRecentFailedLogins,
  isAccountLocked,
  formatLockoutMessage,
  trackSession
} from '../lib/auth';

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
    // Initialize auth state listener first - this will handle INITIAL_SESSION events
    this.initializeAuthStateListener();
    
    // Start session restoration as a backup after a short delay
    // This allows INITIAL_SESSION to fire first (which is the preferred method)
    // On mobile, this ensures we restore the session even if INITIAL_SESSION doesn't fire within 3 seconds
    // On web, this is a backup if the event listener doesn't catch it
    setTimeout(() => {
      // Only restore if we still don't have a user and are not already restoring
      if (!this.currentUser && !this.isRestoringSession) {
        this.sessionRestorationPromise = this.restoreSession().catch(error => {
          // Silently handle session restoration errors
          console.warn('BetterAuthService: Session restoration failed silently:', error.message);
          this.sessionRestorationPromise = null;
        });
      } else {
        console.log('BetterAuthService: Skipping manual restoration - user already loaded or restoration in progress');
      }
    }, 3000); // 3 second delay to let INITIAL_SESSION fire first
  }

  private initializeAuthStateListener() {
    // Listen for auth state changes with debouncing for web
    let authStateChangeTimeout: number | null = null;
    
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 BetterAuthService: Auth state changed:', event, session?.user?.id, 'currentUser:', this.currentUser?.id);
      
      // Debounce auth state changes on web to prevent rapid firing
      if (Platform.OS === 'web' && authStateChangeTimeout) {
        clearTimeout(authStateChangeTimeout);
      }
      
      // Don't debounce INITIAL_SESSION or TOKEN_REFRESHED events - these are critical for session restoration
      const isImmediateEvent = event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED';
      
      authStateChangeTimeout = setTimeout(async () => {
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('🔄 BetterAuthService: Handling SIGNED_IN event');
            // Only handle if we don't already have this user loaded
            if (!this.currentUser || this.currentUser.id !== session.user.id) {
              await this.handleSignInOrSignUp(session.user);
            } else {
              console.log('🔄 BetterAuthService: Skipping SIGNED_IN - user already loaded');
            }
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
            } else {
              console.log('🔄 BetterAuthService: User already loaded with current ID');
            }
          } else if (event === 'INITIAL_SESSION' && session?.user) {
            // Handle initial session load (e.g., on page refresh)
            // But only if we're not in the middle of signing out
            if (!this.isSigningOut) {
              // Only restore if we don't already have this user loaded
              if (!this.currentUser || this.currentUser.id !== session.user.id) {
                console.log('🔄 BetterAuthService: Initial session detected, loading user...');
                await this.handleSignInOrSignUp(session.user);
              } else {
                console.log('🔄 BetterAuthService: User already loaded, skipping INITIAL_SESSION');
              }
            } else {
              console.log('🔄 BetterAuthService: Ignoring initial session - sign out in progress');
            }
          } else if (event === 'USER_UPDATED' && session?.user) {
            // Handle user updates
            console.log('🔄 BetterAuthService: User updated, refreshing user data...');
            if (!this.currentUser || this.currentUser.id !== session.user.id) {
              await this.handleSignInOrSignUp(session.user);
            }
          }
        } catch (error) {
          console.error('❌ BetterAuthService: Error handling auth state change:', error);
        }
      }, isImmediateEvent ? 0 : (Platform.OS === 'web' ? 100 : 0)); // No debounce for critical events
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
      
      // Set minimal user immediately so app doesn't redirect to login
      const minimalUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        displayName: supabaseUser.email?.split('@')[0] || 'User',
        photoURL: supabaseUser.user_metadata?.avatar_url,
        role: 'user' as UserRole,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        preferences: { theme: 'auto', language: 'en', autoSync: true, notifications: true },
        premium: null,
        permissions: { canCreateNotes: true, canExportNotes: true, canShareNotes: true },
        supportInfo: null,
      };
      
      this.currentUser = minimalUser;
      if (this.onAuthStateChange) {
        this.onAuthStateChange(minimalUser);
      }
      console.log('BetterAuthService: Minimal user set, loading full profile in background...');
      
      // Load full profile in background without blocking
      this.loadUserProfile(supabaseUser.id).then(userProfile => {
        if (!userProfile) {
          console.warn('BetterAuthService: Could not load full profile, using minimal user data');
          return;
        }
        
        console.log('BetterAuthService: Full profile loaded for handleSignInOrSignUp, updating...');
        const fullUser: User = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          displayName: userProfile.display_name || supabaseUser.email?.split('@')[0],
          photoURL: supabaseUser.user_metadata?.avatar_url,
          role: userProfile.role,
          createdAt: userProfile.created_at ? new Date(userProfile.created_at) : new Date(),
          lastLoginAt: userProfile.last_login_at ? new Date(userProfile.last_login_at) : new Date(),
          preferences: userProfile.preferences,
          premium: userProfile.premium,
          permissions: userProfile.permissions,
          supportInfo: userProfile.support_info,
        };
        
        this.currentUser = fullUser;
        if (this.onAuthStateChange) {
          this.onAuthStateChange(fullUser);
        }
        
        if (isWeb && isLocalStorageAvailable()) {
          cacheSession(fullUser);
        }
        
        this.updateLastLogin(supabaseUser.id).catch(console.error);
      }).catch(error => {
        console.error('BetterAuthService: Error loading full profile in background:', error);
      });
      
      console.log('User handled successfully:', minimalUser.id);
      
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
      
      // Set minimal user immediately so app doesn't redirect to login
      const minimalUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        displayName: supabaseUser.email?.split('@')[0] || 'User',
        photoURL: supabaseUser.user_metadata?.avatar_url,
        role: 'user' as UserRole,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        preferences: { theme: 'auto', language: 'en', autoSync: true, notifications: true },
        premium: null,
        permissions: { canCreateNotes: true, canExportNotes: true, canShareNotes: true },
        supportInfo: null,
      };
      
      this.currentUser = minimalUser;
      if (this.onAuthStateChange) {
        this.onAuthStateChange(minimalUser);
      }
      console.log('BetterAuthService: Minimal user set, loading full profile in background...');
      
      // Load full profile in background
      this.loadUserProfile(supabaseUser.id).then(userProfile => {
        if (!userProfile) {
          console.warn('BetterAuthService: Could not load full profile, using minimal user data');
          return;
        }
        
        console.log('BetterAuthService: Full profile loaded, updating user...');
        const fullUser: User = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          displayName: userProfile.display_name || supabaseUser.email?.split('@')[0],
          photoURL: supabaseUser.user_metadata?.avatar_url,
          role: userProfile.role,
          createdAt: userProfile.created_at ? new Date(userProfile.created_at) : new Date(),
          lastLoginAt: userProfile.last_login_at ? new Date(userProfile.last_login_at) : new Date(),
          preferences: userProfile.preferences,
          premium: userProfile.premium,
          permissions: userProfile.permissions,
          supportInfo: userProfile.support_info,
        };
        
        this.currentUser = fullUser;
        if (this.onAuthStateChange) {
          this.onAuthStateChange(fullUser);
        }
        
        if (Platform.OS === 'web' && isLocalStorageAvailable()) {
          cacheSession(fullUser);
        }
        
        this.updateLastLogin(supabaseUser.id).catch(console.error);
      }).catch(error => {
        console.error('BetterAuthService: Error loading full profile:', error);
      });
      
      console.log('User signed in successfully:', minimalUser.id);
      
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
      
      // ✅ STEP 1: Validate and sanitize input
      console.log('Validating sign-in credentials...');
      const validatedCredentials = validateSignIn({
        email: credentials.email,
        password: credentials.password,
      });
      
      // Sanitize email (normalize to lowercase, trim)
      const sanitizedEmail = sanitizeEmail(validatedCredentials.email);
      console.log('✅ Sign-in validation passed');
      
      // ✅ STEP 2: Check if account is locked (wrapped to prevent crashes)
      try {
        const lockoutStatus = await isAccountLocked(sanitizedEmail);
        if (lockoutStatus.isLocked) {
          const lockoutMessage = await formatLockoutMessage(sanitizedEmail);
          console.warn('Sign-in blocked: Account is locked:', {
            email: sanitizedEmail,
            lockedUntil: lockoutStatus.lockedUntil,
            remainingMinutes: lockoutStatus.remainingMinutes,
          });
          throw new Error(lockoutMessage);
        }

        console.log('Account lockout check passed:', {
          email: sanitizedEmail,
          isLocked: false,
        });
      } catch (lockoutError) {
        // Re-throw if it's a lockout message, otherwise log and continue
        if (lockoutError instanceof Error && lockoutError.message.includes('locked')) {
          throw lockoutError;
        }
        console.error('Failed to check account lockout:', lockoutError);
      }

      // ✅ STEP 3: Check rate limit BEFORE attempting authentication (wrapped to prevent crashes)
      try {
        const rateLimitCheck = await checkAuthRateLimit(sanitizedEmail, 'auth_signin');
        
        if (!rateLimitCheck.allowed) {
          console.warn('Sign-in rate limit exceeded:', {
            email: sanitizedEmail,
            attempts: rateLimitCheck.attemptCount,
            maxAttempts: rateLimitCheck.maxAttempts,
          });
          throw new Error(formatRateLimitError(rateLimitCheck));
        }

        console.log('Rate limit check passed:', {
          enabled: rateLimitCheck.attemptCount > 0,
          attempts: rateLimitCheck.attemptCount,
          maxAttempts: rateLimitCheck.maxAttempts,
        });
      } catch (rateLimitError) {
        // Re-throw if it's a rate limit message, otherwise log and continue
        if (rateLimitError instanceof Error && rateLimitError.message.includes('rate limit')) {
          throw rateLimitError;
        }
        console.error('Failed to check rate limit:', rateLimitError);
      }
      
      // Use sanitized email for authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: validatedCredentials.password, // Use validated password
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('No user returned from sign in');
      }

      // Check if email verification is required per system settings (wrapped to prevent crashes)
      let requireEmailVerification = true; // Default to true for security
      try {
        requireEmailVerification = await shouldRequireEmailVerification();
        
        // If email verification is required but user hasn't verified their email, reject sign-in
        if (requireEmailVerification && !data.user.email_confirmed_at) {
          console.log('Sign-in blocked: Email verification required but not completed');
          throw new Error('Email not confirmed. Please check your email inbox and click the verification link before signing in.');
        }

        console.log('Email verification check passed:', {
          required: requireEmailVerification,
          confirmed: !!data.user.email_confirmed_at
        });
      } catch (verifyError) {
        // Re-throw if it's an email verification message, otherwise log and continue
        if (verifyError instanceof Error && verifyError.message.includes('Email not confirmed')) {
          throw verifyError;
        }
        console.error('Failed to check email verification requirement:', verifyError);
      }

      // For regular sign-in, use the handleSignIn method that doesn't create profiles
      await this.handleSignIn(data.user);
      
      // ✅ Track session (wrapped to prevent crashes)
      try {
        if (data.session) {
          await trackSession(
            data.user.id,
            sanitizedEmail,
            data.session.access_token,
            false // isRememberMe - can be enhanced later with checkbox
          );
        }
      } catch (trackError) {
        console.error('Failed to track session:', trackError);
      }
      
      // ✅ Log successful sign-in (wrapped to prevent crashes)
      try {
        await logAuthEvent(
          'auth.login.success',
          data.user.id,
          sanitizedEmail,
          true,
          undefined,
          { email_verified: !!data.user.email_confirmed_at }
        );
      } catch (logError) {
        console.error('Failed to log signin success:', logError);
      }
      
      return this.currentUser!;
      
    } catch (error) {
      console.error('Error signing in:', error);
      
      const sanitizedEmail = sanitizeEmail(credentials.email);
      
      // ✅ Log failed sign-in (wrapped to prevent crashes on mobile)
      try {
        await logAuthEvent(
          'auth.login.failure',
          undefined,
          sanitizedEmail,
          false,
          error instanceof Error ? error.message : 'Unknown error'
        );
      } catch (logError) {
        console.error('Failed to log signin failure:', logError);
      }
      
      // ✅ Check if account should be locked (wrapped to prevent crashes)
      try {
        const isAuthError = error instanceof Error && 
          !error.message.includes('rate limit') && 
          !error.message.includes('locked') &&
          !error.message.includes('Email not confirmed');
        
        if (isAuthError) {
          const shouldLock = await shouldLockAccount(sanitizedEmail);
          
          if (shouldLock) {
            console.warn(`[BetterAuthService] Locking account ${sanitizedEmail} due to too many failed attempts`);
            
            // Get failed login info for context
            const failedLogins = await getRecentFailedLogins(sanitizedEmail, 15);
            
            // Find user ID from Supabase (best effort)
            let userId: string | undefined;
            try {
              const { data: userData } = await supabase.auth.admin.listUsers();
              const userRecord = userData.users.find(u => u.email?.toLowerCase() === sanitizedEmail);
              userId = userRecord?.id;
            } catch (e) {
              console.warn('[BetterAuthService] Could not find user ID for lockout');
            }
            
            if (userId) {
              // Lock the account
              await lockAccount(userId, sanitizedEmail, {
                failedAttempts: failedLogins.attemptCount,
                lockReason: 'too_many_failed_attempts',
                ipAddresses: failedLogins.ipAddresses,
              });
              
              console.log(`[BetterAuthService] ✅ Account ${sanitizedEmail} locked successfully`);
            }
          }
        }
      } catch (lockoutError) {
        console.error('Failed to process account lockout:', lockoutError);
      }
      
      // Call handleError (wrapped to prevent crashes)
      try {
        this.handleError(error, 'Sign In');
      } catch (handleErrorFailure) {
        console.error('handleError failed:', handleErrorFailure);
      }
      
      throw error; // Re-throw the error so the UI can handle it
    }
  }

  async signUp(credentials: SignupCredentials): Promise<User> {
    try {
      console.log('Signing up with credentials...');
      
      // ✅ STEP 1: Validate and sanitize input
      console.log('Validating sign-up credentials...');
      const validatedCredentials = validateSignUp({
        email: credentials.email,
        password: credentials.password,
        displayName: credentials.displayName,
        acceptTerms: true, // Assume terms accepted if they got here
      });
      
      // Sanitize email and display name
      const sanitizedEmail = sanitizeEmail(validatedCredentials.email);
      console.log('✅ Sign-up validation passed');
      
      // Check rate limit BEFORE attempting signup (wrapped to prevent crashes)
      try {
        const rateLimitCheck = await checkAuthRateLimit(sanitizedEmail, 'auth_signup');
        
        if (!rateLimitCheck.allowed) {
          console.warn('Sign-up rate limit exceeded:', {
            email: sanitizedEmail,
            attempts: rateLimitCheck.attemptCount,
            maxAttempts: rateLimitCheck.maxAttempts,
          });
          throw new Error(formatRateLimitError(rateLimitCheck));
        }

        console.log('Rate limit check passed:', {
          enabled: rateLimitCheck.attemptCount > 0,
          attempts: rateLimitCheck.attemptCount,
          maxAttempts: rateLimitCheck.maxAttempts,
        });
      } catch (rateLimitError) {
        // Re-throw if it's a rate limit message, otherwise log and continue
        if (rateLimitError instanceof Error && rateLimitError.message.includes('rate limit')) {
          throw rateLimitError;
        }
        console.error('Failed to check rate limit:', rateLimitError);
      }
      
      // Check email verification requirement (wrapped to prevent crashes)
      let requireEmailVerification = true; // Default to true for security
      try {
        requireEmailVerification = await shouldRequireEmailVerification();
      } catch (emailVerifyError) {
        console.error('Failed to check email verification setting:', emailVerifyError);
      }
      
      console.log('Email verification required:', requireEmailVerification);
      
      // Determine redirect URL based on platform
      const getRedirectUrl = () => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          // For web, use the web URL
          return `${window.location.origin}/auth/callback`;
        } else {
          // For mobile, use deep link
          return 'wiznote://auth/callback';
        }
      };

      // Use validated and sanitized credentials
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: validatedCredentials.password,
        options: {
          data: {
            display_name: validatedCredentials.displayName || '',
          },
          emailRedirectTo: getRedirectUrl(),
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
      let userProfile;
      try {
        userProfile = await this.createUserProfile(data.user);
        console.log('✅ User profile created successfully:', userProfile);
      } catch (profileError) {
        console.error('❌ Failed to create user profile during signup:', profileError);
        // Try to create a minimal profile as fallback
        try {
          userProfile = await this.createMinimalUserProfile(data.user);
          console.log('✅ Created minimal user profile as fallback');
        } catch (minimalError) {
          console.error('❌ Failed to create minimal user profile:', minimalError);
          // Profile creation failed completely - this is a critical error
          throw new Error(`Failed to create user profile: ${profileError instanceof Error ? profileError.message : 'Unknown error'}`);
        }
      }

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
        displayName: userProfile.display_name || data.user.email?.split('@')[0],
        photoURL: data.user.user_metadata?.avatar_url,
        role: userProfile.role,
        createdAt: userProfile.created_at ? new Date(userProfile.created_at) : new Date(),
        lastLoginAt: userProfile.last_login_at ? new Date(userProfile.last_login_at) : new Date(),
        preferences: userProfile.preferences,
        premium: userProfile.premium,
        permissions: userProfile.permissions,
        supportInfo: userProfile.support_info,
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
      
      // ✅ Log successful sign-up (wrapped to prevent crashes)
      try {
        await logAuthEvent(
          'auth.signup.success',
          data.user.id,
          sanitizedEmail,
          true,
          undefined,
          { 
            email_verified: !!data.user.email_confirmed_at,
            display_name: validatedCredentials.displayName 
          }
        );
      } catch (logError) {
        console.error('Failed to log signup success:', logError);
      }
      
      return user;
      
    } catch (error) {
      console.error('Error signing up:', error);
      
      // ✅ Log failed sign-up (wrapped in try-catch to prevent crashes)
      try {
        await logAuthEvent(
          'auth.signup.failure',
          undefined,
          credentials.email,
          false,
          error instanceof Error ? error.message : 'Unknown error'
        );
      } catch (logError) {
        // Silently fail logging on mobile to prevent crashes
        console.error('Failed to log signup failure:', logError);
      }
      
      // Call handleError which will notify the UI via onError callback (wrapped to prevent crashes)
      try {
        this.handleError(error, 'Sign Up');
      } catch (handleErrorFailure) {
        console.error('handleError failed:', handleErrorFailure);
      }
      
      // Re-throw the error so the UI can handle it
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      console.log('BetterAuthService: Initiating password reset for:', email);
      
      // ✅ STEP 1: Validate and sanitize input
      const sanitizedEmail = sanitizeEmail(email);
      console.log('✅ Password reset validation passed');
      
      // ✅ STEP 2: Check rate limit for password reset requests
      try {
        const rateLimitCheck = await checkAuthRateLimit(sanitizedEmail, 'password_reset');
        
        if (!rateLimitCheck.allowed) {
          console.warn('Password reset rate limit exceeded:', {
            email: sanitizedEmail,
            attempts: rateLimitCheck.attemptCount,
            maxAttempts: rateLimitCheck.maxAttempts,
          });
          throw new Error(formatRateLimitError(rateLimitCheck));
        }

        console.log('Password reset rate limit check passed:', {
          enabled: rateLimitCheck.attemptCount > 0,
          attempts: rateLimitCheck.attemptCount,
          maxAttempts: rateLimitCheck.maxAttempts,
        });
      } catch (rateLimitError) {
        if (rateLimitError instanceof Error && rateLimitError.message.includes('rate limit')) {
          throw rateLimitError;
        }
        console.error('Failed to check password reset rate limit:', rateLimitError);
      }
      
      // ✅ STEP 3: Determine redirect URL based on platform
      const getRedirectUrl = () => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          return `${window.location.origin}/reset-password`;
        } else {
          // For mobile app, use web URL that will trigger deep linking
          // This allows the link to work in email clients and automatically open the app
          // If you have a custom domain, update this URL
          const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:8081';
          return `${webUrl}/reset-password`;
        }
      };
      
      // ✅ STEP 4: Send password reset email via Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: getRedirectUrl(),
      });

      if (error) {
        console.error('Password reset error:', error);
        throw error;
      }
      
      // ✅ STEP 5: Log successful password reset request
      try {
        await logAuthEvent(
          'auth.password_reset.request',
          undefined,
          sanitizedEmail,
          true,
          undefined,
          { platform: Platform.OS }
        );
      } catch (logError) {
        console.error('Failed to log password reset request:', logError);
      }
      
      console.log('✅ Password reset email sent successfully to:', sanitizedEmail);
      
    } catch (error) {
      console.error('Error requesting password reset:', error);
      
      // ✅ Log failed password reset request
      try {
        await logAuthEvent(
          'auth.password_reset.request',
          undefined,
          email,
          false,
          error instanceof Error ? error.message : 'Unknown error'
        );
      } catch (logError) {
        console.error('Failed to log password reset failure:', logError);
      }
      
      throw error;
    }
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      console.log('BetterAuthService: Updating password...');
      
      if (!this.currentUser) {
        throw new Error('User must be authenticated to update password');
      }
      
      // ✅ STEP 1: Verify current password by attempting to sign in
      console.log('🔐 Verifying current password...');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: this.currentUser.email,
        password: currentPassword,
      });

      if (signInError) {
        console.error('❌ Current password verification failed:', signInError);
        throw new Error('Current password is incorrect');
      }
      
      console.log('✅ Current password verified');
      
      // ✅ STEP 2: Validate new password
      const validatedPassword = validateSignIn({
        email: this.currentUser.email,
        password: newPassword,
      }).password;
      
      console.log('✅ New password validation passed');
      
      // ✅ STEP 3: Update password via Supabase
      const { error } = await supabase.auth.updateUser({
        password: validatedPassword
      });

      if (error) {
        console.error('Password update error:', error);
        throw error;
      }
      
      // ✅ STEP 3: Log successful password update
      try {
        await logAuthEvent(
          'auth.password_reset.success',
          this.currentUser.id,
          this.currentUser.email,
          true,
          undefined,
          { platform: Platform.OS }
        );
      } catch (logError) {
        console.error('Failed to log password update:', logError);
      }
      
      console.log('✅ Password updated successfully for user:', this.currentUser.id);
      
    } catch (error) {
      console.error('Error updating password:', error);
      
      // ✅ Log failed password update
      try {
        if (this.currentUser) {
          await logAuthEvent(
            'auth.password_reset.success',
            this.currentUser.id,
            this.currentUser.email,
            false,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      } catch (logError) {
        console.error('Failed to log password update failure:', logError);
      }
      
      throw error;
    }
  }

  async signInWithGoogle(): Promise<User> {
    try {
      console.log('Signing in with Google...');
      
      // Determine redirect URL based on platform
      const getRedirectUrl = () => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          // For web, use the web URL
          return `${window.location.origin}/auth/callback`;
        } else {
          // For mobile, use deep link
          return 'wiznote://auth/callback';
        }
      };
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
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
      throw error; // Re-throw the error so the UI can handle it
    }
  }

  async signOut(): Promise<void> {
    try {
      console.log('🔄 BetterAuthService: Starting sign out process...');
      
      // ✅ Terminate session tracking (wrapped to prevent crashes)
      try {
        if (this.currentUser) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await terminateSession(session.access_token, this.currentUser.id, 'logout');
          }
        }
      } catch (terminateError) {
        console.error('Failed to terminate session:', terminateError);
      }
      
      // ✅ Log logout event before clearing user data (wrapped to prevent crashes)
      try {
        if (this.currentUser) {
          await logAuthEvent(
            'auth.logout',
            this.currentUser.id,
            this.currentUser.email,
            true
          );
        }
      } catch (logError) {
        console.error('Failed to log logout:', logError);
      }
      
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
          
          // Add timeout to session retrieval
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session retrieval timeout')), 8000) // 8 second timeout
          );
          
          const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
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
            displayName: userProfile.display_name || session.user.email?.split('@')[0],
            photoURL: session.user.user_metadata?.avatar_url,
            role: userProfile.role,
            createdAt: userProfile.created_at ? new Date(userProfile.created_at) : new Date(),
            lastLoginAt: userProfile.last_login_at ? new Date(userProfile.last_login_at) : new Date(),
            preferences: userProfile.preferences,
            premium: userProfile.premium,
            permissions: userProfile.permissions,
            supportInfo: userProfile.support_info,
          };
          
          // Cache the current user
          this.currentUser = user;
          
          return user;
        } else {
          console.log('BetterAuthService: No user profile found');
          // Don't create a profile here - user must sign up first
          this.currentUser = null;
          return null;
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
    const maxRetries = Platform.OS === 'web' ? 2 : 3;
    const retryDelay = 1000; // 1 second between retries
    const queryTimeoutMs = Platform.OS === 'web' ? 5000 : 15000; // 15s for mobile
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`BetterAuthService: Retrying profile load (attempt ${attempt}/${maxRetries}) for:`, userId);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          console.log('BetterAuthService: Loading user profile for:', userId);
        }
        
        const profilePromise = supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), queryTimeoutMs)
        );
        
        const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.log('BetterAuthService: No user profile found for:', userId);
            return null;
          }
          
          if (attempt < maxRetries) {
            console.warn(`BetterAuthService: Profile load failed (attempt ${attempt}/${maxRetries}), retrying...`);
            continue;
          }
          
          console.error('BetterAuthService: Error loading user profile:', error);
          return null;
        }
        
        console.log('BetterAuthService: User profile loaded successfully');
        return profile;
      } catch (raceError) {
        if (raceError instanceof Error && raceError.message.includes('timeout')) {
          if (attempt < maxRetries) {
            console.warn(`BetterAuthService: Database query timed out (attempt ${attempt}/${maxRetries}), retrying...`);
            continue;
          }
          console.error('BetterAuthService: Database query timed out after', maxRetries, 'attempts');
          return null;
        }
        
        if (attempt === maxRetries) {
          throw raceError;
        }
      }
    }
    
    console.error('BetterAuthService: Failed to load user profile after', maxRetries, 'attempts');
    return null;
  }

  private async createUserProfile(supabaseUser: any): Promise<any> {
    try {
      console.log('Creating user profile for:', supabaseUser.id);
      console.log('User metadata:', supabaseUser.user_metadata);
      
      // First, check if a profile already exists
      const existingProfile = await this.loadUserProfile(supabaseUser.id);
      
      // Use RoleService to determine role based on email domain
      const userRole = roleService.determineUserRole(supabaseUser.email);
      console.log('Assigned role based on domain:', userRole);
      
      // If profile already exists, preserve the existing role but update other fields if needed
      if (existingProfile) {
        console.log('Profile already exists, preserving existing role:', existingProfile.role);
        // Return existing profile without modification - this prevents overwriting manually assigned roles
        return existingProfile;
      }
      
      // Profile doesn't exist - this means it's the initial signup, create new profile
      console.log('No existing profile found, creating new user profile');
      
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
      
      let createdProfile: any = null;
      
      // Try using the SECURITY DEFINER function first to bypass RLS during signup
      try {
        const { data: profile, error: rpcError } = await supabase.rpc('create_user_profile_safe', {
          user_id: supabaseUser.id,
          user_email: supabaseUser.email || '',
          user_display_name: supabaseUser.user_metadata?.display_name || supabaseUser.email?.split('@')[0],
          user_role: userRole,
        });

        if (rpcError) {
          console.warn('RPC function failed, falling back to direct insert:', rpcError);
          throw rpcError; // Trigger fallback
        }

        if (profile && profile.length > 0) {
          console.log('✅ Profile created via SECURITY DEFINER function');
          createdProfile = profile[0];
          return createdProfile;
        }
      } catch (rpcError) {
        console.warn('Failed to create profile via RPC, trying direct insert...');
        
        // Fallback to direct insert
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

        if (profile) {
          console.log('✅ Profile created via direct insert');
          createdProfile = profile;
          return createdProfile;
        }
      }

      if (createdProfile) {
        console.log('✅ User profile created successfully:', createdProfile.id);
        return createdProfile;
      }
      
      throw new Error('Failed to create user profile: No profile data returned');
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  private async createMinimalUserProfile(supabaseUser: any): Promise<any> {
    try {
      console.log('Creating minimal user profile as fallback...');
      
      // First, check if a profile already exists
      const existingProfile = await this.loadUserProfile(supabaseUser.id);
      
      // Use RoleService to determine role based on email domain
      const userRole = roleService.determineUserRole(supabaseUser.email);
      console.log('Assigned role for minimal profile:', userRole);
      
      // If profile already exists, preserve the existing role to avoid overwriting manually assigned roles
      if (existingProfile) {
        const existingRole = existingProfile.role || 'user';
        console.log('Profile already exists in minimal profile, keeping existing role:', existingRole);
        return {
          ...existingProfile,
          role: existingRole // Keep the existing role, don't overwrite
        };
      }
      
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
      let isRestoring = false; // Prevent multiple simultaneous restorations
      
      AppState.addEventListener('change', async (nextAppState: string) => {
        console.log('BetterAuthService: App state changed from', appState, 'to', nextAppState);
        
        if (appState.match(/inactive|background/) && nextAppState === 'active') {
          // App came to foreground, check and restore session if needed
          console.log('BetterAuthService: App became active, checking session...');
          
          // Prevent multiple simultaneous restoration attempts
          if (isRestoring) {
            console.log('BetterAuthService: Session restoration already in progress, skipping...');
            return;
          }
          
          isRestoring = true;
          
          try {
            // Add a longer delay for mobile to ensure the app is fully active
            const delay = Math.min(2000, Math.max(1000, Date.now() - lastActiveTime));
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Check if we have a current user first
            if (!this.currentUser) {
              console.log('BetterAuthService: No current user, attempting session restoration...');
              
              // Use a timeout for session restoration to prevent hanging
              const sessionPromise = this.performSafeSessionRestoration();
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Session restoration timeout')), 10000)
              );
              
              try {
                await Promise.race([sessionPromise, timeoutPromise]);
              } catch (error) {
                console.warn('BetterAuthService: Session restoration failed:', error.message);
                // Don't throw error, just log it
              }
            } else {
              console.log('BetterAuthService: Current user exists, validating session...');
              // Validate current user to ensure session is still valid
              const isValid = await this.validateCurrentUser();
              if (!isValid) {
                console.log('BetterAuthService: Current user invalid, attempting to restore...');
                try {
                  await this.performSafeSessionRestoration();
                } catch (error) {
                  console.warn('BetterAuthService: Session restoration failed:', error.message);
                }
              }
            }
          } catch (error) {
            console.error('Error restoring session on app activation:', error);
          } finally {
            isRestoring = false;
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

  // Safe session restoration that won't crash the app
  private async performSafeSessionRestoration(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('BetterAuthService: Found session on app activation, restoring...');
        
        // Try to restore user
        try {
          await this.handleSignIn(session.user);
        } catch (profileError) {
          console.warn('BetterAuthService: Profile verification failed:', profileError.message);
          
          // Profile doesn't exist or failed to load - clear user
          this.currentUser = null;
          if (this.onAuthStateChange) {
            this.onAuthStateChange(null);
          }
          
          console.log('BetterAuthService: Session restoration failed - user must sign up first');
        }
      } else {
        console.log('BetterAuthService: No session found on app activation');
      }
    } catch (error) {
      console.error('BetterAuthService: Error during safe session restoration:', error);
      // Clear any stale user data
      this.currentUser = null;
      if (this.onAuthStateChange) {
        this.onAuthStateChange(null);
      }
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

  async updateProfile(updates: { displayName?: string; email?: string }): Promise<void> {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      console.log('BetterAuthService: Updating profile for user:', this.currentUser.id);
      console.log('BetterAuthService: Profile updates:', updates);

      // Update auth user if email is being changed
      if (updates.email && updates.email !== this.currentUser.email) {
        const sanitizedEmail = sanitizeEmail(updates.email);
        const validatedEmail = validateEmail(sanitizedEmail);
        
        const { error: authError } = await supabase.auth.updateUser({
          email: validatedEmail
        });

        if (authError) {
          console.error('Error updating auth email:', authError);
          throw new Error('Failed to update email. Please try again.');
        }
      }

      // Prepare profile updates
      const profileUpdates: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.displayName !== undefined) {
        profileUpdates.display_name = updates.displayName;
      }

      // Update user profile in database
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(profileUpdates)
        .eq('id', this.currentUser.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw new Error('Failed to update profile. Please try again.');
      }

      // Update local user state
      this.currentUser = {
        ...this.currentUser,
        ...(updates.displayName !== undefined && { displayName: updates.displayName }),
        ...(updates.email !== undefined && { email: updates.email })
      };

      // Notify auth state change
      if (this.onAuthStateChange) {
        this.onAuthStateChange(this.currentUser);
      }

      console.log('BetterAuthService: Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  private async restoreSession() {
    // Skip if we already have a current user
    if (this.currentUser) {
      console.log('BetterAuthService: User already exists, skipping session restoration');
      return;
    }

    try {
      console.log('BetterAuthService: Attempting to restore session...');
      
      // Add timeout for session restoration to prevent hanging
      // Mobile needs more time due to slower network and app state changes
      const timeoutMs = Platform.OS === 'web' ? 10000 : 30000; // 10s web, 30s mobile
      const sessionPromise = this.performSessionRestoration();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Session restoration timeout (${timeoutMs}ms)`)), timeoutMs)
      );
      
      await Promise.race([sessionPromise, timeoutPromise]);
      console.log('BetterAuthService: Session restoration completed');
    } catch (error) {
      // Handle timeout gracefully without showing error to user
      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn('BetterAuthService: Session restoration timed out - this is normal on slow networks');
        return;
      }
      
      console.error('Error restoring session:', error);
    }
  }

  private async performSessionRestoration() {
    try {
      // Try to get session with retry logic
      let session = null;
      let error = null;
      
      for (let attempt = 1; attempt <= 2; attempt++) { // Reduced attempts to 2 for faster timeout
        try {
          console.log(`BetterAuthService: Session restoration attempt ${attempt}/2...`);
          
          // Add individual timeout for each attempt - longer for mobile
          const attemptTimeoutMs = Platform.OS === 'web' ? 5000 : 10000;
          const attemptPromise = supabase.auth.getSession();
          const attemptTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session attempt timeout')), attemptTimeoutMs)
          );
          
          const result = await Promise.race([attemptPromise, attemptTimeout]);
          session = result.data.session;
          error = result.error;
          
          if (session?.user || !error) {
            break; // Success or no error, exit retry loop
          }
          
          if (attempt < 2) {
            console.log(`BetterAuthService: Session restoration attempt ${attempt} failed, retrying in 1s...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (sessionError) {
          error = sessionError;
          if (attempt < 2) {
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
        // Proceed with session restoration - don't block on profile verification
        // The handleSignIn will load the profile and handle errors gracefully
        await this.handleSignIn(session.user);
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
  resetPassword: (email: string) => betterAuthService.instance.resetPassword(email),
  updatePassword: (newPassword: string) => betterAuthService.instance.updatePassword(newPassword),
  setErrorHandler: (callback: (error: string, type: 'error' | 'warning' | 'info') => void) => betterAuthService.instance.setErrorHandler(callback),
  setAuthStateChangeHandler: (callback: (user: User | null) => void) => betterAuthService.instance.setAuthStateChangeHandler(callback),
  updatePreferences: (preferences: Partial<UserPreferences>) => betterAuthService.instance.updatePreferences(preferences),
  getCurrentUserWithValidation: () => betterAuthService.instance.getCurrentUserWithValidation(),
}; 