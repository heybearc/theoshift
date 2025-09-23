# WMACS Shared CASCADE Rules - Universal Implementation

## 🛡️ **WMACS Guardian: Universal CASCADE RULE System**

**Version:** 2.0.0  
**Last Updated:** 2025-09-22  
**Applies To:** ALL WMACS-managed workspaces and projects

---

## 📋 **CASCADE RULE: WMACS Guardian MCP Advisory System**

**RULE:** For every user prompt, Cascade MUST consult the WMACS Guardian MCP Advisory System before taking action.

### 📋 **IMPLEMENTATION PROTOCOL**

1. **Specs-First Analysis (MANDATORY)**
   - **ALWAYS check project specs and documentation FIRST**
   - Identify missing information in specs and request updates
   - Use current project context over historical memories
   - Verify all environment details with user directly
   - **NEVER assume environment details from memories**

2. **Pre-Action Analysis**
   - Analyze user request through WMACS Guardian lens
   - Identify potential system impacts
   - Assess deployment/infrastructure implications
   - Check for port 3001 compliance (immutable)

3. **Guardian Advisory Consultation**
   - Use WMACS Guardian scripts for complex operations
   - Validate against established patterns
   - Ensure consistency across environments
   - Prevent infinite loops and configuration conflicts

4. **Action Execution**
   - Execute with Guardian oversight
   - Monitor for Guardian-flagged issues
   - Apply Guardian fixes when needed
   - Document Guardian interventions

### 🎯 **WMACS GUARDIAN PRIORITIES**

1. **Port 3001 Immutability** - Never deviate from port 3001
2. **Environment Consistency** - Staging and Production must match
3. **Infinite Loop Prevention** - Guardian detects and fixes redirect loops
4. **Configuration Validation** - All configs validated by Guardian
5. **Emergency Response** - Guardian provides emergency fixes
6. **Clean Deployment Enforcement** - Zero cross-environment contamination

### 🔧 **GUARDIAN TOOLS AVAILABLE**

#### **Core Guardian Tools:**
- `wmacs-port-guardian.js` - Port enforcement and validation
- `wmacs-redirect-loop-fix.js` - Redirect loop resolution
- `wmacs-bad-gateway-diagnosis.js` - Gateway issue diagnosis
- `wmacs-rendering-guardian.js` - Rendering mode analysis
- `wmacs-emergency-auth-fix.js` - Authentication emergency fixes

#### **CI/CD Guardian Tools:**
- `wmacs-clean-deploy.sh` - Clean CI/CD deployment script
- `wmacs-environment-validator.js` - Cross-environment contamination checker
- `wmacs-backup-guardian.js` - Automated backup and rollback
- `wmacs-health-monitor.js` - Continuous health monitoring

#### **Documentation:**
- `WMACS_DEPLOYMENT_ARCHITECTURE.md` - Deployment best practices
- `WMACS_SYSTEM_CONFIG.md` - Universal system standards
- `WMACS_EMERGENCY_PROCEDURES.md` - Crisis response protocols

### 🏗️ **MANDATORY DEVELOPMENT WORKFLOW**

#### **🚫 FORBIDDEN PRACTICES:**
- Direct server modifications via SSH
- Editing files directly on production/staging servers
- Building directly on servers without version control
- Making changes without proper artifact deployment
- **Hardcoding environment-specific IPs/URLs in code**
- **Deploying development/testing scripts to production**
- **Cross-environment configuration contamination**
- **Deviating from port 3001 for any reason**
- **Using memories for environment details without user verification**
- **Assuming infrastructure details from historical conversations**

#### **✅ REQUIRED WORKFLOW:**

**1. Local Development First**
- Make ALL changes in local repository
- Test locally with `npm run dev` or equivalent
- Fix all build errors locally
- Commit to version control
- **NO hardcoded server IPs in application code**
- **Use environment variables for all configuration**

**2. Staging Deployment**
- Deploy to staging from repository artifact
- **Deploy ONLY application code (src/, package.json, configs)**
- **Inject staging-specific environment variables**
- Test in staging environment
- Validate all functionality
- **Verify no production references in staging**

**3. Production Deployment**
- Deploy to production from SAME commit as staging
- **Deploy ONLY application code (exclude dev scripts)**
- **Inject production-specific environment variables**
- Use artifact-based deployment only
- Maintain rollback capability via git
- **Verify no staging references in production**

### 📋 **SPECS-FIRST MANDATE**

#### **🎯 PRIMARY INFORMATION SOURCES (IN ORDER):**
1. **Current Project Specifications** - Always check specs first
2. **User Direct Input** - Ask user for missing details
3. **Project Documentation** - README, config files, etc.
4. **Current Environment Verification** - Test/validate current state
5. **Memories (RESTRICTED USE)** - Only for general patterns, NEVER for environment details

