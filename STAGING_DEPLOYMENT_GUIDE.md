# 🚀 STAGING DEPLOYMENT GUIDE - Admin Module Phase 2

## 📋 DEPLOYMENT OVERVIEW

**Target Environment:** Container 135 (10.92.3.25:3001)  
**Database:** PostgreSQL Container 131 (10.92.3.21)  
**Branch:** `staging` (merged with admin module Phase 2)  
**Deployment Type:** Battle-tested CI/CD approach  

## 🎯 PRE-DEPLOYMENT CHECKLIST

### ✅ Code Readiness
- [x] Admin module Phase 2 merged to staging branch
- [x] All dependencies updated (nodemailer, zod)
- [x] Comprehensive testing script created
- [x] No breaking changes to existing functionality
- [x] Clean git history with atomic commits

### ✅ Environment Requirements
- [ ] Staging container accessible (10.92.3.25)
- [ ] Database connectivity verified (10.92.3.21)
- [ ] Node.js and npm/yarn available
- [ ] Environment variables configured
- [ ] SMTP settings (optional for email testing)

## 🔧 DEPLOYMENT STEPS

### Step 1: Connect to Staging Environment
```bash
# SSH to staging container
ssh user@10.92.3.25

# Navigate to application directory
cd /path/to/jw-attendant-scheduler
```

### Step 2: Pull Latest Staging Code
```bash
# Ensure we're on staging branch
git checkout staging

# Pull latest changes (exact staging codebase)
git pull origin staging

# Verify we have the admin module
ls -la src/app/admin/
```

### Step 3: Install Dependencies
```bash
# Install new dependencies (nodemailer, updated zod)
npm install

# Verify critical dependencies
npm list nodemailer @types/nodemailer zod
```

### Step 4: Environment Configuration
```bash
# Copy environment template if needed
cp .env.example .env.local

# Configure essential variables
cat >> .env.local << EOF
# Database (Container 131)
DATABASE_URL="postgresql://username:password@10.92.3.21:5432/jw_attendant_scheduler"

# NextAuth Configuration
NEXTAUTH_URL="http://10.92.3.25:3001"
NEXTAUTH_SECRET="your-staging-secret-key"

# Optional: Email Configuration (for testing invitations)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM_NAME="JW Attendant Scheduler - Staging"
EMAIL_FROM="your-email@gmail.com"
EOF
```

### Step 5: Database Migration (if needed)
```bash
# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Verify database connection
npx prisma db pull
```

### Step 6: Build and Start Application
```bash
# Build the Next.js application
npm run build

# Start the application
npm run start

# Or use PM2 for process management
pm2 start npm --name "jw-attendant-staging" -- start
pm2 save
```

### Step 7: Verify Deployment
```bash
# Check application is running
curl http://localhost:3001/api/health

# Check admin endpoints are accessible
curl http://localhost:3001/admin

# Verify database connectivity
curl http://localhost:3001/api/users
```

## 🧪 COMPREHENSIVE TESTING

### Automated Testing
```bash
# Run the comprehensive admin module test
node test-admin-module.js

# Expected: 80%+ success rate for staging approval
```

### Manual Testing Checklist

#### 🔐 Authentication & Authorization
- [ ] Admin routes require authentication
- [ ] Non-admin users cannot access admin panel
- [ ] Admin users can access all admin features
- [ ] Session management working correctly

#### 👥 User Management
- [ ] Create new user with all role types
- [ ] Edit existing user information
- [ ] Toggle user active/inactive status
- [ ] View user assignment history
- [ ] Search and filter users

#### 📧 Email Configuration
- [ ] Access email configuration page
- [ ] Test different SMTP providers (Gmail, Outlook)
- [ ] Validate email settings
- [ ] Send test emails successfully
- [ ] Handle email configuration errors gracefully

#### 📊 Bulk Operations
- [ ] Access bulk user import page
- [ ] Parse CSV-format user data
- [ ] Validate user data before creation
- [ ] Create multiple users in batch
- [ ] Handle bulk operation errors
- [ ] Display progress and results

#### 📱 Mobile Responsiveness
- [ ] Admin panel accessible on mobile devices
- [ ] Navigation menu works on small screens
- [ ] Forms are usable on mobile
- [ ] Tables scroll horizontally on mobile
- [ ] Touch interactions work properly

#### 🔗 Integration Testing
- [ ] Admin module integrates with existing user system
- [ ] No conflicts with existing authentication
- [ ] Database operations don't affect existing data
- [ ] API endpoints don't break existing functionality

## 📊 SUCCESS CRITERIA

### Minimum Requirements for User Acceptance Testing
- **Automated Tests:** 80%+ success rate
- **Core Functionality:** All admin CRUD operations working
- **Authentication:** Proper role-based access control
- **Email System:** Configuration and testing functional
- **Mobile Support:** Basic responsiveness confirmed
- **Database Integration:** No data corruption or conflicts

### Performance Benchmarks
- **Page Load Times:** < 2 seconds for admin pages
- **API Response Times:** < 500ms for admin operations
- **Bulk Operations:** Handle 50+ users without timeout
- **Memory Usage:** No significant memory leaks
- **Database Queries:** Efficient queries with proper indexing

## 🚨 ROLLBACK PROCEDURE

If critical issues are discovered:

```bash
# Stop the application
pm2 stop jw-attendant-staging

# Rollback to previous stable commit
git log --oneline -10
git checkout <previous-stable-commit>

# Rebuild and restart
npm run build
pm2 restart jw-attendant-staging

# Verify rollback successful
curl http://localhost:3001/api/health
```

## 📋 POST-DEPLOYMENT VALIDATION

### Health Checks
```bash
# Application health
curl http://10.92.3.25:3001/api/health

# Admin endpoints
curl http://10.92.3.25:3001/admin

# Database connectivity
curl http://10.92.3.25:3001/api/users

# Email configuration (if configured)
curl http://10.92.3.25:3001/api/admin/email-config
```

### Log Monitoring
```bash
# Check application logs
pm2 logs jw-attendant-staging

# Check for errors
pm2 logs jw-attendant-staging --err

# Monitor real-time logs
pm2 logs jw-attendant-staging --lines 50 -f
```

## 🎯 USER ACCEPTANCE TESTING PLAN

### Test Scenarios
1. **Admin User Journey**
   - Login as admin user
   - Navigate admin panel
   - Create new users with different roles
   - Configure email settings
   - Test bulk user import

2. **Email System Validation**
   - Configure SMTP settings
   - Send test emails
   - Create users with email invitations
   - Verify email templates and content

3. **Bulk Operations Testing**
   - Import sample user data
   - Validate error handling
   - Test large batch processing
   - Verify individual user creation results

4. **Mobile Experience**
   - Access admin panel on mobile device
   - Test all major functions on mobile
   - Verify responsive design elements

### Feedback Collection
- Document any usability issues
- Note performance concerns
- Record feature requests
- Identify missing functionality

## ✅ DEPLOYMENT COMPLETION

Once all tests pass and user acceptance is achieved:

1. **Document Results**
   - Test results and success rate
   - Performance metrics
   - User feedback summary
   - Any issues discovered and resolved

2. **Prepare for Phase 3**
   - Plan health monitoring module
   - Design API status dashboard
   - Schedule Phase 3 development

3. **Production Readiness Assessment**
   - Evaluate if admin module is production-ready
   - Plan production deployment strategy
   - Document any remaining tasks

---

**Deployment Date:** _To be filled_  
**Deployed By:** _To be filled_  
**Test Results:** _To be filled_  
**User Acceptance:** _To be filled_  
**Production Ready:** _To be determined_
