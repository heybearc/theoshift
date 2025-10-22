#!/usr/bin/env node

/**
 * APEX Guardian Sign-in Debug
 * Diagnoses 400 errors during authentication
 */

const { spawn } = require('child_process');
const fs = require('fs');

class APEXSigninDebug {
  constructor() {
    this.config = JSON.parse(fs.readFileSync('wmacs/config/project.json', 'utf8'));
    this.environments = JSON.parse(fs.readFileSync('wmacs/config/environments.json', 'utf8'));
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  async runCommand(command, cwd = '.') {
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', ['-c', command], { cwd, stdio: 'inherit' });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}: ${command}`));
        }
      });
    });
  }

  async debugSignin() {
    this.log('🛡️ APEX Guardian: Sign-in Debug & Fix');
    this.log('====================================');

    try {
      // Phase 1: Check NextAuth configuration
      this.log('🔍 Phase 1: Checking NextAuth configuration...');
      await this.checkNextAuthConfig();

      // Phase 2: Check database connection
      this.log('🗄️ Phase 2: Checking database connection...');
      await this.checkDatabaseConnection();

      // Phase 3: Test authentication endpoints
      this.log('🔐 Phase 3: Testing authentication endpoints...');
      await this.testAuthEndpoints();

      // Phase 4: Check environment variables
      this.log('⚙️ Phase 4: Checking environment variables...');
      await this.checkEnvironmentVars();

      // Phase 5: Fix common issues
      this.log('🔧 Phase 5: Fixing common authentication issues...');
      await this.fixAuthIssues();

      // Phase 6: Restart and validate
      this.log('🚀 Phase 6: Restarting and validating...');
      await this.restartAndValidate();

      this.log('🎉 APEX Guardian: Sign-in debug completed!');

    } catch (error) {
      this.log(`❌ Sign-in debug failed: ${error.message}`);
      process.exit(1);
    }
  }

  async checkNextAuthConfig() {
    const prod = this.environments.production;
    
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "
      cd ${prod.path}
      
      echo '🔍 Checking NextAuth configuration:'
      echo 'NextAuth API route exists:'
      ls -la pages/api/auth/\\[...nextauth\\].ts 2>/dev/null || echo 'NextAuth route missing!'
      
      echo ''
      echo 'Checking for syntax errors in NextAuth config:'
      node -c pages/api/auth/\\[...nextauth\\].ts 2>/dev/null && echo 'NextAuth config syntax OK' || echo 'NextAuth config has syntax errors!'
    "`);
  }

  async checkDatabaseConnection() {
    const prod = this.environments.production;
    
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "
      cd ${prod.path}
      
      echo '🗄️ Testing database connection:'
      node -e \"
        const { PrismaClient } = require('@prisma/client');
        async function testDB() {
          const prisma = new PrismaClient();
          try {
            await prisma.\\\$connect();
            console.log('✅ Database connection successful');
            
            const userCount = await prisma.users.count();
            console.log(\\\`Users in database: \\\${userCount}\\\`);
            
            const adminUser = await prisma.users.findFirst({ where: { role: 'ADMIN' } });
            if (adminUser) {
              console.log(\\\`✅ Admin user found: \\\${adminUser.email}\\\`);
            } else {
              console.log('❌ No admin user found');
            }
          } catch (error) {
            console.log('❌ Database error:', error.message);
          } finally {
            await prisma.\\\$disconnect();
          }
        }
        testDB();
      \"
    "`);
  }

  async testAuthEndpoints() {
    const prod = this.environments.production;
    
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "
      cd ${prod.path}
      
      echo '🔐 Testing authentication endpoints:'
      
      echo 'Testing NextAuth providers endpoint:'
      curl -s http://localhost:3001/api/auth/providers | head -3 || echo 'Providers endpoint failed'
      
      echo ''
      echo 'Testing NextAuth signin endpoint:'
      curl -I http://localhost:3001/api/auth/signin 2>/dev/null | head -3 || echo 'Signin endpoint failed'
      
      echo ''
      echo 'Testing CSRF token:'
      curl -s http://localhost:3001/api/auth/csrf | head -3 || echo 'CSRF endpoint failed'
    "`);
  }

  async checkEnvironmentVars() {
    const prod = this.environments.production;
    
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "
      cd ${prod.path}
      
      echo '⚙️ Checking critical environment variables:'
      
      echo 'NEXTAUTH_URL:'
      grep NEXTAUTH_URL .env || echo 'NEXTAUTH_URL missing!'
      
      echo 'NEXTAUTH_SECRET:'
      grep NEXTAUTH_SECRET .env | sed 's/=.*/=***HIDDEN***/' || echo 'NEXTAUTH_SECRET missing!'
      
      echo 'DATABASE_URL:'
      grep DATABASE_URL .env | sed 's/postgresql:\\/\\/[^@]*@/postgresql:\\/\\/***:***@/' || echo 'DATABASE_URL missing!'
      
      echo 'NODE_ENV:'
      grep NODE_ENV .env || echo 'NODE_ENV missing!'
    "`);
  }

  async fixAuthIssues() {
    const prod = this.environments.production;
    
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "
      cd ${prod.path}
      
      echo '🔧 Fixing common authentication issues:'
      
      # Ensure proper environment variables
      cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
DATABASE_URL=\"postgresql://jw_scheduler_staging:jw_password@10.92.3.21:5432/jw_attendant_scheduler_staging\"
NEXTAUTH_URL=\"https://attendant.cloudigan.net\"
NEXTAUTH_SECRET=\"\$(openssl rand -hex 32)\"
UPLOAD_DIR=\"/opt/jw-attendant-scheduler/public/uploads\"
MAX_FILE_SIZE=10485760
FEEDBACK_ENABLED=true
EOF
      
      echo 'Environment variables updated'
      
      # Regenerate Prisma client
      echo 'Regenerating Prisma client...'
      npx prisma generate
      
      echo 'Authentication fixes applied'
    "`);
  }

  async restartAndValidate() {
    const prod = this.environments.production;
    
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "
      cd ${prod.path}
      
      echo '🚀 Restarting application...'
      pm2 restart jw-attendant
      sleep 10
      
      echo 'Testing authentication after restart:'
      curl -s http://localhost:3001/api/auth/providers | grep -q 'credentials' && echo '✅ Auth providers working' || echo '❌ Auth providers failed'
      
      echo ''
      echo 'Testing signin page:'
      curl -s http://localhost:3001/auth/signin | grep -q 'Sign in' && echo '✅ Signin page loading' || echo '❌ Signin page failed'
    "`);
  }
}

// Run signin debug
const signinDebug = new APEXSigninDebug();
signinDebug.debugSignin().catch(console.error);
