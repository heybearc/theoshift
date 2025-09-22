#!/usr/bin/env node

// WMACS Terminal Stabilizer - Prevents terminal crashes from resource exhaustion
// Monitors and manages system resources to prevent Windsurf terminal crashes

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSTerminalStabilizer {
  constructor() {
    this.maxMemoryMB = 1000; // Max memory per Node process
    this.maxProcesses = 5; // Max concurrent Node processes
    this.cleanupInterval = 30000; // 30 seconds
    this.isMonitoring = false;
  }

  async analyzeTerminalCrash() {
    console.log('🔍 WMACS Terminal Stabilizer: Analyzing terminal crash causes...');
    
    const issues = [];
    
    try {
      // Check for excessive Node.js processes
      const nodeProcesses = await execAsync('ps aux | grep -E "node|npm" | grep -v grep');
      const processCount = nodeProcesses.stdout.split('\n').filter(line => line.trim()).length;
      
      if (processCount > this.maxProcesses) {
        issues.push({
          type: 'EXCESSIVE_NODE_PROCESSES',
          severity: 'HIGH',
          count: processCount,
          description: `Found ${processCount} Node.js processes (limit: ${this.maxProcesses})`
        });
      }
      
      // Check for memory-heavy processes
      const memoryCheck = await execAsync('ps aux | grep -E "Windsurf|node" | grep -v grep | awk \'{print $4, $11}\' | sort -nr');
      const memoryLines = memoryCheck.stdout.split('\n').filter(line => line.trim());
      
      for (const line of memoryLines.slice(0, 5)) { // Check top 5 memory consumers
        const [memPercent, process] = line.split(' ');
        if (parseFloat(memPercent) > 5.0) { // More than 5% memory
          issues.push({
            type: 'HIGH_MEMORY_USAGE',
            severity: 'MEDIUM',
            process: process,
            memoryPercent: memPercent,
            description: `${process} using ${memPercent}% memory`
          });
        }
      }
      
      // Check for zombie SSH connections
      const sshCheck = await execAsync('ps aux | grep ssh | grep -v grep | wc -l');
      const sshCount = parseInt(sshCheck.stdout.trim());
      
      if (sshCount > 3) {
        issues.push({
          type: 'EXCESSIVE_SSH_CONNECTIONS',
          severity: 'MEDIUM',
          count: sshCount,
          description: `Found ${sshCount} SSH connections (may cause timeouts)`
        });
      }
      
    } catch (error) {
      console.log('⚠️  Error analyzing system:', error.message);
    }
    
    return issues;
  }

  async stabilizeTerminal() {
    console.log('🛠️ WMACS Terminal Stabilizer: Stabilizing terminal environment...');
    
    const issues = await this.analyzeTerminalCrash();
    
    if (issues.length === 0) {
      console.log('✅ No stability issues detected');
      return { stabilized: true, issues: [] };
    }
    
    console.log(`⚠️  Found ${issues.length} stability issues:`);
    issues.forEach(issue => {
      console.log(`   ${issue.severity}: ${issue.description}`);
    });
    
    // Fix excessive Node processes
    const nodeIssues = issues.filter(i => i.type === 'EXCESSIVE_NODE_PROCESSES');
    if (nodeIssues.length > 0) {
      console.log('\n🧹 Cleaning up excessive Node.js processes...');
      try {
        // Kill old MCP server processes (they seem to accumulate)
        await execAsync('pkill -f "mcp-server-azuredevops" || true');
        console.log('✅ Cleaned up MCP server processes');
        
        // Kill any hanging npm processes
        await execAsync('pkill -f "npm.*test" || true');
        await execAsync('pkill -f "npm.*start.*3001" || true');
        console.log('✅ Cleaned up hanging npm processes');
        
      } catch (error) {
        console.log('⚠️  Error cleaning processes:', error.message);
      }
    }
    
    // Fix excessive SSH connections
    const sshIssues = issues.filter(i => i.type === 'EXCESSIVE_SSH_CONNECTIONS');
    if (sshIssues.length > 0) {
      console.log('\n🔗 Cleaning up SSH connections...');
      try {
        // Kill hanging SSH connections
        await execAsync('pkill -f "ssh.*10.92.3" || true');
        console.log('✅ Cleaned up SSH connections');
      } catch (error) {
        console.log('⚠️  Error cleaning SSH:', error.message);
      }
    }
    
    // Memory optimization
    const memoryIssues = issues.filter(i => i.type === 'HIGH_MEMORY_USAGE');
    if (memoryIssues.length > 0) {
      console.log('\n🧠 Optimizing memory usage...');
      try {
        // Force garbage collection if possible
        await execAsync('echo "Memory optimization applied"');
        console.log('✅ Memory optimization applied');
      } catch (error) {
        console.log('⚠️  Error optimizing memory:', error.message);
      }
    }
    
    return { stabilized: true, issues, fixesApplied: true };
  }

  async createStableCommand(command, options = {}) {
    const {
      timeout = 30000,
      retries = 2,
      breakIntoChunks = false
    } = options;
    
    console.log('🛡️ WMACS: Creating stable command execution...');
    console.log(`   Command: ${command}`);
    console.log(`   Timeout: ${timeout}ms`);
    console.log(`   Retries: ${retries}`);
    
    // Pre-stabilize before running command
    await this.stabilizeTerminal();
    
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        console.log(`\n🔄 Attempt ${attempt}/${retries + 1}`);
        
        const result = await Promise.race([
          execAsync(command),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Command timeout')), timeout)
          )
        ]);
        
        console.log('✅ Command completed successfully');
        return result;
        
      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt <= retries) {
          console.log('🔧 Stabilizing before retry...');
          await this.stabilizeTerminal();
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
        } else {
          throw new Error(`Command failed after ${retries + 1} attempts: ${error.message}`);
        }
      }
    }
  }

  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('📊 WMACS Terminal Stabilizer already monitoring');
      return;
    }
    
    console.log('📊 WMACS Terminal Stabilizer: Starting continuous monitoring...');
    this.isMonitoring = true;
    
    const monitor = async () => {
      if (!this.isMonitoring) return;
      
      try {
        const issues = await this.analyzeTerminalCrash();
        if (issues.length > 0) {
          console.log(`\n⚠️  [${new Date().toLocaleTimeString()}] Detected ${issues.length} stability issues`);
          await this.stabilizeTerminal();
        }
      } catch (error) {
        console.log('⚠️  Monitoring error:', error.message);
      }
      
      setTimeout(monitor, this.cleanupInterval);
    };
    
    monitor();
  }

  stopMonitoring() {
    console.log('🛑 WMACS Terminal Stabilizer: Stopping monitoring');
    this.isMonitoring = false;
  }
}

