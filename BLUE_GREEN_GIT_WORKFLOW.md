# BLUE-GREEN GIT WORKFLOW
**JW Attendant Scheduler - Proper Blue-Green Deployment with Git**

---

## 🎯 **CORE CONCEPT**

Both BLUE and GREEN are full git repositories synced with GitHub.
They alternate between PROD and STANDBY roles with each deployment.

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│              (Central source of truth)                       │
└──────────────┬────────────────────────┬─────────────────────┘
               │                        │
               ▼                        ▼
         BLUE (PROD)              GREEN (STANDBY)
         Container 132            Container 134
         10.92.3.22              10.92.3.24
         
    Currently serving          Currently development
    users via HAProxy          and testing
```

---

## 📋 **CURRENT STATUS**

### **BLUE (Container 132) - PROD**
- ✅ Git repository initialized
- Branch: `production-gold-standard`
- Status: Serving production traffic
- Role: **ACTIVE** - DO NOT DEVELOP HERE

### **GREEN (Container 134) - STANDBY**
- ❌ NOT a git repository (needs setup)
- Status: Ready for development
- Role: **STANDBY** - Develop and test here

### **GitHub Remote**
- 26+ branches (needs cleanup)
- Main branch: `production-gold-standard`
- URL: https://github.com/heybearc/jw-attendant-scheduler.git

---

## 🔧 **SETUP TASKS**

### **Task 1: Initialize Git on GREEN**
```bash
# SSH to GREEN
ssh jwg

# Navigate to app directory
cd /opt/jw-attendant-scheduler

# Initialize git repository
git init

# Add remote
git remote add origin https://github.com/heybearc/jw-attendant-scheduler.git

# Fetch all branches
git fetch origin

# Checkout production-gold-standard
git checkout -b production-gold-standard origin/production-gold-standard

