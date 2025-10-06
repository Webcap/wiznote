import { betterAuth } from 'better-auth';
import { getDefaultPermissions } from '../types/User';
import { supabase } from './supabase';

// Custom adapter for Supabase since @better-auth/drizzle-adapter isn't available
const supabaseAdapter = {
  async createUser(userData: any) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
    });
    
    if (error) throw error;
    return data.user;
  },

  async getUser(userId: string) {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) throw error;
    return data.user;
  },

  async getUserByEmail(email: string) {
    // Supabase admin API doesn't have getUserByEmail, use regular auth API
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'dummy' // This will fail but we only need the user lookup
    });
    if (error && error.message.includes('Invalid login credentials')) {
      // User doesn't exist
      return null;
    }
    if (error) throw error;
    return data.user;
  },

  async updateUser(userId: string, userData: any) {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, userData);
    if (error) throw error;
    return data.user;
  },

  async deleteUser(userId: string) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
  },

  async createSession(sessionData: any) {
    // Supabase handles sessions automatically
    return sessionData;
  },

  async getSession(sessionId: string) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  async updateSession(sessionId: string, sessionData: any) {
    // Supabase handles session updates automatically
    return sessionData;
  },

  async deleteSession(sessionId: string) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async createVerificationToken(tokenData: any) {
    // For now, we'll handle verification tokens manually
    return tokenData;
  },

  async useVerificationToken(token: string) {
    // For now, we'll handle verification tokens manually
    return { token };
  },
};

export const auth = betterAuth({
  database: supabaseAdapter,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disable email verification for development
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    // Add Apple provider if needed
  },
  plugins: [
    // Add plugins for additional features
  ],
  // Note: hooks configuration may vary by better-auth version
  // hooks: {
  //   onUserCreate: async (user: any) => {
  //     // Create user profile with default settings using upsert to avoid conflicts
  //     const { error } = await supabase
  //       .from('user_profiles')
  //       .upsert({
  //         id: user.id,
  //         role: 'user',
  //         preferences: {
  //           theme: 'auto',
  //           language: 'en',
  //           autoSync: true,
  //           notifications: true,
  //         },
  //         premium: {
  //           isActive: false,
  //           type: null,
  //         },
  //         permissions: getDefaultPermissions('user'),
  //       }, {
  //         onConflict: 'id'
  //       });

  //     if (error) {
  //       console.error('Error creating user profile:', error);
  //       // Don't throw the error - just log it since this is a hook
  //       // The BetterAuthService will handle profile creation as a fallback
  //     }
  //   },
  // },
});

// Export auth utilities
// Note: better-auth exports may vary by version
// export const { signIn, signUp, signOut, getSession, onAuthStateChange } = auth;

// Helper function to create Stripe customer for new users
// async function createStripeCustomerForUser(userId: string, email: string): Promise<void> {
//   try {
//     console.log('Creating Stripe customer for user:', userId, 'with email:', email);
    
//     // Call the webhook server to create Stripe customer
//     const webhookBaseUrl = process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL || 'http://127.0.0.1:3001';
//           const response = await fetch(`${webhookBaseUrl}/stripe/create-customer`, {
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
//       errorData = await response.json().catch(() => ({}));
//       throw new Error(`Failed to create Stripe customer: ${response.status} ${errorData.error || response.statusText}`);
//     }

//     const result = await response.json();
//     console.log('✅ Stripe customer created successfully:', result.customerId);
    
//   } catch (error) {
//     console.error('Error creating Stripe customer:', error);
//     throw error;
//   }
// } 