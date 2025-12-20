---
description: APEX Guardian CI/CD Pipeline for Next.js Theocratic Shift Scheduler
---

# APEX Guardian CI/CD Pipeline - Next.js Implementation

**Environment Mapping (CORRECTED):**
- **Staging:** Container 134 (blue-theoshift) (10.92.3.24:3001) - Development and testing
- **Production:** Container 132 (green-theoshift) (10.92.3.22:3001) - Live application  
- **Database:** Container 131 (10.92.3.21:5432) - Shared PostgreSQL

## 🛡️ APEX Cascade Rules (MANDATORY)

### Core Principles
1. **Battle-tested deployment pipeline** - No shortcuts allowed
2. **Exact code parity** - Deploy exact staging codebase to production
3. **Staging-first development** - All changes validated in staging
4. **Automated testing** - Required before production deployment

### Prohibited Actions (Auto-Reject)
❌ Direct production deployment
❌ Skipping staging validation
❌ Manual file copying between environments
❌ Different code between staging and production

## Phase 1: Feature Development (Current Environment)

### 1. Connect to Staging Environment
```bash
ssh jws  # 10.92.3.24 (Container 134 (blue-theoshift))
```

### 2. Navigate to Project Directory
```bash
cd /opt/theoshift
```

### 3. Verify APEX Guardian Status
```bash
# Check APEX system
node apex/apex-guardian.js status

# Verify environment configuration
cat apex-config.js
```

### 4. Feature Branch Development
```bash
# Create feature branch (if not exists)
git checkout -b feature/your-feature-name

# Or switch to existing feature branch
git checkout feature/nextauth-implementation
```

### 5. Development Workflow
```bash
# Install dependencies
npm install

# Build and test
npm run build
npm run lint

# Start development server
npm start
```

### 6. Test Changes
```bash
# Verify application health
curl http://10.92.3.24:3001/auth/signin

# Test API endpoints
curl http://10.92.3.24:3001/api/users
```

---

**🛡️ APEX Guardian Enforcement:** This workflow is MANDATORY and enforced by APEX Research Advisor.

**Container Mapping:** 134 (staging: 10.92.3.24) → 132 (production: 10.92.3.22) → 131 (database: 10.92.3.21)
