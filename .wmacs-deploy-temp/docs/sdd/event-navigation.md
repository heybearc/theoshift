---
description: Event-Centric Navigation System - Landing page and event selection workflow
---

# Event-Centric Navigation System

## Overview
The Event-Centric Navigation system serves as the foundation for all JW Attendant Scheduler functionality. Upon login, admin/staff users are directed to an event selection interface where they choose or create an event to manage.

## Architecture Requirements

### Core Philosophy
**Admin/Staff Login → Event Selection/Creation → Event-Specific Management Dashboard**

All subsequent functionality is scoped within the selected event context.

### SSH Access
Use configured shortcuts for development and deployment:
```bash
/ssh-jw-attendant  # Staging server access
```

## User Flow

### 1. Authentication & Landing
```
User Login → Role Verification → Event Selection Landing Page
```

### 2. Event Selection Options
- **Current Events**: Events marked as "Current" status
- **Upcoming Events**: Future events available for management
- **Past Events**: Completed events (limited access)
- **Create New Event**: Admin/Overseer privilege required

### 3. Event Context Establishment
```
Event Selection → Session Storage → Event Dashboard → Feature Access
```

## Technical Implementation

### Database Schema

#### Event Model Enhancement
```typescript
interface Event {
  id: string
  name: string
  eventType: 'circuit_assembly' | 'regional_convention' | 'special_assembly_day' | 'meeting'
  startDate: Date
  endDate: Date
  location: string
  description?: string
  status: 'upcoming' | 'current' | 'completed' | 'cancelled' | 'archived'
  totalStations: number
  expectedAttendants: number
  createdAt: Date
  updatedAt: Date
  
  // Metadata
  archivedAt?: Date
  cancelledAt?: Date
  completedAt?: Date
}
```

#### Session Management
```typescript
interface EventSession {
  userId: string
  selectedEventId: string
  eventRole: UserRole
  sessionStart: Date
  lastActivity: Date
}
```

### API Endpoints

#### Event Selection
```typescript
// GET /api/events/selection
// Returns events available to current user based on role
interface EventSelectionResponse {
  currentEvents: Event[]
  upcomingEvents: Event[]
  pastEvents: Event[]
  canCreateEvents: boolean
  userRole: UserRole
}
```

#### Event Context
```typescript
// POST /api/events/{eventId}/select
// Establishes event context in session
interface EventContextRequest {
  eventId: string
}

interface EventContextResponse {
  event: Event
  userPermissions: Permission[]
  dashboardUrl: string
}
```

### Frontend Components

#### EventSelectionPage
```typescript
interface EventSelectionPageProps {
  currentEvents: Event[]
  upcomingEvents: Event[]
  pastEvents: Event[]
  canCreateEvents: boolean
  userRole: UserRole
}
```

#### EventDashboard
```typescript
interface EventDashboardProps {
  event: Event
  userRole: UserRole
  permissions: Permission[]
  quickStats: EventStats
}

interface EventStats {
  totalAttendants: number
  assignedPositions: number
  unassignedPositions: number
  upcomingCountTimes: number
  activeOverseers: number
}
```

## Permission System

### Role-Based Access
```typescript
enum UserRole {
  ADMIN = 'admin',
  OVERSEER = 'overseer', 
  ASSISTANT_OVERSEER = 'assistant_overseer',
  KEYMAN = 'keyman',
  ATTENDANT = 'attendant'
}

interface Permission {
  action: string
  resource: string
  conditions?: Record<string, any>
}
```

### Event-Specific Permissions
- **Admin**: Full access to all events and creation
- **Overseer**: Full access to assigned events, can create events
- **Assistant Overseer**: Management access to assigned events
- **Keyman**: Limited management access to assigned areas
- **Attendant**: Read-only access to personal assignments

## Navigation Structure

### Primary Navigation (Post Event Selection)
```
Event Dashboard
├── Attendants Management
├── Position Management  
├── Assignment Management
├── Count Times
├── Oversight Management
├── Lanyard Tracking
├── Reports & Analytics
└── Event Settings
```

### Breadcrumb Navigation
```
Home > Events > [Event Name] > [Current Section]
```

## Event Dashboard Features

