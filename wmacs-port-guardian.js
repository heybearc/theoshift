#!/usr/bin/env node

// WMACS Guardian: Port 3001 Enforcement System
// Ensures all JW Attendant Scheduler deployments use port 3001

const fs = require('fs');
const path = require('path');

class WMACSPortGuardian {
  constructor() {
    this.IMMUTABLE_PORT = 3001;
    this.configFiles = [
      '.env',
      '.env.local',
      '.env.production',
      '.env.development'
    ];
  }

  enforcePort3001() {
    console.log('🔒 WMACS Port Guardian: Enforcing Port 3001...\n');
    
    // Check and fix local environment files
    this.fixEnvironmentFiles();
    
    // Verify package.json scripts
    this.verifyPackageJsonScripts();
    
    // Create immutable reference
    this.createImmutableReference();
    
    console.log('\n✅ WMACS Port Guardian: Port 3001 enforcement complete!');
    console.log(`🎯 All configurations now reference port ${this.IMMUTABLE_PORT}`);
  }

  fixEnvironmentFiles() {
    console.log('📝 Checking environment files...');
    
    this.configFiles.forEach(file => {
      if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;
        
        // Fix PORT= lines
        if (content.includes('PORT=') && !content.includes('PORT=3001')) {
          content = content.replace(/PORT=\d+/g, 'PORT=3001');
          modified = true;
          console.log(`   ✅ Fixed PORT in ${file}`);
        }
        
        // Fix NEXTAUTH_URL port references
        if (content.includes(':3000') || content.includes(':8000')) {
          content = content.replace(/:3000/g, ':3001');
          content = content.replace(/:8000/g, ':3001');
          modified = true;
          console.log(`   ✅ Fixed NEXTAUTH_URL port in ${file}`);
        }
        
        if (modified) {
          fs.writeFileSync(file, content);
        }
      }
    });
  }

  verifyPackageJsonScripts() {
    console.log('📦 Verifying package.json scripts...');
    
    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      let modified = false;
      
      // Check dev script
      if (packageJson.scripts && packageJson.scripts.dev) {
        if (!packageJson.scripts.dev.includes('--port 3001')) {
          packageJson.scripts.dev = packageJson.scripts.dev.replace(/--port \d+/, '').trim() + ' --port 3001';
          modified = true;
          console.log('   ✅ Fixed dev script port');
        }
      }
      
      if (modified) {
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
      }
    }
  }

  createImmutableReference() {
    console.log('🔒 Creating immutable port reference...');
    
    const configContent = `// WMACS IMMUTABLE PORT CONFIGURATION
// ⚠️ WARNING: DO NOT MODIFY - This is an immutable reference
export const WMACS_IMMUTABLE_PORT = 3001;

// Port validation function
export function validatePort(port) {
  if (port !== WMACS_IMMUTABLE_PORT) {
    throw new Error(\`WMACS Guardian: Invalid port \${port}. Must use port \${WMACS_IMMUTABLE_PORT}\`);
  }
  return true;
}

// Environment port getter with validation
export function getWMACSPort() {
  const envPort = process.env.PORT ? parseInt(process.env.PORT) : WMACS_IMMUTABLE_PORT;
  validatePort(envPort);
  return envPort;
}

// Production deployment URLs
export const WMACS_URLS = {
  staging: 'http://10.92.3.24:3001',
  production: 'http://10.92.3.22:3001',
  local: 'http://localhost:3001'
};

console.log('🔒 WMACS Guardian: Port 3001 enforced');
`;

    fs.writeFileSync('wmacs-port-config.js', configContent);
    console.log('   ✅ Created wmacs-port-config.js');
  }

  static validateDeployment(targetPort) {
    if (targetPort !== 3001) {
      console.error('🚨 WMACS Guardian: DEPLOYMENT BLOCKED!');
      console.error(`❌ Attempted to deploy on port ${targetPort}`);
      console.error('✅ Required port: 3001');
      console.error('📋 Fix: Update configuration to use port 3001');
      process.exit(1);
    }
    console.log('✅ WMACS Guardian: Port validation passed');
  }
}

// Auto-run if called directly
if (require.main === module) {
  const guardian = new WMACSPortGuardian();
  guardian.enforcePort3001();
}

module.exports = WMACSPortGuardian;
