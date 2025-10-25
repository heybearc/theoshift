# JW ATTENDANT SCHEDULER - MAINTENANCE SCHEDULE

## 📅 Upcoming Maintenance

### **Database Rename Maintenance**
- **Scheduled:** After November 2, 2025 event
- **Recommended Date:** November 3, 2025 (Sunday) at 2:00 AM
- **Duration:** 15-20 minutes
- **Downtime:** 5-10 minutes
- **Details:** See `DATABASE_RENAME_MAINTENANCE_PLAN.md`

**Objective:** Rename `jw_attendant_scheduler_staging` → `jw_attendant_scheduler_production`

**Pre-Maintenance Tasks:**
- [ ] Week before: Announce to users
- [ ] Day before: Fresh backup
- [ ] Hour before: Final verification

---

## 🎯 Current Event Schedule

### **November 2, 2025 Event**
- **Status:** Active - NO MAINTENANCE during this period
- **Production:** BLUE environment locked and stable
- **Development:** GREEN available for non-critical work only

---

## 📋 Maintenance History

### October 25, 2025 - Database Cleanup
- ✅ Dropped unused databases
- ✅ Updated backup script
- ✅ Created fresh backup
- **Impact:** None - no downtime

### October 24, 2025 - Blue-Green Setup
- ✅ GREEN renamed to `jw-attendant-green`
- ✅ SSH shortcuts configured
- ✅ HAProxy verified
- **Impact:** None - no downtime

---

## 🔔 Reminders

**Set calendar reminder for:**
- **November 1, 2025:** Review maintenance plan
- **November 2, 2025 evening:** Prepare for maintenance
- **November 3, 2025 2:00 AM:** Execute database rename

---

**Last Updated:** October 25, 2025
