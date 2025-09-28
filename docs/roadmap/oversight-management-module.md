---
description: Oversight Management Module Specification for JW Attendant Scheduler
priority: high
status: planned
module: oversight-management
---

# Oversight Management Module

## Overview
Dedicated module for managing oversight relationships between Overseers, Overseer Assistants, Keymen, and the attendants they supervise. This module handles the assignment, tracking, and reporting of oversight responsibilities within events.

## Why a Separate Module?

### **Justification for Independence:**
1. **Complex Relationships**: Oversight involves many-to-many relationships that are more complex than simple attendant properties
2. **Event-Specific Logic**: Oversight assignments may vary by event type, location, or organizational needs
3. **Specialized Workflows**: Oversight management has unique processes (assignment, delegation, reporting) distinct from attendant CRUD
4. **Scalability**: As oversight rules become more complex, a dedicated module can evolve independently
5. **Clear Separation of Concerns**: Attendant module focuses on individual data, Oversight module focuses on relationships

### **Integration Points:**
- **Attendant Module**: Provides oversight role identification (`servingAs` field)
- **Event Module**: Provides context for event-specific oversight assignments
- **Position Assignment**: Consumes oversight data to enforce assignment restrictions

---

## Module Architecture

### **Core Entities**

#### **OversightAssignment**
```typescript
interface OversightAssignment {
  id: string;
  eventId?: string;                    // null = global assignment
  overseerAttendantId: string;         // Overseer/Assistant/Keyman
  supervisedAttendantId: string;       // Attendant being overseen
  assignmentType: 'DIRECT' | 'DELEGATED' | 'TEMPORARY';
  startDate: Date;
  endDate?: Date;                      // null = ongoing
  notes?: string;
  assignedBy: string;                  // User who created assignment
  createdAt: Date;
  updatedAt: Date;
}
```

#### **OversightTeam**
```typescript
interface OversightTeam {
  id: string;
  eventId: string;
  name: string;                        // "Security Team A", "Parking Oversight"
  leadOverseerAttendantId: string;     // Primary overseer
  assistantOverseerIds: string[];      // Supporting overseers/assistants
  keymanIds: string[];                 // Keymen assigned to team
  supervisedAttendantIds: string[];    // All attendants under this team
  responsibilities: string[];          // ["Parking", "Security", "Stage"]
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Module Features

### **1. Oversight Assignment Management**
- **Individual Assignments**: Assign specific attendants to overseers
- **Bulk Assignment**: Assign multiple attendants to oversight teams
- **Event-Specific vs Global**: Support both event-specific and organization-wide oversight
- **Delegation Chain**: Track who delegates oversight to whom
- **Assignment History**: Full audit trail of oversight changes

### **2. Oversight Team Management**
- **Team Creation**: Form oversight teams with leads, assistants, and keymen
- **Responsibility Areas**: Define what each team oversees (departments, areas, functions)
- **Team Hierarchies**: Support nested oversight structures
- **Load Balancing**: Distribute oversight responsibilities evenly

### **3. Oversight Dashboard**
- **Oversight Overview**: Visual representation of all oversight relationships
- **Team Performance**: Metrics on oversight effectiveness
- **Coverage Gaps**: Identify attendants without proper oversight
- **Workload Distribution**: Ensure balanced oversight assignments

### **4. Integration Features**
- **Position Assignment Blocking**: Prevent oversight roles from position assignments
- **Attendant Filtering**: Filter attendants by oversight status
- **Event Planning**: Integrate oversight planning into event workflows
- **Reporting**: Generate oversight reports for organizational compliance

---

## Database Schema

### **Tables**

#### **oversight_assignments**
```sql
CREATE TABLE oversight_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,  -- nullable for global
  overseer_attendant_id UUID NOT NULL REFERENCES attendants(id) ON DELETE CASCADE,
  supervised_attendant_id UUID NOT NULL REFERENCES attendants(id) ON DELETE CASCADE,
  assignment_type VARCHAR(20) NOT NULL CHECK (assignment_type IN ('DIRECT', 'DELEGATED', 'TEMPORARY')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  assigned_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT no_self_oversight CHECK (overseer_attendant_id != supervised_attendant_id),
  UNIQUE(event_id, overseer_attendant_id, supervised_attendant_id, start_date)
);
```

#### **oversight_teams**
```sql
CREATE TABLE oversight_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  lead_overseer_attendant_id UUID NOT NULL REFERENCES attendants(id) ON DELETE CASCADE,
  assistant_overseer_ids JSONB DEFAULT '[]',
  keyman_ids JSONB DEFAULT '[]',
  supervised_attendant_ids JSONB DEFAULT '[]',
  responsibilities JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(event_id, name)
);
```

#### **Indexes for Performance**
```sql
CREATE INDEX idx_oversight_assignments_overseer ON oversight_assignments(overseer_attendant_id);
CREATE INDEX idx_oversight_assignments_supervised ON oversight_assignments(supervised_attendant_id);
CREATE INDEX idx_oversight_assignments_event ON oversight_assignments(event_id);
CREATE INDEX idx_oversight_teams_event ON oversight_teams(event_id);
CREATE INDEX idx_oversight_teams_lead ON oversight_teams(lead_overseer_attendant_id);
```

---

## API Endpoints

### **Oversight Assignments**
```typescript
// Get oversight assignments
GET /api/oversight/assignments?eventId={id}&overseerIds={ids}&supervisedIds={ids}

