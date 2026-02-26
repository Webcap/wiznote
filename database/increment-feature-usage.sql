-- Atomic increment for user_feature_usage
-- Fixes the "stays at 1" bug (race condition when recording usage)
--
-- Run in Supabase Dashboard: SQL Editor -> New query -> paste and run
-- After running, usage will increment correctly (1, 2, 3...) instead of staying at 1

CREATE OR REPLACE FUNCTION increment_feature_usage(
  p_user_id UUID,
  p_feature_id TEXT,
  p_amount INT DEFAULT 1,
  p_usage_type TEXT DEFAULT 'count'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_period_type TEXT := 'monthly';
  v_row user_feature_usage%ROWTYPE;
BEGIN
  v_period_start := date_trunc('month', NOW());
  v_period_end := v_period_start + INTERVAL '1 month' - INTERVAL '1 second';

  -- Atomic upsert - uses row's current values for increment (no race condition)
  INSERT INTO user_feature_usage (
    user_id, feature_id, usage_count, usage_duration, usage_storage,
    current_period_start, current_period_end, period_type, last_used_at
  )
  VALUES (
    p_user_id, p_feature_id,
    CASE WHEN p_usage_type = 'count' THEN p_amount ELSE 0 END,
    CASE WHEN p_usage_type = 'duration' THEN p_amount ELSE 0 END,
    CASE WHEN p_usage_type = 'storage' THEN p_amount ELSE 0 END,
    v_period_start, v_period_end, v_period_type, NOW()
  )
  ON CONFLICT (user_id, feature_id)
  DO UPDATE SET
    usage_count = CASE
      WHEN user_feature_usage.current_period_end IS NULL OR user_feature_usage.current_period_end < NOW()
      THEN CASE WHEN p_usage_type = 'count' THEN p_amount ELSE 0 END
      WHEN p_usage_type = 'count' THEN user_feature_usage.usage_count + p_amount
      ELSE user_feature_usage.usage_count
    END,
    usage_duration = CASE
      WHEN user_feature_usage.current_period_end IS NULL OR user_feature_usage.current_period_end < NOW()
      THEN CASE WHEN p_usage_type = 'duration' THEN p_amount ELSE 0 END
      WHEN p_usage_type = 'duration' THEN user_feature_usage.usage_duration + p_amount
      ELSE user_feature_usage.usage_duration
    END,
    usage_storage = CASE
      WHEN user_feature_usage.current_period_end IS NULL OR user_feature_usage.current_period_end < NOW()
      THEN CASE WHEN p_usage_type = 'storage' THEN p_amount ELSE 0 END
      WHEN p_usage_type = 'storage' THEN user_feature_usage.usage_storage + p_amount
      ELSE user_feature_usage.usage_storage
    END,
    current_period_start = CASE
      WHEN user_feature_usage.current_period_end IS NULL OR user_feature_usage.current_period_end < NOW()
      THEN v_period_start ELSE user_feature_usage.current_period_start
    END,
    current_period_end = CASE
      WHEN user_feature_usage.current_period_end IS NULL OR user_feature_usage.current_period_end < NOW()
      THEN v_period_end ELSE user_feature_usage.current_period_end
    END,
    last_used_at = NOW()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'usage_count', v_row.usage_count,
    'usage_duration', v_row.usage_duration,
    'usage_storage', v_row.usage_storage,
    'current_period_end', v_row.current_period_end
  );
END;
$$;
