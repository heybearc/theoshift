---
description: Staging-First Development Workflow with CI/CD Pipeline
---

# Staging-First Development Workflow

## Overview
All development for JW Attendant Scheduler follows a staging-first approach with automated CI/CD deployment to production.

## Development Environment Setup

### SSH Configuration
Use the configured SSH shortcuts for server access:

```bash
# Access staging server
/ssh-jw-attendant

# Alternative staging access
ssh staging-jw-attendant

# Production access (automated deployment only)
# Direct SSH to production is restricted
```

### Server Details
- **Staging Server**: `10.92.3.24:3001`
- **Production Server**: Automated deployment target
- **Database**: PostgreSQL (staging and production)

## Development Workflow

### 1. Feature Development Process

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/[feature-name]

# 2. Develop locally with staging database connection
npm run dev

# 3. Test locally against staging database
npm run test

# 4. Commit and push feature branch
git add .
git commit -m "feat: [feature description]"
git push origin feature/[feature-name]
```

### 2. Staging Deployment

```bash
# 1. SSH to staging server
/ssh-jw-attendant

# 2. Navigate to application directory
cd /opt/jw-attendant-scheduler

# 3. Pull latest changes
git fetch origin
git checkout feature/[feature-name]
git pull origin feature/[feature-name]

# 4. Install dependencies and build
npm install
npm run build

# 5. Restart application
pm2 restart jw-attendant-scheduler
pm2 logs jw-attendant-scheduler --lines 50
```

### 3. Testing in Staging

#### Manual Testing Checklist
- [ ] All new features functional
- [ ] No regression in existing features
- [ ] User interface responsive and accessible
- [ ] Database operations successful
- [ ] Performance within acceptable limits

#### Automated Testing
```bash
# Run comprehensive test suite
npm run test:staging

# Run performance benchmarks
npm run test:performance

# Run SDD compliance tests
npm run test:sdd
```

### 4. Production Deployment (CI/CD)

#### Automated Pipeline Triggers
- **Merge to main**: Triggers production deployment
- **Tag creation**: Triggers versioned release
- **Manual trigger**: Emergency deployments

#### Pipeline Steps
1. **Code Quality Checks**
   - ESLint validation
   - TypeScript compilation
   - Unit test execution
   - Security scanning

2. **Build Process**
   - Next.js production build
   - Asset optimization
   - Bundle analysis

3. **Staging Validation**
   - Deploy to staging
   - Run integration tests
   - Performance validation
   - Security checks

4. **Production Deployment**
   - Blue-green deployment
   - Database migrations
   - Health checks
   - Rollback capability

## Branch Strategy

### Branch Types
- `main` - Production-ready code
- `develop` - Integration branch (optional)
- `feature/[name]` - Feature development
- `bugfix/[name]` - Bug fixes
- `hotfix/[name]` - Critical production fixes

### Merge Requirements
- [ ] Code review approved
- [ ] All tests passing
- [ ] Staging deployment successful
- [ ] Performance benchmarks met
- [ ] Security scan clean

## Environment Configuration

### Staging Environment
```bash
# Environment variables
NODE_ENV=staging
DATABASE_URL=postgresql://staging_db_connection
NEXTAUTH_URL=http://10.92.3.24:3001
NEXTAUTH_SECRET=staging_secret

# Feature flags
ENABLE_DEBUG_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_FEATURE_PREVIEWS=true
```

### Production Environment
```bash
# Environment variables
NODE_ENV=production
DATABASE_URL=postgresql://production_db_connection
NEXTAUTH_URL=https://production-domain.com
NEXTAUTH_SECRET=production_secret

# Feature flags
ENABLE_DEBUG_LOGGING=false
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_FEATURE_PREVIEWS=false
```

## Database Management

### Staging Database
- **Purpose**: Development and testing
- **Data**: Sample/test data, safe to reset
- **Migrations**: Applied automatically
- **Backups**: Daily snapshots

### Production Database
- **Purpose**: Live application data
- **Data**: Real attendant and event information
- **Migrations**: Automated with rollback capability
- **Backups**: Hourly snapshots with point-in-time recovery

### Migration Process
```bash
# Generate migration
npx prisma migrate dev --name [migration-name]

# Apply to staging
npx prisma migrate deploy

# Production deployment (automated)
# Migrations applied during CI/CD pipeline
```

## Monitoring and Logging

### Staging Monitoring
- Application logs via PM2
- Database performance metrics
- Error tracking and alerting
- Performance profiling

### Production Monitoring
- Uptime monitoring
- Performance metrics
- Error tracking
- Security monitoring
- User analytics

## Rollback Procedures

### Staging Rollback
```bash
# SSH to staging
/ssh-jw-attendant

# Rollback to previous commit
git checkout [previous-commit-hash]
npm run build
pm2 restart jw-attendant-scheduler
```

### Production Rollback
- Automated rollback triggers
- Database rollback procedures
- Blue-green deployment switch
- Emergency contact procedures

## Security Considerations

### Staging Security
- VPN access required
- SSH key authentication
- Limited external access
- Regular security updates

### Production Security
- HTTPS enforcement
- Database encryption
- Regular security audits
- Automated vulnerability scanning

## Performance Standards

### Staging Performance
- Page load time: < 2 seconds
- API response time: < 500ms
- Database query time: < 100ms
- Memory usage: < 512MB

### Production Performance
- Page load time: < 1 second
- API response time: < 200ms
- Database query time: < 50ms
- 99.9% uptime requirement

## Troubleshooting

### Common Issues
1. **Build Failures**: Check Node.js version compatibility
2. **Database Connection**: Verify connection strings
3. **Permission Errors**: Check file permissions and SSH keys
4. **Performance Issues**: Review database queries and caching

### Emergency Contacts
- **Development Team**: [Contact Information]
- **Infrastructure Team**: [Contact Information]
- **On-Call Support**: [Contact Information]

## Best Practices

### Code Quality
- Follow TypeScript strict mode
- Implement comprehensive error handling
- Write unit tests for all business logic
- Document API endpoints and components

### Deployment Safety
- Always test in staging first
- Use feature flags for gradual rollouts
- Monitor application health post-deployment
- Maintain rollback readiness

### Security
- Regular dependency updates
- Secure environment variable management
- Access control and audit logging
- Regular security assessments

---

*This workflow ensures reliable, secure, and efficient development and deployment of JW Attendant Scheduler features.*
