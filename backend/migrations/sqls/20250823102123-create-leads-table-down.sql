-- Drop trigger
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;

-- Drop indexes
DROP INDEX IF EXISTS idx_leads_status;
DROP INDEX IF EXISTS idx_leads_phone;
DROP INDEX IF EXISTS idx_leads_created_at;

-- Drop leads table
DROP TABLE IF EXISTS leads;