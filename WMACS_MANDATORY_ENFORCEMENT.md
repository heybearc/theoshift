# 🛡️ APEX MANDATORY ENFORCEMENT PROTOCOL

## 🚨 **CREDIT-AWARE DEVELOPMENT ENFORCEMENT**

### **MANDATORY PRE-ACTION VERIFICATION (MUST EXECUTE BEFORE ANY CHANGE):**

```bash
# APEX GUARDIAN PRE-ACTION CHECKLIST
echo "🛡️ APEX GUARDIAN: PRE-ACTION VERIFICATION"
echo "=========================================="

# 1. FEATURE BRANCH AUDIT
echo "📋 Checking feature branches for existing work..."
git branch -a
git log --oneline --graph --branches --decorate | head -20

# 2. CURRENT WORK INVENTORY  
echo "📦 Current work inventory..."
find src/ -name "*.tsx" -o -name "*.ts" | head -10
ls -la src/app/admin/ 2>/dev/null || echo "❌ Admin module missing"

# 3. SPECS VERIFICATION
echo "📋 Checking project specifications..."
ls -la *SPEC*.md *PLAN*.md *GUIDE*.md 2>/dev/null | head -5

# 4. DEPLOYMENT STATUS
echo "🚀 Current deployment status..."
git status --porcelain | head -5

echo "✅ PRE-ACTION VERIFICATION COMPLETE"
echo "PROCEED ONLY IF ALL CHECKS PASS"
```

### **ENFORCEMENT RULES (MANDATORY - NOT OPTIONAL):**

#### **🔒 RULE 1: WORK PRESERVATION**
- **BEFORE** any merge/deployment: Audit ALL feature branches
- **BEFORE** any file changes: Verify existing implementations  
- **BEFORE** any overwrites: Create backup branches
- **VIOLATION CONSEQUENCE:** Immediate rollback and recovery

#### **🔒 RULE 2: SPECS-FIRST PROTOCOL**
- **BEFORE** any action: Check project specifications FIRST
- **BEFORE** using memories: Verify against current specs
- **BEFORE** assumptions: Ask user for clarification
- **VIOLATION CONSEQUENCE:** Stop all actions until specs verified

#### **🔒 RULE 3: CLEAN DEPLOYMENT ONLY**
- **NO** direct server modifications via SSH
- **NO** manual file copying to servers
- **NO** shortcuts bypassing CI/CD
- **VIOLATION CONSEQUENCE:** Deployment rollback and proper CI/CD

#### **🔒 RULE 4: CREDIT-AWARE DEVELOPMENT**
- **TRACK** all feature branch contributions
- **PRESERVE** all committed work
- **DOCUMENT** all changes and authors
- **VIOLATION CONSEQUENCE:** Work recovery and proper attribution

### **AUTOMATIC ENFORCEMENT TRIGGERS:**

```bash
# These commands MUST be run before ANY action:
apex_pre_action_check() {
    echo "🛡️ APEX MANDATORY ENFORCEMENT ACTIVE"
    
    # Check 1: Feature branch work
    if ! git branch -a | grep -q "feature/"; then
        echo "❌ No feature branches found - verify work location"
        return 1
    fi
    
    # Check 2: Specs verification
    if [ ! -f "*SPEC*.md" ] && [ ! -f "*PLAN*.md" ]; then
        echo "❌ No specifications found - specs-first violation"
        return 1
    fi
    
    # Check 3: Work preservation
    echo "📋 Current admin module status:"
    ls -la src/app/admin/ 2>/dev/null || echo "⚠️ Admin module not found"
    
    echo "✅ APEX ENFORCEMENT CHECKS PASSED"
    return 0
}
```

### **RECOVERY PROTOCOL (IMMEDIATE EXECUTION REQUIRED):**

1. **STOP** all current deployment activities
2. **AUDIT** all feature branches for lost work  
3. **RECOVER** missing implementations from feature branches
4. **MERGE** recovered work properly into staging
5. **REDEPLOY** with complete work preservation
6. **VERIFY** all functionality restored

### **IMPLEMENTATION STATUS:**
- ✅ **Enforcement mechanism created**
- 🔄 **Recovery protocol ready for execution**
- ⏳ **Awaiting user approval to proceed**

**APEX GUARDIAN STATUS: MANDATORY ENFORCEMENT ACTIVE** 🛡️
