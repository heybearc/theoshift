# Theoshift Repository Cleanup Analysis

**Date:** December 22, 2025  
**Purpose:** Audit and cleanup plan to align with industry standards

---

## 🔍 Current State Analysis

### **Repository Structure Issues:**

1. **Root Directory Clutter** (60+ markdown files)
   - Multiple deployment guides with overlapping content
   - Legacy migration documentation
   - Temporary debug/test scripts
   - Outdated planning documents

2. **Legacy Systems Found:**
   - **APEX:** 54 files in `/apex` directory + root-level apex scripts
   - **WMACS:** 10 files in `/wmacs` directory + 70+ root-level wmacs scripts
   - **GitHub Actions:** 5 workflow files (not actively used)

3. **Deployment Confusion:**
   - Multiple deployment scripts (deploy.sh, deploy-production.sh, deploy-staging.sh, etc.)
   - Current deployment: MCP Blue-Green system
   - Legacy scripts reference old systems

---

## ✅ What's Actually Being Used

### **Active Systems:**
1. **Next.js 14** - Core application framework
2. **Prisma** - Database ORM
3. **NextAuth** - Authentication
4. **PM2** - Process management (via ecosystem.config.js)
5. **MCP Blue-Green** - Deployment system (mcp-blue-green/)

### **Active Scripts (package.json):**
```json
{
  "dev": "next dev --port 3001",
  "build": "next build",
  "start": "next start --port 3001",
  "lint": "eslint",
  "validate-config": "node scripts/validate-config.js",
  "prebuild": "npm run validate-config"
}
```

### **WMACS Scripts (Unused):**
```json
{
  "wmacs:deploy": "node wmacs/wmacs-guardian.js deploy",
  "wmacs:monitor": "node wmacs/wmacs-guardian.js monitor",
  "wmacs:rollback": "node wmacs/wmacs-guardian.js rollback"
}
```
**Status:** These scripts exist but are NOT used. Deployment is handled by MCP server.

---

## 🗑️ Files/Folders to Remove

### **1. APEX System (DEPRECATED)**
**Remove:**
- `/apex/` directory (54 files)
- `apex-*.js` files in root (15+ files)
- `apex-*.sh` files in root (3+ files)
- `setup-apex-cicd.sh`
- All APEX documentation files

**Reason:** APEX was a previous deployment system. Now using MCP Blue-Green.

**Validation:** No imports of APEX in active code (only in legacy scripts and comments)

### **2. WMACS System (DEPRECATED)**
**Remove:**
- `/wmacs/` directory (10 files)
- `wmacs-*.js` files in root (70+ files)
- `wmacs-*.sh` files in root (5+ files)
- WMACS npm scripts from package.json
- All WMACS documentation files

**Reason:** WMACS was a deployment/monitoring system. Now using MCP Blue-Green.

**Validation:** Only references in comments and legacy code. A few WMACS comments in src/ files can be updated.

### **3. GitHub Actions (NOT USED)**
**Remove:**
- `.github/workflows/` (5 workflow files)
- Keep `.github/ISSUE_TEMPLATE/` and `pull_request_template.md`

**Reason:** Not using GitHub Actions. Deployment is manual via MCP server.

### **4. Legacy Documentation (60+ MD files)**
**Remove:**
- All APEX_*.md files (8 files)
- All WMACS_*.md files (15 files)
- Migration/deployment guides for old systems
- Temporary planning documents
- Duplicate guides

**Keep:**
- BUMP_RELEASE_SYNC_STRATEGY.md
- LIVE_STANDBY_WORKFLOW.md
- INFRASTRUCTURE_CONFIG.md
- RELEASE_NOTES_v3.0.0.md

### **5. Debug/Test Scripts (100+ files)**
**Remove:**
- `test-*.js` files in root (20+ files)
- `debug-*.js` files in root (15+ files)
- `wmacs-*.js` files in root (70+ files)
- `apex-*.js` files in root (15+ files)
- Legacy deployment scripts

**Keep:**
- `/scripts/` directory (organized test/utility scripts)
- `/tests/` directory (organized test files)

### **6. Temporary/Backup Files**
**Remove:**
- `.env.backup.*` files
- `*.backup` files
- `cookies.txt`
- `{` (empty file)
- `.tar.gz` archives

---

