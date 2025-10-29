---
description: Version bump, release notes, and deploy to STANDBY for testing
---

# Bump Workflow

Prepares a new release by bumping version, creating release notes, and deploying to STANDBY for testing.

## Usage

Simply say:
- **"bump"** or **"/bump"** - Patch release (2.4.0 → 2.4.1)
- **"bump patch"** - Bug fixes (2.4.0 → 2.4.1)
- **"bump minor"** - New features (2.4.0 → 2.5.0)
- **"bump major"** - Breaking changes (2.4.0 → 3.0.0)

## What This Workflow Does

### Step 1: Version Bump
- Reads current version from `package.json`
- Increments version based on type (patch/minor/major)
- Updates `package.json` with new version
- Default: **patch** if not specified

### Step 2: Generate Release Notes
- Creates markdown file: `release-notes/v{version}.md`
- Analyzes recent commits since last release
- Categorizes changes:
  - 🐛 Bug Fixes
  - ✨ New Features
  - 🔧 Improvements
  - 📝 Other Changes
- Includes version, date, and summary

### Step 3: Commit and Push
- Commits changes with message: `Release v{version}`
- Pushes to `production-gold-standard` branch
- Tags commit with version number

### Step 4: Deploy to STANDBY
- Identifies current STANDBY environment (Blue or Green)
- Deploys ONLY to STANDBY (blue-green protocol)
- Runs: `git pull && npm install && npm run build && pm2 restart`
- Verifies deployment successful

### Step 5: Request Testing
- Provides STANDBY URL for testing
- Lists changes in this release
- Shows test checklist
- **STOPS HERE** - Waits for you to test and approve

## Example

**You say:** "bump"

**Cascade does:**
```
1. ✅ Bump version: 2.4.0 → 2.4.1
2. ✅ Create release notes: release-notes/v2.4.1.md
3. ✅ Commit: "Release v2.4.1"
4. ✅ Push to production-gold-standard
5. ✅ Deploy to Blue (STANDBY): http://10.92.3.22:3001
6. ⏸️  READY FOR TESTING

📋 Test Checklist:
- [ ] All pages load
- [ ] New features work
- [ ] Bug fixes verified
- [ ] No console errors

Test URL: http://10.92.3.22:3001

When ready, say "release" to switch traffic.
```

## Version Bump Types

### Patch (2.4.0 → 2.4.1)
**Use for:**
- Bug fixes
- Minor improvements
- Documentation updates
- Performance optimizations
- UI/UX tweaks

### Minor (2.4.0 → 2.5.0)
**Use for:**
- New features
- New API endpoints
- Significant improvements
- Non-breaking changes
- New pages or components

### Major (2.4.0 → 3.0.0)
**Use for:**
- Breaking changes
- Major architecture changes
- API changes that break compatibility
- Database schema changes
- Complete redesigns

## Release Notes Template

Automatically generated with this structure:

```markdown
# Release v{version}
**Release Date:** {date}

## Summary
{Auto-generated summary of changes}

## Changes

### 🐛 Bug Fixes
- Fixed Actions dropdown positioning
- Fixed feedback comment API errors
- Fixed getBoundingClientRect null reference

### ✨ New Features
- Added click-outside dropdown detection
- Added release notification banner

### 🔧 Improvements
- Improved dropdown UX with scroll handling
- Enhanced error messages

### 📝 Other Changes
- Updated documentation
- Code cleanup
```

## Safety Features

### Blue-Green Protocol
- ✅ Deploys to STANDBY only
- ✅ Never touches PRODUCTION
- ✅ Maintains rollback capability
- ✅ Requires explicit approval (via "release")

### Validation Checks
- ✅ Verifies on `production-gold-standard` branch
- ✅ Checks for uncommitted changes
- ✅ Validates version format
- ✅ Ensures release notes created
- ✅ Confirms STANDBY deployment successful

## After Bump

### Next Steps:
1. **Test on STANDBY** - Thoroughly test all changes
2. **Say "release"** - Switch traffic when ready
3. **Say "sync"** - Sync new STANDBY after release

### If Issues Found:
- Fix issues on local
- Run "bump" again (increments to next patch)
- Old version stays on STANDBY until overwritten

## Related Workflows
- `/release` - Switch traffic to STANDBY (after bump)
- `/sync` - Sync new STANDBY with PRODUCTION
- `/staging-first-development` - Full CI/CD workflow

## Notes
- Always test on STANDBY before releasing
- Release notes are user-facing - write clearly
- Version bumps trigger release notification banner
- Can run "bump" multiple times if issues found
- Each "bump" creates new version and release notes
