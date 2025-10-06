import { supabase } from '../lib/supabase';

export interface MigrationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  tablesCreated: string[];
  tablesUpdated: string[];
}

export class DatabaseMigrationService {
  private static instance: DatabaseMigrationService;

  private constructor() {}

  static getInstance(): DatabaseMigrationService {
    if (!DatabaseMigrationService.instance) {
      DatabaseMigrationService.instance = new DatabaseMigrationService();
    }
    return DatabaseMigrationService.instance;
  }

  /**
   * Run the simple usage tracking migration
   */
  async runSimpleUsageTrackingMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      errors: [],
      warnings: [],
      tablesCreated: [],
      tablesUpdated: [],
    };

    try {
      console.log('DatabaseMigrationService: Starting simple usage tracking migration...');

      // Check and create user_feature_usage table
      await this.ensureUserFeatureUsageTable(result);

      // Check and create feature_flags table
      await this.ensureFeatureFlagsTable(result);

      // Check and create feature_limits table
      await this.ensureFeatureLimitsTable(result);

      // Create indexes
      await this.createIndexes(result);

      // Set up RLS policies
      await this.setupRLSPolicies(result);

      console.log('DatabaseMigrationService: Migration completed successfully');
      return result;
    } catch (error) {
      console.error('DatabaseMigrationService: Migration failed:', error);
      result.success = false;
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  private async ensureUserFeatureUsageTable(result: MigrationResult): Promise<void> {
    try {
      // Check if table exists
      const { error: checkError } = await supabase
        .from('user_feature_usage')
        .select('count')
        .limit(1);

      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist, create it
        console.log('DatabaseMigrationService: Creating user_feature_usage table...');
        
        // We'll need to use raw SQL for table creation
        // For now, we'll check if we can create it via a different approach
        result.warnings.push('user_feature_usage table creation requires manual SQL execution');
        result.errors.push('Table creation not supported via client API');
      } else if (checkError) {
        result.errors.push(`Error checking user_feature_usage table: ${checkError.message}`);
      } else {
        console.log('DatabaseMigrationService: user_feature_usage table exists');
        result.tablesUpdated.push('user_feature_usage');
      }
    } catch (error) {
      result.errors.push(`Error ensuring user_feature_usage table: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async ensureFeatureFlagsTable(result: MigrationResult): Promise<void> {
    try {
      // Check if table exists
      const { error: checkError } = await supabase
        .from('feature_flags')
        .select('count')
        .limit(1);

      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist
        console.log('DatabaseMigrationService: feature_flags table missing');
        result.warnings.push('feature_flags table creation requires manual SQL execution');
        result.errors.push('Table creation not supported via client API');
      } else if (checkError) {
        result.errors.push(`Error checking feature_flags table: ${checkError.message}`);
      } else {
        console.log('DatabaseMigrationService: feature_flags table exists');
        result.tablesUpdated.push('feature_flags');
      }
    } catch (error) {
      result.errors.push(`Error ensuring feature_flags table: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async ensureFeatureLimitsTable(result: MigrationResult): Promise<void> {
    try {
      // Check if table exists
      const { error: checkError } = await supabase
        .from('feature_limits')
        .select('count')
        .limit(1);

      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist
        console.log('DatabaseMigrationService: feature_limits table missing');
        result.warnings.push('feature_limits table creation requires manual SQL execution');
        result.errors.push('Table creation not supported via client API');
      } else if (checkError) {
        result.errors.push(`Error checking feature_limits table: ${checkError.message}`);
      } else {
        console.log('DatabaseMigrationService: feature_limits table exists');
        result.tablesUpdated.push('feature_limits');
      }
    } catch (error) {
      result.errors.push(`Error ensuring feature_limits table: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createIndexes(result: MigrationResult): Promise<void> {
    try {
      // Note: Index creation requires raw SQL
      // For now, we'll just log that indexes should be created
      console.log('DatabaseMigrationService: Index creation requires manual SQL execution');
      result.warnings.push('Index creation requires manual SQL execution');
    } catch (error) {
      result.errors.push(`Error creating indexes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async setupRLSPolicies(result: MigrationResult): Promise<void> {
    try {
      // Note: RLS policy setup requires raw SQL
      // For now, we'll just log that policies should be set up
      console.log('DatabaseMigrationService: RLS policy setup requires manual SQL execution');
      result.warnings.push('RLS policy setup requires manual SQL execution');
    } catch (error) {
      result.errors.push(`Error setting up RLS policies: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check database health and connectivity
   */
  async checkDatabaseHealth(): Promise<{
    connected: boolean;
    tables: {
      feature_flags: boolean;
      feature_limits: boolean;
      user_feature_usage: boolean;
      user_profiles: boolean;
    };
    errors: string[];
  }> {
    const health = {
      connected: false,
      tables: {
        feature_flags: false,
        feature_limits: false,
        user_feature_usage: false,
        user_profiles: false,
      },
      errors: [] as string[],
    };

    try {
      // Test basic connection
      const { data: testData, error: testError } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1);

      if (testError) {
        health.errors.push(`Connection test failed: ${testError.message}`);
      } else {
        health.connected = true;
        health.tables.user_profiles = true;
      }

      // Check if required tables exist
      const tables = [
        { name: 'feature_flags', key: 'feature_flags' as keyof typeof health.tables },
        { name: 'feature_limits', key: 'feature_limits' as keyof typeof health.tables },
        { name: 'user_feature_usage', key: 'user_feature_usage' as keyof typeof health.tables },
      ];
      
      for (const table of tables) {
        try {
          const { error } = await supabase
            .from(table.name)
            .select('count')
            .limit(1);
          
          if (error) {
            if (error.code === '42P01') {
              // Table doesn't exist
              health.errors.push(`Table ${table.name} does not exist`);
            } else {
              health.errors.push(`Table ${table.name} check failed: ${error.message}`);
            }
          } else {
            health.tables[table.key] = true;
          }
        } catch (err) {
          health.errors.push(`Table ${table.name} not accessible: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

    } catch (error) {
      health.errors.push(`Database health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return health;
  }

  /**
   * Get migration SQL that can be run manually
   */
  getMigrationSQL(): string {
    return `
-- Simple Usage Tracking Migration
-- Run this SQL in your Supabase SQL editor

-- Create user_feature_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_feature_usage (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_id TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    usage_duration INTEGER DEFAULT 0,
    usage_storage INTEGER DEFAULT 0,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    period_type TEXT NOT NULL DEFAULT 'monthly',
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, feature_id)
);

-- Create feature_flags table if it doesn't exist
CREATE TABLE IF NOT EXISTS feature_flags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    enabled BOOLEAN DEFAULT false,
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feature_limits table if it doesn't exist
CREATE TABLE IF NOT EXISTS feature_limits (
    id TEXT PRIMARY KEY,
    feature_id TEXT NOT NULL UNIQUE,
    feature_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    free_user_limit INTEGER NOT NULL,
    free_user_limit_type TEXT NOT NULL,
    free_user_period TEXT NOT NULL,
    free_user_session_limit INTEGER,
    premium_user_limit JSONB NOT NULL,
    premium_user_limit_type TEXT NOT NULL,
    premium_user_period TEXT NOT NULL,
    premium_user_session_limit JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_feature_usage_user_id ON user_feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feature_usage_feature_id ON user_feature_usage(feature_id);
CREATE INDEX IF NOT EXISTS idx_user_feature_usage_period ON user_feature_usage(current_period_start, current_period_end);

-- Enable Row Level Security
ALTER TABLE user_feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_feature_usage
DROP POLICY IF EXISTS "Users can view their own feature usage" ON user_feature_usage;
CREATE POLICY "Users can view their own feature usage" ON user_feature_usage
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own feature usage" ON user_feature_usage;
CREATE POLICY "Users can insert their own feature usage" ON user_feature_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own feature usage" ON user_feature_usage;
CREATE POLICY "Users can update their own feature usage" ON user_feature_usage
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own feature usage" ON user_feature_usage;
CREATE POLICY "Users can delete their own feature usage" ON user_feature_usage
    FOR DELETE USING (auth.uid() = user_id);

-- Admin policies for managing all usage data
DROP POLICY IF EXISTS "Admins can manage all feature usage" ON user_feature_usage;
CREATE POLICY "Admins can manage all feature usage" ON user_feature_usage
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id::uuid = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- RLS policies for feature_flags (admin only)
DROP POLICY IF EXISTS "Admins can manage feature flags" ON feature_flags;
CREATE POLICY "Admins can manage feature flags" ON feature_flags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id::uuid = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- RLS policies for feature_limits (admin only)
DROP POLICY IF EXISTS "Admins can manage feature limits" ON feature_limits;
CREATE POLICY "Admins can manage feature limits" ON feature_limits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id::uuid = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_feature_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feature_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feature_limits TO authenticated;
    `;
  }
}

// Export singleton instance
export const databaseMigrationService = DatabaseMigrationService.getInstance();
