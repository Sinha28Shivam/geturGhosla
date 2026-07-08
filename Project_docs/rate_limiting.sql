-- ============================================================
-- BACKSTOP: Postgres trigger, defense-in-depth only.
-- This should never fire under normal operation — if it does,
-- the Redis check was bypassed somewhere and needs investigating.
-- Uses the idx_interests_seeker_created index already in schema.sql.
-- ============================================================

CREATE OR REPLACE FUNCTION check_interest_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO recent_count
    FROM interests
    WHERE seeker_id = NEW.seeker_id
      AND created_at > now() - INTERVAL '24 hours';

    IF recent_count >= 10 THEN
        RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: max 10 interests per 24 hours (user %)', NEW.seeker_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_interest_rate_limit
    BEFORE INSERT ON interests
    FOR EACH ROW EXECUTE FUNCTION check_interest_rate_limit();
