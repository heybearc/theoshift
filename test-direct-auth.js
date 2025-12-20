#!/usr/bin/env node

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

// WMACS Research Advisor Recommendation: Direct PostgreSQL instead of Prisma
const dbConfig = {
  host: '10.92.3.21',
  port: 5432,
  database: 'theoshift_scheduler_staging',
  user: 'jw_scheduler_staging',
  password: 'jw_password'
};

async function testDirectAuth() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔍 WMACS: Testing direct PostgreSQL authentication...');
    await client.connect();
    console.log('✅ Database connected successfully');
    
    // Test user query
    const result = await client.query('SELECT email, "firstName", "lastName", role, "passwordHash" FROM users WHERE role = $1', ['ADMIN']);
    console.log(`📊 Found ${result.rows.length} admin users`);
    
    for (const user of result.rows) {
      console.log(`  - ${user.email} (${user.role})`);
      console.log(`    Name: ${user.firstName} ${user.lastName}`);
      console.log(`    Has password: ${!!user.passwordHash}`);
      
      if (user.passwordHash) {
        const isValid = await bcrypt.compare('admin123', user.passwordHash);
        console.log(`    Password valid: ${isValid}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testDirectAuth();
