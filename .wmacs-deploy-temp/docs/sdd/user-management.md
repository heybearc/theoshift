---
description: Advanced User Management System with roles, invitations, and attendant linking
---

# Advanced User Management System

## Overview
Comprehensive user management system supporting hierarchical roles, secure invitations, and attendant profile linking for JW Attendant Scheduler.

## SSH Access
```bash
/ssh-jw-attendant  # Staging server access
```

## User Role Hierarchy

### Role Definitions
```typescript
enum UserRole {
  ADMIN = 'admin',           // Full system access
  OVERSEER = 'overseer',     // Event management, user creation
  ASSISTANT_OVERSEER = 'assistant_overseer',  // Limited management
  KEYMAN = 'keyman',         // Department oversight
  ATTENDANT = 'attendant'    // Basic assignment access
}
```

### Permission Matrix
| Feature | Admin | Overseer | Asst. Overseer | Keyman | Attendant |
|---------|-------|----------|----------------|--------|-----------|
| Create Events | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage All Attendants | ✓ | ✓ | Assigned Only | Assigned Only | ✗ |
| Create Assignments | ✓ | ✓ | ✓ | Department Only | ✗ |
| View All Assignments | ✓ | ✓ | ✓ | Department Only | Own Only |
| Manage Count Times | ✓ | ✓ | ✓ | ✓ | Enter Only |
| Send Emails | ✓ | ✓ | ✓ | Department Only | ✗ |
| System Settings | ✓ | ✗ | ✗ | ✗ | ✗ |

## Database Schema

### Enhanced User Model
```typescript
interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  isAdmin: boolean
  
  // Invitation system
  invitationToken?: string
  invitationSentAt?: Date
  invitationAcceptedAt?: Date
  invitedBy?: string // User ID
  
  // Profile linking
  attendantProfileId?: string
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
}
```

### Attendant Profile Model
```typescript
interface AttendantProfile {
  id: string
  userId?: string // Linked user account
  
  // Personal Information
  firstName: string
  lastName: string
  email?: string
  phone: string
  congregation: string
  address?: string
  
  // JW Organizational Status
  servingAs: string[] // ['elder', 'ministerial_servant', 'regular_pioneer', etc.]
  experienceLevel: 'beginner' | 'intermediate' | 'experienced' | 'expert'
  availabilityNotes?: string
  
  // Event Associations
  eventIds: string[] // Events this attendant is associated with
  
  // Status
  isActive: boolean
  oversightId?: string // Assigned oversight
  
  createdAt: Date
  updatedAt: Date
}
```

### Event User Association
```typescript
interface EventUserAssociation {
  id: string
  eventId: string
  userId: string
  role: UserRole // Role specific to this event
  isActive: boolean
  assignedDepartments?: string[]
  assignedStationRanges?: string[]
  createdAt: Date
}
```

## Invitation System

### Invitation Workflow
```
Admin/Overseer → Create Invitation → Send Email → User Accepts → Account Created → Profile Linked
```

### Invitation Creation
```typescript
interface InvitationRequest {
  email: string
  role: UserRole
  eventId: string
  firstName?: string
  lastName?: string
  linkToAttendant?: string // Existing attendant profile ID
  customMessage?: string
}

interface InvitationResponse {
  invitationId: string
  invitationUrl: string
  expiresAt: Date
}
```

### Secure Token Generation
```typescript
// Generate cryptographically secure invitation token
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Token validation
function validateInvitationToken(token: string): {
  valid: boolean
  invitation?: Invitation
  expired?: boolean
} 
```

## User-Attendant Linking

### Linking Strategies

#### 1. During Invitation
```typescript
// Link existing attendant profile during invitation
const invitation = await createInvitation({
  email: 'john.doe@example.com',
  role: UserRole.ATTENDANT,
  eventId: 'event-123',
  linkToAttendant: 'attendant-456'
})
```

#### 2. Post-Registration Linking
```typescript
// Link after user account creation
const linkResult = await linkUserToAttendant({
  userId: 'user-123',
  attendantId: 'attendant-456',
  eventId: 'event-123'
})
```

#### 3. Automatic Matching
```typescript
// Auto-match based on email/name
const matches = await findPotentialAttendantMatches({
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe'
})
```

## User Management Interface

### User List View
```typescript
interface UserListProps {
  users: User[]
  currentEvent: Event
  userRole: UserRole
  canInviteUsers: boolean
  canEditUsers: boolean
}

interface UserListFilters {
  role?: UserRole
  isActive?: boolean
  hasAttendantProfile?: boolean
  eventAssociation?: string
}
```

### User Detail/Edit Form
```typescript
interface UserFormData {
  firstName: string
  lastName: string
  email: string
  role: UserRole
  isActive: boolean
  
  // Event-specific settings
  eventAssociations: EventUserAssociation[]
  assignedDepartments: string[]
  assignedStationRanges: string[]
  
  // Attendant linking
  attendantProfileId?: string
  createAttendantProfile?: boolean
}
```

## Attendant Dashboard

### Dashboard Components
```typescript
interface AttendantDashboardProps {
  user: User
  attendantProfile: AttendantProfile
  currentEvent: Event
  assignments: Assignment[]
  oversight: OversightInfo
  countTimes: CountSession[]
  documents: Document[]
}

interface OversightInfo {
  overseer: User
  assistantOverseer?: User
  keyman?: User
  department: string
  stationRange: string
  contactInfo: ContactInfo
}
```

### Dashboard Sections