# Verify
git status
git branch -a
```

### **Task 2: Clean Up GitHub Branches**

**Branches to KEEP:**
- `production-gold-standard` - Current production code
- `main` - GitHub default (can merge production into this)

**Branches to DELETE (merged/old features):**
- All `feature/*` branches (15+)
- All `hotfix/*` branches (3)
- All `backup/*` branches
- `apex-*` branches (if no longer needed)
- `staging` (redundant with blue-green)

**Cleanup Script:**
```bash
# From local Mac
cd /Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler

# Delete remote branches (DO THIS CAREFULLY)
git push origin --delete feature/admin-module-events-management
git push origin --delete feature/apex-ssr-architecture-upgrade
git push origin --delete feature/api-foundation
# ... (list all branches to delete)

# Or use interactive cleanup
git branch -r | grep 'origin/feature/' | sed 's/origin\///' | xargs -I {} git push origin --delete {}
```

### **Task 3: Sync Both Environments**
```bash
# On BLUE (verify it's clean)
ssh jwa "cd /opt/jw-attendant-scheduler && git status"

# On GREEN (pull latest)
ssh jwg "cd /opt/jw-attendant-scheduler && git pull origin production-gold-standard"

# Verify both are in sync
ssh jwa "cd /opt/jw-attendant-scheduler && git log --oneline -5"
ssh jwg "cd /opt/jw-attendant-scheduler && git log --oneline -5"
```

---

## 🔄 **DEPLOYMENT WORKFLOW**

### **Cycle 1: Develop on GREEN (Current)**

#### **Step 1: Develop on GREEN (STANDBY)**
```bash
# SSH to GREEN
ssh jwg
cd /opt/jw-attendant-scheduler

# Create feature branch
git checkout -b feature/new-feature

# Make changes, test locally
npm run build
pm2 restart jw-attendant

# Test at http://10.92.3.24:3001
```

#### **Step 2: Commit and Push**
```bash
# On GREEN
git add .
git commit -m "feat: implement new feature"
git push origin feature/new-feature

# Merge to production-gold-standard
git checkout production-gold-standard
git merge feature/new-feature
git push origin production-gold-standard
```

#### **Step 3: Final Testing on GREEN**
```bash
# Ensure GREEN is on latest production-gold-standard
git checkout production-gold-standard
git pull origin production-gold-standard

# Build and restart
npm run build
pm2 restart jw-attendant

# Thorough testing at http://10.92.3.24:3001
```

#### **Step 4: Switch Traffic (GREEN becomes PROD)**
```bash
# Via HAProxy
ssh haproxy "sed -i 's/default_backend jw_attendant_blue/default_backend jw_attendant_green/' /etc/haproxy/haproxy.cfg && systemctl reload haproxy"

# Verify
curl -I https://attendant.cloudigan.net/
```

#### **Step 5: Update BLUE (now STANDBY)**
```bash
# SSH to BLUE (now standby)
ssh jwa
cd /opt/jw-attendant-scheduler

# Pull latest code
git checkout production-gold-standard
git pull origin production-gold-standard

# Build
npm run build
pm2 restart jw-attendant-blue

# BLUE is now ready for next development cycle
```

---

### **Cycle 2: Develop on BLUE (After Switch)**

#### **Step 1: Develop on BLUE (now STANDBY)**
```bash
# SSH to BLUE (now standby)
ssh jwa
cd /opt/jw-attendant-scheduler

# Create feature branch
git checkout -b feature/another-feature

# Make changes, test
npm run build
pm2 restart jw-attendant-blue

# Test at http://10.92.3.22:3001
```

#### **Step 2: Commit and Push**
```bash
# On BLUE
git add .
git commit -m "feat: implement another feature"
git push origin feature/another-feature

# Merge to production-gold-standard
git checkout production-gold-standard
git merge feature/another-feature
git push origin production-gold-standard
```

#### **Step 3: Switch Traffic (BLUE becomes PROD again)**
```bash
# Via HAProxy
ssh haproxy "sed -i 's/default_backend jw_attendant_green/default_backend jw_attendant_blue/' /etc/haproxy/haproxy.cfg && systemctl reload haproxy"
```

#### **Step 4: Update GREEN (now STANDBY)**
```bash
# SSH to GREEN (now standby)
ssh jwg
cd /opt/jw-attendant-scheduler

# Pull latest
git checkout production-gold-standard
git pull origin production-gold-standard

# Build
npm run build
pm2 restart jw-attendant

# GREEN ready for next cycle
```

---

## 🎯 **GOLDEN RULES**

### **1. Never Develop on PROD**
- ✅ Always develop on whichever server is STANDBY
- ❌ Never make changes on the server serving traffic

### **2. GitHub is Source of Truth**
- All changes must be committed and pushed
- Both servers pull from GitHub
- GitHub serves as backup and version control

### **3. Always Sync After Switch**
- After traffic switch, immediately update the new STANDBY
- Keeps both environments in sync
- Ready for next development cycle

### **4. Test Before Switch**
- Thoroughly test on STANDBY before switching traffic
- Direct access: http://10.92.3.22:3001 or http://10.92.3.24:3001
- No rollback needed if testing is thorough

### **5. Feature Branches for Development**
- Create feature branches for new work
- Merge to `production-gold-standard` when ready
- Delete feature branch after merge

---

## 🚨 **EMERGENCY ROLLBACK**

If something goes wrong after traffic switch:

```bash
# Immediate rollback (switch traffic back)
ssh haproxy "sed -i 's/default_backend jw_attendant_green/default_backend jw_attendant_blue/' /etc/haproxy/haproxy.cfg && systemctl reload haproxy"

# Or vice versa
ssh haproxy "sed -i 's/default_backend jw_attendant_blue/default_backend jw_attendant_green/' /etc/haproxy/haproxy.cfg && systemctl reload haproxy"

# Verify
curl -I https://attendant.cloudigan.net/
```

---

## 📊 **BRANCH STRATEGY**

### **Long-lived Branches:**
- `production-gold-standard` - Always deployable production code
- `main` - GitHub default (optional, can be same as production)

### **Short-lived Branches:**
- `feature/feature-name` - New features
- `bugfix/bug-name` - Bug fixes
- `hotfix/critical-fix` - Emergency fixes

### **Deleted After Merge:**
- All feature/bugfix/hotfix branches after successful deployment

---

## 🔍 **VERIFICATION COMMANDS**

### **Check Current PROD Server**
```bash
ssh haproxy "grep 'default_backend' /etc/haproxy/haproxy.cfg"
```

### **Check Git Status on Both**
```bash
echo "=== BLUE ===" && ssh jwa "cd /opt/jw-attendant-scheduler && git status && git log --oneline -3"
echo "=== GREEN ===" && ssh jwg "cd /opt/jw-attendant-scheduler && git status && git log --oneline -3"
```

### **Verify Both in Sync**
```bash
ssh jwa "cd /opt/jw-attendant-scheduler && git rev-parse HEAD"
ssh jwg "cd /opt/jw-attendant-scheduler && git rev-parse HEAD"
# Should show same commit hash
```

---

## 📝 **NEXT STEPS**

1. [ ] Initialize git on GREEN
2. [ ] Clean up old GitHub branches
3. [ ] Sync both BLUE and GREEN to same commit
4. [ ] Document current PROD server (BLUE)
5. [ ] Ready for first blue-green development cycle

---

**Created:** October 25, 2025
**Status:** Ready for implementation
**Current PROD:** BLUE (Container 132)
**Current STANDBY:** GREEN (Container 134)
