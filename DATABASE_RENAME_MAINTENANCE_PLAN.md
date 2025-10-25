# DATABASE RENAME MAINTENANCE PLAN
**JW Attendant Scheduler - Production Database Rename**

---

## 📅 **SCHEDULE**

**Maintenance Window:** After November 2, 2025 event
**Recommended Time:** Late evening or early morning (low user activity)
**Estimated Duration:** 15-20 minutes
**Expected Downtime:** 5-10 minutes

---

## 🎯 **OBJECTIVE**

Rename `jw_attendant_scheduler_staging` → `jw_attendant_scheduler_production` to reflect actual usage.

---

## ⚠️ **PRE-MAINTENANCE CHECKLIST**

### **1 Week Before:**
- [ ] Announce maintenance window to users
- [ ] Verify backup system is working
- [ ] Test rollback procedure on GREEN
- [ ] Document current configuration

### **1 Day Before:**
- [ ] Create fresh backup of production database
- [ ] Verify BLUE and GREEN are both healthy
- [ ] Prepare rollback script
- [ ] Have SSH access ready to all servers

### **1 Hour Before:**
- [ ] Final backup of production database
- [ ] Verify no active user sessions
- [ ] Put up maintenance page (optional)

---

## 🔧 **MAINTENANCE PROCEDURE**

### **Step 1: Create Final Backup (2 min)**
```bash
# On database server
ssh postgres "sudo -u postgres pg_dump jw_attendant_scheduler_staging | gzip > /mnt/backups/db-pre-rename-$(date +%Y%m%d_%H%M%S).sql.gz"

# Verify backup
ssh postgres "ls -lh /mnt/backups/db-pre-rename-*.sql.gz | tail -1"
```

### **Step 2: Stop Both Environments (1 min)**
```bash
# Stop BLUE (production)
ssh jwa "cd /opt/jw-attendant-scheduler && pm2 stop jw-attendant-blue"

# Stop GREEN (standby)
ssh jwg "cd /opt/jw-attendant-scheduler && pm2 stop jw-attendant"

# Verify both stopped
ssh jwa "pm2 status"
ssh jwg "pm2 status"
```

### **Step 3: Rename Database (1 min)**
```bash
# Rename the database
ssh postgres "sudo -u postgres psql -c 'ALTER DATABASE jw_attendant_scheduler_staging RENAME TO jw_attendant_scheduler_production;'"

# Verify rename
ssh postgres "sudo -u postgres psql -c '\l' | grep jw_attendant"
```

### **Step 4: Update BLUE Configuration (2 min)**
```bash
# Update BLUE .env.production
ssh jwa "cd /opt/jw-attendant-scheduler && \
  cp .env.production .env.production.backup && \
  sed -i 's/jw_attendant_scheduler_staging/jw_attendant_scheduler_production/g' .env.production && \
  echo '✅ BLUE .env updated'"

# Verify BLUE configuration
ssh jwa "grep DATABASE_URL /opt/jw-attendant-scheduler/.env.production"
```

### **Step 5: Update GREEN Configuration (2 min)**
```bash
# Update GREEN .env.production
ssh jwg "cd /opt/jw-attendant-scheduler && \
  cp .env.production .env.production.backup && \
  sed -i 's/jw_attendant_scheduler_staging/jw_attendant_scheduler_production/g' .env.production && \
  echo '✅ GREEN .env updated'"

# Verify GREEN configuration
ssh jwg "grep DATABASE_URL /opt/jw-attendant-scheduler/.env.production"
```

### **Step 6: Update Backup Script (1 min)**
```bash
# Update backup script to use new database name
ssh postgres "sed -i 's/jw_attendant_scheduler_staging/jw_attendant_scheduler_production/g' /usr/local/bin/backup-jw-scheduler.sh"

# Verify backup script
ssh postgres "grep 'pg_dump' /usr/local/bin/backup-jw-scheduler.sh"
```

### **Step 7: Start BLUE First (2 min)**
```bash
# Start BLUE
ssh jwa "cd /opt/jw-attendant-scheduler && pm2 start jw-attendant-blue"

# Wait 10 seconds for startup
sleep 10

# Test BLUE health
curl -I http://10.92.3.22:3001/

# Check BLUE logs
ssh jwa "pm2 logs jw-attendant-blue --lines 20 --nostream"
```

