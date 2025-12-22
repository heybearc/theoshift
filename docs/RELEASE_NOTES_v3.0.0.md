# Release Notes - Version 3.0.0

**Release Date:** December 19, 2025  
**Release Type:** Major Version - Infrastructure Migration

---

## 🎉 Major Changes

### Theocratic Shift Scheduler Migration

This is a **major infrastructure migration** from "JW Attendant Scheduler" to "Theocratic Shift Scheduler" with complete rebranding and blue-green deployment architecture.

---

## 🚀 What's New

### Infrastructure
- ✅ **New Domain:** Migrated to `theoshift.com`
- ✅ **Blue-Green Deployment:** Implemented true blue-green deployment with containers:
  - Blue Environment: `blue-theoshift` (Container 134, 10.92.3.24)
  - Green Environment: `green-theoshift` (Container 132, 10.92.3.22)
- ✅ **New Database:** `theoshift_scheduler` with migrated data
- ✅ **Updated Branding:** All references updated to Theocratic Shift Scheduler

### User-Facing Changes
- ✅ **Migration Announcement:** Added prominent banner with deadline information
- ✅ **Updated Timeline:** Clear migration schedule with February 1, 2026 deadline
- ✅ **Warning Banner:** Yellow/orange warning banner appears on all pages
- ✅ **Updated FAQ:** Clear information about domain transition

---

## ⚠️ Important User Information

### Domain Transition Timeline

**December 19, 2025 - January 31, 2026:**
- Both old and new domains work identically
- Users should update bookmarks to `theoshift.com`

**February 1, 2026 - DEADLINE:**
- Old domain (`attendant.cloudigan.net`) will **stop working**
- Users **must** use `theoshift.com` after this date

### Action Required
- **Update your bookmarks** to `https://theoshift.com`
- **Share the new URL** with your team members
- **No new account needed** - existing credentials work on both domains

---

## 🔧 Technical Changes

### Code Migration (238 files updated)
- Container names: 134→blue-theoshift, 132→green-theoshift
- Domains: *.cloudigan.net → *.theoshift.com
- Application paths: /opt/jw-attendant-scheduler → /opt/theoshift
- Database: jw_attendant_scheduler → theoshift_scheduler
- SSH shortcuts: jwa/jwg → green/blue-theoshift
- Environment files: .env.staging/production → .env.blue/green
- PM2 processes: jw-attendant → theoshift-blue/green
- MCP configuration updated to 'theoshift'
- Project name: JW Attendant Scheduler → Theocratic Shift Scheduler

### Infrastructure Updates
- **Proxmox Containers Renamed:**
  - Container 134: `blue-theoshift` (10.92.3.24)
  - Container 132: `green-theoshift` (10.92.3.22)
  
- **Database Migration:**
  - New database: `theoshift_scheduler`
  - New user: `theoshift_user`
  - Data migrated from staging database
  
- **Environment Configuration:**
  - Blue: `.env.blue` → `https://blue.theoshift.com`
  - Green: `.env.green` → `https://green.theoshift.com`
  - Both run production builds (NODE_ENV=production)

### Deployment Changes
- Both blue and green deploy from `production-gold-standard` branch
- Equal environments - either can be live or standby
- Traffic routing controlled by load balancer
- PM2 process names: `theoshift-blue`, `theoshift-green`

---

## 🛡️ Safety & Rollback

### Backups Created
- **Proxmox Snapshots:**
  - Blue (134): `pre-theoshift-migration-20251219-195620`
  - Green (132): `pre-theoshift-migration-20251219-195628`
- **Database Backup:** `/tmp/jw_attendant_scheduler_staging_backup_20251219-195709.sql`
- **Git Stash:** Code backup available

### Rollback Procedures
If issues arise, rollback procedures are documented in `MIGRATION_COMPLETE_SUMMARY.md`

---

## 📊 Migration Statistics

- **Files Updated:** 238 files
- **Code Changes:** 2,005 insertions, 1,078 deletions
- **Downtime:** ~5 minutes during container restarts
- **Data Loss:** None
- **Migration Duration:** ~2 hours
- **Status:** ✅ Complete and Operational

---

## 🔗 New URLs

### Production URLs
- **Main Domain:** https://theoshift.com
- **Blue Environment:** https://blue.theoshift.com
- **Green Environment:** https://green.theoshift.com

### Legacy URLs (Work until Feb 1, 2026)
- ~~https://attendant.cloudigan.net~~ → Redirects to theoshift.com
- ~~https://jw-staging.cloudigan.net~~ → Redirects to blue.theoshift.com
- ~~https://jw-production.cloudigan.net~~ → Redirects to green.theoshift.com

---

## 📝 Documentation Updates

- `INFRASTRUCTURE_CONFIG.md` - Updated with new blue-green configuration
- `MIGRATION_COMPLETE_SUMMARY.md` - Complete migration documentation
- `THEOSHIFT_INFRASTRUCTURE_MIGRATION.md` - Migration tracking
- `SERVER_MIGRATION_CHECKLIST.md` - Server-side migration procedures

---

## 🐛 Bug Fixes

None - this is a pure infrastructure migration with no functional changes.

---

## 🔮 Coming Soon

### Q1 2026
- Multi-department volunteer support
- Enhanced scheduling features
- Improved mobile experience

---

## 💬 Support

### Quick Commands
```bash
# Check Blue status
ssh blue-theoshift "pm2 status"

# Check Green status
ssh green-theoshift "pm2 status"

# View logs
ssh blue-theoshift "pm2 logs theoshift-blue --lines 50"
```

### Health Checks
```bash
# Blue health
curl -I https://blue.theoshift.com

# Green health
curl -I https://green.theoshift.com

# Main domain
curl -I https://theoshift.com
```

---

## 🙏 Thank You

Thank you for your patience during this migration. We're excited about the future of Theocratic Shift Scheduler and the new features coming in 2026!

If you have any questions or issues, please contact your system administrator.

---

**Version:** 3.0.0  
**Build Date:** December 19, 2025  
**Git Commit:** c7844963  
**Migration Status:** ✅ Complete
