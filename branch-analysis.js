#!/usr/bin/env node

/**
 * Branch Analysis Tool
 * Analyzes all feature branches to identify missing work and cleanup opportunities
 */

const { execSync } = require('child_process');
const fs = require('fs');

class BranchAnalyzer {
    constructor() {
        this.currentBranch = 'feature/admin-module-events-management';
        this.branches = [
            'backup-before-cleanup',
            'clean-slate-rebuild', 
            'feature/admin-module',
            'feature/api-foundation',
            'feature/auth-stub'
        ];
        this.analysis = {
            current_features: [],
            missing_features: [],
            redundant_branches: [],
            recommended_actions: []
        };
    }

    getCurrentFeatures() {
        console.log('🔍 Analyzing current branch features...\n');
        
        // Check what we have on current branch
        const currentFiles = [
            'pages/admin/email-config/index.tsx',
            'pages/api/admin/email-config.ts', 
            'src/lib/email.ts',
            'enhanced-jw-mcp.js',
            'scripts/corrected-mcp-health.js',
            'components/AdminLayout.tsx',
            'tailwind.config.js'
        ];

        currentFiles.forEach(file => {
            if (fs.existsSync(file)) {
                this.analysis.current_features.push(file);
                console.log(`✅ ${file}`);
            } else {
                console.log(`❌ Missing: ${file}`);
            }
        });

        console.log(`\n📊 Current Features: ${this.analysis.current_features.length} files found\n`);
    }

    analyzeBranch(branch) {
        console.log(`🔍 Analyzing ${branch}...`);
        
        try {
            // Get latest commit info
            const latestCommit = execSync(`git log --oneline -1 ${branch}`, { encoding: 'utf8' }).trim();
            console.log(`   Latest: ${latestCommit}`);
            
            // Check for unique files
            const uniqueFiles = execSync(`git diff --name-only ${this.currentBranch}..${branch}`, { encoding: 'utf8' })
                .split('\n')
                .filter(f => f.trim())
                .filter(f => !f.startsWith('.next/') && !f.startsWith('node_modules/'));
            
            if (uniqueFiles.length === 0) {
                console.log(`   ✅ No unique content - can be cleaned up`);
                this.analysis.redundant_branches.push(branch);
            } else {
                console.log(`   📁 ${uniqueFiles.length} unique files`);
                
                // Check for important missing features
                const importantFiles = uniqueFiles.filter(f => 
                    f.includes('email') || 
                    f.includes('lib/') ||
                    f.includes('utils/') ||
                    f.includes('components/') ||
                    f.includes('WMACS') ||
                    f.includes('APEX')
                );
                
                if (importantFiles.length > 0) {
                    console.log(`   🎯 Important files: ${importantFiles.slice(0, 3).join(', ')}${importantFiles.length > 3 ? '...' : ''}`);
                    this.analysis.missing_features.push({
                        branch: branch,
                        files: importantFiles,
                        commit: latestCommit
                    });
                }
            }
            
        } catch (error) {
            console.log(`   ❌ Error analyzing: ${error.message}`);
        }
        
        console.log();
    }

    checkEnvironmentNeeds() {
        console.log('🏗️ Checking environment needs...\n');
        
        // Check if we have all necessary components
        const requiredComponents = [
            { name: 'Email Service', files: ['src/lib/email.ts', 'utils/email.ts'], found: false },
            { name: 'Admin Layout', files: ['components/AdminLayout.tsx'], found: false },
            { name: 'WMACS Integration', files: ['wmacs/', 'WMACS_'], found: false },
            { name: 'APEX Integration', files: ['apex/', 'APEX_'], found: false },
            { name: 'MCP Server', files: ['enhanced-jw-mcp.js'], found: false }
        ];

        requiredComponents.forEach(component => {
            component.files.forEach(pattern => {
                try {
                    if (pattern.endsWith('/')) {
                        // Directory check
                        if (fs.existsSync(pattern)) {
                            component.found = true;
                        }
                    } else if (pattern.includes('_')) {
                        // Pattern check
                        const files = execSync('find . -name "*' + pattern + '*" -type f | head -5', { encoding: 'utf8' });
                        if (files.trim()) {
                            component.found = true;
                        }
                    } else {
                        // File check
                        if (fs.existsSync(pattern)) {
                            component.found = true;
                        }
                    }
                } catch (error) {
                    // Ignore errors
                }
            });
            
            console.log(`${component.found ? '✅' : '❌'} ${component.name}`);
        });

        console.log();
    }

    generateRecommendations() {
        console.log('💡 Generating recommendations...\n');

        // Redundant branches
        if (this.analysis.redundant_branches.length > 0) {
            console.log('🧹 CLEANUP OPPORTUNITIES:');
            this.analysis.redundant_branches.forEach(branch => {
                console.log(`   - Delete ${branch} (no unique content)`);
                this.analysis.recommended_actions.push(`git branch -D ${branch}`);
            });
            console.log();
        }

        // Missing features
        if (this.analysis.missing_features.length > 0) {
            console.log('🎯 MISSING FEATURES TO CONSIDER:');
            this.analysis.missing_features.forEach(feature => {
                console.log(`   From ${feature.branch}:`);
                feature.files.slice(0, 5).forEach(file => {
                    console.log(`     - ${file}`);
                });
                if (feature.files.length > 5) {
                    console.log(`     ... and ${feature.files.length - 5} more files`);
                }
                console.log();
            });
        }

        // Priority actions
        console.log('🚀 PRIORITY ACTIONS:');
        console.log('   1. Clean up redundant branches');
        console.log('   2. Review missing features for business value');
        console.log('   3. Merge valuable features to current branch');
        console.log('   4. Update staging with consolidated changes');
        
        console.log();
    }

    generateCleanupScript() {
        console.log('📝 Generating cleanup script...\n');
        
        let script = '#!/bin/bash\n\n';
        script += '# Branch Cleanup Script\n';
        script += '# Generated by branch-analysis.js\n\n';
        
        script += 'echo "🧹 Starting branch cleanup..."\n\n';
        
        this.analysis.redundant_branches.forEach(branch => {
            script += `echo "Deleting redundant branch: ${branch}"\n`;
            script += `git branch -D ${branch}\n\n`;
        });
        
        script += 'echo "✅ Branch cleanup complete!"\n';
        script += 'echo "📊 Remaining branches:"\n';
        script += 'git branch\n';
        
        fs.writeFileSync('cleanup-branches.sh', script);
        execSync('chmod +x cleanup-branches.sh');
        
        console.log('✅ Created cleanup-branches.sh');
        console.log('   Run: ./cleanup-branches.sh');
        console.log();
    }

    async run() {
        console.log('🔍 JW Attendant Scheduler - Branch Analysis\n');
        console.log('='.repeat(50));
        
        this.getCurrentFeatures();
        this.checkEnvironmentNeeds();
        
        console.log('📋 Analyzing feature branches...\n');
        this.branches.forEach(branch => this.analyzeBranch(branch));
        
        this.generateRecommendations();
        this.generateCleanupScript();
        
        console.log('🎯 Analysis complete!');
        console.log(`Current branch (${this.currentBranch}) appears to have most functionality.`);
        console.log('Review recommendations above for cleanup opportunities.');
    }
}

const analyzer = new BranchAnalyzer();
analyzer.run();
