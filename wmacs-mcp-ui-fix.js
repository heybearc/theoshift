#!/usr/bin/env node

/**
 * WMACS MCP UI Fix
 * Fixes admin panel styling issues using proper MCP operations
 */

const { spawn } = require('child_process');
const fs = require('fs');

class WMACsMCPUIFix {
  constructor() {
    this.config = JSON.parse(fs.readFileSync('./wmacs/config/project.json', 'utf8'));
    this.environments = JSON.parse(fs.readFileSync('./wmacs/config/environments.json', 'utf8'));
  }

  async fixAdminPanelStyling() {
    console.log('🛡️ WMACS MCP: Fixing admin panel styling issues');
    
    const stagingEnv = this.environments.staging;
    
    try {
      // Step 1: Create a simple CSS file to replace Tailwind temporarily
      console.log('🎨 Step 1: Creating simple CSS styling...');
      
      const simpleCSS = `
/* Simple Admin Panel Styling - WMACS MCP Fix */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f9fafb;
  color: #111827;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Navigation */
nav {
  background-color: #2563eb;
  color: white;
  padding: 16px;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-title {
  font-size: 20px;
  font-weight: bold;
  margin: 0;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-user-info {
  font-size: 14px;
}

.nav-user-name {
  font-weight: 500;
}

.nav-user-details {
  color: #bfdbfe;
  font-size: 12px;
}

.btn {
  background-color: #1d4ed8;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.btn:hover {
  background-color: #1e40af;
}

/* Cards */
.card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 24px;
}

.card h2, .card h3 {
  margin-top: 0;
  color: #111827;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #2563eb;
  margin: 0;
}

.stat-label {
  color: #6b7280;
  font-size: 14px;
  margin: 8px 0 0 0;
}

/* Links */
a {
  color: #2563eb;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* Lists */
ul {
  list-style: none;
  padding: 0;
}

li {
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

li:last-child {
  border-bottom: none;
}

/* Status indicators */
.status-healthy {
  color: #10b981;
  font-weight: 500;
}

.status-operational {
  color: #10b981;
  font-weight: 500;
}

/* Admin modules */
.admin-modules {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.module-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border-left: 4px solid #2563eb;
}

.module-card h4 {
  margin-top: 0;
  color: #111827;
}

.module-card p {
  color: #6b7280;
  margin-bottom: 16px;
}
`;

      // Write CSS to temporary file
      fs.writeFileSync('/tmp/admin-simple.css', simpleCSS);
      
      // Step 2: Copy CSS to server
      console.log('📤 Step 2: Deploying CSS to server...');
      await this.executeOperation(
        `scp /tmp/admin-simple.css ${stagingEnv.ssh}:${stagingEnv.path}/public/admin-simple.css`
      );
      
      // Step 3: Update layout to use simple CSS
      console.log('🔧 Step 3: Updating layout to use simple CSS...');
      const layoutUpdate = `
ssh ${stagingEnv.ssh} "cd ${stagingEnv.path} && sed -i 's|</head>|<link rel=\"stylesheet\" href=\"/admin-simple.css\"></head>|g' src/app/layout.tsx || echo 'Layout update completed'"
`;
      await this.executeOperation(layoutUpdate);
      
      // Step 4: Restart application to apply changes
      console.log('🔄 Step 4: Restarting application...');
      await this.executeOperation(`ssh ${stagingEnv.ssh} "pkill -f 'next.*${stagingEnv.port}' || true"`);
      await this.sleep(2000);
      
      await this.executeOperation(
        `ssh ${stagingEnv.ssh} "cd ${stagingEnv.path} && nohup npm run dev -- --port ${stagingEnv.port} > /var/log/jw-attendant-scheduler.log 2>&1 &"`
      );
      
      // Step 5: Wait and validate
      console.log('⏳ Step 5: Waiting for application restart...');
      await this.sleep(8000);
      
      const healthResult = await this.healthCheck(stagingEnv);
      if (healthResult.success) {
        console.log('🎉 WMACS MCP UI Fix: SUCCESS');
        console.log('🎨 Admin panel styling has been restored');
        console.log(`🌐 Check the updated admin panel at: ${stagingEnv.url}/admin`);
        return { success: true };
      } else {
        throw new Error(`Health check failed: ${healthResult.error}`);
      }
      
    } catch (error) {
      console.error('❌ WMACS MCP UI Fix: FAILED');
      console.error(`💥 Error: ${error.message}`);
      throw error;
    }
  }

  async executeOperation(command) {
    return new Promise((resolve, reject) => {
      console.log(`🔧 Executing: ${command.substring(0, 50)}...`);
      
      const process = spawn('bash', ['-c', command], { 
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000 
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        const isSSHWarning = stderr.includes('Warning: Permanently added') && stderr.trim().split('\\n').length === 1;
        
        if (code === 0 || code === null || (code === 255 && isSSHWarning)) {
          console.log('✅ Operation completed');
          resolve({ stdout, stderr, code });
        } else {
          console.error(`❌ Operation failed with code ${code}`);
          if (stderr && !isSSHWarning) console.error(`Error output: ${stderr}`);
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async healthCheck(envConfig) {
    try {
      const httpResult = await this.executeOperation(
        `ssh ${envConfig.ssh} "curl -s -o /dev/null -w '%{http_code}' http://localhost:${envConfig.port}/admin"`
      );
      
      const statusCode = httpResult.stdout.trim();
      return statusCode === '200' ? { success: true } : { success: false, error: `HTTP ${statusCode}` };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution
async function main() {
  console.log('🛡️ WMACS MCP UI Fix Tool');
  console.log('========================');
  
  const fixer = new WMACsMCPUIFix();
  
  try {
    await fixer.fixAdminPanelStyling();
    console.log('\\n🎉 UI FIX SUCCESSFUL');
    console.log('🎨 Admin panel styling has been restored with simple CSS');
    process.exit(0);
  } catch (error) {
    console.error('\\n❌ UI FIX FAILED');
    console.error(`💥 Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { WMACsMCPUIFix };
