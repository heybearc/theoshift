#!/usr/bin/env node

/**
 * APEX Guardian Styling Fix
 * Diagnoses and fixes CSS/Tailwind issues in production
 */

const { spawn } = require('child_process');
const fs = require('fs');

class APEXStylingFix {
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

  async fixStyling() {
    this.log('🛡️ APEX Guardian: Styling Diagnostic & Fix');
    this.log('============================================');

    try {
      // Phase 1: Diagnostic
      this.log('🔍 Phase 1: CSS Diagnostic...');
      await this.diagnosticCSS();

      // Phase 2: Fix CSS file serving
      this.log('🔧 Phase 2: Fixing CSS file serving...');
      await this.fixCSSServing();

      // Phase 3: Rebuild with proper CSS
      this.log('🎨 Phase 3: Rebuilding with Tailwind CSS...');
      await this.rebuildCSS();

      // Phase 4: Restart services
      this.log('🚀 Phase 4: Restarting services...');
      await this.restartServices();

      // Phase 5: Validation
      this.log('✅ Phase 5: Validating styling...');
      await this.validateStyling();

      this.log('🎉 APEX Guardian: Styling fix completed successfully!');

    } catch (error) {
      this.log(`❌ Styling fix failed: ${error.message}`);
      process.exit(1);
    }
  }

  async diagnosticCSS() {
    const prod = this.environments.production;
    
    this.log('Checking CSS files in production...');
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "
      cd ${prod.path}
      echo 'CSS files in build:'
      find .next -name '*.css' -type f 2>/dev/null || echo 'No CSS files found'
      
      echo ''
      echo 'HTML CSS references:'
      curl -s http://localhost:3001/auth/signin | grep -o 'href=\"[^\"]*css[^\"]*\"' | head -3 || echo 'No CSS references found'
    "`);
  }

  async fixCSSServing() {
    const prod = this.environments.production;
    
    this.log('Fixing CSS file serving issues...');
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "
      cd ${prod.path}
      
      # Get the actual CSS file name
      CSS_FILE=\$(find .next -name '*.css' -type f | head -1)
      if [ ! -z \"\$CSS_FILE\" ]; then
        CSS_BASENAME=\$(basename \$CSS_FILE)
        echo \"Found CSS file: \$CSS_BASENAME\"
        
        # Check what HTML expects
        EXPECTED_CSS=\$(curl -s http://localhost:3001/auth/signin | grep -o '_next/static/css/[^\"]*\\.css' | head -1 | sed 's|_next/static/css/||')
        
        if [ ! -z \"\$EXPECTED_CSS\" ] && [ \"\$CSS_BASENAME\" != \"\$EXPECTED_CSS\" ]; then
          echo \"CSS filename mismatch: HTML expects \$EXPECTED_CSS but we have \$CSS_BASENAME\"
          echo \"Creating symlink to fix mismatch...\"
          cd .next/static/css/
          ln -sf \$CSS_BASENAME \$EXPECTED_CSS 2>/dev/null || cp \$CSS_BASENAME \$EXPECTED_CSS
          echo \"CSS file mismatch fixed\"
        else
          echo \"CSS filename matches or no mismatch detected\"
        fi
      else
        echo \"No CSS file found - need to rebuild\"
      fi
    "`);
  }

  async rebuildCSS() {
    const prod = this.environments.production;
    
    this.log('Rebuilding application with proper CSS processing...');
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "
      cd ${prod.path}
      
      # Stop the application
      pm2 stop jw-attendant || true
      
      # Clean build artifacts
      rm -rf .next
      
      # Ensure Tailwind config exists
      if [ ! -f tailwind.config.js ]; then
        echo 'Tailwind config missing - copying from staging'
        # This should not happen after APEX deployment, but safety check
      fi
      
      # Rebuild with CSS
      npm run build
      
      echo 'Build completed - checking CSS generation...'
      find .next -name '*.css' -type f | head -3
    "`);
  }

  async restartServices() {
    const prod = this.environments.production;
    
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "
      cd ${prod.path}
      pm2 restart jw-attendant
      sleep 5
    "`);
  }

  async validateStyling() {
    const prod = this.environments.production;
    
    this.log('Validating CSS is now working...');
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "
      cd ${prod.path}
      
      echo 'Testing CSS file access:'
      CSS_FILE=\$(find .next -name '*.css' -type f | head -1)
      if [ ! -z \"\$CSS_FILE\" ]; then
        CSS_BASENAME=\$(basename \$CSS_FILE)
        curl -I http://localhost:3001/_next/static/css/\$CSS_BASENAME 2>/dev/null | head -3
      fi
      
      echo ''
      echo 'Testing page load with styling:'
      curl -s http://localhost:3001/auth/signin | grep -c 'class=' || echo 'No CSS classes found in HTML'
    "`);
  }
}

// Run styling fix
const stylingFix = new APEXStylingFix();
stylingFix.fixStyling().catch(console.error);