// Create oversight assignment
POST /api/oversight/assignments
{
  eventId?: string,
  overseerAttendantId: string,
  supervisedAttendantIds: string[],
  assignmentType: 'DIRECT' | 'DELEGATED' | 'TEMPORARY',
  startDate: string,
  endDate?: string,
  notes?: string
}

// Update oversight assignment
PUT /api/oversight/assignments/{id}

// Delete oversight assignment
DELETE /api/oversight/assignments/{id}
```

### **Oversight Teams**
```typescript
// Get oversight teams for event
GET /api/oversight/teams?eventId={id}

// Create oversight team
POST /api/oversight/teams
{
  eventId: string,
  name: string,
  leadOverseerAttendantId: string,
  assistantOverseerIds: string[],
  keymanIds: string[],
  responsibilities: string[]
}

// Update team assignments
PUT /api/oversight/teams/{id}/assignments
{
  supervisedAttendantIds: string[]
}
```

---

## User Interface

### **Navigation Structure**
```
Events → [Event] → Oversight Management
├── Oversight Assignments
│   ├── Individual Assignments
│   ├── Bulk Assignment Tool
│   └── Assignment History
├── Oversight Teams
│   ├── Team Management
│   ├── Team Assignments
│   └── Team Performance
└── Oversight Dashboard
    ├── Coverage Overview
    ├── Workload Distribution
    └── Reports
```

### **Key UI Components**
1. **Assignment Matrix**: Visual grid showing overseer-attendant relationships
2. **Team Builder**: Drag-and-drop interface for building oversight teams
3. **Coverage Map**: Visual representation of oversight coverage gaps
4. **Workload Balancer**: Tool to redistribute oversight responsibilities

---

## Integration with Existing Modules

### **Attendant Module Integration**
```typescript
// Add computed field to attendant responses
interface AttendantWithOversight extends Attendant {
  oversightInfo: {
    isOversightRole: boolean;
    canBeAssignedToPositions: boolean;
    currentOverseers: string[];        // Who oversees this attendant
    currentlyOversees: string[];       // Who this attendant oversees
    oversightTeams: string[];          // Teams this attendant belongs to
  };
}
```

### **Position Assignment Integration**
```typescript
// Position assignment validation
const canAssignToPosition = (attendantId: string, positionId: string) => {
  const attendant = await getAttendant(attendantId);
  const hasOversightRole = attendant.servingAs.some(role => 
    ['Overseer', 'Overseer Assistant', 'Keyman'].includes(role)
  );
  
  if (hasOversightRole) {
    throw new Error('Attendants with oversight roles cannot be assigned to positions');
  }
  
  return true;
};
```

---

## Implementation Timeline

### **Phase 1: Foundation (3-4 weeks)**
- Database schema creation
- Basic CRUD API endpoints
- Core oversight assignment functionality

### **Phase 2: Team Management (2-3 weeks)**
- Oversight team creation and management
- Team assignment workflows
- Integration with attendant module

### **Phase 3: Advanced Features (3-4 weeks)**
- Oversight dashboard and reporting
- Bulk assignment tools
- Performance analytics

### **Phase 4: UI/UX Polish (2-3 weeks)**
- Advanced UI components
- Mobile optimization
- User experience refinements

---

## Success Metrics

- **Assignment Coverage**: 100% of attendants have appropriate oversight
- **Workload Balance**: No overseer manages more than 15 attendants
- **Assignment Accuracy**: 99%+ accuracy in oversight relationships
- **User Adoption**: 90%+ of events use oversight management features
- **Time Savings**: 60% reduction in manual oversight coordination

---

*This specification provides the foundation for a comprehensive oversight management system that integrates seamlessly with existing attendant and event management workflows.*
