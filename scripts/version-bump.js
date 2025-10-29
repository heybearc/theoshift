#!/usr/bin/env node

/**
 * Version Bump Script
 * 
 * Automates version bumping with release notes validation
 * 
 * Usage:
 *   npm run version:bump <major|minor|patch> [--skip-notes]
 * 
 * Examples:
 *   npm run version:bump minor
 *   npm run version:bump patch --skip-notes
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const bumpType = args[0]; // major, minor, or patch
const skipNotes = args.includes('--skip-notes');

if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error('❌ Error: Invalid bump type. Use: major, minor, or patch');
  console.error('Usage: npm run version:bump <major|minor|patch> [--skip-notes]');
  process.exit(1);
}

// Read current version from package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const currentVersion = packageJson.version;

// Calculate new version
const [major, minor, patch] = currentVersion.split('.').map(Number);
let newVersion;

switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

console.log(`\n🔄 Version Bump: ${currentVersion} → ${newVersion}\n`);

// Check if release notes exist
const releaseNotesPath = path.join(__dirname, '..', 'release-notes', `v${newVersion}.md`);
const releaseNotesExist = fs.existsSync(releaseNotesPath);

if (!skipNotes && !releaseNotesExist) {
  console.error(`❌ Error: Release notes not found!`);
  console.error(`\nExpected file: release-notes/v${newVersion}.md`);
  console.error(`\nPlease create the release notes file first, or use --skip-notes to bypass this check.`);
  console.error(`\nTemplate available at: release-notes/TEMPLATE.md`);
  process.exit(1);
}

if (releaseNotesExist) {
  console.log(`✅ Release notes found: v${newVersion}.md`);
} else {
  console.log(`⚠️  Skipping release notes check (--skip-notes flag)`);
}

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`✅ Updated package.json to ${newVersion}`);

// Summary
console.log(`\n📋 Summary:`);
console.log(`   Version: ${currentVersion} → ${newVersion}`);
console.log(`   Type: ${bumpType}`);
console.log(`   Release Notes: ${releaseNotesExist ? '✅ Present' : '⚠️  Skipped'}`);

console.log(`\n🚀 Next Steps:`);
console.log(`   1. Review changes: git diff`);
console.log(`   2. Commit: git add -A && git commit -m "Version ${newVersion}"`);
console.log(`   3. Push: git push origin production-gold-standard`);
console.log(`   4. Deploy: npm run deploy:green\n`);
