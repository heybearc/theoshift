# JW Attendant Scheduler - Clean Slate Rebuild Plan

## 🎯 OBJECTIVE
Eliminate Flask→Django→NextJS migration debt and create a clean, maintainable codebase.

## 📋 PHASE 1: ASSET PRESERVATION (30 minutes)

### Keep These Files:
```bash
# Core Business Logic
prisma/schema.prisma
.env.local (database config)

# WMACS Guardian (valuable system)
wmacs/wmacs-guardian.js
wmacs/wmacs-research-advisor.js
wmacs/WINDSURF_OPERATIONAL_GUIDELINES.md

# Infrastructure
.github/workflows/
docker-compose.yml (if exists)
```

### Extract Business Rules:
```bash
# Document these before wiping:
- User roles and permissions
- Scheduling algorithms
- Database relationships
- API endpoints needed
```

## 📋 PHASE 2: NUCLEAR CLEANUP (15 minutes)

### Container Wipe:
```bash
# Stop all services
ssh root@10.92.3.24 "systemctl stop nginx && pkill -f npm"

# Wipe application directory
ssh root@10.92.3.24 "rm -rf /opt/jw-attendant-scheduler/*"

# Clean package caches
ssh root@10.92.3.24 "npm cache clean --force"
```

### Repository Cleanup:
```bash
# Remove migration artifacts
rm -rf node_modules/
rm -rf .next/
rm -rf app/ (rebuild from scratch)
rm wmacs-*.js (keep only core guardian)
rm test-*.js
rm *-old.* *-test.* *-working.*

# Reset git history (optional)
git checkout --orphan clean-slate
git add -A
git commit -m "Clean slate: Remove Flask/Django migration debt"
```

## 📋 PHASE 3: MODERN REBUILD (2 hours)

### 1. Initialize Clean Next.js (15 minutes)
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app
```

### 2. Database Setup (15 minutes)
```bash
# Restore clean Prisma schema
npm install prisma @prisma/client
# Copy preserved schema.prisma
npx prisma generate
npx prisma db push
```

### 3. Authentication (30 minutes)
```bash
# Single auth system only
npm install next-auth @auth/prisma-adapter
# Implement clean NextAuth setup
```

### 4. Core Features (60 minutes)
```bash
# Build only essential pages:
- /dashboard (simple overview)
- /attendants (CRUD)
- /schedule (calendar view)
- /admin (user management)
```

## 📋 PHASE 4: WMACS INTEGRATION (30 minutes)

### Restore Guardian System:
```bash
# Copy preserved WMACS files
# Update wmacs-config.js (fix "django" → "nextjs")
# Test deployment pipeline
```

## 🎯 SUCCESS CRITERIA

### Before (Current State):
- ❌ 19,987 files
- ❌ Multiple auth systems
- ❌ Constant errors
- ❌ Framework confusion

### After (Clean Slate):
- ✅ <100 core files
- ✅ Single auth system
- ✅ Zero migration debt
- ✅ Clear architecture

## 💰 COST-BENEFIT

### Time Investment: 3-4 hours
### Savings: Weeks of debugging
### ROI: 10x improvement in development velocity

## 🚨 RISK MITIGATION

### Backup Strategy:
```bash
# Create backup branch before cleanup
git branch backup-before-cleanup
git push origin backup-before-cleanup
```

### Rollback Plan:
```bash
# If clean slate fails, restore from backup
git checkout backup-before-cleanup
```

## 🎯 RECOMMENDATION

**PROCEED WITH CLEAN SLATE IMMEDIATELY**

The Flask→Django→NextJS migration debt is killing productivity. A 3-4 hour investment will save weeks of debugging and create a maintainable foundation.

**Next Step:** Execute Phase 1 (Asset Preservation) and get approval for nuclear cleanup.
