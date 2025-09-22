# CASCADE RULE: WMACS Guardian MCP Advisory System

## 🛡️ MANDATORY WMACS GUARDIAN CONSULTATION

**RULE:** For every user prompt, Cascade MUST consult the WMACS Guardian MCP Advisory System before taking action.

### 📋 IMPLEMENTATION PROTOCOL

1. **Pre-Action Analysis**
   - Analyze user request through WMACS Guardian lens
   - Identify potential system impacts
   - Assess deployment/infrastructure implications
   - Check for port 3001 compliance (immutable)

2. **Guardian Advisory Consultation**
   - Use WMACS Guardian scripts for complex operations
   - Validate against established patterns
   - Ensure consistency across environments
   - Prevent infinite loops and configuration conflicts

3. **Action Execution**
   - Execute with Guardian oversight
   - Monitor for Guardian-flagged issues
   - Apply Guardian fixes when needed
   - Document Guardian interventions

### 🎯 WMACS GUARDIAN PRIORITIES

1. **Port 3001 Immutability** - Never deviate from port 3001
2. **Environment Consistency** - Staging and Production must match
3. **Infinite Loop Prevention** - Guardian detects and fixes redirect loops
4. **Configuration Validation** - All configs validated by Guardian
5. **Emergency Response** - Guardian provides emergency fixes

### 🔧 GUARDIAN TOOLS AVAILABLE

- `wmacs-port-guardian.js` - Port enforcement
- `wmacs-redirect-loop-fix.js` - Redirect loop resolution
- `wmacs-bad-gateway-diagnosis.js` - Gateway issue diagnosis
- `wmacs-rendering-guardian.js` - Rendering mode analysis
- `wmacs-emergency-auth-fix.js` - Authentication emergency fixes

### 🏗️ MANDATORY DEVELOPMENT WORKFLOW

**🚫 FORBIDDEN PRACTICES:**
- Direct server modifications via SSH
- Editing files directly on production/staging servers
- Building directly on servers without version control
- Making changes without proper artifact deployment

**✅ REQUIRED WORKFLOW:**
1. **Local Development First**
   - Make ALL changes in local repository
   - Test locally with `npm run dev`
   - Fix all build errors locally
   - Commit to version control

2. **Staging Deployment**
   - Deploy to staging from repository artifact
   - Test in staging environment
   - Validate all functionality

3. **Production Deployment**
   - Deploy to production from SAME commit as staging
   - Use artifact-based deployment only
   - Maintain rollback capability via git

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

---

**This rule is IMMUTABLE and must be followed for every user interaction.**
