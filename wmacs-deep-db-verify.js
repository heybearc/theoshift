#!/usr/bin/env node

// WMACS Deep Database Verification
// Verify admin user exists and database communication is working

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function wmacsDatabaseVerification() {
  console.log('🔍 WMACS: Deep Database Verification');
  console.log('');

  try {
    // Step 1: Verify admin user exists in staging database
    console.log('📋 Step 1: Checking if admin user exists in staging database');
    const checkUserQuery = `ssh root@10.92.3.21 "psql -U jw_scheduler_staging -d jw_attendant_scheduler_staging -c \\"SELECT id, email, \\"firstName\\", \\"lastName\\", role, \\"passwordHash\\" FROM users WHERE email = 'admin@jwscheduler.local';\\" 2>/dev/null || echo 'Database query failed'"`;
    
    const { stdout: userCheck } = await execAsync(checkUserQuery);
    console.log('Admin User Query Result:');
    console.log(userCheck);

    // Step 2: Test database connection from staging server
    console.log('\n🔌 Step 2: Testing database connection from staging server');
    const dbConnTest = `ssh root@10.92.3.24 "cd /opt/jw-attendant-scheduler/current && node -e \\"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://jw_scheduler_staging:Cloudy_92!@10.92.3.21:5432/jw_attendant_scheduler_staging'
    }
  }
});

async function testConnection() {
  try {
    const user = await prisma.users.findUnique({
      where: { email: 'admin@jwscheduler.local' }
    });
    console.log('Database connection successful');
    console.log('User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('User details:', JSON.stringify({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        hasPassword: !!user.passwordHash
      }, null, 2));
    }
  } catch (error) {
    console.error('Database connection failed:', error.message);
  } finally {
    await prisma.\\$disconnect();
  }
}

testConnection();
\\" 2>&1"`;

    const { stdout: connTest } = await execAsync(dbConnTest);
    console.log('Database Connection Test:');
    console.log(connTest);

    // Step 3: Check current environment variables
    console.log('\n🔧 Step 3: Checking current environment variables');
    const envCheck = `ssh root@10.92.3.24 "ps aux | grep 'npm start' | grep -v grep | head -1 | tr ' ' '\\n' | grep -E 'DATABASE_URL|JWT_SECRET' || echo 'No environment variables found in process'"`;
    
    const { stdout: envVars } = await execAsync(envCheck);
    console.log('Environment Variables:');
    console.log(envVars);

    // Step 4: Test password verification
    console.log('\n🔐 Step 4: Testing password verification');
    const passwordTest = `ssh root@10.92.3.24 "cd /opt/jw-attendant-scheduler/current && node -e \\"
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://jw_scheduler_staging:Cloudy_92!@10.92.3.21:5432/jw_attendant_scheduler_staging'
    }
  }
});

async function testPassword() {
  try {
    const user = await prisma.users.findUnique({
      where: { email: 'admin@jwscheduler.local' }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    const isValid = await bcrypt.compare('AdminPass123!', user.passwordHash);
    console.log('Password verification result:', isValid);
    console.log('Password hash exists:', !!user.passwordHash);
    console.log('Hash length:', user.passwordHash ? user.passwordHash.length : 0);
  } catch (error) {
    console.error('Password test failed:', error.message);
  } finally {
    await prisma.\\$disconnect();
  }
}

testPassword();
\\" 2>&1"`;

    const { stdout: passwordResult } = await execAsync(passwordTest);
    console.log('Password Verification Test:');
    console.log(passwordResult);

    // Step 5: Monitor real-time login attempt
    console.log('\n🎯 Step 5: Testing live login attempt with monitoring');
    
    // Start log monitoring in background
    const logMonitor = exec('ssh root@10.92.3.24 "tail -f /var/log/jw-attendant-scheduler.log"');
    
    setTimeout(async () => {
      try {
        // Make login attempt
        const loginTest = await execAsync('curl -X POST http://10.92.3.24:3001/api/auth/login -H "Content-Type: application/json" -d \'{"email": "admin@jwscheduler.local", "password": "AdminPass123!"}\' -s');
        console.log('Login attempt result:', loginTest);
      } catch (error) {
        console.log('Login attempt error:', error.message);
      }
      
      // Stop log monitoring
      logMonitor.kill();
    }, 2000);

    // Wait for log output
    await new Promise(resolve => {
      let output = '';
      logMonitor.stdout.on('data', (data) => {
        output += data;
        console.log('Live log:', data.toString().trim());
      });
      
      setTimeout(() => {
        logMonitor.kill();
        resolve();
      }, 5000);
    });

    console.log('\n✅ WMACS deep database verification completed');

  } catch (error) {
    console.error('❌ WMACS Database Verification Error:', error.message);
  }
}

wmacsDatabaseVerification().catch(console.error);