### **Step 8: Verify BLUE Production (3 min)**
```bash
# Test through HAProxy (production URL)
curl -I https://attendant.cloudigan.net/

# Check database connection
ssh jwa "cd /opt/jw-attendant-scheduler && pm2 logs jw-attendant-blue --lines 50 --nostream | grep -i 'database\|error\|prisma'"

# Manual verification: Open browser to https://attendant.cloudigan.net/
# - Test login
# - Test event access
# - Test attendant list
```

### **Step 9: Start GREEN (1 min)**
```bash
# Start GREEN
ssh jwg "cd /opt/jw-attendant-scheduler && pm2 start jw-attendant"

# Verify GREEN
curl -I http://10.92.3.24:3001/
```

### **Step 10: Final Verification (2 min)**
```bash
# Verify both environments
echo "=== BLUE Status ==="
ssh jwa "pm2 status && pm2 logs jw-attendant-blue --lines 10 --nostream"

echo "=== GREEN Status ==="
ssh jwg "pm2 status && pm2 logs jw-attendant --lines 10 --nostream"

# Verify database connections
ssh postgres "sudo -u postgres psql -c 'SELECT datname, numbackends FROM pg_stat_database WHERE datname = '\''jw_attendant_scheduler_production'\'';'"
```

---

## 🔄 **ROLLBACK PROCEDURE** (If Something Goes Wrong)

### **Emergency Rollback (5 min)**
```bash
# 1. Stop both environments
ssh jwa "cd /opt/jw-attendant-scheduler && pm2 stop jw-attendant-blue"
ssh jwg "cd /opt/jw-attendant-scheduler && pm2 stop jw-attendant"

# 2. Rename database back
ssh postgres "sudo -u postgres psql -c 'ALTER DATABASE jw_attendant_scheduler_production RENAME TO jw_attendant_scheduler_staging;'"

# 3. Restore BLUE configuration
ssh jwa "cd /opt/jw-attendant-scheduler && cp .env.production.backup .env.production"

# 4. Restore GREEN configuration
ssh jwg "cd /opt/jw-attendant-scheduler && cp .env.production.backup .env.production"

# 5. Restore backup script
ssh postgres "sed -i 's/jw_attendant_scheduler_production/jw_attendant_scheduler_staging/g' /usr/local/bin/backup-jw-scheduler.sh"

# 6. Start BLUE
ssh jwa "cd /opt/jw-attendant-scheduler && pm2 start jw-attendant-blue"

# 7. Verify BLUE is working
curl -I https://attendant.cloudigan.net/

# 8. Start GREEN
ssh jwg "cd /opt/jw-attendant-scheduler && pm2 start jw-attendant"
```

---

## ✅ **POST-MAINTENANCE CHECKLIST**

- [ ] BLUE production site accessible and working
- [ ] GREEN standby site accessible and working
- [ ] Database connections verified on both environments
- [ ] Test backup script with new database name
- [ ] Monitor logs for any errors (24 hours)
- [ ] Update documentation with new database name
- [ ] Notify users maintenance is complete

---

## 📊 **SUCCESS CRITERIA**

- ✅ Database successfully renamed to `jw_attendant_scheduler_production`
- ✅ BLUE serving production traffic without errors
- ✅ GREEN operational and ready for development
- ✅ Backup script updated and tested
- ✅ No data loss
- ✅ Total downtime under 10 minutes

---

## 📝 **NOTES**

### **Why This is Safe:**
1. **Full backup before any changes** - can restore if needed
2. **Both environments stopped** - no active connections during rename
3. **BLUE started first** - production verified before GREEN
4. **Rollback plan ready** - can revert in 5 minutes if issues
5. **Configuration backups** - .env.production.backup files created

### **What Could Go Wrong:**
1. **Database rename fails** - Rollback: rename back, restore configs
2. **BLUE won't start** - Rollback: restore old database name and configs
3. **Connection errors** - Rollback: full rollback procedure
4. **PM2 issues** - Manual restart with `pm2 restart`

### **Communication Plan:**
- **Before:** Email users about maintenance window
- **During:** Status updates if extended downtime
- **After:** Confirmation email that maintenance is complete

---

## 🎯 **RECOMMENDED TIMING**

**Best Time:** Sunday morning 2:00 AM - 3:00 AM
- Lowest user activity
- Time to fix issues before Monday
- Can monitor throughout the day

**Alternative:** Saturday evening 10:00 PM - 11:00 PM
- Low activity
- Weekend buffer for issues

---

**Created:** October 25, 2025
**Status:** Scheduled for after November 2, 2025 event
**Owner:** System Administrator
**Estimated Risk:** LOW (with proper backup and rollback plan)
