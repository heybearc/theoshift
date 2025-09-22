# JW Attendant Scheduler - Preserved Assets Documentation

## 🗄️ DATABASE SCHEMA (PRESERVE COMPLETELY)

### Core Business Models:
```prisma
# CRITICAL: This schema represents months of business logic development
# Location: prisma/schema.prisma
# Status: PRESERVE ENTIRELY

Key Models:
- users (RBAC system with 5 roles)
- events (Assembly/Convention/Special Event management)
- attendants (Volunteer management with skills/availability)
- assignments (Position assignments with shifts)
- event_positions (192 positions with departments)
- departments (Organizational structure)
- count_sessions (Attendance tracking)
- oversight_assignments (Leadership hierarchy)
- lanyards (Badge management system)
```

### Business Rules Encoded in Schema:
1. **Role Hierarchy**: ADMIN > OVERSEER > ASSISTANT_OVERSEER > KEYMAN > ATTENDANT
2. **Assignment Workflow**: ASSIGNED → CONFIRMED → COMPLETED
3. **Event Lifecycle**: UPCOMING → CURRENT → COMPLETED → ARCHIVED
4. **Position Management**: 192 role positions with department organization
5. **Shift System**: Multiple shifts per position with capacity limits

## 🛡️ WMACS GUARDIAN SYSTEM (PRESERVE CORE)

### Keep These Files:
```bash
wmacs/wmacs-guardian.js          # Fixed SSH command construction
wmacs/wmacs-research-advisor.js  # Industry best practices analysis
wmacs/WINDSURF_OPERATIONAL_GUIDELINES.md  # Core operational rules
wmacs-config.js                  # Container configuration (fix django→nextjs)
```

### WMACS Value:
- **Battle-tested deployment pipeline**
- **Automatic error recovery**
- **SSH command execution with timeouts**
- **QOS Agent oversight patterns**

## 📋 CORE BUSINESS LOGIC (DOCUMENT & PRESERVE)

### Scheduling Algorithms:
```javascript
// CRITICAL: Extract these patterns before cleanup

1. Position Assignment Logic:
   - maxAttendants/minAttendants per position
   - Experience level requirements
   - Department-based assignments
   - Shift overlap handling

2. Availability Management:
   - unavailableDates JSON field
   - servingAs multiple roles
   - preferredDepartments matching

3. Count Tracking System:
   - Real-time attendance counting
   - Position-based count sessions
   - Statistical reporting

4. Oversight Hierarchy:
   - Department-based oversight
   - Station range management
   - Multi-level supervision
```

### API Endpoints (Document Required):
```bash
# User Management
POST /api/admin/users
GET /api/admin/users
PUT /api/admin/users/[id]
DELETE /api/admin/users/[id]

# Event Management
GET /api/events
POST /api/events
PUT /api/events/[id]

# Assignment Management
GET /api/assignments
POST /api/assignments
PUT /api/assignments/[id]

# Attendant Management
GET /api/attendants
POST /api/attendants
PUT /api/attendants/[id]

# Count Tracking
GET /api/counts
POST /api/counts
GET /api/counts/analytics
```

## 🔧 ENVIRONMENT CONFIGURATIONS (PRESERVE)

### Database Configuration:
```bash
# From .env.local
DATABASE_URL=postgresql://jw_scheduler_staging:jw_password@10.92.3.21:5432/jw_attendant_scheduler_staging
NEXTAUTH_SECRET=staging-nextauth-secret-2024
NEXTAUTH_URL=http://10.92.3.24:3001
NODE_ENV=production
PORT=3001
```

### Container Setup:
```bash
# Infrastructure that works
- Staging: Container 134 (10.92.3.24:3001)
- Production: Container 132 (10.92.3.22:3001)
- Database: Container 131 (10.92.3.21:5432)
```

## 🎯 BUSINESS VALUE ASSESSMENT

### High-Value Components (KEEP):
1. **Database Schema** - Months of business logic
2. **WMACS Guardian** - Deployment automation
3. **Role-Based Access Control** - 5-tier permission system
4. **Position Management** - 192 standardized positions
5. **Assignment Workflow** - Proven scheduling logic

### Low-Value Components (DISCARD):
1. **Multiple Auth Systems** - NextAuth + JWT + bcrypt chaos
2. **Debug Files** - 91 test/debug/old files
3. **Migration Artifacts** - Flask/Django remnants
4. **Excessive WMACS Tools** - Over-engineered debugging

## 📊 CLEAN SLATE METRICS

### Before Cleanup:
- **Files**: 19,987 total
- **Auth Systems**: 3 competing implementations
- **Framework Confusion**: Django config in NextJS app
- **Debug Overhead**: 91 legacy files

### After Cleanup Target:
- **Files**: <200 core files
- **Auth Systems**: 1 (NextAuth only)
- **Framework**: Pure Next.js 15
- **Debug Overhead**: 0 (clean development)

## 🚀 PRESERVATION CHECKLIST

- ✅ **Backup created**: backup-before-cleanup branch
- ✅ **Schema documented**: Complete Prisma schema preserved
- ✅ **WMACS core identified**: Guardian + Research Advisor
- ✅ **Environment configs**: Database URLs and secrets
- ✅ **Business rules documented**: Assignment logic patterns
- ✅ **API endpoints mapped**: Required endpoint list
- ✅ **Infrastructure documented**: Container topology

## 🎯 NEXT PHASE READINESS

**Phase 1 Complete** ✅
**Ready for Phase 2**: Nuclear Cleanup
**Estimated Rebuild Time**: 2-3 hours for core functionality
**Risk Level**: LOW (comprehensive backup + documentation)

---

**CRITICAL**: This documentation ensures zero business logic loss during the clean slate rebuild.
