# Theocratic Shift Scheduler - Backlog

## 🐛 Bugs

### HIGH PRIORITY: Environment Configuration Symlink Conflict
**ID**: BUG-001  
**Priority**: High  
**Status**: Open  
**Created**: 2025-10-04  
**Component**: Infrastructure / Configuration  

#### Problem Description:
The staging server has a symlink `.env -> .env.blue` which causes environment configuration conflicts. When both `.env.local` and `.env.blue` exist, the symlink causes `.env.blue` to override `.env.local`, leading to incorrect database credentials being used.

#### Current Impact:
- Database authentication failures
- API endpoints returning 401/500 errors
- "Error Loading Lanyards" and other page failures
- Requires manual intervention after each deployment

#### Root Cause:
1. Server has symlink: `.env -> .env.blue`
2. Next.js loads environment files in this order:
   - `.env.local` (should have highest priority for local overrides)
   - `.env.blue` (environment-specific)
   - `.env` (base configuration)
3. Symlink causes `.env` to point to `.env.blue`, creating conflicts

#### Current Workaround:
- Manually ensure `.env.blue` has correct credentials
- Update both `.env.local` and `.env.blue` with same values
- Restart application after each environment file change

#### Permanent Fix Needed:
1. **Remove Symlink**: Delete `.env -> .env.blue` symlink on server
2. **Standardize Environment Loading**: 
   - Use `.env.local` for local development
   - Use `.env.blue` for staging server (no symlink)
   - Use `.env.green` for production server
3. **Update Deployment Scripts**: Ensure proper environment file is used based on deployment target
4. **Add Validation**: Script to verify correct environment file is loaded on startup
5. **Documentation**: Document environment file precedence and usage

#### Files Affected:
- `.env` (symlink - should be removed)
- `.env.local` (local development)
- `.env.blue` (staging environment)
- Deployment scripts in `wmacs/` and `apex/`

#### Acceptance Criteria:
- [ ] Remove `.env` symlink from staging server
- [ ] Application loads correct environment based on NODE_ENV
- [ ] No manual intervention needed after deployment
- [ ] Database credentials work correctly in all environments
- [ ] Add startup validation to verify correct env file loaded
- [ ] Update deployment documentation

#### Related Issues:
- Database authentication failures
- Lanyards page loading errors
- API 401/500 errors

#### Technical Notes:
```bash
# Current problematic setup on server:
lrwxrwxrwx 1 root root  12 Sep 30 21:51 .env -> .env.blue

# Correct setup should be:
# No .env symlink
# Application uses .env.blue directly when NODE_ENV=production
```

---

## 🔧 Infrastructure & DevOps

### HIGH PRIORITY: Health Check API Endpoint
**ID**: INFRA-001  
**Priority**: High  
**Status**: Backlog  
**Created**: 2025-10-25  
**Component**: API / Infrastructure  
**Estimated Effort**: 30 minutes  

#### Description:
Create a `/api/health` endpoint for the Next.js application to support automated health checks, monitoring, and blue-green deployment orchestration.

