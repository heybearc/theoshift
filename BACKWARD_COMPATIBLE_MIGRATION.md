# Backward-Compatible Department Migration

## ✅ Database Backup Complete
- **File:** `/var/backups/theoshift_pre_departments_20251221_094108.backup`
- **Size:** 176KB
- **Location:** PostgreSQL container (10.92.3.21)

---

## 🔄 Migration Strategy

### Phase 1: Add New Tables (This Migration)
**What happens:**
- ✅ Creates `department_templates` table
- ✅ Creates `event_departments` table
- ✅ Creates `volunteers` table (copy of attendants)
- ✅ Creates `event_volunteers` table
- ✅ Copies all attendants data to volunteers
- ✅ Migrates event_attendants data to event_volunteers
- ✅ **KEEPS old tables intact** (attendants, event_attendants)

**Result:**
- STANDBY (Blue) uses NEW tables: volunteers, event_volunteers, event_departments
- LIVE (Green) uses OLD tables: attendants, event_attendants
- Both environments work independently on same database

### Phase 2: Release & Sync
**After testing STANDBY:**
1. Switch traffic to STANDBY (becomes LIVE)
2. Sync GREEN with new code
3. Both environments now use new tables

### Phase 3: Cleanup (Future Migration)
**After everything stable:**
- Drop old `attendants` table
- Drop old `event_attendants` table
- Remove any dual-write code

---

## 📊 Table Coexistence

### Old Tables (LIVE uses these)
- `attendants` - Original volunteer data
- `event_attendants` - Original event associations

### New Tables (STANDBY uses these)
- `volunteers` - Copy of attendants with same data
- `event_volunteers` - New structure with department links
- `event_departments` - Event-specific departments
- `department_templates` - Global department templates

---

## 🎯 Department Structure

### Templates (16 total)
1. Accounts
2. Attendants
3. First Aid
4. Parking
5. Safety
6. Audio-Video (parent)
   - Audio Crew (child)
   - Stage Crew (child)
   - Video Crew (child)
7. Baptism
8. Cleaning
9. Information & Volunteer Service
10. Installation
11. Lost & Found
12. Rooming Desk
13. Trucking

---

## 🚀 Deployment Plan

### Step 1: Local Testing ✅ NEXT
1. Update Prisma schema (add new models, keep old)
2. Generate Prisma client
3. Test migration on local database
4. Verify both old and new structures work

### Step 2: Deploy to STANDBY Only
1. Commit and push to production-gold-standard
2. SSH to Blue (10.92.3.22)
3. Pull latest code
4. Run Prisma migration
5. npm run build
6. Restart PM2

### Step 3: Test on STANDBY
- Verify departments created
- Test volunteer management
- Test event creation with departments
- Verify existing data accessible

### Step 4: Release (When Ready)
1. User says "release"
2. Traffic switches to Blue
3. User says "sync"
4. Green gets new code

---

## 🔒 Safety Features

✅ **Database backup created** - Can restore if needed
✅ **Backward compatible** - LIVE unaffected during testing
✅ **No data loss** - All data copied to new tables
✅ **Gradual migration** - Can rollback at any point
✅ **Event isolation** - Each event has own departments

---

## 📝 Next Actions

1. **Update Prisma schema** - Add new models
2. **Generate client** - Update TypeScript types
3. **Test locally** - Verify migration works
4. **Commit & push** - Send to repository
5. **Deploy to STANDBY** - Test in real environment
6. **Get user approval** - Before releasing to LIVE

---

## ⚠️ Important Notes

- **LIVE (Green) is untouched** - Users continue working normally
- **STANDBY (Blue) tests new structure** - Safe isolated testing
- **Same database** - Both environments share PostgreSQL
- **No interference** - Old and new tables coexist peacefully
- **Clean separation** - STANDBY code uses new tables, LIVE code uses old tables