#### 1. Personal Assignment Info
- Current assignments with times and positions
- Upcoming assignments and schedule
- Assignment history for current event

#### 2. Oversight Contact Information
- Assigned overseer details and contact
- Department and station range information
- Emergency contact procedures

#### 3. Count Times Interface
- Scheduled count sessions
- Live count entry form
- Count history and statistics

#### 4. Document Access
- Event-specific documents (PDFs, images, text)
- Emergency procedures and evacuation plans
- Position-specific instructions

## API Endpoints

### User Management
```typescript
// GET /api/users - List users with filtering
// POST /api/users - Create new user (admin only)
// GET /api/users/{id} - Get user details
// PUT /api/users/{id} - Update user
// DELETE /api/users/{id} - Deactivate user
// POST /api/users/{id}/toggle-status - Toggle active/inactive
```

### Invitation System
```typescript
// POST /api/invitations - Create invitation
// GET /api/invitations/{token} - Validate invitation token
// POST /api/invitations/{token}/accept - Accept invitation
// DELETE /api/invitations/{id} - Cancel invitation
```

### User-Attendant Linking
```typescript
// POST /api/users/{id}/link-attendant - Link to attendant profile
// DELETE /api/users/{id}/unlink-attendant - Remove attendant link
// GET /api/users/{id}/potential-matches - Find matching attendants
```

### Attendant Dashboard
```typescript
// GET /api/attendant-dashboard - Get dashboard data for current user
// GET /api/attendant-dashboard/assignments - Get current assignments
// GET /api/attendant-dashboard/documents - Get accessible documents
```

## Permission System Implementation

### Permission Checking
```typescript
interface Permission {
  action: string
  resource: string
  conditions?: Record<string, any>
}

class PermissionService {
  async checkPermission(
    user: User, 
    permission: Permission, 
    context?: Record<string, any>
  ): Promise<boolean> {
    // Role-based permission checking logic
  }
  
  async getUserPermissions(
    user: User, 
    eventId: string
  ): Promise<Permission[]> {
    // Get all permissions for user in event context
  }
}
```

### Middleware Integration
```typescript
// API route protection
export function requirePermission(permission: Permission) {
  return async (req: NextRequest, context: any) => {
    const user = await getCurrentUser(req)
    const hasPermission = await checkPermission(user, permission, context)
    
    if (!hasPermission) {
      return new Response('Forbidden', { status: 403 })
    }
    
    return NextResponse.next()
  }
}
```

## Email Integration

### Invitation Email Template
```typescript
interface InvitationEmailData {
  invitedBy: User
  invitationUrl: string
  eventName: string
  role: UserRole
  customMessage?: string
  expiresAt: Date
}
```

### Notification System
```typescript
interface NotificationService {
  sendInvitationEmail(invitation: Invitation): Promise<boolean>
  sendWelcomeEmail(user: User): Promise<boolean>
  sendAssignmentNotification(assignment: Assignment): Promise<boolean>
  sendBulkNotification(users: User[], message: string): Promise<boolean>
}
```

## Security Implementation

### Password Requirements
- Minimum 8 characters
- Must include uppercase, lowercase, number
- Optional special character requirement
- Password history prevention

### Session Security
```typescript
interface SessionConfig {
  maxAge: number // 2 hours
  rolling: boolean // Extend on activity
  secure: boolean // HTTPS only
  httpOnly: boolean // No client access
  sameSite: 'strict' | 'lax' | 'none'
}
```

### Audit Logging
```typescript
interface AuditLog {
  id: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  eventId?: string
  ipAddress: string
  userAgent: string
  timestamp: Date
  details?: Record<string, any>
}
```

## Testing Requirements

### Unit Tests
- User role permission validation
- Invitation token generation and validation
- User-attendant linking logic
- Password security requirements

### Integration Tests
- Complete invitation workflow
- User authentication and authorization
- Attendant dashboard data loading
- Permission-based UI rendering

### Security Tests
- SQL injection prevention
- XSS protection
- CSRF token validation
- Session hijacking prevention

## Deployment Configuration

### Environment Variables
```bash
# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://10.92.3.24:3001

# Invitation system
INVITATION_EXPIRY_HOURS=72
INVITATION_BASE_URL=http://10.92.3.24:3001

# Email configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Database Migrations
```sql
-- User role and invitation columns
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'attendant';
ALTER TABLE users ADD COLUMN invitation_token VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN invitation_sent_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN invitation_accepted_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN invited_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN attendant_profile_id UUID REFERENCES attendant_profiles(id);

-- Event user associations
CREATE TABLE event_user_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  assigned_departments TEXT[],
  assigned_station_ranges TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Success Criteria

### Functional Requirements
- [ ] All user roles implemented with correct permissions
- [ ] Invitation system sends secure, time-limited invitations
- [ ] User-attendant linking works for all scenarios
- [ ] Attendant dashboard displays relevant information
- [ ] User management interface supports all CRUD operations

### Security Requirements
- [ ] All API endpoints properly protected
- [ ] Invitation tokens are cryptographically secure
- [ ] Session management prevents hijacking
- [ ] Audit logging captures all user actions

### Performance Requirements
- [ ] User list loads in < 1 second with 1000+ users
- [ ] Attendant dashboard loads in < 2 seconds
- [ ] Permission checks complete in < 50ms
- [ ] Invitation emails sent within 30 seconds

---

*This specification provides comprehensive user management with security, scalability, and usability as primary concerns.*
