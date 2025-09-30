#!/usr/bin/env node

/**
 * APEX Universal Synchronization System
 * 
 * Backward-compatible sync that works with both WMACS and APEX repositories
 * Automatically detects repository type and migrates WMACS to APEX
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class APEXUniversalSync {
  constructor() {
    // Auto-detect repository type and set appropriate paths
    this.detectRepositoryType();
    this.setSharedSystemPath();
    this.setLocalPath();
    
    // Files that are always synced from shared system
    this.syncableFiles = [
      // Core components
      'WINDSURF_OPERATIONAL_GUIDELINES.md',
      'ENFORCEMENT_MECHANISMS.md',
      'OPERATIONAL_PROCEDURES.md',
      'USAGE_GUIDE.md',
      'cascade-rules.json',
      'health-check.sh',
      
      // Advisors and tools (backward compatible names)
      'apex-research-advisor.js',
      'apex-auto-advisor.js',
      'apex-architectural-guardian.js',
      'apex-admin-comprehensive-tester.js',
      
      // Deployment standards
      'DEPLOYMENT_STANDARDS.md',
      'apex-deployment-rules.json',
      'apex-enhanced-deployment.js',
      
      // MCP integration
      'base-server.js'
    ];
    
    // Repository-specific files (never synced - preserved locally)
    this.repositorySpecificFiles = [
      'config/project.json',
      'config/environments.json',
      'logs/',
      'setup-wmacs-deployment-standards.sh'
    ];
    
    // Files that are NEVER overwritten (protected)
    this.protectedFiles = [
      'config/project.json',
      'config/environments.json',
      'config/ssh-config.json',
      'config/overrides.json',
      'local/custom-rules.js',
      'local/local-procedures.md'
    ];
  }

  detectRepositoryType() {
    const apexDir = path.join(process.cwd(), 'apex');
    const wmacsDir = path.join(process.cwd(), 'wmacs');
    
    if (fs.existsSync(apexDir)) {
      this.repositoryType = 'apex';
      console.log('🚀 APEX repository detected');
    } else if (fs.existsSync(wmacsDir)) {
      this.repositoryType = 'wmacs';
      console.log('🔄 WMACS repository detected - will migrate to APEX');
    } else {
      this.repositoryType = 'new';
      console.log('📦 New repository - will initialize APEX structure');
    }
  }

  setSharedSystemPath() {
    const apexSystem = path.join(process.env.HOME, 'Documents/Cloudy-Work/shared/apex-guardian-system');
    const wmacsSystem = path.join(process.env.HOME, 'Documents/Cloudy-Work/shared/wmacs-guardian-system');
    
    if (fs.existsSync(apexSystem)) {
      this.sharedSystemPath = apexSystem;
      this.sharedSystemType = 'apex';
      console.log('✅ Using APEX guardian system');
    } else if (fs.existsSync(wmacsSystem)) {
      this.sharedSystemPath = wmacsSystem;
      this.sharedSystemType = 'wmacs';
      console.log('⚠️  Using legacy WMACS guardian system');
    } else {
      throw new Error('❌ No guardian system found. Please ensure shared system is available.');
    }
  }

  setLocalPath() {
    if (this.repositoryType === 'apex') {
      this.localPath = path.join(process.cwd(), 'apex');
    } else if (this.repositoryType === 'wmacs') {
      this.localPath = path.join(process.cwd(), 'wmacs');
    } else {
      this.localPath = path.join(process.cwd(), 'apex');
      // Create apex directory for new repositories
      if (!fs.existsSync(this.localPath)) {
        this.createApexStructure();
      }
    }
  }

  createApexStructure() {
    console.log('📁 Creating APEX directory structure...');
    fs.mkdirSync(this.localPath, { recursive: true });
    fs.mkdirSync(path.join(this.localPath, 'config'), { recursive: true });
    fs.mkdirSync(path.join(this.localPath, 'core'), { recursive: true });
    fs.mkdirSync(path.join(this.localPath, 'logs'), { recursive: true });
    console.log('✅ APEX directory structure created');
  }

  async sync() {
    console.log('🛡️ APEX Universal Sync: Starting backward-compatible synchronization...');
    console.log(`📋 Repository Type: ${this.repositoryType.toUpperCase()}`);
    console.log(`📋 Shared System: ${this.sharedSystemType.toUpperCase()}`);
    
    try {
      // 1. Handle WMACS to APEX migration if needed
      if (this.repositoryType === 'wmacs') {
        await this.migrateWmacsToApex();
      }
      
      // 2. Validate shared system exists
      await this.validateSharedSystem();
      
      // 3. Sync files with name mapping
      await this.syncFiles();
      
      // 4. Update configuration
      await this.updateConfiguration();
      
      // 5. Validate sync completion
      await this.validateSync();
      
      console.log('🎉 APEX Universal Sync: Completed successfully');
      
    } catch (error) {
      console.error('❌ APEX Universal Sync: Failed -', error.message);
      throw error;
    }
  }

  async migrateWmacsToApex() {
    console.log('🔄 Migrating WMACS repository to APEX...');
    
    const wmacsPath = path.join(process.cwd(), 'wmacs');
    const apexPath = path.join(process.cwd(), 'apex');
    
    if (fs.existsSync(apexPath)) {
      console.log('⚠️  APEX directory already exists - skipping migration');
      this.repositoryType = 'apex';
      this.localPath = apexPath;
      return;
    }
    
    // Copy wmacs to apex
    try {
      execSync(`cp -r "${wmacsPath}" "${apexPath}"`, { stdio: 'pipe' });
      console.log('✅ Copied WMACS directory to APEX');
      
      // Update file names in apex directory
      this.renameWmacsFilesToApex(apexPath);
      
      // Update repository type
      this.repositoryType = 'apex';
      this.localPath = apexPath;
      
      console.log('✅ WMACS to APEX migration completed');
      console.log('📋 Note: Original wmacs/ directory preserved for safety');
      
    } catch (error) {
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  renameWmacsFilesToApex(apexPath) {
    console.log('🔄 Renaming WMACS files to APEX...');
    
    const renameMap = {
      'wmacs-guardian.js': 'apex-guardian.js',
      'wmacs-smart-sync.js': 'apex-smart-sync.js',
      'wmacs-enhanced-deployment.js': 'apex-enhanced-deployment.js',
      'wmacs-research-advisor.js': 'apex-research-advisor.js',
      'wmacs-auto-advisor.js': 'apex-auto-advisor.js',
      'wmacs-architectural-guardian.js': 'apex-architectural-guardian.js'
    };
    
    // Recursively find and rename files
    this.findAndRenameFiles(apexPath, renameMap);
    
    // Update file contents
    this.updateFileContents(apexPath);
    
    console.log('✅ File renaming completed');
  }

  findAndRenameFiles(dir, renameMap) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        this.findAndRenameFiles(filePath, renameMap);
      } else if (renameMap[file]) {
        const newPath = path.join(dir, renameMap[file]);
        fs.renameSync(filePath, newPath);
        console.log(`   Renamed: ${file} → ${renameMap[file]}`);
      }
    }
  }

  updateFileContents(apexPath) {
    console.log('🔄 Updating file contents to APEX...');
    
    // Find all .js and .json files and update content
    this.updateFilesRecursively(apexPath, ['.js', '.json', '.md'], (content) => {
      return content
        .replace(/WMACS/g, 'APEX')
        .replace(/wmacs/g, 'apex')
        .replace(/WMACSSmartSync/g, 'APEXSmartSync')
        .replace(/WMACSEnhancedDeployment/g, 'APEXEnhancedDeployment');
    });
    
    console.log('✅ File contents updated to APEX');
  }

  updateFilesRecursively(dir, extensions, updateFn) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        this.updateFilesRecursively(filePath, extensions, updateFn);
      } else if (extensions.some(ext => file.endsWith(ext))) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const updatedContent = updateFn(content);
          if (content !== updatedContent) {
            fs.writeFileSync(filePath, updatedContent);
            console.log(`   Updated: ${path.relative(process.cwd(), filePath)}`);
          }
        } catch (error) {
          console.log(`   Skipped: ${file} (${error.message})`);
        }
      }
    }
  }

  async validateSharedSystem() {
    if (!fs.existsSync(this.sharedSystemPath)) {
      throw new Error(`Shared system not found at: ${this.sharedSystemPath}`);
    }
    console.log('✅ Shared system validated');
  }

  async syncFiles() {
    console.log('🔄 Syncing files from shared system...');
    
    let syncedCount = 0;
    
    for (const file of this.syncableFiles) {
      const sourcePath = path.join(this.sharedSystemPath, file);
      const targetPath = path.join(this.localPath, file);
      
      // Handle name mapping for backward compatibility
      const mappedFile = this.mapFileName(file);
      const mappedSourcePath = path.join(this.sharedSystemPath, mappedFile);
      
      let actualSourcePath = sourcePath;
      if (!fs.existsSync(sourcePath) && fs.existsSync(mappedSourcePath)) {
        actualSourcePath = mappedSourcePath;
      }
      
      if (fs.existsSync(actualSourcePath)) {
        // Ensure target directory exists
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // Copy file
        fs.copyFileSync(actualSourcePath, targetPath);
        console.log(`   Synced: ${file}`);
        syncedCount++;
      } else {
        console.log(`   Missing: ${file} (skipped)`);
      }
    }
    
    console.log(`✅ Synced ${syncedCount}/${this.syncableFiles.length} files`);
  }

  mapFileName(file) {
    // Map APEX names to WMACS names for backward compatibility
    const nameMap = {
      'apex-research-advisor.js': 'wmacs-research-advisor.js',
      'apex-auto-advisor.js': 'wmacs-auto-advisor.js',
      'apex-architectural-guardian.js': 'wmacs-architectural-guardian.js',
      'apex-admin-comprehensive-tester.js': 'wmacs-admin-comprehensive-tester.js',
      'apex-enhanced-deployment.js': 'wmacs-enhanced-deployment.js',
      'apex-deployment-rules.json': 'wmacs-deployment-rules.json'
    };
    
    return nameMap[file] || file;
  }

  async updateConfiguration() {
    console.log('🔧 Updating configuration...');
    
    const configPath = path.join(this.localPath, 'config', 'project.json');
    
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Update to APEX configuration
        config.apex_version = config.wmacs_version || config.apex_version || '1.0';
        config.apex_enabled = true;
        config.auto_activation = true;
        
        // Remove old WMACS keys
        delete config.wmacs_version;
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('✅ Configuration updated to APEX');
      } catch (error) {
        console.log('⚠️  Configuration update failed:', error.message);
      }
    }
  }

  async validateSync() {
    console.log('🔍 Validating sync completion...');
    
    const criticalFiles = [
      'DEPLOYMENT_STANDARDS.md',
      'apex-enhanced-deployment.js'
    ];
    
    let validationPassed = true;
    
    for (const file of criticalFiles) {
      const filePath = path.join(this.localPath, file);
      if (!fs.existsSync(filePath)) {
        console.log(`❌ Missing critical file: ${file}`);
        validationPassed = false;
      }
    }
    
    if (validationPassed) {
      console.log('✅ Sync validation passed');
    } else {
      throw new Error('Sync validation failed - missing critical files');
    }
  }
}

// CLI Interface
if (require.main === module) {
  const sync = new APEXUniversalSync();
  sync.sync().catch(error => {
    console.error('💥 Sync failed:', error.message);
    process.exit(1);
  });
}

module.exports = APEXUniversalSync;
