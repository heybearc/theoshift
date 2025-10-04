# JW Attendant Scheduler - Backlog

## 🐛 Bugs

### HIGH PRIORITY: Environment Configuration Symlink Conflict
**ID**: BUG-001  
**Priority**: High  
**Status**: Open  
**Created**: 2025-10-04  
**Component**: Infrastructure / Configuration  

#### Problem Description:
The staging server has a symlink `.env -> .env.staging` which causes environment configuration conflicts. When both `.env.local` and `.env.staging` exist, the symlink causes `.env.staging` to override `.env.local`, leading to incorrect database credentials being used.

#### Current Impact:
- Database authentication failures
- API endpoints returning 401/500 errors
- "Error Loading Lanyards" and other page failures
- Requires manual intervention after each deployment

#### Root Cause:
1. Server has symlink: `.env -> .env.staging`
2. Next.js loads environment files in this order:
   - `.env.local` (should have highest priority for local overrides)
   - `.env.staging` (environment-specific)
   - `.env` (base configuration)
3. Symlink causes `.env` to point to `.env.staging`, creating conflicts

#### Current Workaround:
- Manually ensure `.env.staging` has correct credentials
- Update both `.env.local` and `.env.staging` with same values
- Restart application after each environment file change

#### Permanent Fix Needed:
1. **Remove Symlink**: Delete `.env -> .env.staging` symlink on server
2. **Standardize Environment Loading**: 
   - Use `.env.local` for local development
   - Use `.env.staging` for staging server (no symlink)
   - Use `.env.production` for production server
3. **Update Deployment Scripts**: Ensure proper environment file is used based on deployment target
4. **Add Validation**: Script to verify correct environment file is loaded on startup
5. **Documentation**: Document environment file precedence and usage

#### Files Affected:
- `.env` (symlink - should be removed)
- `.env.local` (local development)
- `.env.staging` (staging environment)
- Deployment scripts in `wmacs/` and `apex/`

#### Acceptance Criteria:
- [ ] Remove `.env` symlink from staging server
- [ ] Application loads correct environment based on NODE_ENV
- [ ] No manual intervention needed after deployment
- [ ] Database credentials work correctly in all environments
- [ ] Add startup validation to verify correct env file loaded
- [ ] Update deployment documentation

#### Related Issues:
- Database authentication failures
- Lanyards page loading errors
- API 401/500 errors

#### Technical Notes:
```bash
# Current problematic setup on server:
lrwxrwxrwx 1 root root  12 Sep 30 21:51 .env -> .env.staging

# Correct setup should be:
# No .env symlink
# Application uses .env.staging directly when NODE_ENV=production
```

---

## 📋 Feature Requests

(Add future feature requests here)

---

## 🔧 Technical Debt

(Add technical debt items here)
