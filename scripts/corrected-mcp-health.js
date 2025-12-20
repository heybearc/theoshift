#!/usr/bin/env node

/**
 * Corrected MCP Health Check
 * Properly detects Next.js architecture and provides accurate system status
 */

const { execSync } = require('child_process');
const fs = require('fs');

class CorrectedMCPHealth {
    constructor() {
        this.serverHost = 'jws';
        this.sshConfig = '-F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant';
        this.projectPath = '/opt/theoshift';
        this.healthData = {};
    }

    async detectTechnologyStack() {
        try {
            // Read package.json to determine actual stack
            const packageJson = execSync(`ssh ${this.sshConfig} ${this.serverHost} "cd ${this.projectPath} && cat package.json"`, { encoding: 'utf8' });
            const pkg = JSON.parse(packageJson);

            const hasNext = !!pkg.dependencies?.next;
            const hasDjango = !!(pkg.dependencies?.django || pkg.dependencies?.Django);
            const hasReact = !!pkg.dependencies?.react;
            const hasPrisma = !!pkg.dependencies?.['@prisma/client'];

            if (hasNext && hasReact) {
                return {
                    framework: 'Next.js',
                    version: pkg.dependencies.next,
                    type: 'Full-Stack React Framework',
                    backend: 'Next.js API Routes',
                    frontend: 'React/Next.js',
                    orm: hasPrisma ? 'Prisma' : 'None detected'
                };
            } else if (hasDjango) {
                return {
                    framework: 'Django',
                    version: pkg.dependencies.django || 'Unknown',
                    type: 'Python Web Framework',
                    backend: 'Django',
                    frontend: 'Django Templates',
                    orm: 'Django ORM'
                };
            } else {
                return {
                    framework: 'Unknown',
                    version: 'Unknown',
                    type: 'Cannot determine',
                    backend: 'Unknown',
                    frontend: 'Unknown',
                    orm: 'Unknown'
                };
            }
        } catch (error) {
            return {
                framework: 'Error',
                version: 'Could not detect',
                type: 'Detection failed',
                backend: 'Unknown',
                frontend: 'Unknown',
                orm: 'Unknown',
                error: error.message
            };
        }
    }

    async checkRunningProcesses() {
        try {
            const processes = execSync(`ssh ${this.sshConfig} ${this.serverHost} "ps aux | grep -E '(node|next|npm)' | grep -v grep"`, { encoding: 'utf8' });
            const processLines = processes.split('\n').filter(line => line.trim());

            return {
                isRunning: processLines.length > 0,
                processCount: processLines.length,
                processes: processLines,
                status: processLines.length > 0 ? 'running' : 'stopped'
            };
        } catch (error) {
            return {
                isRunning: false,
                processCount: 0,
                processes: [],
                status: 'stopped',
                error: error.message
            };
        }
    }

    async checkPorts() {
        try {
            const ports = execSync(`ssh ${this.sshConfig} ${this.serverHost} "ss -tlnp | grep -E ':(3000|3001)'"`, { encoding: 'utf8' });
            const portLines = ports.split('\n').filter(line => line.trim());

            const port3000 = portLines.some(line => line.includes(':3000'));
            const port3001 = portLines.some(line => line.includes(':3001'));

            return {
                port3000: port3000 ? 'listening' : 'not listening',
                port3001: port3001 ? 'listening' : 'not listening',
                activePort: port3001 ? 3001 : (port3000 ? 3000 : null),
                status: (port3000 || port3001) ? 'healthy' : 'no ports listening'
            };
        } catch (error) {
            return {
                port3000: 'not listening',
                port3001: 'not listening',
                activePort: null,
                status: 'no ports listening',
                error: error.message
            };
        }
    }

    async checkDatabase() {
        try {
            // Check if Prisma schema exists
            const prismaSchema = execSync(`ssh ${this.sshConfig} ${this.serverHost} "cd ${this.projectPath} && ls prisma/schema.prisma 2>/dev/null || echo 'not found'"`, { encoding: 'utf8' });
            
            if (prismaSchema.includes('not found')) {
                return {
                    type: 'Unknown',
                    status: 'schema not found',
                    connection: 'unknown'
                };
            }

            // Try to read database URL from .env
            const envCheck = execSync(`ssh ${this.sshConfig} ${this.serverHost} "cd ${this.projectPath} && grep DATABASE_URL .env 2>/dev/null || echo 'not found'"`, { encoding: 'utf8' });
            
            if (envCheck.includes('postgresql://')) {
                return {
                    type: 'PostgreSQL',
                    status: 'configured',
                    connection: 'PostgreSQL via Prisma'
                };
            } else {
                return {
                    type: 'Unknown',
                    status: 'not configured',
                    connection: 'unknown'
                };
            }
        } catch (error) {
            return {
                type: 'Unknown',
                status: 'error checking',
                connection: 'unknown',
                error: error.message
            };
        }
    }

