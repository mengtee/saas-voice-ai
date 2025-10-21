-- Drop triggers only from existing tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;

-- Drop indexes
DROP INDEX IF EXISTS idx_tenants_slug;
DROP INDEX IF EXISTS idx_users_tenant_id;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_tenant_email;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;

-- Finally drop the shared function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;