-- Drop indexes first
DROP INDEX IF EXISTS idx_campaign_calls_created_at;
DROP INDEX IF EXISTS idx_campaign_calls_status;
DROP INDEX IF EXISTS idx_campaign_calls_lead_id;
DROP INDEX IF EXISTS idx_campaign_calls_campaign_id;

DROP INDEX IF EXISTS idx_campaigns_created_at;
DROP INDEX IF EXISTS idx_campaigns_status;
DROP INDEX IF EXISTS idx_campaigns_type;
DROP INDEX IF EXISTS idx_campaigns_tenant_id;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS campaign_calls;
DROP TABLE IF EXISTS campaigns;