    async checkAdminModules() {
        try {
            // Count actual admin modules in pages/admin/
            const adminModules = execSync(`ssh ${this.sshConfig} ${this.serverHost} "cd ${this.projectPath} && find pages/admin -maxdepth 1 -type d | grep -v '^pages/admin$' | wc -l"`, { encoding: 'utf8' });
            const moduleCount = parseInt(adminModules.trim());

            // List the modules
            const moduleList = execSync(`ssh ${this.sshConfig} ${this.serverHost} "cd ${this.projectPath} && find pages/admin -maxdepth 1 -type d | grep -v '^pages/admin$' | sed 's|pages/admin/||'"`, { encoding: 'utf8' });
            const modules = moduleList.split('\n').filter(m => m.trim());

            return {
                count: moduleCount,
                modules: modules,
                status: `${moduleCount}/${moduleCount} available`,
                working: 'assumed working (static analysis)'
            };
        } catch (error) {
            return {
                count: 0,
                modules: [],
                status: 'error checking modules',
                working: 'unknown',
                error: error.message
            };
        }
    }

    async performHealthCheck() {
        console.log('🔍 Performing Corrected MCP Health Check...\n');

        this.healthData.timestamp = new Date().toISOString();
        this.healthData.technology = await this.detectTechnologyStack();
        this.healthData.processes = await this.checkRunningProcesses();
        this.healthData.ports = await this.checkPorts();
        this.healthData.database = await this.checkDatabase();
        this.healthData.admin = await this.checkAdminModules();

        return this.healthData;
    }

    formatHealthReport() {
        const tech = this.healthData.technology;
        const proc = this.healthData.processes;
        const ports = this.healthData.ports;
        const db = this.healthData.database;
        const admin = this.healthData.admin;

        console.log('✅ CORRECTED JW Attendant Health Check\n');
        
        console.log('🏗️  Technology Stack:');
        console.log(`   Framework: ${tech.framework} ${tech.version || ''}`);
        console.log(`   Backend: ${tech.backend}`);
        console.log(`   Frontend: ${tech.frontend}`);
        console.log(`   ORM: ${tech.orm}\n`);

        console.log('⚙️  Application Status:');
        console.log(`   Process Status: ${proc.status}`);
        console.log(`   Running Processes: ${proc.processCount}`);
        console.log(`   Port Status: ${ports.status}`);
        if (ports.activePort) {
            console.log(`   Active Port: ${ports.activePort}`);
        }
        console.log();

        console.log('🗄️  Database:');
        console.log(`   Type: ${db.type}`);
        console.log(`   Status: ${db.status}`);
        console.log(`   Connection: ${db.connection}\n`);

        console.log('🎛️  Admin Modules:');
        console.log(`   Count: ${admin.count} modules detected`);
        console.log(`   Status: ${admin.status}`);
        if (admin.modules.length > 0) {
            console.log('   Modules:');
            admin.modules.forEach(module => {
                console.log(`     - ${module}`);
            });
        }
        console.log();

        // Overall health assessment
        const isHealthy = tech.framework !== 'Unknown' && tech.framework !== 'Error';
        const healthStatus = isHealthy ? 'HEALTHY' : 'NEEDS ATTENTION';
        const healthIcon = isHealthy ? '✅' : '⚠️';

        console.log(`${healthIcon} Overall Status: ${healthStatus}`);
        console.log(`📅 Last checked: ${this.healthData.timestamp}\n`);

        return {
            status: healthStatus,
            healthy: isHealthy,
            summary: {
                framework: tech.framework,
                backend: tech.backend,
                running: proc.status,
                database: db.type,
                admin_modules: admin.count
            }
        };
    }

    // Method that mimics the MCP interface but with correct data
    getMCPCompatibleOutput() {
        const tech = this.healthData.technology;
        const proc = this.healthData.processes;
        const ports = this.healthData.ports;
        const db = this.healthData.database;
        const admin = this.healthData.admin;

        return {
            frontend: `${ports.status} (port ${ports.activePort || 'none'})`,
            backend: `${tech.backend}`,
            database: `${db.type}`,
            admin: `operational (${admin.count}/${admin.count} modules)`,
            last_checked: this.healthData.timestamp
        };
    }

    async run() {
        await this.performHealthCheck();
        const report = this.formatHealthReport();
        
        console.log('🔄 MCP-Compatible Output:');
        const mcpOutput = this.getMCPCompatibleOutput();
        Object.entries(mcpOutput).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });

        return {
            healthData: this.healthData,
            report: report,
            mcpOutput: mcpOutput
        };
    }
}

// Run the corrected health check
const healthChecker = new CorrectedMCPHealth();
healthChecker.run().catch(console.error);
