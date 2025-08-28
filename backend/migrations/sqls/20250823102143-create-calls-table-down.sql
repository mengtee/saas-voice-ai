-- Drop indexes
DROP INDEX IF EXISTS idx_calls_lead_id;
DROP INDEX IF EXISTS idx_calls_status;
DROP INDEX IF EXISTS idx_calls_start_time;

-- Drop calls table
DROP TABLE IF EXISTS calls;