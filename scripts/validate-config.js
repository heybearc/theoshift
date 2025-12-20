#!/usr/bin/env node

/**
 * Configuration Validation Script
 * 
 * Ensures ecosystem.config.js doesn't contain environment variables
 * Run this before deployment to catch configuration issues
 */

const fs = require('fs');
const path = require('path');

const ECOSYSTEM_PATH = path.join(__dirname, '..', 'ecosystem.config.js');
const FORBIDDEN_KEYS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'NODE_ENV',
  'PORT',
  'HOSTNAME'
];

console.log('🔍 Validating ecosystem.config.js...\n');

// Check if file exists
if (!fs.existsSync(ECOSYSTEM_PATH)) {
  console.log('⚠️  ecosystem.config.js not found (this is OK if using template)');
  process.exit(0);
}

// Read and parse the file
const content = fs.readFileSync(ECOSYSTEM_PATH, 'utf8');

// Check for forbidden keys
let hasErrors = false;
FORBIDDEN_KEYS.forEach(key => {
  if (content.includes(key)) {
    console.error(`❌ ERROR: Found "${key}" in ecosystem.config.js`);
    console.error(`   Environment variables should be in .env.green, not ecosystem.config.js`);
    hasErrors = true;
  }
});

// Check for env object
if (content.match(/env\s*:\s*{/)) {
  console.error(`❌ ERROR: Found "env:" object in ecosystem.config.js`);
  console.error(`   Remove the env object and use .env.green instead`);
  hasErrors = true;
}

if (hasErrors) {
  console.error('\n❌ Configuration validation FAILED');
  console.error('   Fix: Remove environment variables from ecosystem.config.js');
  console.error('   All env vars should be in .env.green');
  process.exit(1);
}

console.log('✅ Configuration validation PASSED');
console.log('   ecosystem.config.js contains only PM2 settings');
process.exit(0);
