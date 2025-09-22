#!/usr/bin/env node

// WMACS Guardian: Database Verification Script
// Verifies database connectivity and password hash integrity

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSDBVerifier {
  constructor() {
    this.dbConfig = {
      host: '10.92.3.21',
      port: 5432,
      database: 'jw_attendant_scheduler_staging',
      user: 'jw_scheduler_staging',
      password: 'jw_password'
    };
  }

  async verifyDatabase() {
    console.log('🔍 WMACS Guardian: Verifying Database...\n');
    
    try {
      // Test 1: Database connectivity
      await this.testConnectivity();
      
      // Test 2: User table structure
      await this.testUserTable();
      
      // Test 3: Admin user exists
      await this.testAdminUser();
      
      // Test 4: Password hash integrity
      await this.testPasswordHashes();
      
      console.log('\n✅ Database verification completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Database verification failed:', error.message);
      process.exit(1);
    }
  }

  async testConnectivity() {
    console.log('🔍 Testing database connectivity...');
    
    const result = await execAsync(`ssh jws "cd /opt/jw-attendant-scheduler && PGPASSWORD=${this.dbConfig.password} psql -h ${this.dbConfig.host} -U ${this.dbConfig.user} -d ${this.dbConfig.database} -c 'SELECT 1;'"`);
    
    if (result.stdout.includes('1')) {
      console.log('   ✅ Database connection successful');
    } else {
      throw new Error('Database connection failed');
    }
  }

  async testUserTable() {
    console.log('🔍 Testing user table structure...');
    
    const result = await execAsync(`ssh jws "cd /opt/jw-attendant-scheduler && PGPASSWORD=${this.dbConfig.password} psql -h ${this.dbConfig.host} -U ${this.dbConfig.user} -d ${this.dbConfig.database} -c 'SELECT COUNT(*) FROM users;'"`);
    
    const userCount = result.stdout.match(/\d+/)?.[0];
    if (userCount && parseInt(userCount) > 0) {
      console.log(`   ✅ Users table exists with ${userCount} users`);
    } else {
      throw new Error('Users table is empty or missing');
    }
  }

  async testAdminUser() {
    console.log('🔍 Testing admin user...');
    
    const result = await execAsync(`ssh jws "cd /opt/jw-attendant-scheduler && PGPASSWORD=${this.dbConfig.password} psql -h ${this.dbConfig.host} -U ${this.dbConfig.user} -d ${this.dbConfig.database} -c \\"SELECT email, role FROM users WHERE email = 'admin@jwscheduler.local';\\""`);
    
    if (result.stdout.includes('admin@jwscheduler.local') && result.stdout.includes('ADMIN')) {
      console.log('   ✅ Admin user exists with correct role');
    } else {
      throw new Error('Admin user not found or incorrect role');
    }
  }

  async testPasswordHashes() {
    console.log('🔍 Testing password hash integrity...');
    
    const result = await execAsync(`ssh jws "cd /opt/jw-attendant-scheduler && PGPASSWORD=${this.dbConfig.password} psql -h ${this.dbConfig.host} -U ${this.dbConfig.user} -d ${this.dbConfig.database} -c \\"SELECT email, LENGTH(\\\\\\\"passwordHash\\\\\\\") as hash_length, SUBSTRING(\\\\\\\"passwordHash\\\\\\\", 1, 4) as hash_prefix FROM users WHERE \\\\\\\"passwordHash\\\\\\\" IS NOT NULL;\\""`);
    
    const lines = result.stdout.split('\n').filter(line => line.includes('@'));
    let validHashes = 0;
    let invalidHashes = 0;
    
    for (const line of lines) {
      const parts = line.trim().split('|').map(p => p.trim());
      if (parts.length >= 3) {
        const email = parts[0];
        const hashLength = parseInt(parts[1]);
        const hashPrefix = parts[2];
        
        if (hashLength === 60 && hashPrefix.startsWith('$2b$')) {
          console.log(`   ✅ ${email}: Valid bcrypt hash`);
          validHashes++;
        } else {
          console.log(`   ❌ ${email}: Invalid hash (length: ${hashLength}, prefix: ${hashPrefix})`);
          invalidHashes++;
        }
      }
    }
    
    if (invalidHashes > 0) {
      throw new Error(`Found ${invalidHashes} users with invalid password hashes`);
    }
    
    console.log(`   ✅ All ${validHashes} password hashes are valid bcrypt hashes`);
  }

  async fixPasswordHash(email, plainPassword) {
    console.log(`🔧 Fixing password hash for ${email}...`);
    
    // Generate new bcrypt hash
    const hashResult = await execAsync(`ssh jws "cd /opt/jw-attendant-scheduler && node -e \\"const bcrypt = require('bcryptjs'); bcrypt.hash('${plainPassword}', 12).then(hash => console.log(hash));\\""`);
    const newHash = hashResult.stdout.trim();
    
    // Update database
    const updateResult = await execAsync(`ssh jws "cd /opt/jw-attendant-scheduler && PGPASSWORD=${this.dbConfig.password} psql -h ${this.dbConfig.host} -U ${this.dbConfig.user} -d ${this.dbConfig.database} -c \\"UPDATE users SET \\\\\\\"passwordHash\\\\\\\" = '${newHash}' WHERE email = '${email}';\\""`);
    
    if (updateResult.stdout.includes('UPDATE 1')) {
      console.log(`   ✅ Password hash updated for ${email}`);
    } else {
      throw new Error(`Failed to update password hash for ${email}`);
    }
  }
}

// Auto-run if called directly
if (require.main === module) {
  const verifier = new WMACSDBVerifier();
  verifier.verifyDatabase().catch(console.error);
}

module.exports = WMACSDBVerifier;