#### Requirements:
1. **Endpoint**: `GET /api/health`
2. **Response Format**:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-10-25T12:00:00.000Z",
     "version": "1.0.0",
     "environment": "production",
     "database": "connected",
     "uptime": 3600
   }
   ```
3. **Health Checks**:
   - Database connectivity
   - Application uptime
   - Environment configuration
   - Memory usage (optional)

#### Use Cases:
- Blue-green deployment MCP server health checks
- HAProxy backend health monitoring
- Automated deployment validation
- Infrastructure monitoring systems
- Load balancer health probes

#### Implementation:
- Create `pages/api/health.ts`
- Test database connection with Prisma
- Return appropriate HTTP status codes (200 = healthy, 503 = unhealthy)
- Add caching to prevent database overload

#### Acceptance Criteria:
- [ ] Endpoint returns 200 when application is healthy
- [ ] Endpoint returns 503 when database is unreachable
- [ ] Response includes all required fields
- [ ] Response time < 100ms
- [ ] Works on both BLUE and GREEN servers
- [ ] Integrated with blue-green MCP server

---

### MEDIUM PRIORITY: Blue-Green Deployment Feedback Integration
**ID**: INFRA-002  
**Priority**: Medium  
**Status**: Backlog  
**Created**: 2025-10-25  
**Component**: Blue-Green Deployment / Feedback System  
**Estimated Effort**: 2-4 hours  

#### Description:
Integrate the blue-green deployment system with the existing feedback system to capture deployment-related feedback, issues, and user reports during and after traffic switches.

#### Requirements:
1. **Deployment Feedback Category**:
   - Add "Deployment Issue" category to feedback system
   - Capture deployment context (which server, when switched)
   - Link feedback to specific deployment events

2. **Automated Feedback Collection**:
   - Prompt for feedback after traffic switch
   - Monitor error rates post-deployment
   - Capture user-reported issues during rollout

3. **Deployment Metrics**:
   - Track error rates before/after switch
   - Monitor user feedback sentiment
   - Alert on spike in negative feedback
   - Integration with rollback decisions

4. **MCP Server Integration**:
   - `switch_traffic` tool checks recent feedback
   - Warning if negative feedback spike detected
   - Option to abort switch based on feedback
   - Post-switch feedback summary

#### Use Cases:
- Detect deployment issues quickly
- User-reported problems during rollout
- Automated rollback triggers
- Deployment quality metrics
- Continuous improvement feedback loop

#### Implementation Ideas:
- Add deployment context to feedback submissions
- Create deployment feedback dashboard
- Email notifications for deployment feedback
- Integration with MCP server tools
- Feedback-based rollback automation

#### Acceptance Criteria:
- [ ] Feedback system includes deployment category
- [ ] Deployment events logged with timestamps
- [ ] Feedback linked to deployment events
- [ ] MCP server checks feedback before switch
- [ ] Dashboard shows deployment feedback metrics
- [ ] Alerts on negative feedback spikes

#### Related Systems:
- Existing feedback system (`pages/api/admin/feedback/`)
- Blue-green MCP server (`mcp-blue-green/server.js`)
- HAProxy traffic switching
- Monitoring and alerting

---

## 📋 Feature Requests

### MEDIUM PRIORITY: Enhanced Attendant Filtering
**ID**: FEATURE-001  
**Priority**: Medium  
**Status**: Backlog  
**Created**: 2025-10-16  
**Component**: Event Attendants Page  
**Estimated Effort**: 2-4 hours  

#### Description:
Enhance the event attendants page filtering capabilities to allow filtering on all visible data columns, not just search, congregation, and status.

#### Current Filtering:
- ✅ Search: name, email, phone, congregation, forms of service
- ✅ Congregation: dedicated filter field
- ✅ Status: Active/Inactive/All dropdown

#### Proposed Enhancements:
1. **Multi-select Forms of Service Filter**
   - Filter by: Overseer, Keyman, Elder, Ministerial Servant, etc.
   - Allow multiple selections
   
2. **Verification Status Filter**
   - Options: All, Verified, Required, Not Verified
   - Quick identification of unverified profiles
   
3. **Assignment Status Filters**
   - Has Overseer: Yes/No/All
   - Has Keyman: Yes/No/All
   - Identify gaps in oversight assignments

4. **Advanced Filter Toggle**
   - Collapsible "Advanced Filters" section
   - Keeps UI clean while providing power users more options
   - Filter chip display to show active filters

#### User Stories:
- As an admin managing 148+ attendants, I need granular filtering to find specific groups
- As a coordinator, I want to quickly find "all Overseers" or "all unverified attendants"
- As a scheduler, I want to identify attendants without overseer assignments

#### Implementation Notes:
- Use existing filter pattern (lines 171-191 in attendants.tsx)
- Add filter state to URL params for bookmarking
- Client-side filtering (no API changes needed)
- Consider using filter chips to show active filters

#### Acceptance Criteria:
- [ ] Multi-select dropdown for Forms of Service
- [ ] Verification Status filter dropdown
- [ ] Assignment Status filters (Has Overseer/Keyman)
- [ ] Advanced Filters collapsible section
- [ ] Active filters displayed as chips
- [ ] URL params preserve filter state
- [ ] "Clear All Filters" button

#### Alternative Quick Win:
Add Forms of Service options to existing Status dropdown:
```
Status: All | Active | Inactive | Overseer | Keyman | Elder
```
This provides immediate value with minimal UI changes.

---

### HIGH PRIORITY: Advanced Filtering and Search (Comprehensive)
**ID**: FEATURE-002  
**Priority**: High  
**Status**: Planned  
**Created**: 2025-10-16  
**Component**: Attendant Management Module  
**Estimated Effort**: 3-4 weeks  
**Source**: Migrated from attendant-module-enhancements.md

#### Features:
- **Role-based Filtering**: Filter attendants by serving roles (Elder, MS, Pioneer, etc.)
- **Availability Filtering**: Show only available, unavailable, or limited availability attendants
- **Text Search**: Search by name, email, phone, or notes
- **Combined Filters**: Apply multiple filters simultaneously
- **Saved Filter Presets**: Save commonly used filter combinations
- **Quick Filter Buttons**: One-click filters for common scenarios

#### Technical Requirements:
- Advanced search UI with filter dropdowns and text inputs
- URL parameter handling for shareable filtered views
- Database query optimization for complex filters
- Debounced search input for performance
- Filter state persistence in localStorage
- Export functionality that respects active filters

#### User Stories:
- As a scheduler, I want to quickly find all available Elders for an assignment
- As an administrator, I want to see all attendants serving in "Other Department"
- As an event coordinator, I want to search for attendants by phone number

---

### HIGH PRIORITY: Event Position Assignment Workflow
**ID**: FEATURE-003  
**Priority**: High  
**Status**: Planned  
**Created**: 2025-10-16  
**Component**: Event Management  
**Estimated Effort**: 4-6 weeks  
**Source**: Migrated from attendant-module-enhancements.md

#### Features:
- **Position Management**: Define event-specific positions (Security, Parking, Stage, etc.)
- **Assignment Interface**: Drag-and-drop or click-to-assign attendants to positions
- **Schedule Management**: Assign attendants to specific time slots within events
- **Conflict Detection**: Prevent double-booking and highlight scheduling conflicts
- **Assignment History**: Track who was assigned to what positions across events
- **Assignment Templates**: Save and reuse common assignment patterns

#### Technical Requirements:
- New database tables for positions and assignments
- Real-time assignment interface with drag-and-drop functionality
- Conflict detection algorithms
- Assignment notification system
- Reporting and analytics for assignment patterns
- Integration with existing attendant availability rules

#### User Stories:
- As an event coordinator, I want to assign specific attendants to parking positions
- As a scheduler, I want to see who is assigned to each position for an event
- As an attendant, I want to see what positions I'm assigned to across multiple events

---

### MEDIUM PRIORITY: Bulk Operations
**ID**: FEATURE-004  
**Priority**: Medium  
**Status**: Planned  
**Created**: 2025-10-16  
**Component**: Attendant Management  
**Estimated Effort**: 2-3 weeks  
**Source**: Migrated from attendant-module-enhancements.md

#### Features:
- **Bulk Delete**: Select multiple attendants and delete them simultaneously
- **Bulk Status Updates**: Change availability status for multiple attendants at once
- **Bulk Role Assignment**: Add or remove serving roles across multiple attendants
- **Bulk Export**: Export selected attendants to CSV with custom field selection

#### Technical Requirements:
- Checkbox selection UI for attendant lists
- Bulk action toolbar with operation buttons
- Confirmation dialogs for destructive operations
- Progress indicators for long-running bulk operations
- API endpoints supporting batch operations
- Database transaction handling for data integrity

#### User Stories:
- As an administrator, I want to mark multiple attendants as unavailable for a specific period
- As an event coordinator, I want to delete multiple test attendants at once
- As a scheduler, I want to assign "Regular Pioneer" role to multiple attendants simultaneously

---

### MEDIUM PRIORITY: Audit Logging and Change Tracking
**ID**: FEATURE-005  
**Priority**: Medium  
**Status**: Planned  
**Created**: 2025-10-16  
**Component**: System-wide  
**Estimated Effort**: 2-3 weeks  
**Source**: Migrated from attendant-module-enhancements.md

#### Features:
- **Change History**: Track all modifications to attendant records
- **User Attribution**: Record who made each change and when
- **Field-level Tracking**: Show exactly what fields were modified
- **Audit Trail Export**: Generate reports of changes over time periods
- **Rollback Capability**: Ability to revert changes to previous states
- **Compliance Reporting**: Generate audit reports for organizational requirements

#### Technical Requirements:
- Audit log database table with JSON change tracking
- Middleware to capture all CRUD operations
- User session tracking for change attribution
- Audit log viewer interface with filtering and search
- Data retention policies for audit logs
- Performance optimization for high-volume logging

#### User Stories:
- As an administrator, I want to see who changed an attendant's availability status
- As a supervisor, I want to generate a report of all changes made last month
- As a compliance officer, I want to track all data modifications for audit purposes

---

## 🔧 Infrastructure Issues

### MEDIUM PRIORITY: APEX MCP Restart Tool Not Working
**ID**: INFRA-001  
**Priority**: Medium  
**Status**: Open  
**Created**: 2025-10-04  
**Component**: APEX MCP / Deployment  

#### Problem Description:
The APEX MCP `jw_application_restart` tool reports success but doesn't actually start the Next.js application. The tool returns "healthy and responding" status even when the application is not running.

#### Current Impact:
- Manual SSH intervention required to start application
- APEX deployments don't properly restart the app
- False positive health checks
- Deployment workflow broken

#### Workaround:
```bash
ssh root@10.92.3.24 'cd /opt/theoshift && (PORT=3001 npm start > /dev/null 2>&1 &)'
```

#### Root Cause Investigation Needed:
- Check APEX restart script implementation
- Verify process management strategy
- Review health check logic
- Determine why process doesn't persist

#### Permanent Fix Needed:
1. Fix APEX MCP restart tool to properly start application
2. Implement proper process management (PM2, systemd, or supervisor)
3. Add real health checks (not just process checks)
4. Update deployment scripts to verify app is actually serving requests
5. Add startup validation to confirm port 3001 is listening

---

---

## 🔧 Technical Debt

### LOW PRIORITY: React Hydration Warnings - Date/Time Formatting
**ID**: TECH-002  
**Priority**: Low  
**Status**: Backlog  
**Created**: 2025-10-18  
**Component**: UI / Date Formatting  
**Estimated Effort**: 2-3 hours  

#### Problem Description:
React hydration warnings appear in browser console due to inconsistent date/time formatting between server-side rendering and client-side hydration. The app functions perfectly, but produces console warnings.

#### Current Impact:
- ❌ Console spam (annoying for developers)
- ❌ Minor performance overhead (React re-renders to reconcile)
- ❌ Possible visual "flash" on page load
- ✅ **No functional impact** - app works perfectly

#### Root Cause:
Locale-dependent date/time formatting functions produce different output on server vs client:
- `toLocaleDateString()`
- `toLocaleTimeString()`
- `toLocaleString()`
- `new Date()` with timezone-dependent methods (`.getDay()`, `.getMonth()`, etc.)

#### Files Fixed (4/21):
- ✅ `/pages/events/index.tsx` - formatDate, formatTime
- ✅ `/pages/events/select.tsx` - inline date formatting
- ✅ `/pages/attendant/dashboard.tsx` - formatDate
- ✅ `/pages/events/[id]/index.tsx` - formatDate, formatTime, formatDateTime, number formatting

#### Files Still Needing Fixes (17 remaining):

**High Traffic Pages:**
1. `/pages/events/[id]/count-times/[sessionId]/index.tsx` (3 instances)
2. `/pages/events/[id]/assignments.tsx` (1 instance)
3. `/pages/events/[id]/count-times.tsx` (1 instance)
4. `/pages/events/[id]/lanyards.tsx` (2 instances)

**Admin Pages:**
5. `/pages/admin/api-status/index.tsx` (2 instances)
6. `/pages/admin/users/invite.tsx` (2 instances)
7. `/pages/admin/audit-logs/index.tsx` (1 instance)
8. `/pages/admin/users/index.tsx` (1 instance)
9. `/pages/admin/health/index.tsx` (1 instance)
10. `/pages/admin/test-modules.tsx` (1 instance)

**Other Pages:**
11. `/pages/auth/accept-invitation.tsx` (2 instances)
12. `/pages/attendant/select-event.tsx` (1 instance)
13. `/pages/events/[id]/count-times/[sessionId]/enter-count.tsx` (1 instance)
14. `/pages/events/[id]/documents.tsx` (1 instance)
15. `/pages/guest-lookup.tsx` (1 instance)

#### Solution Pattern:
Replace all locale-dependent formatting with `date-fns` library (already installed):

```typescript
// Add import
import { format, parseISO } from 'date-fns'

