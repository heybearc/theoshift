# Department System Migration Plan

## Overview
Migrating from attendant-only system to multi-department volunteer system with complete event isolation.

---

## Migration Strategy

### ✅ What Gets Migrated

**Existing Data:**
- `attendants` table → `volunteers` table (renamed, all data preserved)
- All existing volunteers automatically linked to "Attendants" department
- All existing events get full department structure
- All assignments/relationships preserved

**New Structure:**
- Global department templates (16 departments including nested Audio-Video)
- Event-specific department instances (complete isolation between events)
- Volunteer-to-department associations per event

---

## Database Changes

### New Tables

**1. `department_templates`** (Global)
- Master list of available departments
- Admin can add/edit/delete templates
- Supports parent/child relationships (Audio-Video → Audio Crew, Stage Crew, Video Crew)
- Used as templates when creating new events

**2. `event_departments`** (Event-Specific)
- Each event gets its own copy of departments
- Can be customized per event (enable/disable)
- Complete isolation - no crossover between events
- Links to templates for consistency

**3. `event_volunteers`** (Replaces `event_attendants`)
- Links volunteers to specific departments within events
- Supports roles: ADMIN, OVERSEER, ASSISTANT_OVERSEER, KEYMAN, VOLUNTEER
- Multiple departments per volunteer per event

### Renamed Tables

**`attendants` → `volunteers`**
- All data preserved
- Column names remain the same
- Foreign keys updated throughout schema

### Updated Foreign Keys

**Tables with renamed columns:**
- `position_assignments`: `attendantId` → `volunteerId`
- `position_oversight_assignments`: `overseer_id` → `overseer_volunteer_id`
- `document_publications`: `attendantId` → `volunteerId`

---

## Initial Department List

### Parent Departments (13)
1. Accounts
2. Attendants ← **Existing attendants migrate here**
3. First Aid
4. Parking
5. Safety
6. Audio-Video (has children)
7. Baptism
8. Cleaning
9. Information & Volunteer Service
10. Installation
11. Lost & Found
12. Rooming Desk
13. Trucking

### Child Departments (3)
Under Audio-Video:
- Audio Crew
- Stage Crew
- Video Crew

**Total: 16 departments**

---

## Migration Steps

### Phase 1: Database Schema
1. ✅ Create `department_templates` table
2. ✅ Create `event_departments` table
3. ✅ Rename `attendants` → `volunteers`
4. ✅ Create `event_volunteers` table
5. ✅ Update foreign key references

### Phase 2: Data Migration
1. ✅ Insert 16 department templates
2. ✅ Create event_departments for all existing events
3. ✅ Migrate event_attendants → event_volunteers (linked to "Attendants" department)
4. ✅ Drop old event_attendants table

### Phase 3: Prisma Schema Update
1. Update schema.prisma with new models
2. Update all relations
3. Generate new Prisma client

### Phase 4: API Updates
1. Update all API endpoints to use "volunteers" instead of "attendants"
2. Add department management endpoints
3. Update event creation to copy department templates

### Phase 5: UI Updates
1. Replace "Attendant" with "Volunteer" throughout UI
2. Add department selection/filtering
3. Update event creation to show department selection
4. Add department management interface

---

## Backward Compatibility

### Existing Events
- ✅ All existing events automatically get all 16 departments
- ✅ All existing attendants become volunteers in "Attendants" department
- ✅ All assignments preserved
- ✅ No data loss

### Existing Functionality
- ✅ All current features continue to work
- ✅ Roles preserved (ADMIN, OVERSEER, etc.)
- ✅ Station ranges preserved
- ✅ Oversight assignments preserved

---

## Event Isolation Guarantee

**Each event has:**
- ✅ Its own copy of departments (event_departments)
- ✅ Its own volunteer associations (event_volunteers)
- ✅ Its own positions linked to departments
- ✅ Complete independence from other events

**Deleting an event:**
- ✅ Removes all event_departments for that event
- ✅ Removes all event_volunteers for that event
- ✅ Does NOT affect other events
- ✅ Does NOT affect global volunteer records

---

## Testing Checklist

### Pre-Migration
- [ ] Backup production database
- [ ] Test migration on local database
- [ ] Verify all existing events load correctly
- [ ] Verify all existing volunteers load correctly

### Post-Migration
- [ ] Verify all 16 departments exist in templates
- [ ] Verify all existing events have all departments
- [ ] Verify all existing volunteers linked to "Attendants" department
- [ ] Verify all assignments still work
- [ ] Verify event creation copies departments correctly
- [ ] Verify event deletion removes departments correctly

### Rollback Plan
- [ ] Database backup available
- [ ] Reverse migration script prepared
- [ ] Can restore from backup if needed

---

## Next Steps

1. **Review this plan** - Confirm approach is correct
2. **Test locally** - Run migration on local database
3. **Update Prisma schema** - Reflect new structure
4. **Generate migration** - Create Prisma migration files
5. **Deploy to STANDBY** - Test on Blue environment
6. **Verify thoroughly** - Test all functionality
7. **Release to LIVE** - Deploy to production

---

## Timeline Estimate

- Database migration: ~5 minutes
- Prisma schema update: ~30 minutes
- API updates: ~2 hours
- UI updates: ~4 hours
- Testing: ~2 hours

**Total: ~8-9 hours of development work**

---

## Questions Resolved

✅ **Global vs Event-Specific?** Hybrid - templates are global, instances are event-specific
✅ **Existing events migrated?** Yes, all existing events get full department structure
✅ **Attendants become volunteers?** Yes, linked to "Attendants" department automatically
✅ **Event isolation?** Complete - each event has its own departments and volunteer associations
✅ **Can add departments?** Yes, admin can manage global templates
