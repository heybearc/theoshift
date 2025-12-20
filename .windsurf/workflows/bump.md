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
- **MUST follow TEMPLATE.md format** (user-friendly, no technical details)
- Includes YAML frontmatter with version, date, type, title, description
- Analyzes recent commits since last release
- Categorizes changes in user-friendly language:
  - 🐛 Bug Fixes - What was broken and is now fixed (user perspective)
  - ✨ New Features - What users can now do
  - 🔧 Improvements - How the experience is better
  - 📝 Notes - Any additional context for users
- **AVOID:** IP addresses, file paths, technical jargon, deployment details

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

**MUST follow this structure** (see `release-notes/TEMPLATE.md` for full guidelines):

```markdown
---
version: X.Y.Z
date: YYYY-MM-DD
type: major|minor|patch
title: Brief User-Friendly Title
description: One sentence describing the main focus
---

## 🐛 Bug Fixes (if any)

- **Fixed [issue]** - User-friendly description of what was broken and is now fixed
- **Resolved [problem]** - How this benefits users

## ✨ New Features (if any)

- **Feature Name** - What users can now do
- **Another Feature** - How this benefits users

## 🔧 Improvements (if any)

- **Better [thing]** - How the experience is improved
- **Enhanced [feature]** - What's better for users

## 📝 Notes (optional)

- Additional context or information users should know
- Any actions users need to take
```

### ✅ DO's (User-Focused):
- "Fixed issue where removing attendants would fail"
- "Improved dashboard loading speed"
- "Added ability to export assignments to PDF"

### ❌ DON'Ts (Technical Details):
- NO IP addresses (10.92.3.22, Container 132 (green-theoshift), etc.)
- NO file paths (pages/api/events/[id]/attendants.tsx)
- NO technical jargon (Prisma, getBoundingClientRect, etc.)
- NO deployment details (Blue/Green environments)
- NO code references or database schema details

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
