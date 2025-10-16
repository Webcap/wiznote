import { supabase } from '../lib/supabase';

export class AccountDeletionService {
  /**
   * Verify user password before account deletion
   */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    try {
      console.log('🔐 AccountDeletionService: Verifying password for user:', email);
      
      // Attempt to sign in with the provided credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ AccountDeletionService: Password verification failed:', error.message);
        return false;
      }

      if (!data.user) {
        console.error('❌ AccountDeletionService: No user returned from sign in');
        return false;
      }

      console.log('✅ AccountDeletionService: Password verified successfully');
      return true;
    } catch (error) {
      console.error('❌ AccountDeletionService: Error verifying password:', error);
      return false;
    }
  }

  /**
   * Delete all user data and account
   * This is a comprehensive deletion that removes all user-related data
   */
  async deleteUserAccount(userId: string): Promise<void> {
    try {
      console.log('🗑️ AccountDeletionService: Starting account deletion for user:', userId);

      // Step 1: Delete user's notes (this should cascade to related data)
      console.log('📝 Deleting user notes...');
      const { error: notesError } = await supabase
        .from('notes')
        .delete()
        .eq('user_id', userId);

      if (notesError) {
        console.error('❌ Error deleting notes:', notesError);
        // Continue with deletion even if this fails
      }

      // Step 2: Delete user's quizzes (this should cascade to quiz_questions, quiz_tags, quiz_attempts)
      console.log('📚 Deleting user quizzes...');
      const { error: quizzesError } = await supabase
        .from('quizzes')
        .delete()
        .eq('user_id', userId);

      if (quizzesError) {
        console.error('❌ Error deleting quizzes:', quizzesError);
        // Continue with deletion even if this fails
      }

      // Step 3: Delete quiz attempts
      console.log('📊 Deleting quiz attempts...');
      const { error: attemptsError } = await supabase
        .from('quiz_attempts')
        .delete()
        .eq('user_id', userId);

      if (attemptsError) {
        console.error('❌ Error deleting quiz attempts:', attemptsError);
        // Continue with deletion even if this fails
      }

      // Helper function to safely delete from a table
      const safeDelete = async (tableName: string, column: string, description: string) => {
        console.log(`${description}...`);
        try {
          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq(column, userId);

          if (error) {
            // PGRST116 = no rows found (fine)
            // PGRST106 = table not found (fine, just means feature not used)
            // 42P01 = relation does not exist (fine)
            if (error.code !== 'PGRST116' && error.code !== 'PGRST106' && error.code !== '42P01') {
              console.warn(`⚠️ Non-critical error deleting ${tableName}:`, error.message);
            }
          }
        } catch (err) {
          console.warn(`⚠️ Non-critical error deleting ${tableName}:`, err);
          // Continue with deletion
        }
      };

      // Step 4: Delete flashcards
      await safeDelete('flashcards', 'user_id', '🃏 Deleting flashcards');

      // Step 5: Delete shared notes (both shared by user and shared with user)
      console.log('🔗 Deleting note shares...');
      await safeDelete('note_shares', 'owner_id', '  - Deleting owned shares');
      await safeDelete('note_shares', 'shared_with_user_id', '  - Deleting received shares');

      // Step 6: Delete audio storage records
      await safeDelete('audio_storage', 'user_id', '🎵 Deleting audio storage records');

      // Step 7: Delete PDF storage records
      await safeDelete('pdf_storage', 'user_id', '📄 Deleting PDF storage records');

      // Step 8: Delete usage tracking records
      await safeDelete('usage_tracking', 'user_id', '📈 Deleting usage tracking records');

      // Step 9: Delete feature analytics
      await safeDelete('feature_analytics', 'user_id', '📊 Deleting feature analytics');

      // Step 10: Delete the auth user completely
      // Note: We do this BEFORE deleting the profile because the trigger will handle profile cleanup
      // But we'll also delete profile manually as a fallback
      console.log('🔐 Deleting auth user (this will trigger profile cleanup)...');
      
      let authUserDeleted = false;
      
      try {
        // Call the database function that allows users to delete their own account
        // This requires the delete_current_user() function to be created in the database
        // See: database/delete-user-function.sql
        const { error: deleteError } = await supabase.rpc('delete_current_user');
        
        if (deleteError) {
          // Check if it's a "function not found" error
          if (deleteError.message?.includes('function') || deleteError.message?.includes('does not exist')) {
            console.log('⚠️ Database function not found - see DATABASE_SETUP_ACCOUNT_DELETION.md');
            console.log('ℹ️ Falling back to profile deletion only...');
          } else {
            console.error('❌ Error calling delete function:', deleteError);
          }
        } else {
          console.log('✅ Auth user deleted successfully via database function');
          authUserDeleted = true;
        }
      } catch (error) {
        console.warn('⚠️ Could not call delete function:', error);
      }

      // Step 11: Delete user profile (fallback if auth deletion failed or trigger didn't run)
      if (!authUserDeleted) {
        console.log('👤 Deleting user profile...');
        const { error: profileError } = await supabase
          .from('user_profiles')
          .delete()
          .eq('id', userId);

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('❌ Error deleting user profile:', profileError);
          throw new Error('Failed to delete user profile: ' + profileError.message);
        }
        
        console.log('✅ User profile deleted successfully');
        console.log('ℹ️ Auth user remains but account is inaccessible');
        console.log('ℹ️ To enable complete deletion, run: database/delete-user-function.sql');
      } else {
        console.log('✅ User profile was automatically deleted by trigger');
      }

      console.log('✅ AccountDeletionService: Account deletion completed successfully');
    } catch (error) {
      console.error('❌ AccountDeletionService: Fatal error during account deletion:', error);
      throw error;
    }
  }

  /**
   * Complete account deletion flow
   * Verifies password, deletes all data, and signs out
   */
  async deleteAccountWithVerification(
    userId: string, 
    email: string, 
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Verify password
      const isPasswordValid = await this.verifyPassword(email, password);
      
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid password. Please try again.',
        };
      }

      // Step 2: Delete all user data and account
      await this.deleteUserAccount(userId);

      // Step 3: Sign out (this will be handled by the auth state change)
      await supabase.auth.signOut();

      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ AccountDeletionService: Error in deleteAccountWithVerification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during account deletion.',
      };
    }
  }
}

// Export singleton instance
export const accountDeletionService = new AccountDeletionService();

