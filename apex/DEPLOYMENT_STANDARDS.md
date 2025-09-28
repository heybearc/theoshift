# APEX DEPLOYMENT STANDARDS
**Version:** 1.0  
**Effective Date:** 2025-09-24  
**Scope:** All APEX-managed repositories and deployments

## 🛡️ APEX DEPLOYMENT RULES

### APEX-DEPLOY-001: Git-Based Container Deployment
**Rule:** All staging and production containers MUST use direct git repository deployment
- **Rationale:** Ensures exact code parity between environments
- **Implementation:** Clone repository directly on target containers
- **Verification:** Commit hash validation required for all deployments

### APEX-DEPLOY-002: Repository Synchronization Verification
**Rule:** ALL deployments MUST verify repository synchronization before application restart
- **Required Checks:**
  1. Commit hash verification between local and container
  2. Critical file hash validation (MD5/SHA256)
  3. Branch alignment confirmation
  4. Deployment integrity validation

### APEX-DEPLOY-003: Forced Synchronization Protocol
**Rule:** Use `git reset --hard origin/branch` for critical deployments
- **When to Use:** When deployment verification fails
- **Safety:** Always backup current state before forced sync
- **Validation:** Confirm synchronization with hash checks

### APEX-DEPLOY-004: MCP-Only Deployment Operations
**Rule:** NO manual SSH commands for deployments - MCP operations ONLY
- **Benefits:** Structured operations, audit trails, error handling
- **Required:** All deployment operations through APEX MCP tools
- **Exception:** Emergency recovery only (with documentation)

## 📋 STANDARD DEPLOYMENT WORKFLOW

### Phase 1: Pre-Deployment Verification
```bash
# 1. Verify local repository state
git status --porcelain
git log --oneline -3

# 2. Ensure clean working directory
git stash push -m "Pre-deployment stash"

# 3. Validate target branch
git branch --show-current
```

### Phase 2: Container Repository Synchronization
```bash
# 1. Force fetch latest changes
git fetch origin --force

# 2. Verify remote branch exists
git ls-remote --heads origin staging

# 3. Force synchronization
git reset --hard origin/staging

# 4. Verify synchronization
git rev-parse HEAD
```

### Phase 3: Deployment Validation
```bash
# 1. Commit hash verification
LOCAL_HASH=$(git rev-parse HEAD)
CONTAINER_HASH=$(ssh container "cd /path && git rev-parse HEAD")

# 2. Critical file validation
md5sum critical_files.txt

# 3. Application health check
curl -s -o /dev/null -w '%{http_code}' http://container/health
```

## 🔧 ENHANCED MCP OPERATIONS

### Required MCP Tool Enhancements
1. **Repository Integrity Verification**
2. **Forced Synchronization Capabilities**
3. **Deployment Validation Protocols**
4. **Rollback Mechanisms**
5. **Audit Trail Generation**

### MCP Operation Standards
- **Timeout Handling:** 60 seconds maximum per operation
- **Error Recovery:** Automatic fallback procedures
- **Logging:** Comprehensive operation logging
- **Validation:** Multi-point verification checks

## 🎯 IMPLEMENTATION PRIORITIES

### Immediate (Phase 1)
1. ✅ Enhanced MCP restart tool with repository verification
2. ✅ Deployment validation protocols
3. ✅ Forced synchronization capabilities

### Short-term (Phase 2)
1. 🔄 Automated deployment pipeline integration
2. 🔄 Multi-environment deployment orchestration
3. 🔄 Rollback automation

### Long-term (Phase 3)
1. 📋 Git webhook integration
2. 📋 Automated testing integration
3. 📋 Database migration automation

## 🌐 MULTI-REPOSITORY STANDARDIZATION

### Repository Requirements
- **APEX Configuration:** All repos MUST have `apex/` directory
- **MCP Integration:** Standardized MCP server operations
- **Environment Config:** Consistent environment configuration
- **Deployment Scripts:** Standardized deployment tooling

### Cross-Repository Consistency
- **Same MCP Operations:** Identical deployment procedures
- **Consistent Validation:** Same verification protocols
- **Unified Logging:** Standardized audit trails
- **Common Rollback:** Identical recovery procedures

## 📊 SUCCESS METRICS

### Deployment Reliability
- **Target:** 99.9% successful deployments
- **Measurement:** Deployment success rate tracking
- **Validation:** Post-deployment health checks

### Repository Synchronization
- **Target:** 100% repository synchronization accuracy
- **Measurement:** Commit hash verification success rate
- **Validation:** File integrity validation

### Recovery Time
- **Target:** < 5 minutes for deployment issues
- **Measurement:** Time from issue detection to resolution
- **Validation:** Automated rollback success rate

## 🛡️ APEX CASCADE RULES INTEGRATION

### APEX-COMPLEX-001 Compliance
- Simple, reliable deployment over complex CI/CD systems
- Direct git operations over build artifacts
- MCP operations over manual procedures

### APEX-AUDIT-001 Compliance
- Complete audit trail for all deployments
- Repository state tracking
- Deployment validation logging

### APEX-RECOVERY-001 Compliance
- Automated rollback capabilities
- Emergency recovery procedures
- State preservation protocols

---

**APEX GUARDIAN ENFORCEMENT:** These standards are enforced through MCP operations and automated validation. Non-compliance triggers automatic remediation procedures.

**NEXT STEPS:** Implement enhanced MCP deployment tools across all APEX repositories.
