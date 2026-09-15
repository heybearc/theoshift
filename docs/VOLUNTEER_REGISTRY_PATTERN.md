# Volunteer Registry Pattern

**Decision:** D-TS-021: Global Volunteer Registry with Event-Scoped Access  
**Date:** 2026-02-16

## Overview

TheoShift treats volunteers as **global records** - one person = one volunteer record. This prevents duplicate records and provides a consistent volunteer experience across multiple events.

## Architecture

```
volunteers (GLOBAL REGISTRY)
├── One record per person
├── Email is unique identifier
├── Can link to system user (userId)
└── Signs in via magic-link email

event_volunteers (EVENT ASSOCIATION)
├── Links volunteer to event
├── volunteerId → volunteers (FK)
├── eventId → events (FK)
└── Unique constraint on (eventId, volunteerId)
```

## Key Principles

### 1. Search First, Create If Not Found

**Always** search for existing volunteer by email before creating a new record.

```typescript
import { findOrCreateVolunteer } from '@/src/lib/volunteerHelpers'

// ✅ CORRECT: Search first
const volunteer = await findOrCreateVolunteer({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  congregation: 'Springfield'
})

// ❌ WRONG: Direct create (will fail if email exists)
const volunteer = await prisma.volunteers.create({
  data: { ... }
})
```

### 2. Link Volunteers to Events

After finding/creating a volunteer, link them to the event via `event_volunteers`:

```typescript
import { linkVolunteerToEvent } from '@/src/lib/volunteerHelpers'

// Link volunteer to event
await linkVolunteerToEvent(volunteer.id, eventId)
```

### 3. Event-Scoped Queries

**Always** filter volunteers by event to prevent data leaking:

```typescript
import { getVolunteersForEvent } from '@/src/lib/volunteerHelpers'

// ✅ CORRECT: Event-scoped query
const volunteers = await getVolunteersForEvent(eventId)

// ❌ WRONG: Global query (shows all volunteers)
const volunteers = await prisma.volunteers.findMany()
```

## Helper Functions

### `findOrCreateVolunteer(params)`

Searches for existing volunteer by email. If found, returns existing record. If not found, creates new record.

**Parameters:**
- `firstName: string`
- `lastName: string`
- `email: string` (unique identifier)
- `congregation: string`
- `phone?: string`
- `formsOfService?: string[]`
- `userId?: string` (optional link to system user)

**Returns:** Volunteer record

### `linkVolunteerToEvent(volunteerId, eventId)`

Links volunteer to event via `event_volunteers` junction table. If already linked, returns existing record.

**Parameters:**
- `volunteerId: string`
- `eventId: string`

**Returns:** event_volunteers record

### `getVolunteersForEvent(eventId)`

Gets all volunteers for a specific event (event-scoped query).

**Parameters:**
- `eventId: string`

**Returns:** Array of volunteer records

## Migration from Old Pattern

### Before (Event-Isolated - Creates Duplicates)

```typescript
// ❌ OLD: Creates new volunteer every time
const volunteer = await prisma.volunteers.create({
  data: {
    id: randomUUID(),
    firstName,
    lastName,
    email,
    congregation,
    updatedAt: new Date()
  }
})
```

### After (Global Registry - Prevents Duplicates)

```typescript
// ✅ NEW: Search first, create if not found
const volunteer = await findOrCreateVolunteer({
  firstName,
  lastName,
  email,
  congregation
})

// Link to event
await linkVolunteerToEvent(volunteer.id, eventId)
```

## Data Isolation

Event isolation is achieved through **query filters**, not duplicate data:

### Volunteer Portal

```typescript
// Volunteer logs in - session stores selectedEventId
const session = await getSession()
const eventId = session.selectedEventId

// All queries scoped to this event
const assignments = await prisma.position_assignments.findMany({
  where: {
    volunteerId: session.user.id,
    position: {
      eventId: eventId  // Event scope
    }
  }
})
```

### Admin UI

```typescript
// Overseer manages event - only sees volunteers for their event
const volunteers = await getVolunteersForEvent(eventId)
```

## Benefits

✅ **No duplicates** - One person = one volunteer record  
✅ **Consistent login** - One PIN per person  
✅ **Better UX** - Volunteers don't re-enter info for each event  
✅ **Volunteer history** - Track engagement across events  
✅ **Data integrity** - Email updates propagate everywhere  
✅ **Industry standard** - Same pattern as Eventbrite, SignUpGenius, VolunteerLocal

## Unique Constraints

- `volunteers.email` - Prevents duplicate volunteer records
- `volunteers.userId` - One volunteer per system user
- `event_volunteers(eventId, volunteerId)` - One link per volunteer per event

## Common Pitfalls

### ❌ Creating Volunteers Without Searching

```typescript
// DON'T DO THIS
const volunteer = await prisma.volunteers.create({ ... })
```

**Error:** Will fail with unique constraint violation if email exists.

**Fix:** Use `findOrCreateVolunteer()` helper.

### ❌ Querying All Volunteers (Not Event-Scoped)

```typescript
// DON'T DO THIS
const volunteers = await prisma.volunteers.findMany()
```

**Problem:** Returns volunteers from ALL events, leaking data.

**Fix:** Use `getVolunteersForEvent(eventId)` helper.

### ❌ Forgetting to Link to Event

```typescript
// DON'T DO THIS
const volunteer = await findOrCreateVolunteer({ ... })
// Missing: linkVolunteerToEvent(volunteer.id, eventId)
```

**Problem:** Volunteer exists but isn't associated with the event.

**Fix:** Always call `linkVolunteerToEvent()` after finding/creating volunteer.

## See Also

- [DECISIONS.md](../DECISIONS.md) - D-TS-021
- [volunteerHelpers.ts](../src/lib/volunteerHelpers.ts) - Helper functions
- [merge-duplicate-volunteers.ts](../scripts/merge-duplicate-volunteers.ts) - Cleanup script
