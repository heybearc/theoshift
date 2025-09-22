# WMACS Deployment Architecture - Best Practices

## 🛡️ WMACS Guardian: Proper Staging-to-Production Flow

### 🎯 **CORE PRINCIPLE: Environment Isolation**

**CRITICAL RULE:** Staging and Production must be **completely isolated** with **zero cross-contamination**.

## 📋 **Proper Deployment Architecture**

### 1. **Environment Separation**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DEVELOPMENT   │    │     STAGING     │    │   PRODUCTION    │
│                 │    │                 │    │                 │
│ localhost:3001  │───▶│ 10.92.3.24:3001 │───▶│ 10.92.3.22:3001 │
│                 │    │                 │    │                 │
│ Local Database  │    │ Staging Database│    │ Production DB   │
│ Test Data       │    │ Staging Data    │    │ Live Data       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2. **Environment-Specific Configuration**

#### **🏠 Development (.env.local)**
```bash
DATABASE_URL=postgresql://localhost:5432/jw_scheduler_dev
NEXTAUTH_SECRET=dev-secret-not-secure
NEXTAUTH_URL=http://localhost:3001
NODE_ENV=development
PORT=3001
NEXTAUTH_DEBUG=true
```

#### **🧪 Staging (.env.staging)**
```bash
DATABASE_URL=postgresql://jw_scheduler_staging:password@10.92.3.21:5432/jw_scheduler_staging
NEXTAUTH_SECRET=staging-secret-2024-secure
NEXTAUTH_URL=http://10.92.3.24:3001
NODE_ENV=production
PORT=3001
NEXTAUTH_DEBUG=true
```

#### **🚀 Production (.env.production)**
```bash
DATABASE_URL=postgresql://jw_scheduler_prod:password@10.92.3.21:5432/jw_scheduler_production
NEXTAUTH_SECRET=production-secret-2024-ultra-secure
NEXTAUTH_URL=http://10.92.3.22:3001
NODE_ENV=production
PORT=3001
NEXTAUTH_DEBUG=false
```

### 3. **Proper Deployment Workflow**

#### **Step 1: Development**
```bash
# Local development
npm run dev
# Test locally
npm run build
npm run start
```

#### **Step 2: Staging Deployment**
```bash
# Deploy to staging
git push origin feature/branch
# Staging auto-deploys from feature branch
# Test in staging environment
# Validate all functionality
```

#### **Step 3: Production Deployment**
```bash
# Only after staging validation
git checkout main
git merge feature/branch
git push origin main
# Production deploys from main branch ONLY
# Use EXACT same commit as staging
```

### 4. **Environment Variable Management**

#### **🚫 NEVER DO:**
- Share environment files between environments
- Hardcode URLs in application code
- Use staging URLs in production
- Deploy different code to production than staging

#### **✅ ALWAYS DO:**
- Use environment-specific .env files
- Validate environment variables on startup
- Use environment detection in code
- Deploy identical artifacts with different configs

### 5. **Database Isolation**

```sql
-- Separate databases for each environment
CREATE DATABASE jw_scheduler_development;
CREATE DATABASE jw_scheduler_staging;
CREATE DATABASE jw_scheduler_production;

-- Separate users with appropriate permissions
CREATE USER jw_dev WITH PASSWORD 'dev_password';
CREATE USER jw_staging WITH PASSWORD 'staging_password';  
CREATE USER jw_prod WITH PASSWORD 'production_password';
```

### 6. **Deployment Validation Checklist**

#### **Pre-Deployment:**
- [ ] Code tested locally
- [ ] All tests passing
- [ ] Environment variables validated
- [ ] Database migrations tested

#### **Staging Deployment:**
- [ ] Deploy from feature branch
- [ ] Smoke test all endpoints
- [ ] Validate authentication flow
- [ ] Check database connections
- [ ] Performance testing

#### **Production Deployment:**
- [ ] Deploy EXACT same commit as staging
- [ ] Environment-specific configuration
- [ ] Database backup completed
- [ ] Rollback plan prepared
- [ ] Monitoring alerts active

### 7. **Troubleshooting Cross-Environment Issues**

#### **Common Problems:**
1. **Shared Configuration Files**
   - Solution: Environment-specific .env files
   
2. **Hardcoded URLs**
   - Solution: Use environment variables everywhere
   
3. **Shared Databases**
   - Solution: Separate databases per environment
   
4. **Load Balancer Misconfiguration**
   - Solution: Environment-specific routing rules

#### **Debugging Commands:**
```bash
# Check environment variables
ssh server "cd /app && printenv | grep NEXTAUTH"

# Verify configuration
ssh server "cd /app && cat .env"

# Test direct connectivity
curl -v http://server:3001/api/auth/providers

# Check service logs
ssh server "journalctl -u service-name -f"
```

### 8. **WMACS Guardian Enforcement**

The WMACS Guardian will enforce:
- ✅ Environment isolation
- ✅ Proper configuration management
- ✅ Artifact-based deployments
- ✅ No cross-environment contamination
- ✅ Proper staging-to-production flow

### 9. **Emergency Procedures**

#### **If Cross-Environment Contamination Detected:**
1. **Immediate:** Stop affected services
2. **Isolate:** Verify environment configurations
3. **Fix:** Deploy proper environment-specific configs
4. **Validate:** Test each environment independently
5. **Monitor:** Ensure no further contamination

---

## 🎯 **IMPLEMENTATION PRIORITY**

1. **HIGH:** Separate databases per environment
2. **HIGH:** Environment-specific .env files
3. **MEDIUM:** Automated deployment pipelines
4. **MEDIUM:** Environment validation scripts
5. **LOW:** Advanced monitoring and alerting

**This architecture ensures complete environment isolation and prevents the staging-to-production contamination you experienced.**
