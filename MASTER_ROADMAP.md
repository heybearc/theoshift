# JW Attendant Scheduler - Master Development Roadmap

## Event-Centric Architecture Overview

**Core Philosophy**: All functionality revolves around Events. Admin/Staff login → Event selection/creation → Event-specific management dashboard.

## Development Phases

### 🔴 Phase 1: Event Foundation (Weeks 1-3)
**Priority**: Critical - Must be completed first

#### 1.1 Event-Centric Navigation
- **SDD Spec**: `docs/sdd/event-navigation.md`
- **Branch**: `feature/event-centric-navigation`
- **Description**: Landing page for event selection/creation, event dashboard as primary workspace
- **Dependencies**: None
- **Deliverables**:
  - Event selection landing page
  - Event dashboard interface
  - Event creation/editing forms
  - Session-based event context

#### 1.2 Advanced User Management System
- **SDD Spec**: `docs/sdd/user-management.md`
- **Branch**: `feature/user-management-system`
- **Description**: Complete user role system with invitations and attendant linking
- **Dependencies**: Event-Centric Navigation
- **Deliverables**:
  - User roles: Admin, Overseer, Assistant Overseer, Keyman, Attendant
  - Secure token-based invitation system
  - User-attendant profile linking
  - Permission-based access control
  - User management: edit, delete, toggle active/deactivated per event
  - Attendant dashboard with assignment info, oversight contact, count times

#### 1.3 Position Management System
- **SDD Spec**: `docs/sdd/position-management.md`
- **Branch**: `feature/position-management`
- **Description**: Unlimited numbered positions with time-based shifts
- **Dependencies**: User Management System
- **Deliverables**:
  - EventPosition model (unlimited numbered positions)
  - PositionShift model (time-based assignments)
  - Position templates for reuse
  - Bulk position operations
  - Admin/overseer position editing per event

### 🟡 Phase 2: Core Operations (Weeks 4-7)

#### 2.1 Count Times System
- **SDD Spec**: `docs/sdd/count-times.md`
- **Branch**: `feature/count-times-system`
- **Description**: Event counting with attendant dashboard integration
- **Dependencies**: Position Management, User Management
- **Deliverables**:
  - CountSession model for event count times
  - PositionCount for individual counts
  - Live count entry in attendant dashboard
  - Count analytics and reporting

#### 2.2 Auto-Assignment Engine
- **SDD Spec**: `docs/sdd/auto-assignment.md`
- **Branch**: `feature/auto-assignment-engine`
- **Description**: Intelligent attendant assignment with conflict detection
- **Dependencies**: Position Management, User Management
- **Deliverables**:
  - Priority-based assignment algorithm
  - Conflict detection and prevention
  - Equal assignment count balancing
  - Rotation-based assignment options
  - Time-based balancing methods

#### 2.3 Oversight Management
- **SDD Spec**: `docs/sdd/oversight-management.md`
- **Branch**: `feature/oversight-management`
- **Description**: Hierarchical oversight structure
- **Dependencies**: User Management, Position Management
- **Deliverables**:
  - Department organization system
  - Station ranges for oversight
  - Overseer assignments to departments/ranges
  - Multi-level hierarchical tracking

#### 2.4 Email Communication System
- **SDD Spec**: `docs/sdd/email-system.md`
- **Branch**: `feature/email-system`
- **Description**: Gmail App Password integration with templates
- **Dependencies**: User Management
- **Deliverables**:
  - Gmail App Password configuration
  - Email templates: invitations, notifications, reminders
  - Admin configuration panel
  - Bulk and individual email sending

### 🟢 Phase 3: Supporting Features (Weeks 8-10)

#### 3.1 Lanyard Management
- **SDD Spec**: `docs/sdd/lanyard-management.md`
- **Branch**: `feature/lanyard-management`
- **Description**: Badge tracking within events
- **Dependencies**: User Management, Position Management
- **Deliverables**:
  - Badge number tracking system
  - Check-out/return functionality
  - Attendant-lanyard linking
  - Lanyard status reporting

#### 3.2 Import/Export System
- **SDD Spec**: `docs/sdd/import-export.md`
- **Branch**: `feature/import-export`
- **Description**: CSV handling and bulk operations
- **Dependencies**: All core systems
- **Deliverables**:
  - CSV import for attendants and bulk data
  - Export: attendants, events, assignments, lanyard tracking
  - Sample CSV templates
  - Data validation and error handling

#### 3.3 Advanced Event Features
- **SDD Spec**: `docs/sdd/advanced-events.md`
- **Branch**: `feature/advanced-events`
- **Description**: Event lifecycle and copying functionality
- **Dependencies**: All core systems
- **Deliverables**:
  - Event status management: Upcoming, Current, Completed, Cancelled, Archived
  - Selective event copying with configurable options
  - Multi-event attendant associations
  - Event archival and cleanup

### 🔧 Phase 4: Architecture & Polish (Weeks 11-12)

