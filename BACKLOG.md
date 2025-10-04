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

## 🔧 Infrastructure Issues

### MEDIUM PRIORITY: APEX MCP Restart Tool Not Working
**ID**: INFRA-001  
**Priority**: Medium  
**Status**: Open  
**Created**: 2025-10-04  
**Component**: APEX MCP / Deployment  

#### Problem Description:
The APEX MCP `jw_application_restart` tool reports success but doesn't actually start the Next.js application. The tool returns "healthy and responding" status even when the application is not running.

#### Current Impact:
- Manual SSH intervention required to start application
- APEX deployments don't properly restart the app
- False positive health checks
- Deployment workflow broken

#### Workaround:
```bash
ssh root@10.92.3.24 'cd /opt/jw-attendant-scheduler && (PORT=3001 npm start > /dev/null 2>&1 &)'
```

#### Root Cause Investigation Needed:
- Check APEX restart script implementation
- Verify process management strategy
- Review health check logic
- Determine why process doesn't persist

#### Permanent Fix Needed:
1. Fix APEX MCP restart tool to properly start application
2. Implement proper process management (PM2, systemd, or supervisor)
3. Add real health checks (not just process checks)
4. Update deployment scripts to verify app is actually serving requests
5. Add startup validation to confirm port 3001 is listening

---

---

## 🔧 Technical Debt

(Add technical debt items here)