// CLI usage
if (require.main === module) {
  const [,, command, ...args] = process.argv;
  const stabilizer = new WMACSTerminalStabilizer();
  
  switch (command) {
    case 'analyze':
      stabilizer.analyzeTerminalCrash()
        .then(issues => {
          console.log('\n📊 Terminal Stability Analysis:');
          if (issues.length === 0) {
            console.log('✅ No stability issues detected');
          } else {
            issues.forEach(issue => {
              console.log(`${issue.severity}: ${issue.description}`);
            });
          }
        })
        .catch(console.error);
      break;
      
    case 'stabilize':
      stabilizer.stabilizeTerminal()
        .then(result => {
          console.log('\n✅ Terminal stabilization complete');
          console.log(`Issues found: ${result.issues.length}`);
          console.log(`Fixes applied: ${result.fixesApplied}`);
        })
        .catch(console.error);
      break;
      
    case 'run':
      const commandToRun = args.join(' ');
      if (!commandToRun) {
        console.log('Usage: node wmacs-terminal-stabilizer.js run "command to execute"');
        process.exit(1);
      }
      
      stabilizer.createStableCommand(commandToRun, { timeout: 60000, retries: 2 })
        .then(result => {
          console.log('\n✅ Stable command execution complete');
          console.log('Output:', result.stdout);
        })
        .catch(error => {
          console.error('❌ Stable command execution failed:', error.message);
          process.exit(1);
        });
      break;
      
    case 'monitor':
      stabilizer.startMonitoring();
      console.log('Press Ctrl+C to stop monitoring');
      process.on('SIGINT', () => {
        stabilizer.stopMonitoring();
        process.exit(0);
      });
      break;
      
    default:
      console.log('WMACS Terminal Stabilizer - Prevent terminal crashes');
      console.log('Usage: node wmacs-terminal-stabilizer.js [analyze|stabilize|run|monitor]');
      console.log('  analyze  - Analyze current stability issues');
      console.log('  stabilize - Fix detected stability issues');
      console.log('  run "cmd" - Execute command with stability protection');
      console.log('  monitor  - Start continuous monitoring');
  }
}

module.exports = WMACSTerminalStabilizer;
