import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function createUser() {
  try {
    const [, , name, email, password, role, tenantSlug] = process.argv;

    // Validate arguments
    if (!name || !email || !password || !role) {
      console.log('Usage: ts-node src/scripts/createUser.ts "Full Name" email@example.com password123 role [tenant-slug]');
      console.log('');
      console.log('Roles: admin, agent, viewer');
      console.log('');
      console.log('Examples:');
      console.log('  # Use existing tenant (first available):');
      console.log('  ts-node src/scripts/createUser.ts "John Doe" john@example.com mypassword admin');
      console.log('');
      console.log('  # Use specific existing tenant:');
      console.log('  ts-node src/scripts/createUser.ts "John Doe" john@example.com mypassword admin acme-sales');
      console.log('');
      console.log('  # Create new tenant and user:');
      console.log('  ts-node src/scripts/createUser.ts "John Doe" john@example.com mypassword admin NEW:johns-company');
      console.log('');
      process.exit(1);
    }

    if (!['admin', 'agent', 'viewer'].includes(role)) {
      console.error('❌ Invalid role. Must be: admin, agent, or viewer');
      process.exit(1);
    }

    console.log('🚀 Creating user...');

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.error('❌ User with this email already exists');
      process.exit(1);
    }

    // Hash password (matching seed.ts exactly)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Handle tenant creation/selection
    let tenantId: string;

    if (!tenantSlug) {
      // No tenant specified - use first available tenant
      console.log('🔍 No tenant specified, using first available tenant...');
      const tenantResult = await pool.query('SELECT id, name, slug FROM tenants ORDER BY created_at LIMIT 1');
      
      if (tenantResult.rows.length === 0) {
        console.error('❌ No tenants found. Please run: npm run migrate:reset:seed');
        console.error('   Or create a tenant: ts-node src/scripts/createUser.ts "Name" email pass role NEW:tenant-slug');
        process.exit(1);
      }
      
      tenantId = tenantResult.rows[0].id;
      console.log(`📋 Using existing tenant: ${tenantResult.rows[0].name} (${tenantResult.rows[0].slug})`);
      
    } else if (tenantSlug.startsWith('NEW:')) {
      // Create new tenant
      const newTenantSlug = tenantSlug.replace('NEW:', '');
      const newTenantName = newTenantSlug.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      console.log(`🏢 Creating new tenant: ${newTenantName} (${newTenantSlug})...`);
      
      // Check if tenant slug already exists
      const existingTenant = await pool.query('SELECT id FROM tenants WHERE slug = $1', [newTenantSlug]);
      if (existingTenant.rows.length > 0) {
        console.error(`❌ Tenant with slug '${newTenantSlug}' already exists`);
        process.exit(1);
      }
      
      const tenantResult = await pool.query(
        `INSERT INTO tenants (name, slug, settings) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [newTenantName, newTenantSlug, JSON.stringify({ timezone: 'Asia/Kuala_Lumpur', currency: 'MYR' })]
      );
      
      tenantId = tenantResult.rows[0].id;
      console.log(`✅ Created tenant: ${newTenantName} (${newTenantSlug})`);
      
    } else {
      // Use specific existing tenant
      console.log(`🔍 Looking for tenant with slug: ${tenantSlug}...`);
      const tenantResult = await pool.query('SELECT id, name FROM tenants WHERE slug = $1', [tenantSlug]);
      
      if (tenantResult.rows.length === 0) {
        console.error(`❌ Tenant with slug '${tenantSlug}' not found`);
        console.log('\n📋 Available tenants:');
        const allTenants = await pool.query('SELECT name, slug FROM tenants ORDER BY name');
        allTenants.rows.forEach((t: any) => console.log(`  - ${t.name} (${t.slug})`));
        process.exit(1);
      }
      
      tenantId = tenantResult.rows[0].id;
      console.log(`📋 Using tenant: ${tenantResult.rows[0].name} (${tenantSlug})`);
    }

    // Create user (exactly matching seed.ts method)
    const result = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (tenant_id, email) DO UPDATE SET 
       password_hash = EXCLUDED.password_hash,
       name = EXCLUDED.name,
       role = EXCLUDED.role
       RETURNING *`,
      [tenantId, email, hashedPassword, name, role]
    );

    const newUser = result.rows[0];

    // Get tenant info for display
    const tenantInfo = await pool.query('SELECT name, slug FROM tenants WHERE id = $1', [tenantId]);
    const tenant = tenantInfo.rows[0];

    console.log('\n✅ User created successfully!');
    console.log('👤 User Details:');
    console.log(`   Name: ${newUser.name}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Created: ${newUser.created_at}`);
    console.log('\n🏢 Tenant Assignment:');
    console.log(`   Company: ${tenant.name}`);
    console.log(`   Slug: ${tenant.slug}`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log('\n🔐 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

  } catch (error: any) {
    console.error('❌ Error creating user:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createUser();