#### **✅ APPROVED MEMORY USAGE:**
- **General coding patterns and best practices**
- **Framework-specific knowledge (Next.js, React, etc.)**
- **Universal development principles**
- **Common troubleshooting approaches**
- **Technology-specific syntax and methods**

#### **❌ FORBIDDEN MEMORY USAGE:**
- **Environment-specific details (IPs, ports, server names)**
- **Infrastructure configuration from other projects**
- **Deployment-specific information**
- **Database connection details**
- **Authentication configurations**
- **Any project-specific implementation details**

#### **🔄 SPECS UPDATE PROTOCOL:**
When information is missing from specs:
1. **Identify the gap** in current specifications
2. **Request user to provide** the missing information
3. **Update project specs** with the new information
4. **Document the addition** for future reference
5. **Proceed with verified information only**

### 🧹 **CLEAN DEPLOYMENT REQUIREMENTS**

#### **✅ INCLUDE in Deployments:**
- Application source code (`src/`, `app/`, etc.)
- Package management files (`package.json`, `package-lock.json`)
- Configuration files (`next.config.js`, `tsconfig.json`, etc.)
- Essential middleware and routing files
- Database migration scripts (if applicable)

#### **❌ EXCLUDE from Deployments:**
- Development scripts (`wmacs-*`, `test-*`, `debug-*`)
- Testing directories (`tests/`, `__tests__/`, `spec/`)
- CI/CD workflows (`.github/`, `.gitlab-ci.yml`)
- Development utilities (`scripts/`, `tools/`)
- Documentation files (`README.md`, `DOCS/`)
- Environment-specific files from other environments

#### **🔍 DEPLOYMENT VERIFICATION:**
```bash
# Check for cross-environment contamination
grep -r "{other-environment-ip}" /deployment/path/ \
  --exclude-dir=node_modules --exclude-dir=.git

# Verify environment variables
cat /deployment/path/.env | grep -E "(NEXTAUTH_URL|DATABASE_URL)"

# Test service health
curl -s http://{server}:3001/health
```

### 🔍 **TROUBLESHOOTING WITHOUT SERVER ACCESS**

#### **Approved Methods:**
- Use remote logging (`journalctl`, application logs)
- Reproduce issues in local development
- Use staging as production mirror
- Implement health check endpoints
- Monitor via external tools
- Use WMACS Guardian diagnostic scripts

#### **Emergency Remote Access:**
- Only for critical production issues
- Must be logged and documented
- Requires Guardian oversight
- Changes must be committed to repository afterward

### ⚡ **GUARDIAN ACTIVATION TRIGGERS**

- Any port configuration changes
- Authentication/NextAuth modifications
- Environment deployment operations
- Service restart/rebuild operations
- Error states (500, 502, infinite redirects)
- User reports of system issues
- **Attempts to modify servers directly (FORBIDDEN)**
- **Requests to bypass proper workflow (BLOCKED)**
- **Cross-environment contamination detected**
- **Hardcoded environment references found**
- **Use of memories for infrastructure details without verification**
- **Missing or incomplete project specifications detected**

### 🚨 **EMERGENCY GUARDIAN PROTOCOLS**

#### **When user says "guardian save me" or reports critical issues:**
1. **Immediate Assessment**
   - Identify the critical issue type
   - Determine affected environments
   - Check for cross-environment contamination

2. **Guardian Response**
   - Activate appropriate Guardian script
   - Diagnose with Guardian tools
   - Apply Guardian emergency fixes
   - Validate with Guardian verification

3. **Recovery Process**
   - Stop affected services if necessary
   - Deploy clean artifacts if contaminated
   - Restore from backup if needed
   - Verify complete system health

4. **Post-Emergency**
   - Document the incident
   - Update Guardian tools if needed
   - Commit all fixes to repository
   - Report Guardian status to user

### 📊 **GUARDIAN SUCCESS METRICS**

#### **Core Metrics:**
- ✅ **Zero port deviations from 3001**
- ✅ **Zero infinite redirect loops**
- ✅ **100% environment consistency**
- ✅ **Rapid emergency response (<5 minutes)**
- ✅ **Proactive issue prevention**

#### **Deployment Metrics:**
- ✅ **100% artifact-based deployments**
- ✅ **Zero direct server modifications**
- ✅ **Complete version control compliance**
- ✅ **Zero cross-environment contamination**
- ✅ **Clean deployment verification (no staging refs in production)**
- ✅ **Environment-specific configuration injection**

