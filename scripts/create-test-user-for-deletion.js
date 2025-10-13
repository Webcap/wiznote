/**
 * Script to create a test user for testing account deletion
 * 
 * Creates:
 * - User account (test16 / test.16@webcap.cc / test123456)
 * - Test notes
 * - Test quizzes
 * - Test flashcards
 * - Usage data at 100%
 * 
 * Usage: node scripts/create-test-user-for-deletion.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  console.log('🔧 Creating test user for deletion testing...\n');

  const testUser = {
    email: 'test.16@webcap.cc',
    password: 'test123456',
    displayName: 'test16'
  };

  try {
    // Step 1: Create auth user
    console.log('👤 Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: {
        display_name: testUser.displayName
      }
    });

    let userId;
    
    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already registered') || authError.code === 'email_exists') {
        console.log('ℹ️  User already exists, fetching existing user...');
        
        // Get existing user
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingUser = users.find(u => u.email === testUser.email);
        if (!existingUser) throw new Error('User exists but could not be found');
        
        userId = existingUser.id;
        console.log('✅ Found existing user:', userId);
      } else {
        throw authError;
      }
    } else {
      userId = authData.user.id;
      console.log('✅ Auth user created:', userId);
    }

    // Step 2: Create user profile
    console.log('\n📝 Creating user profile...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        display_name: testUser.displayName,
        role: 'user',
        preferences: {
          theme: 'dark',
          language: 'en',
          autoSync: true,
          notifications: true,
          autoKeyDetails: true,
          autoAISummaries: true
        },
        premium: {
          isActive: false,
          type: null
        },
        permissions: {
          canCreateNotes: true,
          canDeleteNotes: true,
          canShareNotes: true
        },
        last_login_at: new Date().toISOString()
      });

    if (profileError) throw profileError;
    console.log('✅ User profile created');

    // Step 3: Create test notes
    console.log('\n📄 Creating test notes...');
    const notes = [
      {
        id: `test-note-1-${userId}`,
        user_id: userId,
        title: 'Test Note 1 - Important Meeting',
        content: 'This is a test note about an important meeting. Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        tags: ['work', 'meeting', 'important'],
        is_pinned: true,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: `test-note-2-${userId}`,
        user_id: userId,
        title: 'Test Note 2 - Shopping List',
        content: 'Shopping list:\n- Milk\n- Bread\n- Eggs\n- Coffee',
        tags: ['personal', 'shopping'],
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: `test-note-3-${userId}`,
        user_id: userId,
        title: 'Test Note 3 - Project Ideas',
        content: 'Project ideas:\n1. Build a mobile app\n2. Create a website\n3. Write a blog',
        tags: ['projects', 'ideas'],
        is_pinned: false,
        is_archived: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: `test-note-4-${userId}`,
        user_id: userId,
        title: 'Test Note 4 - Code Snippet',
        content: 'function hello() {\n  console.log("Hello World!");\n}',
        tags: ['code', 'javascript'],
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: `test-note-5-${userId}`,
        user_id: userId,
        title: 'Test Note 5 - Audio Recording Notes',
        content: 'Notes from audio recording session. Key points discussed...',
        tags: ['audio', 'recording'],
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { error: notesError } = await supabase
      .from('notes')
      .insert(notes);

    if (notesError) throw notesError;
    console.log(`✅ Created ${notes.length} test notes`);

    // Step 4: Create test quizzes (if table exists)
    console.log('\n📚 Creating test quizzes...');
    try {
      const quizzes = [
        {
          id: `test-quiz-1-${userId}`,
          note_id: notes[0].id,
          user_id: userId,
          title: 'Test Quiz - Meeting Notes',
          description: 'Quiz about the important meeting',
          difficulty: 'medium',
          question_count: 3,
          question_types: ['multiple_choice', 'true_false'],
          source_type: 'note',
          source_content: notes[0].content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const { error: quizzesError } = await supabase
        .from('quizzes')
        .insert(quizzes);

      if (quizzesError && quizzesError.code !== '42P01') { // Ignore table not found
        console.warn('⚠️  Could not create quizzes:', quizzesError.message);
      } else if (!quizzesError) {
        console.log(`✅ Created ${quizzes.length} test quizzes`);
      }
    } catch (err) {
      console.warn('⚠️  Quizzes table might not exist');
    }

    // Step 5: Create test flashcards (if table exists)
    console.log('\n🃏 Creating test flashcards...');
    try {
      const flashcards = [
        {
          id: `test-flashcard-1-${userId}`,
          user_id: userId,
          note_id: notes[1].id,
          front: 'What is JavaScript?',
          back: 'A programming language',
          difficulty: 'easy',
          last_reviewed: new Date().toISOString(),
          next_review: new Date(Date.now() + 86400000).toISOString(),
          review_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: `test-flashcard-2-${userId}`,
          user_id: userId,
          note_id: notes[1].id,
          front: 'What is React?',
          back: 'A JavaScript library for building user interfaces',
          difficulty: 'medium',
          last_reviewed: new Date().toISOString(),
          next_review: new Date(Date.now() + 86400000).toISOString(),
          review_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const { error: flashcardsError } = await supabase
        .from('flashcards')
        .insert(flashcards);

      if (flashcardsError && flashcardsError.code !== '42P01') {
        console.warn('⚠️  Could not create flashcards:', flashcardsError.message);
      } else if (!flashcardsError) {
        console.log(`✅ Created ${flashcards.length} test flashcards`);
      }
    } catch (err) {
      console.warn('⚠️  Flashcards table might not exist');
    }

    // Step 6: Set usage to 100% (if table exists)
    console.log('\n📊 Setting usage to 100%...');
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      const usageData = {
        user_id: userId,
        month: currentMonth,
        notes_created: 1000,
        ai_requests: 500,
        audio_recordings: 100,
        pdf_uploads: 50,
        storage_used_mb: 5000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: usageError } = await supabase
        .from('usage_tracking')
        .upsert(usageData, { onConflict: 'user_id,month' });

      if (usageError && usageError.code !== '42P01') {
        console.warn('⚠️  Could not set usage:', usageError.message);
      } else if (!usageError) {
        console.log('✅ Usage set to 100%');
      }
    } catch (err) {
      console.warn('⚠️  Usage tracking table might not exist');
    }

    // Step 7: Create feature analytics (if table exists)
    console.log('\n📈 Creating feature analytics...');
    try {
      const analytics = [
        {
          user_id: userId,
          feature_name: 'notes',
          action: 'create',
          count: 50,
          last_used: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          user_id: userId,
          feature_name: 'quizzes',
          action: 'generate',
          count: 25,
          last_used: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          user_id: userId,
          feature_name: 'flashcards',
          action: 'study',
          count: 100,
          last_used: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ];

      const { error: analyticsError } = await supabase
        .from('feature_analytics')
        .insert(analytics);

      if (analyticsError && analyticsError.code !== '42P01') {
        console.warn('⚠️  Could not create analytics:', analyticsError.message);
      } else if (!analyticsError) {
        console.log(`✅ Created ${analytics.length} analytics entries`);
      }
    } catch (err) {
      console.warn('⚠️  Feature analytics table might not exist');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST USER CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 User Details:');
    console.log(`   Email:        ${testUser.email}`);
    console.log(`   Password:     ${testUser.password}`);
    console.log(`   Display Name: ${testUser.displayName}`);
    console.log(`   User ID:      ${userId}`);
    console.log('\n📊 Test Data:');
    console.log(`   ✅ ${notes.length} notes created`);
    console.log(`   ✅ Usage set to 100%`);
    console.log(`   ✅ Profile fully configured`);
    console.log('\n🧪 Test the Account Deletion:');
    console.log('   1. Login with the credentials above');
    console.log('   2. Go to Settings → Danger Zone');
    console.log('   3. Click "Delete Account"');
    console.log('   4. Enter password: test123456');
    console.log('   5. Type "DELETE" to confirm');
    console.log('   6. Verify all data is deleted');
    console.log('\n' + '='.repeat(60));

    return authData.user;

  } catch (error) {
    console.error('\n❌ Error creating test user:', error);
    if (error.message) {
      console.error('   Message:', error.message);
    }
    if (error.details) {
      console.error('   Details:', error.details);
    }
    process.exit(1);
  }
}

// Run the script
createTestUser()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

