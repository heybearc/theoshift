# CASCADE RULE: APEX Guardian MCP Advisory System

## 🛡️ MANDATORY APEX GUARDIAN CONSULTATION

**RULE:** For every user prompt, Cascade MUST consult the APEX Guardian MCP Advisory System before taking action.

### 📋 IMPLEMENTATION PROTOCOL

1. **Pre-Action Analysis**
   - Analyze user request through APEX Guardian lens
   - Identify potential system impacts
   - Assess deployment/infrastructure implications
   - Check for port 3001 compliance (immutable)

2. **Guardian Advisory Consultation**
   - Use APEX Guardian scripts for complex operations
   - Validate against established patterns
   - Ensure consistency across environments
   - Prevent infinite loops and configuration conflicts

3. **Action Execution**
   - Execute with Guardian oversight
   - Monitor for Guardian-flagged issues
   - Apply Guardian fixes when needed
   - Document Guardian interventions

### 🎯 APEX GUARDIAN PRIORITIES

1. **Port 3001 Immutability** - Never deviate from port 3001
2. **Environment Consistency** - Staging and Production must match
3. **Infinite Loop Prevention** - Guardian detects and fixes redirect loops
4. **Configuration Validation** - All configs validated by Guardian
5. **Emergency Response** - Guardian provides emergency fixes

### 🔧 GUARDIAN TOOLS AVAILABLE

- `apex-port-guardian.js` - Port enforcement
- `apex-redirect-loop-fix.js` - Redirect loop resolution
- `apex-bad-gateway-diagnosis.js` - Gateway issue diagnosis
- `apex-rendering-guardian.js` - Rendering mode analysis
- `apex-emergency-auth-fix.js` - Authentication emergency fixes
- **`apex-clean-deploy.sh` - Clean CI/CD deployment script**
- **`APEX_DEPLOYMENT_ARCHITECTURE.md` - Deployment best practices**
- **`APEX_CICD_NGINX_PROXY_ARCHITECTURE.md` - Proxy setup guidelines**

### 🏗️ MANDATORY DEVELOPMENT WORKFLOW

**🚫 FORBIDDEN PRACTICES:**
- Direct server modifications via SSH
- Editing files directly on production/staging servers
- Building directly on servers without version control
- Making changes without proper artifact deployment
- **Hardcoding environment-specific IPs/URLs in code**
- **Deploying development/testing scripts to production**
- **Cross-environment configuration contamination**

**✅ REQUIRED WORKFLOW:**
1. **Local Development First**
   - Make ALL changes in local repository
   - Test locally with `npm run dev`
   - Fix all build errors locally
   - Commit to version control
   - **NO hardcoded server IPs in application code**

2. **Staging Deployment**
   - Deploy to staging from repository artifact
   - **Deploy ONLY application code (src/, package.json, configs)**
   - **Inject staging-specific environment variables**
   - Test in staging environment
   - Validate all functionality

3. **Production Deployment**
   - Deploy to production from SAME commit as staging
   - **Deploy ONLY application code (exclude dev scripts)**
   - **Inject production-specific environment variables**
   - Use artifact-based deployment only
   - Maintain rollback capability via git

### 🧹 **CLEAN DEPLOYMENT REQUIREMENTS:**
- **✅ Application Code Only:** Deploy src/, package.json, configs
- **❌ Exclude Development Files:** No apex-*, test-*, scripts/, .github/
- **✅ Environment Injection:** Server-specific .env at deployment time
- **✅ Cross-Environment Verification:** Check for staging references in production
- **✅ Clean Slate Deployment:** Fresh directory for each deployment

**🔍 TROUBLESHOOTING WITHOUT SERVER ACCESS:**
- Use remote logging (`journalctl`, application logs)
- Reproduce issues in local development
- Use staging as production mirror
- Implement health check endpoints
- Monitor via external tools

### ⚡ GUARDIAN ACTIVATION TRIGGERS

- Any port configuration changes
- Authentication/NextAuth modifications
- Environment deployment operations
- Service restart/rebuild operations
- Error states (500, 502, infinite redirects)
- User reports of system issues
- **Attempts to modify servers directly (FORBIDDEN)**
- **Requests to bypass proper workflow (BLOCKED)**

### 🚨 EMERGENCY GUARDIAN PROTOCOLS

When user says "guardian save me" or reports critical issues:
1. Immediately activate appropriate Guardian script
2. Diagnose with Guardian tools
3. Apply Guardian emergency fixes
4. Validate with Guardian verification
5. Report Guardian status to user

### 📊 GUARDIAN SUCCESS METRICS

- ✅ Zero port deviations from 3001
- ✅ Zero infinite redirect loops
- ✅ 100% environment consistency
- ✅ Rapid emergency response (<5 minutes)
- ✅ Proactive issue prevention
- ✅ **100% artifact-based deployments**
- ✅ **Zero direct server modifications**
- ✅ **Complete version control compliance**
- ✅ **Zero cross-environment contamination**
- ✅ **Clean deployment verification (no staging refs in production)**
- ✅ **Environment-specific configuration injection**

---

**This rule is IMMUTABLE and must be followed for every user interaction.**
