<!-- 949d4bff-85a9-43dc-ad53-956bae6c24bf 63ca0a79-4b2c-4f72-96d0-fae14a3385e9 -->
# Fix Auth System and Google OAuth

## Overview

Fix authentication system to ensure Google OAuth works on both platforms, coordinate loading of user profile, feature flags, and limits, and improve UX with proper loading states.

## Key Issues Identified

1. **Google OAuth Issues:**

- OAuth callback doesn't wait for profile/feature flags to load before redirecting
- Race conditions between native and OAuth flows on mobile
- Callback handler needs better error handling

2. **Loading Coordination:**

- User profile loads in background after minimal user is set
- Feature flags and limits load independently
- Navigation happens before all critical data is loaded
- Settings/preferences should load last (lower priority)

3. **UX Flow:**

- No clear loading state showing what's being loaded
- User can interact with app before data is ready
- Need progressive loading indicators

## Implementation Plan

### Phase 1: Fix Google OAuth (Both Platforms)

#### 1.1 Update Auth Callback Handler

- File: `app/auth/callback.tsx`
- Wait for user profile, feature flags, and limits to load before redirecting
- Show loading progress with specific states
- Handle errors gracefully with retry options

#### 1.2 Fix Google OAuth in BetterAuthService

- File: `services/BetterAuthService.ts`
- Ensure OAuth flow properly handles callback on both web and mobile
- Fix native Google Sign-In fallback logic
- Ensure profile creation happens for new Google users
- Coordinate with feature flag and limit loading

#### 1.3 Update Sign In/Sign Up Screens

- Files: `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`
- Add better error handling for Google OAuth failures
- Show loading states during OAuth flow
- Ensure redirects only happen after full initialization

### Phase 2: Coordinated Loading System

#### 2.1 Create Auth Initialization Service

- New file: `services/AuthInitializationService.ts`
- Coordinate parallel loading of:

1. User profile (highest priority)
2. Feature flags (parallel with profile)
3. Feature limits (parallel with profile)
4. User preferences/settings (load last, lower priority)

- Return initialization state with progress tracking
- Handle errors and retries

#### 2.2 Update BetterAuthService

- File: `services/BetterAuthService.ts`
- Modify `handleSignInOrSignUp` and `handleSignIn` to:
- Set minimal user immediately for quick login feel
- Wait for profile, feature flags, and limits before marking as ready
- Load preferences/settings in background (don't block)
- Add `isInitialized` flag that indicates when all critical data is loaded
- Add progress callback for loading states

#### 2.3 Update useAuth Hook

- File: `hooks/useAuth.ts`
- Add `isInitializing` state (separate from `isLoading`)
- Track initialization progress
- Expose initialization state to components
- Only set `isAuthenticated` to true when initialization complete

#### 2.4 Update Layout Files

- Files: `app/_layout.tsx`, `app/_layout.native.tsx`, `app/_layout.web.tsx`
- Don't navigate to app until initialization is complete
- Show `AuthLoadingScreen` during initialization with progress
- Display what's being loaded (Profile → Feature Flags → Limits → Ready)

### Phase 3: Feature Flags and Limits Integration

#### 3.1 Update Feature Flag Loading

- File: `hooks/useFeatureFlags.ts`
- Ensure initialization happens synchronously with auth
- Add retry logic for failed loads
- Coordinate with auth initialization service

#### 3.2 Update Feature Limits Loading

- File: `hooks/useUnifiedFeatureLimits.ts`
- Load limits in parallel with profile and feature flags
- Don't block on limits loading, but mark initialization incomplete if fails
- Add retry mechanism

#### 3.3 Preferences Loading (Lower Priority)

- File: `services/BetterAuthService.ts`
- Load preferences/settings after critical data is loaded
- Don't block initialization completion on preferences
- Load in background and update UI when ready

### Phase 4: UX Improvements

#### 4.1 Enhanced Loading Screen

- File: `components/AuthLoadingScreen.tsx` (update existing)
- Show progress indicators for:
- Loading profile
- Loading feature flags
- Loading limits
- Ready to go
- Show estimated time remaining
- Handle errors with retry buttons

#### 4.2 Better Error Handling

- Add retry mechanisms for failed loads
- Show specific error messages for different failure types
- Provide recovery options (retry, sign out, contact support)

#### 4.3 Loading State Management

- Add `AuthInitializationContext` if needed
- Coordinate loading states across components
- Prevent navigation until ready

### Phase 5: Testing and Edge Cases

#### 5.1 Test Scenarios

- New user sign up (email and Google)
- Existing user sign in (email and Google)
- User with no profile (edge case handling)
- Network failures during initialization
- Slow network conditions
- Mobile vs web differences

#### 5.2 Error Scenarios

- Profile load fails
- Feature flags load fails
- Limits load fails
- Partial failures (some succeed, some fail)

## Files to Modify

1. `services/BetterAuthService.ts` - Core auth logic and initialization
2. `app/auth/callback.tsx` - OAuth callback handling
3. `app/(auth)/login.tsx` - Login screen updates
4. `app/(auth)/signup.tsx` - Signup screen updates
5. `hooks/useAuth.ts` - Auth hook with initialization state
6. `hooks/useFeatureFlags.ts` - Feature flag loading coordination
7. `hooks/useUnifiedFeatureLimits.ts` - Limits loading coordination
8. `app/_layout.tsx` - Main layout with initialization check
9. `app/_layout.native.tsx` - Native layout
10. `app/_layout.web.tsx` - Web layout
11. `components/AuthLoadingScreen.tsx` - Enhanced loading UI

## Files to Create

1. `services/AuthInitializationService.ts` - Coordination service for loading

## Key Implementation Details

### Initialization Flow

1. User authenticates (email or Google)
2. Minimal user object set immediately (for quick login feel)
3. Parallel loading begins:

- User profile (required)
- Feature flags (required)
- Feature limits (required)

4. Once all three are loaded, mark as initialized
5. Preferences/settings load in background (don't block)
6. Navigation to app happens only after initialization complete

### Google OAuth Flow

1. User clicks "Sign in with Google"
2. Native flow attempted first on mobile (with fallback)
3. OAuth URL opened
4. Callback received
5. Session created in Supabase
6. Full initialization begins (profile, flags, limits)
7. Redirect to app only after initialization

### Error Handling

- Retry failed loads up to 3 times
- Show specific error messages
- Allow user to retry manually
- Fall back to cached data when available
- Don't block on non-critical failures (preferences)

## Success Criteria

- Google OAuth works on both web and mobile
- Login feels quick (minimal user set immediately)
- App only shows after profile, flags, and limits are loaded
- Preferences load in background (don't block)
- Clear loading progress indicators
- Graceful error handling with retry options
- Better UX flow throughout

### To-dos

- [x] Fix auth callback handler to wait for full initialization before redirecting and show loading progress
- [x] Fix Google OAuth in BetterAuthService to handle both native and OAuth flows properly on web and mobile
- [x] Create AuthInitializationService to coordinate parallel loading of profile, feature flags, and limits
- [x] Update BetterAuthService to use initialization service and wait for critical data before marking ready
- [x] Update useAuth hook to track initialization state and expose isInitializing flag
- [x] Coordinate feature flags loading with auth initialization
- [x] Coordinate feature limits loading with auth initialization
- [x] Update layout files to check initialization state before allowing navigation
- [x] Enhance AuthLoadingScreen to show progress for profile, flags, limits loading
- [x] Implement background loading of preferences/settings (lower priority, dont block)
- [ ] Test all auth flows: email sign in/up, Google sign in/up on both platforms