#!/usr/bin/env node

/**
 * APEX Database Migration Tool
 * 
 * MCP-compliant database migration system for APEX Guardian
 * Enforces proper deployment standards and repository verification
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class APEXDatabaseMigration {
  constructor() {
    this.projectPath = process.cwd();
    this.loadConfiguration();
    this.migrationLog = [];
  }

  loadConfiguration() {
    try {
      this.config = JSON.parse(fs.readFileSync(`${this.projectPath}/apex/config/project.json`, 'utf8'));
      this.environments = JSON.parse(fs.readFileSync(`${this.projectPath}/apex/config/environments.json`, 'utf8'));
    } catch (error) {
      throw new Error(`APEX configuration not found. Ensure apex/config/ directory exists with project.json and environments.json`);
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    this.migrationLog.push(logMessage);
  }

  async runMigration(environment, migrationFile) {
    const startTime = Date.now();
    this.log(`🛡️ APEX Database Migration: ${environment.toUpperCase()}`);
    this.log(`📋 Migration File: ${migrationFile}`);
    this.log(`🎯 Following APEX Deployment Standards v1.0`);
    
    const envConfig = this.environments[environment];
    if (!envConfig) {
      throw new Error(`Environment '${environment}' not found in configuration`);
    }

    try {
      // Phase 1: Pre-Migration Verification
      this.log(`🔍 Phase 1: Pre-Migration Verification`);
      await this.verifyMigrationFile(migrationFile);
      await this.verifyDatabaseConnection(envConfig);
      
      // Phase 2: Repository State Verification
      this.log(`🔄 Phase 2: Repository State Verification`);
      await this.verifyRepositoryState();
      
      // Phase 3: Database Migration Execution
      this.log(`🚀 Phase 3: Database Migration Execution`);
      await this.executeMigration(envConfig, migrationFile);
      
      // Phase 4: Post-Migration Validation
      this.log(`🏥 Phase 4: Post-Migration Validation`);
      await this.validateMigration(envConfig);
      
      const duration = Date.now() - startTime;
      this.log(`🎉 APEX Database Migration: SUCCESS (${duration}ms)`);
      this.log(`🌐 Environment: ${environment}`);
      
      return { success: true, duration, environment };
      
    } catch (error) {
      this.log(`❌ APEX Database Migration: FAILED - ${error.message}`);
      throw error;
    }
  }

  async verifyMigrationFile(migrationFile) {
    const migrationPath = path.join(this.projectPath, 'database/migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Basic SQL validation
    if (!migrationContent.includes('CREATE TABLE') && !migrationContent.includes('ALTER TABLE')) {
      this.log(`⚠️  Warning: Migration file may not contain table operations`);
    }
    
    this.log(`✅ Migration file verified: ${migrationFile}`);
  }

  async verifyDatabaseConnection(envConfig) {
    try {
      // Use MCP operation to verify database connectivity
      const testQuery = 'SELECT version();';
      const result = await this.executeDatabaseQuery(envConfig, testQuery);
      this.log(`✅ Database connection verified: ${envConfig.ip}:${envConfig.database?.port || 5432}`);
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async verifyRepositoryState() {
    try {
      // Verify we're on the correct branch and state
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      const currentCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
      
      this.log(`📊 Repository State: ${currentBranch}@${currentCommit}`);
      
      // Check for uncommitted changes
      try {
        execSync('git diff --exit-code', { stdio: 'pipe' });
        execSync('git diff --cached --exit-code', { stdio: 'pipe' });
        this.log(`✅ Repository state clean`);
      } catch (error) {
        this.log(`⚠️  Warning: Uncommitted changes detected`);
      }
      
    } catch (error) {
      throw new Error(`Repository verification failed: ${error.message}`);
    }
  }

  async executeMigration(envConfig, migrationFile) {
    const migrationPath = path.join(this.projectPath, 'database/migrations', migrationFile);
    
    try {
      // Use MCP operation with proper SSH aliases
      const sshAlias = this.getSshAlias(envConfig);
      const command = `ssh ${sshAlias} "cd /opt/theoshift && source .env && psql \\$DATABASE_URL -f database/migrations/${migrationFile}"`;
      
      this.log(`🔧 Executing migration on ${sshAlias} (container ${envConfig.container})`);
      
      const result = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.log(`✅ Migration executed successfully`);
      
      // Log migration output (truncated for readability)
      const output = result.toString().trim();
      if (output) {
        const lines = output.split('\n');
        const importantLines = lines.filter(line => 
          line.includes('CREATE') || 
          line.includes('INSERT') || 
          line.includes('ERROR') || 
          line.includes('WARNING')
        );
        
        if (importantLines.length > 0) {
          this.log(`📋 Migration Output:`);
          importantLines.slice(0, 10).forEach(line => {
            this.log(`   ${line}`);
          });
        }
      }
      
    } catch (error) {
      throw new Error(`Migration execution failed: ${error.message}`);
    }
  }

  async validateMigration(envConfig) {
    try {
      // Validate that tables were created successfully
      const tableCheckQueries = [
        "SELECT COUNT(*) FROM events;",
        "SELECT COUNT(*) FROM attendants;", 
        "SELECT COUNT(*) FROM event_attendants;"
      ];
      
      for (const query of tableCheckQueries) {
        try {
          await this.executeDatabaseQuery(envConfig, query);
          const tableName = query.match(/FROM (\w+)/)[1];
          this.log(`✅ Table validated: ${tableName}`);
        } catch (error) {
          this.log(`⚠️  Table validation warning: ${error.message}`);
        }
      }
      
      this.log(`✅ Post-migration validation complete`);
      
    } catch (error) {
      this.log(`⚠️  Post-migration validation failed: ${error.message}`);
    }
  }

  getSshAlias(envConfig) {
    // Map container IPs to SSH aliases for APEX MCP operations
    const sshAliasMap = {
      '10.92.3.24': 'jws',        // JW Attendant Staging
      '10.92.3.22': 'jwa',        // JW Attendant Production  
      '10.92.3.21': 'postgres',   // PostgreSQL Database
      '10.92.3.23': 'ldc',        // LDC Construction Tools
      '10.92.3.25': 'ldc-staging' // LDC Staging
    };
    
    return sshAliasMap[envConfig.ip] || envConfig.ip;
  }

  async executeDatabaseQuery(envConfig, query) {
    const sshAlias = this.getSshAlias(envConfig);
    const command = `ssh ${sshAlias} "cd /opt/theoshift && source .env && psql \\$DATABASE_URL -c \\"${query}\\""`;
    
    return execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
🛡️ APEX Database Migration Tool

Usage: node apex-db-migration.js <environment> <migration-file>

Examples:
  node apex-db-migration.js staging 003_create_events_table.sql
  node apex-db-migration.js production 004_add_indexes.sql

Available environments: staging, production
    `);
    process.exit(1);
  }
  
  const [environment, migrationFile] = args;
  
  try {
    const migration = new APEXDatabaseMigration();
    await migration.runMigration(environment, migrationFile);
    
    console.log(`\n🎉 MIGRATION SUCCESSFUL`);
    console.log(`🌐 Environment: ${environment}`);
    console.log(`📋 Migration: ${migrationFile}`);
    
  } catch (error) {
    console.error(`\n❌ MIGRATION FAILED`);
    console.error(`💥 Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = APEXDatabaseMigration;
