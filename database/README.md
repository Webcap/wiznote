# Database Migrations

This directory contains SQL migration scripts for your Supabase database.

## Setup Instructions

### 1. Quiz Tables Migration

The quiz feature requires several database tables to function. To set up the quiz tables:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Go to the **SQL Editor** (in the left sidebar)
4. Click **New query**
5. Copy the contents of `quiz-tables-migration.sql` and paste it into the SQL editor
6. Click **Run** to execute the migration

This will create the following tables:
- `quizzes` - Stores quiz metadata
- `quiz_questions` - Stores individual quiz questions
- `quiz_tags` - Stores tags for quizzes
- `quiz_attempts` - Stores user quiz attempt results

The migration also sets up:
- Indexes for optimal query performance
- Row Level Security (RLS) policies to ensure users can only access their own data
- Triggers for automatic timestamp updates

### 2. Verify Migration

After running the migration, you can verify it worked by:

1. Going to **Table Editor** in your Supabase dashboard
2. You should see the new tables: `quizzes`, `quiz_questions`, `quiz_tags`, `quiz_attempts`

### 3. Test the Quiz Feature

Once the tables are created, you can test the quiz feature:

1. Navigate to a note in your app
2. Click the "Generate Quiz" or similar button
3. Configure your quiz settings
4. Generate the quiz

## Troubleshooting

### Error: "relation does not exist"
This means the tables haven't been created yet. Make sure you ran the migration SQL in your Supabase SQL Editor.

### Error: "Failed to save quiz"
Check:
1. The tables exist (see verification steps above)
2. Your Supabase connection is configured correctly
3. The user is authenticated
4. Check the browser console for detailed error messages

### Error: "permission denied for table"
This means RLS policies might not be set up correctly. Re-run the migration SQL to ensure all policies are created.

## Security Hardening

### 🔒 Resolve Critical Security Issues

The `resolve-critical-security-issues.sql` script is a consolidated fix for critical security vulnerabilities identified in the Supabase project:

1.  **Publicly Accessible Tables (`rls_disabled_in_public`)**: Automatically enables Row-Level Security (RLS) on **all** tables in the `public` schema and applies lockdown policies to internal tables like `email_notifications_queue`.
2.  **Exposed User Data (`auth_users_exposed`)**: Refactors the `search_users_by_email_or_name` function to provide **Tiered Access**. Regular users can no longer harvest the entire user database, while admins and core features like note sharing remain functional.

#### How to Apply:

1.  Open your [Supabase Dashboard](https://supabase.com/dashboard)
2.  Go to the **SQL Editor**
3.  Click **New query**
4.  Copy the contents of `resolve-critical-security-issues.sql` and click **Run**
5.  Verify that the output shows `🎉 ALL TABLES SECURED!`

## Need Help?
...