// Date formatting
// OLD: new Date(dateString).toLocaleDateString()
// NEW: format(parseISO(dateString), 'MMMM d, yyyy')

// Time formatting
// OLD: new Date(`2000-01-01T${timeString}`).toLocaleTimeString()
// NEW: 
const [h, m] = timeString.split(':')
format(new Date(2000, 0, 1, parseInt(h), parseInt(m)), 'h:mm a')

// Number formatting
// OLD: number.toLocaleString()
// NEW: number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
```

#### Implementation Strategy:
- Fix opportunistically when working on related features
- OR schedule dedicated cleanup sprint
- Each file takes ~5-10 minutes to fix
- Low risk - purely cosmetic issue

#### Acceptance Criteria:
- [ ] No console hydration warnings on page load
- [ ] Dates display correctly in all timezones
- [ ] Times display correctly
- [ ] Numbers format with commas
- [ ] No visual "flash" on page load

---

### LOW PRIORITY: Enhanced Access Request System
**ID**: TECH-003  
**Priority**: Low  
**Status**: Backlog  
**Created**: 2025-10-19  
**Component**: Authentication / User Management  
**Estimated Effort**: 4-6 hours  

#### Problem Description:
Current system is invite-only (secure), but may need more sophisticated access request options for larger deployments or special circumstances.

#### Current Implementation:
- ✅ Invite-only system (secure, prevents bots)
- ✅ Contact information page for access requests
- ✅ Manual admin approval process

#### Future Enhancement Options:

**Option 2: Secure Request Form**
- Form that emails admins (doesn't create accounts)
- Requires verification (congregation, role, etc.)
- Includes admin approval link in email
- No automatic account creation

**Option 3: QR Code/Link Distribution**  
- Admins generate time-limited invitation codes
- Share via QR codes at meetings/events
- Each code has limited uses (1-5 invitations)
- Expires after set time period
- Audit trail of code usage

#### Implementation Strategy:
- Evaluate need based on user feedback
- Consider for larger congregations or special events
- Maintain security-first approach
- Keep human verification in approval process

#### Acceptance Criteria:
- [ ] Maintains current security standards
- [ ] Reduces admin workload for legitimate requests
- [ ] Provides audit trail for access requests
- [ ] Prevents automated/bot requests
- [ ] Integrates with existing invitation system

---

### MEDIUM PRIORITY: Environment Variable Loading in Production
**ID**: TECH-001  
**Priority**: Medium  
**Status**: Resolved  
**Created**: 2025-10-16  
**Resolved**: 2025-10-16  
**Component**: Infrastructure / Deployment  

#### Problem:
Next.js production server (`next start`) doesn't automatically load `.env` file, causing environment variables like `NEXTAUTH_URL` and `NEXT_PUBLIC_URL` to be undefined, resulting in localhost redirects.

#### Solution Implemented:
1. Created `/opt/theoshift/start-server.sh` script
2. Script exports environment variables before starting server
3. Updated server startup process to use the script

#### Files:
- `start-server.sh`: Startup script with environment loading
- `.env`: Environment configuration file

---

## 📊 Implementation Roadmap

### Phase 1 (Next 3 months)
- FEATURE-001: Enhanced Attendant Filtering (Quick Win)
- FEATURE-002: Advanced Filtering and Search (Comprehensive)

### Phase 2 (Months 4-6)
- FEATURE-003: Event Position Assignment Workflow

### Phase 3 (Months 7-9)
- FEATURE-004: Bulk Operations

### Phase 4 (Months 10-12)
- FEATURE-005: Audit Logging and Change Tracking

---

## 💡 Future Enhancement Ideas

### Photo Management
- Upload and display attendant photos
- Photo-based attendant selection interface
- Integration with user profile photos

### Skills and Certifications
- Track attendant skills and certifications
- Skill-based assignment recommendations
- Certification expiration tracking and alerts

### Mobile Optimization
- Progressive Web App (PWA) functionality
- Mobile-first attendant check-in interface
- Offline capability for remote events

### Integration Features
- Calendar integration for availability management
- Email/SMS notifications for assignments
- Integration with external scheduling systems

---

## 📈 Success Metrics

- **User Adoption**: 90%+ of events using position assignment feature
- **Time Savings**: 50% reduction in manual assignment coordination time
- **Data Accuracy**: 99%+ accuracy in attendant availability tracking
- **User Satisfaction**: 4.5+ rating on feature usability surveys

---

## 📝 Backlog Management Notes

**Last Updated**: 2025-10-25

**Recent Additions**:
- **INFRA-001**: Health Check API Endpoint (High Priority) - Required for blue-green deployment
- **INFRA-002**: Blue-Green Deployment Feedback Integration (Medium Priority) - Enhance deployment quality

**Sources Consolidated**:
- `docs/roadmap/attendant-module-enhancements.md` - Migrated all features
- Blue-green deployment implementation - Added infrastructure items
- Infrastructure fixes - Documented resolved technical debt

**Deprecated Documents**:
- `TODO_IMMEDIATE.md` - Empty, can be removed
- `docs/roadmap/attendant-module-enhancements.md` - Content migrated to BACKLOG.md