### Quick Actions Panel
- Create New Assignment
- Add Attendant to Event
- Start Count Session
- Send Notifications
- Generate Reports

### Status Overview Cards
- **Attendants**: Total registered, active, inactive
- **Positions**: Total positions, assigned, unassigned
- **Count Times**: Scheduled, completed, pending
- **Assignments**: Total assignments, conflicts, gaps

### Recent Activity Feed
- Recent assignments created/modified
- New attendants added
- Count sessions completed
- System notifications

## Event Creation Workflow

### Event Creation Form
```typescript
interface EventCreationForm {
  name: string
  eventType: EventType
  startDate: Date
  endDate: Date
  location: string
  description?: string
  expectedAttendants: number
  copyFromEvent?: string // Optional event to copy settings from
}
```

### Event Templates
- Circuit Assembly Template
- Regional Convention Template  
- Special Assembly Day Template
- Custom Event Template

## Session Management

### Event Context Storage
```typescript
// Session storage for event context
interface EventContext {
  eventId: string
  eventName: string
  userRole: UserRole
  permissions: Permission[]
  lastAccessed: Date
}
```

### Context Switching
- Users can switch between events they have access to
- Context preserved across browser sessions
- Automatic context validation on page load

## Error Handling

### Event Access Errors
- **No Events Available**: Guide user to request access
- **Event Not Found**: Redirect to event selection
- **Permission Denied**: Show appropriate error message
- **Session Expired**: Re-authenticate and restore context

### Fallback Behaviors
- Default to most recent event if session lost
- Graceful degradation for limited permissions
- Clear error messages with next steps

## Performance Considerations

### Caching Strategy
- Cache event list for 5 minutes
- Cache user permissions for session duration
- Lazy load event details on selection

### Optimization
- Paginate past events list
- Preload dashboard data on event selection
- Minimize database queries with joins

## Testing Requirements

### Unit Tests
- Event selection logic
- Permission validation
- Session management
- Error handling

### Integration Tests
- Complete user flow from login to dashboard
- Role-based access control
- Event context switching
- API endpoint functionality

### User Acceptance Tests
- Admin can create and access all events
- Overseer can access assigned events
- Attendant sees only relevant information
- Navigation is intuitive and responsive

## Security Considerations

### Access Control
- Validate user permissions on every request
- Encrypt session data
- Implement CSRF protection
- Rate limit event creation

### Data Protection
- Sanitize all user inputs
- Validate event data integrity
- Audit log for event access
- Secure event context storage

## Deployment Notes

### Database Migrations
```sql
-- Add event status and metadata columns
ALTER TABLE events ADD COLUMN status VARCHAR(20) DEFAULT 'upcoming';
ALTER TABLE events ADD COLUMN archived_at TIMESTAMP NULL;
ALTER TABLE events ADD COLUMN cancelled_at TIMESTAMP NULL;
ALTER TABLE events ADD COLUMN completed_at TIMESTAMP NULL;

-- Create event sessions table
CREATE TABLE event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  session_start TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW()
);
```

### Environment Configuration
```bash
# Staging
EVENT_SESSION_TIMEOUT=3600  # 1 hour
MAX_EVENTS_PER_USER=10
ENABLE_EVENT_CREATION=true

# Production  
EVENT_SESSION_TIMEOUT=7200  # 2 hours
MAX_EVENTS_PER_USER=25
ENABLE_EVENT_CREATION=true
```

## Success Criteria

### Functional Requirements
- [ ] Users can select from available events
- [ ] Event context is maintained across sessions
- [ ] Role-based access control works correctly
- [ ] Event dashboard displays relevant information
- [ ] Navigation is intuitive and responsive

### Performance Requirements
- [ ] Event selection page loads in < 1 second
- [ ] Event dashboard loads in < 2 seconds
- [ ] Context switching takes < 500ms
- [ ] No memory leaks in session management

### Security Requirements
- [ ] All event access is properly authorized
- [ ] Session data is encrypted and secure
- [ ] Audit logging captures event access
- [ ] CSRF protection is implemented

---

*This specification provides the foundation for event-centric navigation, enabling all subsequent features to operate within proper event context.*
