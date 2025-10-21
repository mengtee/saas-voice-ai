-- Drop trigger (function will be dropped by users migration)
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;

-- Drop indexes
DROP INDEX IF EXISTS idx_leads_tenant_id;
DROP INDEX IF EXISTS idx_leads_assigned_user_id;
DROP INDEX IF EXISTS idx_leads_status;
DROP INDEX IF EXISTS idx_leads_phone;
DROP INDEX IF EXISTS idx_leads_created_at;
DROP INDEX IF EXISTS idx_leads_tenant_status;
DROP INDEX IF EXISTS idx_leads_tenant_user;
DROP INDEX IF EXISTS idx_leads_agent_status;
DROP INDEX IF EXISTS idx_leads_agent_created;

-- Drop leads table
DROP TABLE IF EXISTS leads;