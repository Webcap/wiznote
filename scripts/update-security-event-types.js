/**
 * Update Security Audit Log Event Types
 * 
 * This script adds the new password reset event types to the
 * security_audit_log table constraint.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - EXPO_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateSecurityEventTypes() {
  try {
    console.log('🔄 Updating security audit log event type constraint...\n');

    // Read the migration SQL file
    const migrationPath = join(__dirname, '../database/add-password-reset-event-types.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Error executing migration:', error);
      
      // Try alternative approach - direct SQL execution
      console.log('\n🔄 Trying alternative approach...\n');
      
      const alterSQL = `
        -- Drop the existing constraint
        ALTER TABLE public.security_audit_log 
        DROP CONSTRAINT IF EXISTS security_audit_log_event_type_check;

        -- Recreate the constraint with the new event types
        ALTER TABLE public.security_audit_log
        ADD CONSTRAINT security_audit_log_event_type_check CHECK (event_type IN (
            'auth.login.success',
            'auth.login.failure',
            'auth.logout',
            'auth.signup.success',
            'auth.signup.failure',
            'auth.password_reset.request',
            'auth.password_reset.requested',
            'auth.password_reset.request_failed',
            'auth.password_reset.success',
            'auth.password_reset.completed',
            'auth.password_reset.failure',
            'auth.password_reset.update_failed',
            'auth.email_verification.success',
            'auth.email_verification.failure',
            'auth.mfa.enabled',
            'auth.mfa.disabled',
            'auth.mfa.success',
            'auth.mfa.failure',
            'auth.session.expired',
            'auth.session.revoked',
            'account.lockout',
            'account.unlock',
            'account.deleted',
            'account.suspended',
            'account.reactivated',
            'admin.role.granted',
            'admin.role.revoked',
            'admin.action.user_management',
            'admin.action.system_settings',
            'admin.action.premium_grant',
            'admin.action.support_ticket',
            'admin.privilege.escalation',
            'data.note.created',
            'data.note.updated',
            'data.note.deleted',
            'data.note.shared',
            'data.note.accessed',
            'data.export.requested',
            'data.export.completed',
            'api.rate_limit.exceeded',
            'api.rate_limit.warning',
            'api.error.unauthorized',
            'api.error.forbidden',
            'api.error.server',
            'csrf.validation.success',
            'csrf.validation.failure',
            'csrf.token.generated',
            'csrf.token.expired',
            'security.suspicious.multiple_failed_logins',
            'security.suspicious.unusual_location',
            'security.suspicious.unusual_time',
            'security.suspicious.sql_injection_attempt',
            'security.suspicious.xss_attempt',
            'security.suspicious.path_traversal_attempt',
            'system.settings.updated',
            'system.backup.created',
            'system.maintenance.started',
            'system.maintenance.completed'
        ));
      `;

      console.log('⚠️  Manual migration required. Please run the following SQL in Supabase SQL Editor:\n');
      console.log('=' .repeat(80));
      console.log(alterSQL);
      console.log('=' .repeat(80));
      console.log('\nOr copy the SQL from: database/add-password-reset-event-types.sql\n');
      
      return;
    }

    console.log('✅ Security audit log constraint updated successfully!\n');
    console.log('📝 Added password reset event types:');
    console.log('   - auth.password_reset.requested');
    console.log('   - auth.password_reset.request_failed');
    console.log('   - auth.password_reset.completed');
    console.log('   - auth.password_reset.update_failed');
    console.log('\n✅ Password reset security logging is now fully functional!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n⚠️  Please run the migration manually in Supabase SQL Editor:');
    console.log('   File: database/add-password-reset-event-types.sql\n');
  }
}

updateSecurityEventTypes();

