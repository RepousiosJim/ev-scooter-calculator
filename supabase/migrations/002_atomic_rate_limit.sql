-- Atomic rate-limit check: single round-trip, race-free via Postgres row lock.
-- Replaces the previous two-query SELECT + UPDATE pattern in the TS layer.
CREATE OR REPLACE FUNCTION check_rate_limit_atomic(
  p_key        TEXT,
  p_max        INTEGER,
  p_now        BIGINT,
  p_window_ms  BIGINT
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count        INTEGER;
  v_window_start BIGINT;
  v_cutoff       BIGINT;
BEGIN
  v_cutoff := p_now - p_window_ms;

  INSERT INTO rate_limits (key, count, window_start)
  VALUES (p_key, 1, p_now)
  ON CONFLICT (key) DO UPDATE SET
    count        = CASE
                     WHEN rate_limits.window_start < v_cutoff THEN 1
                     ELSE rate_limits.count + 1
                   END,
    window_start = CASE
                     WHEN rate_limits.window_start < v_cutoff THEN p_now
                     ELSE rate_limits.window_start
                   END
  RETURNING rate_limits.count, rate_limits.window_start
  INTO v_count, v_window_start;

  RETURN QUERY SELECT
    (v_count <= p_max)::BOOLEAN,
    GREATEST(0, p_max - v_count)::INTEGER,
    v_window_start + p_window_ms;
END;
$$;