#### 4.1 SDD Library Architecture
- **SDD Spec**: `docs/sdd/library-architecture.md`
- **Branch**: `feature/sdd-architecture`
- **Description**: Modular service extraction
- **Dependencies**: All features implemented
- **Deliverables**:
  - Modular service libraries
  - CLI interfaces per module
  - Decoupled business logic
  - Service documentation

## Development Standards

### Branch Naming Convention
- `feature/[feature-name]` - New features
- `bugfix/[issue-description]` - Bug fixes
- `hotfix/[critical-issue]` - Production hotfixes

### Development Workflow
1. **Staging-First Development**: All development happens in staging environment
2. **SSH Shortcuts**: Use configured SSH shortcuts for server access
3. **CI/CD Pipeline**: Automated deployment from staging to production
4. **SDD Compliance**: All features follow SDD architecture principles

### SSH Configuration
- Staging Server: Use `/ssh-jw-attendant` shortcut
- Production Server: Automated deployment only
- Development: Local with staging database connection

## Workload Balancing Methods

### 1. Equal Assignment Count
- **Description**: Distribute assignments evenly by count per attendant
- **Exception**: All-day positions excluded from count balancing
- **Implementation**: Algorithm tracks assignment count per attendant

### 2. Rotation-Based Assignments
- **Description**: Rotate attendants through different position types
- **Benefits**: Prevents assignment monotony, builds experience
- **Implementation**: Track position history per attendant

### 3. Time-Based Balancing
- **Description**: Balance total hours assigned per attendant
- **Calculation**: Sum of shift durations per attendant
- **Implementation**: Consider shift length in assignment algorithm

## Document Management System

### Supported File Types
- **PDFs**: Evacuation plans, emergency procedures, detailed instructions
- **Images**: Maps, diagrams, position layouts, emergency contact sheets
- **Text Documents**: Quick instructions, contact lists, notes

### Document Categories
- **Emergency Information**: Evacuation plans, emergency contacts
- **Position Instructions**: Specific duties, procedures per position
- **Event Documentation**: Schedules, contact lists, general information
- **Training Materials**: Guidelines, best practices, reference materials

## Position System Design

### Position Numbering
- **Sequential**: 1, 2, 3, 4... (default)
- **Custom Names**: Optional names for positions (e.g., "Main Gate", "Parking Lot A")
- **Editable**: Admin/Overseer can modify per event
- **Unlimited**: No restriction on position count

### Position Configuration
- **Position Number**: Required, sequential
- **Position Name**: Optional, descriptive
- **Shift Times**: Multiple shifts per position
- **Department**: Oversight assignment
- **Special Requirements**: All-day, leadership, etc.

## Event Copying Options

### Selective Copying Interface
- **Positions and Shifts**: ✓ Copy position structure and time slots
- **Attendant Associations**: ✓ Copy attendant-event relationships
- **Oversight Assignments**: ✓ Copy department and overseer assignments
- **Settings Only**: ✓ Copy configuration without people
- **Custom Selection**: ✓ Choose specific elements to copy

### Copy Scenarios
1. **Full Event Copy**: Everything including people and assignments
2. **Template Copy**: Structure only (positions, shifts, departments)
3. **Partial Copy**: User-selected elements
4. **Settings Copy**: Configuration and templates only

## Django Cleanup Strategy

### Recommendation: Keep Django Until Feature Parity
- **Rationale**: Django serves as reference implementation and fallback
- **Timeline**: Remove after Phase 3 completion (Week 10)
- **Process**: 
  1. Document all Django features not yet migrated
  2. Create migration checklist
  3. Parallel testing during development
  4. Archive Django code after successful Next.js deployment

### Cleanup Steps (Week 10+)
1. **Archive Django Code**: Move to `archive/django-implementation/`
2. **Update Documentation**: Remove Django references
3. **Clean Dependencies**: Remove Django-specific configurations
4. **Update CI/CD**: Remove Django deployment pipelines

## Success Metrics

### Phase 1 Success Criteria
- [ ] Event-centric navigation functional
- [ ] All user roles implemented and tested
- [ ] Position management system operational
- [ ] Attendant dashboard displaying relevant information

### Phase 2 Success Criteria
- [ ] Count times system integrated with attendant dashboard
- [ ] Auto-assignment engine preventing conflicts
- [ ] Oversight management hierarchy functional
- [ ] Email system sending notifications

### Phase 3 Success Criteria
- [ ] Lanyard management tracking badges
- [ ] Import/export handling CSV operations
- [ ] Event copying with selective options
- [ ] All features integrated and tested

### Phase 4 Success Criteria
- [ ] SDD architecture fully implemented
- [ ] All services modular and documented
- [ ] Performance benchmarks met
- [ ] Production deployment successful

## Next Steps

1. **Create SDD Specifications**: Generate detailed specs for each feature
2. **Update Development Environment**: Configure staging-first workflow
3. **Create Feature Branches**: Set up branch structure for development
4. **Begin Phase 1**: Start with event-centric navigation implementation

---

*This roadmap serves as the master plan for transforming the Next.js SDD foundation into a complete JW Attendant Scheduler system with full Django feature parity.*