## 📁 Proposed New Structure

```
theoshift/
├── README.md                          # Comprehensive documentation
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── .windsurf/                         # Windsurf IDE workflows
├── docs/                              # All documentation
│   ├── deployment/
│   │   ├── blue-green-guide.md
│   │   ├── bump-release-sync.md
│   │   └── infrastructure.md
│   ├── development/
│   │   ├── getting-started.md
│   │   └── architecture.md
│   └── release-notes/
│       └── v3.0.0.md
├── mcp-blue-green/                    # MCP deployment system
├── prisma/                            # Database schema
├── src/                               # Source code
├── pages/                             # Next.js pages
├── components/                        # React components
├── features/                          # Feature modules
├── public/                            # Static assets
├── scripts/                           # Utility scripts
├── tests/                             # Test files
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── ecosystem.config.js                # PM2 config
```

---

## ⚠️ Breaking Change Validation

### **Will This Break Anything?**

**NO** - Here's why:

1. **Active Code:**
   - No imports of APEX/WMACS in `/src`, `/pages`, `/components`, `/features`
   - Only legacy comments reference these systems
   - Core app uses Next.js, Prisma, NextAuth

2. **Deployment:**
   - Current deployment: MCP Blue-Green (in `mcp-blue-green/`)
   - MCP server is separate and won't be affected
   - ecosystem.config.js is clean and doesn't reference legacy systems

3. **Package.json:**
   - Removing WMACS scripts won't break anything
   - They're not called by any active processes
   - Build/start scripts are standard Next.js

4. **GitHub Actions:**
   - Not currently running
   - Deployment is manual via MCP commands
   - Safe to remove

### **What Needs to be Updated:**

1. **Comments in src/ files:**
   - A few files have "WMACS Guardian" comments
   - Update to generic comments or remove

2. **Package.json:**
   - Remove wmacs:* scripts
   - Keep core scripts (dev, build, start, lint)

3. **Documentation:**
   - Create comprehensive README.md
   - Consolidate deployment docs into docs/

---

## 🎯 Cleanup Steps

### **Phase 1: Safe Removals (No Risk)**
1. Remove `/apex/` directory
2. Remove `/wmacs/` directory
3. Remove `apex-*.js` and `apex-*.sh` files
4. Remove `wmacs-*.js` and `wmacs-*.sh` files
5. Remove `.github/workflows/`
6. Remove legacy documentation files
7. Remove debug/test scripts from root
8. Remove backup/temp files

### **Phase 2: Code Updates (Low Risk)**
1. Update comments in src/ files (remove WMACS references)
2. Remove WMACS scripts from package.json
3. Clean up .gitignore if needed

### **Phase 3: Documentation (No Risk)**
1. Create comprehensive README.md
2. Organize remaining docs into docs/ directory
3. Create docs/deployment/ with consolidated guides
4. Create docs/development/ with getting started guide

### **Phase 4: Validation (Critical)**
1. Test build: `npm run build`
2. Test start: `npm start`
3. Test MCP deployment to STANDBY
4. Verify no broken imports
5. Check ecosystem.config.js still works

---

## 📝 Proposed README.md Outline

```markdown
# Theocratic Shift Scheduler

Event-centric attendant management system for Jehovah's Witness conventions.

## Features
- Event-scoped attendant management
- Position and shift scheduling
- Count times tracking
- User management with role-based access
- Email notifications

## Tech Stack
- Next.js 14 (React framework)
- Prisma (Database ORM)
- NextAuth (Authentication)
- PostgreSQL (Database)
- PM2 (Process management)

## Getting Started
- Prerequisites
- Installation
- Development
- Deployment

## Documentation
- Architecture overview
- Deployment guide (Blue-Green)
- API documentation
- Database schema

## Deployment
- Uses MCP Blue-Green deployment system
- See docs/deployment/blue-green-guide.md

## License & Contact
```

---

## ✅ Recommendation

**Proceed with cleanup:**
1. Safe to remove all APEX/WMACS systems
2. Safe to remove GitHub Actions
3. Safe to consolidate documentation
4. Will NOT break deployment or application
5. Will significantly improve repo organization

**Estimated Impact:**
- Remove: ~200 files
- Update: ~5 files
- Create: 1 comprehensive README + organized docs
- Result: Clean, industry-standard repository structure
