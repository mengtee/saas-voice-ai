import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seedTenants() {
  console.log('Seeding tenants...');
  
  const tenants = [
    {
      name: 'Acme Sales Corp',
      slug: 'acme-sales',
      domain: 'acme-sales.com',
      settings: JSON.stringify({ timezone: 'America/New_York', currency: 'USD' })
    },
    {
      name: 'TechStart Solutions',
      slug: 'techstart',
      domain: 'techstart.io',
      settings: JSON.stringify({ timezone: 'America/Los_Angeles', currency: 'USD' })
    },
    {
      name: 'Global Marketing Inc', 
      slug: 'global-marketing',
      domain: 'globalmarketing.co',
      settings: JSON.stringify({ timezone: 'Europe/London', currency: 'GBP' })
    }
  ];

  const createdTenants = [];
  for (const tenant of tenants) {
    try {
      const result = await pool.query(
        `INSERT INTO tenants (name, slug, domain, settings) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (slug) DO UPDATE SET 
         name = EXCLUDED.name,
         domain = EXCLUDED.domain,
         settings = EXCLUDED.settings
         RETURNING *`,
        [tenant.name, tenant.slug, tenant.domain, tenant.settings]
      );
      createdTenants.push(result.rows[0]);
      console.log(`✓ Seeded tenant: ${tenant.name} (${tenant.slug})`);
    } catch (error) {
      console.error(`✗ Failed to seed tenant ${tenant.name}:`, error);
    }
  }
  
  return createdTenants;
}

async function seedUsers(tenants: any[]) {
  console.log('Seeding users...');
  
  const saltRounds = 10;
  const adminPassword = await bcrypt.hash('admin123', saltRounds);
  const agentPassword = await bcrypt.hash('agent123', saltRounds);
  const customPassword = await bcrypt.hash('pmlz5929', saltRounds);
  
  const users = [
    // Acme Sales Corp users
    {
      tenant_id: tenants[0].id,
      email: 'mengtee1127@gmail.com',
      password: customPassword,
      name: 'Meng Tee (Admin)',
      role: 'admin'
    },
    {
      tenant_id: tenants[0].id,
      email: 'john.agent@acme-sales.com',
      password: agentPassword,
      name: 'John Smith',
      role: 'agent'
    },
    {
      tenant_id: tenants[0].id, 
      email: 'sarah.agent@acme-sales.com',
      password: agentPassword,
      name: 'Sarah Johnson',
      role: 'agent'
    },
    
    // TechStart Solutions users
    {
      tenant_id: tenants[1].id,
      email: 'admin@techstart.io', 
      password: adminPassword,
      name: 'Tech Admin',
      role: 'admin'
    },
    {
      tenant_id: tenants[1].id,
      email: 'mike.agent@techstart.io',
      password: agentPassword,
      name: 'Mike Wilson',
      role: 'agent'
    },
    
    // Global Marketing Inc users
    {
      tenant_id: tenants[2].id,
      email: 'admin@globalmarketing.co',
      password: adminPassword, 
      name: 'Global Admin',
      role: 'admin'
    },
    {
      tenant_id: tenants[2].id,
      email: 'emma.agent@globalmarketing.co',
      password: agentPassword,
      name: 'Emma Davis',
      role: 'agent'
    }
  ];

  const createdUsers = [];
  for (const user of users) {
    try {
      const result = await pool.query(
        `INSERT INTO users (tenant_id, email, password_hash, name, role) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (tenant_id, email) DO UPDATE SET 
         password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name,
         role = EXCLUDED.role
         RETURNING *`,
        [user.tenant_id, user.email, user.password, user.name, user.role]
      );
      createdUsers.push(result.rows[0]);
      console.log(`✓ Seeded user: ${user.email} (${user.role}) - ${user.name}`);
    } catch (error) {
      console.error(`✗ Failed to seed user ${user.email}:`, error);
    }
  }
  
  return createdUsers;
}

