---
description: Staging-First Development Workflow - Prevent deployment issues
---

# STAGING-FIRST DEVELOPMENT WORKFLOW
**Prevent deployment issues by developing directly on staging environment**

## CORE PRINCIPLE
**Develop incrementally on staging, not locally, to ensure environment parity**

## WORKFLOW STEPS

### 1. INITIAL SETUP
```bash
# Connect to staging environment
ssh jws

# Navigate to project
cd /opt/jw-attendant-scheduler

# Create feature branch on staging
git checkout -b feature/your-feature-name
```

### 2. INCREMENTAL DEVELOPMENT
```bash
# Make small changes directly on staging
nano pages/your-new-page.tsx

# Test immediately
curl -s -w "Status: %{http_code}\n" "http://10.92.3.24:3001/your-route" -o /dev/null

# Build and restart if needed
npm run build && pkill -f 'next start' && PORT=3001 nohup npm start > /tmp/app.log 2>&1 &

# Test again
curl -s -w "Status: %{http_code}\n" "http://10.92.3.24:3001/your-route" -o /dev/null
```

### 3. COMMIT WORKING CHANGES
```bash
# Only commit when feature works on staging
git add your-changes
git commit -m "feat: working feature tested on staging"
git push origin feature/your-feature-name
```

### 4. SYNC TO LOCAL (OPTIONAL)
```bash
# Pull working changes to local for further development
git pull origin feature/your-feature-name
```

## ENVIRONMENT PARITY CHECKLIST

### ✅ DATABASE
- [ ] Same PostgreSQL version
- [ ] Same schema (run migrations on both)
- [ ] Same data for testing
- [ ] Same connection strings

### ✅ NEXT.JS CONFIGURATION
- [ ] Same Node.js version
- [ ] Same npm/package versions
- [ ] Same environment variables
- [ ] Same build configuration

### ✅ AUTHENTICATION
- [ ] Same NextAuth configuration
- [ ] Same session handling
- [ ] Same redirect behavior

## TESTING PIPELINE

### 1. ROUTE TESTING
```bash
# Test each new route immediately
curl -s -w "Status: %{http_code}\n" "http://10.92.3.24:3001/new-route" -o /dev/null
```

### 2. FUNCTIONALITY TESTING
```bash
# Test with authentication
curl -s -H "Cookie: next-auth.session-token=test" "http://10.92.3.24:3001/protected-route"
```

### 3. ERROR LOG MONITORING
```bash
# Monitor for errors during development
tail -f /tmp/app.log
```

## DEPLOYMENT RULES

### ✅ ONLY DEPLOY TESTED FEATURES
- Feature must work on staging before merging
- All routes must return proper status codes
- No database errors in logs
- Authentication flow must work

### ✅ INCREMENTAL DEPLOYMENTS
- Deploy small changes frequently
- Test each change immediately
- Fix issues before adding more features

## ROLLBACK SAFETY MECHANISMS

### 1. AUTOMATIC BACKUP BEFORE CHANGES
```bash
# Create safety checkpoint before any development
git tag "safe-$(date +%Y%m%d-%H%M%S)" staging
git push origin --tags

# Store current working state
cp -r /opt/jw-attendant-scheduler /opt/jw-attendant-scheduler.backup.$(date +%Y%m%d-%H%M%S)
```

### 2. HEALTH CHECK VALIDATION
```bash
# Test critical functionality before proceeding
curl -s -w "Status: %{http_code}\n" "http://10.92.3.24:3001/" -o /dev/null
curl -s -w "Status: %{http_code}\n" "http://10.92.3.24:3001/admin" -o /dev/null
curl -s -w "Status: %{http_code}\n" "http://10.92.3.24:3001/events" -o /dev/null

# If any return unexpected codes, STOP development
```

### 3. INCREMENTAL SAFETY COMMITS
```bash
# Commit working state frequently during development
git add .
git commit -m "checkpoint: feature working at $(date)"
git push origin feature/branch-name

# Tag stable points
git tag "stable-checkpoint-$(date +%H%M%S)"
```

### 4. EMERGENCY ROLLBACK PROCEDURES

#### IMMEDIATE ROLLBACK (< 1 minute)
```bash
# Stop broken app
pkill -f 'next start'

# Restore from backup
rm -rf /opt/jw-attendant-scheduler
mv /opt/jw-attendant-scheduler.backup.YYYYMMDD-HHMMSS /opt/jw-attendant-scheduler
cd /opt/jw-attendant-scheduler

# Restart known good version
PORT=3001 nohup npm start > /tmp/app.log 2>&1 &

# Verify restoration
curl -s -w "Status: %{http_code}\n" "http://10.92.3.24:3001/" -o /dev/null
```

#### GIT-BASED ROLLBACK (< 2 minutes)
```bash
# Find last known good commit
git log --oneline -10

# Reset to last known good
git reset --hard <last-good-commit-hash>

# Force clean deployment
./wmacs-clean-staging-deploy.sh

# Verify rollback success
curl -s -w "Status: %{http_code}\n" "http://10.92.3.24:3001/" -o /dev/null
```

#### TAG-BASED ROLLBACK (< 3 minutes)
```bash
# List available safe points
git tag | grep safe

# Rollback to specific safe point
git checkout tags/safe-YYYYMMDD-HHMMSS -b emergency-rollback

# Deploy safe version
./wmacs-clean-staging-deploy.sh
```

### 5. ROLLBACK VALIDATION CHECKLIST
- [ ] Main app responds (/)
- [ ] Admin panel accessible (/admin)
- [ ] Events page works (/events)
- [ ] Authentication works
- [ ] Database connectivity confirmed
- [ ] No errors in logs

### 6. AUTOMATED ROLLBACK SCRIPT
```bash
#!/bin/bash
# emergency-rollback.sh

echo "🚨 EMERGENCY ROLLBACK INITIATED"

# Stop current app
pkill -f 'next start'

# Get last safe backup
LAST_BACKUP=$(ls -t /opt/jw-attendant-scheduler.backup.* | head -1)

if [ -n "$LAST_BACKUP" ]; then
    echo "Restoring from: $LAST_BACKUP"
    rm -rf /opt/jw-attendant-scheduler
    mv "$LAST_BACKUP" /opt/jw-attendant-scheduler
    cd /opt/jw-attendant-scheduler
    PORT=3001 nohup npm start > /tmp/app.log 2>&1 &
    sleep 5
    
    # Verify restoration
    if curl -s "http://10.92.3.24:3001/" > /dev/null; then
        echo "✅ ROLLBACK SUCCESSFUL"
    else
        echo "❌ ROLLBACK FAILED - MANUAL INTERVENTION REQUIRED"
    fi
else
    echo "❌ NO BACKUP FOUND - MANUAL INTERVENTION REQUIRED"
fi
```

## BENEFITS
- **No deployment surprises**: Features work before deployment
- **Faster debugging**: Issues caught immediately
- **Environment parity**: Development matches production
- **Reduced risk**: Small, tested changes only