#### **System Health Metrics:**
- ✅ **>99.9% service uptime**
- ✅ **<500ms average response time**
- ✅ **Zero configuration drift**
- ✅ **100% backup success rate**

---

## 🚀 **WORKSPACE IMPLEMENTATION GUIDE**

### **Step 1: Download and Setup**
```bash
# Download WMACS Guardian system
curl -O https://raw.githubusercontent.com/your-org/wmacs-config/main/WMACS_SHARED_CASCADE_RULES.md
curl -O https://raw.githubusercontent.com/your-org/wmacs-config/main/wmacs-clean-deploy.sh
curl -O https://raw.githubusercontent.com/your-org/wmacs-config/main/WMACS_SYSTEM_CONFIG.md

# Make scripts executable
chmod +x wmacs-clean-deploy.sh
```

### **Step 2: Workspace Integration**
```bash
# Create WMACS directory
mkdir -p .wmacs/

# Move Guardian files
mv WMACS_SHARED_CASCADE_RULES.md .wmacs/
mv wmacs-clean-deploy.sh .wmacs/
mv WMACS_SYSTEM_CONFIG.md .wmacs/

# Create workspace-specific Guardian config
cat > .wmacs/workspace-config.json << EOF
{
  "workspace_name": "your-project-name",
  "staging_server": "10.92.3.24",
  "production_server": "10.92.3.22",
  "port": 3001,
  "guardian_enabled": true,
  "clean_deployment": true
}
EOF
```

### **Step 3: Environment Setup**
```bash
# Create environment templates
mkdir -p .wmacs/env-templates/

# Staging template
cat > .wmacs/env-templates/.env.staging << EOF
NODE_ENV=production
PORT=3001
NEXTAUTH_URL=http://10.92.3.24:3001
DATABASE_URL=postgresql://user_staging:pass@db:5432/app_staging
NEXTAUTH_SECRET=staging-secret-unique
NEXTAUTH_DEBUG=true
EOF

# Production template
cat > .wmacs/env-templates/.env.production << EOF
NODE_ENV=production
PORT=3001
NEXTAUTH_URL=http://10.92.3.22:3001
DATABASE_URL=postgresql://user_prod:pass@db:5432/app_production
NEXTAUTH_SECRET=production-secret-ultra-secure
NEXTAUTH_DEBUG=false
EOF
```

### **Step 4: Guardian Activation**
```bash
# Add to package.json scripts
{
  "scripts": {
    "deploy:staging": ".wmacs/wmacs-clean-deploy.sh staging",
    "deploy:production": ".wmacs/wmacs-clean-deploy.sh production",
    "guardian:health": ".wmacs/wmacs-health-monitor.js",
    "guardian:validate": ".wmacs/wmacs-environment-validator.js"
  }
}
```

### **Step 5: Git Integration**
```bash
# Add to .gitignore
echo ".wmacs/secrets/" >> .gitignore
echo ".wmacs/logs/" >> .gitignore

# Commit Guardian system
git add .wmacs/
git commit -m "feat: Add WMACS Guardian system

🛡️ WMACS Guardian Integration
- Added shared CASCADE rules
- Implemented clean deployment system
- Added environment validation
- Enabled Guardian oversight"
```

---

## 🔒 **COMPLIANCE VERIFICATION**

### **Daily Checks:**
- [ ] All services running on port 3001
- [ ] No cross-environment contamination
- [ ] Environment variables properly set
- [ ] Backup systems operational

### **Weekly Audits:**
- [ ] Review deployment logs
- [ ] Validate Guardian metrics
- [ ] Test emergency procedures
- [ ] Update Guardian tools if needed

### **Monthly Reviews:**
- [ ] Full system health assessment
- [ ] Guardian rule compliance audit
- [ ] Performance metrics analysis
- [ ] Security configuration review

---

## ⚠️ **IMPORTANT NOTES**

1. **This rule system is IMMUTABLE** and must be followed for every user interaction
2. **Guardian oversight is MANDATORY** for all system operations
3. **Port 3001 is SACRED** and cannot be changed under any circumstances
4. **Environment isolation is CRITICAL** - no exceptions allowed
5. **Clean deployments are REQUIRED** - no development scripts in production

**Violation of these rules will result in immediate Guardian intervention and system lockdown until compliance is restored.**

---

## 📞 **SUPPORT AND UPDATES**

- **Guardian Issues:** Create issue with `[WMACS-GUARDIAN]` prefix
- **Rule Updates:** Must be approved by WMACS Guardian Council
- **Emergency Contact:** Use `guardian save me` command for immediate assistance
- **Documentation:** Always refer to latest version in shared repository

**Version Control:** This document is version-controlled and automatically distributed to all WMACS workspaces.