async function seedSampleLeads(tenants: any[], users: any[]) {
  console.log('Seeding sample leads...');
  
  // Get users by tenant for assignment
  const acmeUsers = users.filter(u => u.tenant_id === tenants[0]?.id);
  const techstartUsers = users.filter(u => u.tenant_id === tenants[1]?.id);
  const globalUsers = users.filter(u => u.tenant_id === tenants[2]?.id);
  
  const leads = [
    // Acme Sales Corp leads
    {
      tenant_id: tenants[0]?.id,
      assigned_user_id: acmeUsers[1]?.id || null, // John Smith
      date: new Date('2025-08-26').toISOString(),
      name: 'Robert Johnson',
      phone_number: '+1234567890',
      email: 'robert.j@enterprise.com',
      purpose: 'Enterprise sales inquiry',
      status: 'pending',
      notes: 'Interested in bulk licensing for 500+ employees'
    },
    {
      tenant_id: tenants[0]?.id,
      assigned_user_id: acmeUsers[2]?.id || null, // Sarah Johnson
      date: new Date('2025-08-26').toISOString(),
      name: 'Maria Garcia',
      phone_number: '+1234567891',
      email: 'maria.garcia@manufacturing.com',
      purpose: 'Product demo',
      status: 'called',
      notes: 'Scheduled demo for next Tuesday'
    },
    {
      tenant_id: tenants[0]?.id,
      assigned_user_id: acmeUsers[1]?.id || null, // John Smith
      date: new Date('2025-08-27').toISOString(),
      name: 'David Lee',
      phone_number: '+1234567892',
      email: 'david.lee@consulting.biz',
      purpose: 'Consultation',
      status: 'scheduled',
      notes: 'Meeting scheduled for Thursday 2 PM'
    },
    {
      tenant_id: tenants[0]?.id,
      assigned_user_id: null, // Unassigned
      date: new Date('2025-08-25').toISOString(),
      name: 'Lisa Wang',
      phone_number: '+1234567893',
      email: 'lisa.w@healthcare.org',
      purpose: 'Healthcare solutions',
      status: 'pending',
      notes: 'Warm lead from website form - healthcare sector'
    },
    
    // TechStart Solutions leads
    {
      tenant_id: tenants[1]?.id,
      assigned_user_id: techstartUsers[1]?.id || null, // Mike Wilson
      date: new Date('2025-08-26').toISOString(),
      name: 'Alex Thompson',
      phone_number: '+1555667890',
      email: 'alex.t@startup.tech',
      purpose: 'Tech integration',
      status: 'called',
      notes: 'Needs API integration support'
    },
    {
      tenant_id: tenants[1]?.id,
      assigned_user_id: techstartUsers[1]?.id || null, // Mike Wilson
      date: new Date('2025-08-24').toISOString(),
      name: 'Jennifer Brown',
      phone_number: '+1555667891',
      email: 'jen.brown@ecommerce.shop',
      purpose: 'E-commerce solution',
      status: 'completed',
      notes: 'Successfully closed - signed contract'
    },
    {
      tenant_id: tenants[1]?.id,
      assigned_user_id: null, // Unassigned
      date: new Date('2025-08-23').toISOString(),
      name: 'Chris Miller',
      phone_number: '+1555667892',
      email: 'c.miller@fintech.io',
      purpose: 'Fintech partnership',
      status: 'failed',
      notes: 'Budget constraints - follow up in Q4'
    },
    
    // Global Marketing Inc leads
    {
      tenant_id: tenants[2]?.id,
      assigned_user_id: globalUsers[1]?.id || null, // Emma Davis
      date: new Date('2025-08-26').toISOString(),
      name: 'James Wilson',
      phone_number: '+44234567890',
      email: 'james.w@retailchain.co.uk',
      purpose: 'Marketing automation',
      status: 'scheduled',
      notes: 'Demo scheduled for Friday - retail chain expansion'
    },
    {
      tenant_id: tenants[2]?.id,
      assigned_user_id: globalUsers[1]?.id || null, // Emma Davis
      date: new Date('2025-08-25').toISOString(),
      name: 'Sophie Clarke',
      phone_number: '+44234567891',
      email: 'sophie.clarke@fashion.london',
      purpose: 'Fashion brand marketing',
      status: 'called',
      notes: 'Interested in social media campaign tools'
    },
    {
      tenant_id: tenants[2]?.id,
      assigned_user_id: null, // Unassigned
      date: new Date('2025-08-24').toISOString(),
      name: 'Oliver Martinez',
      phone_number: '+44234567892',
      email: 'oliver.m@realestate.co.uk',
      purpose: 'Real estate marketing',
      status: 'pending',
      notes: 'New lead from LinkedIn - property development company'
    }
  ];

  for (const lead of leads) {
    try {
      await pool.query(
        `INSERT INTO leads (tenant_id, assigned_user_id, date, name, phone_number, email, purpose, status, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [lead.tenant_id, lead.assigned_user_id, lead.date, lead.name, lead.phone_number, lead.email, lead.purpose, lead.status, lead.notes]
      );
      console.log(`✓ Seeded lead: ${lead.name} (${lead.tenant_id})`);
    } catch (error) {
      console.error(`✗ Failed to seed lead ${lead.name}:`, error);
    }
  }
}

async function main() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Seed tenants first
    const tenants = await seedTenants();
    
    // Seed users (need tenants to exist first)
    const users = await seedUsers(tenants);
    
    // Seed sample leads (need both tenants and users)
    await seedSampleLeads(tenants, users);
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Login Credentials by Tenant:');
    
    console.log('\n🏢 Acme Sales Corp (acme-sales):');
    console.log('  Admin: mengtee1127@gmail.com / pmlz5929');
    console.log('  Agent: john.agent@acme-sales.com / agent123');
    console.log('  Agent: sarah.agent@acme-sales.com / agent123');
    
    console.log('\n🚀 TechStart Solutions (techstart):');
    console.log('  Admin: admin@techstart.io / admin123');
    console.log('  Agent: mike.agent@techstart.io / agent123');
    
    console.log('\n🌍 Global Marketing Inc (global-marketing):');
    console.log('  Admin: admin@globalmarketing.co / admin123');
    console.log('  Agent: emma.agent@globalmarketing.co / agent123');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();