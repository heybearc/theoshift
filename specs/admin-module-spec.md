# Admin Module Specification
## JW Attendant Scheduler - Administrative Control Center

### Overview
The Admin Module is a comprehensive administrative control center that provides system-wide management capabilities through organized sub-modules. This centralized approach ensures efficient administration of users, system configuration, and operational settings.

### Admin Module Architecture
The Admin Module is organized into distinct sub-modules, each handling specific administrative functions:

#### Core Sub-Modules
1. **User Management** - Complete user lifecycle management
2. **Email Configuration** - SMTP and email template management
3. **Role Management** - Permission and access control
4. **System Settings** - Application-wide configuration
5. **Audit & Logging** - Activity tracking and compliance
6. **Bulk Operations** - Mass data management tools

### Navigation Structure
```
/admin                    # Main Admin Dashboard
├── /users               # User Management Sub-Module
│   ├── /new            # Create New User
│   ├── /[id]/edit      # Edit User Profile
│   └── /bulk           # Bulk User Operations
├── /email-config        # Email Configuration Sub-Module
├── /roles              # Role Management Sub-Module
├── /settings           # System Settings Sub-Module
├── /audit              # Audit & Logging Sub-Module
└── /reports            # Administrative Reports
```

### User Roles (From Prisma Schema)
```typescript
enum UserRole {
  ADMIN           // Full system access, user management
  OVERSEER        // Department oversight, assignment management  
  ASSISTANT_OVERSEER // Limited oversight capabilities
  KEYMAN          // Key position assignments, special access
  ATTENDANT       // Standard user, view assignments
}
```

### Role Hierarchy & Permissions
- **ADMIN**: Complete system control, user CRUD, role assignment, system configuration
- **OVERSEER**: Manage events, assign attendants, view reports, department oversight
- **ASSISTANT_OVERSEER**: Limited event management, assist with assignments
- **KEYMAN**: Special position assignments, access to key areas
- **ATTENDANT**: View personal assignments, update availability, basic profile management

### Core Features

#### 1. User Management
- **User CRUD Operations**
  - Create new users with role assignment
  - Edit user profiles (name, email, phone, role)
  - Deactivate/reactivate users
  - Delete users (with cascade considerations)
  - Bulk user operations

#### 2. User Invitation System
- **Email-Based Invitations**
  - Generate secure invitation tokens
  - Send invitation emails via Gmail App Password
  - Token expiration management (7-day default)
  - Resend invitation capability
  - Track invitation status

- **SMS Notifications (Future Enhancement)**
  - Research indicates free SMS options are limited
  - Twilio offers free trial credits but requires paid plan for production
  - Consider SMS as premium feature for future implementation
  - **Current Decision: Email-only for MVP**

#### 3. Email Configuration
- **Gmail App Password Integration**
  - SMTP configuration for Gmail
  - App-specific password setup
  - Template management for invitations
  - Email delivery status tracking
  - Configurable sender information

#### 4. Role Management
- **Role Assignment Interface**
  - Visual role hierarchy display
  - Bulk role changes
  - Role change audit trail
  - Permission matrix display

### Technical Implementation

#### Database Models Used
- `users` - Core user information and roles
- `email_configurations` - SMTP settings and templates
- `attendants` - Extended attendant profiles (linked to users)

#### API Endpoints
```
POST   /api/admin/users              # Create user
GET    /api/admin/users              # List users with pagination
GET    /api/admin/users/[id]         # Get user details
PUT    /api/admin/users/[id]         # Update user
DELETE /api/admin/users/[id]         # Delete user
POST   /api/admin/users/invite       # Send invitation
POST   /api/admin/users/bulk         # Bulk operations
GET    /api/admin/email/config       # Get email configuration
PUT    /api/admin/email/config       # Update email configuration
POST   /api/admin/email/test         # Test email configuration
```

#### UI Components by Sub-Module

**User Management Sub-Module**
- User dashboard with statistics cards
- User list table with search/filter capabilities
- User creation form with role selection
- User edit form with validation
- Invitation management interface
- Bulk operation controls

**Email Configuration Sub-Module**
- SMTP configuration form
- Current configuration display
- Test email interface
- Gmail setup instructions
- Configuration validation feedback

**Admin Dashboard (Main)**
- Sub-module navigation cards
- System status overview
- Quick action buttons
- Recent activity summary

### Email Configuration Requirements
```typescript
interface EmailConfig {
  smtpServer: string      // smtp.gmail.com
  smtpPort: number        // 587 (TLS) or 465 (SSL)
  smtpUser: string        // Gmail address
  smtpPassword: string    // Gmail App Password
  fromEmail: string       // Sender email
  fromName: string        // Display name
  replyToEmail?: string   // Reply-to address
  inviteTemplate: string  // HTML email template
}
```

### Security Considerations
- Invitation tokens must be cryptographically secure
- Email passwords encrypted at rest
- Role changes require admin authentication
- Audit trail for all user management actions
- Rate limiting on invitation sending

### WMACS Guardian Integration
- All admin operations protected by WMACS Guardian
- Automatic recovery from email configuration failures
- Database transaction rollback on user creation errors
- Deployment protection during admin module updates

### Development Approach
1. **Feature Branch**: `feature/admin-module`
2. **Incremental Development**: Build and test each component with WMACS Guardian
3. **Staging Testing**: Use container 134 for all testing
4. **API-First**: Complete backend APIs before UI development
5. **Email Testing**: Test with actual Gmail configuration

### Implementation Status

#### ✅ Completed Sub-Modules
- [x] **User Management Sub-Module**
  - [x] Complete user CRUD operations
  - [x] User creation with automatic invitation
  - [x] User editing with validation
  - [x] User deactivation (soft delete)
  - [x] Invitation resending capability
  - [x] Professional UI with action buttons

- [x] **Email Configuration Sub-Module**
  - [x] Gmail SMTP configuration interface
  - [x] Encrypted password storage
  - [x] Test email functionality
  - [x] Configuration validation
  - [x] Gmail setup instructions

- [x] **Bulk Operations Sub-Module**
  - [x] Bulk user activation/deactivation
  - [x] Bulk role changes
  - [x] Bulk invitation sending
  - [x] Error handling per operation

#### 🚧 Planned Sub-Modules
- [ ] **Role Management Sub-Module**
  - [ ] Visual role hierarchy display
  - [ ] Permission matrix interface
  - [ ] Role change audit trail

- [ ] **System Settings Sub-Module**
  - [ ] Application configuration
  - [ ] Feature toggles
  - [ ] Maintenance mode controls

- [ ] **Audit & Logging Sub-Module**
  - [ ] User activity tracking
  - [ ] Administrative action logs
  - [ ] Security event monitoring

### Success Criteria
- [x] Complete user CRUD operations
- [x] Working invitation system with email delivery
- [x] Gmail integration with app passwords
- [x] Bulk user operations
- [x] Admin UI with modular navigation
- [x] WMACS Guardian protection on all operations
- [x] Comprehensive error handling and validation
- [ ] Role management with proper permissions
- [ ] System settings management
- [ ] Audit trail implementation

### Future Enhancements
- SMS invitation capability (paid service integration)
- Advanced user analytics and reporting
- Single Sign-On (SSO) integration
- Multi-factor authentication
- Advanced permission granularity
- User import/export functionality
