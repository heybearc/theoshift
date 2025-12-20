# Theocratic Shift Scheduler - Infrastructure Migration Guide

**Migration Date:** December 19, 2025  
**Status:** In Progress

## Overview

This document tracks the migration from "Theocratic Shift Scheduler" to "Theocratic Shift Scheduler" with new blue-green deployment infrastructure.

## Infrastructure Changes

### Container Naming

| Old Name | New Name | Container ID | IP Address | Purpose |
|----------|----------|--------------|------------|---------|
| Staging (Container 134 (blue-theoshift)) | **blue-theoshift** | 134 | 10.92.3.24 | Standby/Development |
| Production (Container 132 (green-theoshift)) | **green-theoshift** | 132 | 10.92.3.22 | Live/Production |
| Database (Container 131) | database-theoshift | 131 | 10.92.3.21 | PostgreSQL |

### Domain Changes

```bash
# Old domains
blue.theoshift.com
green.theoshift.com
theoshift.com

# New domains
blue.theoshift.com (Container 134 (blue-theoshift) - blue-theoshift)
green.theoshift.com (Container 132 (green-theoshift) - green-theoshift)
theoshift.com (main domain - routes to live server)
```

**Note:** Blue and Green are equal environments. "Live" and "Standby" are status designations only, controlled by load balancer routing. Either blue or green can be live at any time.

### Terminology Changes

| Old Term | New Term |
|----------|----------|
| Staging | Standby (Blue) |
| Production | Live (Green) |
| Theocratic Shift Scheduler | Theocratic Shift Scheduler |
| theoshift.com | theoshift.com |

## Application Path Changes

```bash
# Old path
/opt/theoshift

# New path
/opt/theoshift
```

## Database Changes

```bash
# Old database
Database: theoshift_scheduler
User: theoshift_user
Password: jw_password

# New database
Database: theoshift_scheduler
User: theoshift_user
Password: theoshift_password
```

## Environment Variables

### Blue Environment (.env.blue)
```env
NODE_ENV=production
PORT=3001
NEXTAUTH_URL=https://blue.theoshift.com
NEXT_PUBLIC_APP_URL=https://blue.theoshift.com
DATABASE_URL=postgresql://theoshift_user:theoshift_password@10.92.3.21:5432/theoshift_scheduler
NEXTAUTH_SECRET=blue-secret-2025-theoshift
```

### Green Environment (.env.green)
```env
NODE_ENV=production
PORT=3001
NEXTAUTH_URL=https://green.theoshift.com
NEXT_PUBLIC_APP_URL=https://green.theoshift.com
DATABASE_URL=postgresql://theoshift_user:theoshift_password@10.92.3.21:5432/theoshift_scheduler
NEXTAUTH_SECRET=green-secret-2025-theoshift
```

## SSH Configuration

```bash
# Old SSH shortcuts
ssh green-theoshift  # Production
ssh blue-theoshift  # Staging

# New SSH shortcuts
ssh green-theoshift  # Live (10.92.3.22)
ssh blue-theoshift   # Standby (10.92.3.24)
```

## Deployment Commands

### Deploy to Blue
```bash
ssh root@10.92.3.24 "cd /opt/theoshift && git pull origin main && npm install && npm run build && npm start -- --port 3001"
```

### Deploy to Green
```bash
ssh root@10.92.3.22 "cd /opt/theoshift && git pull origin main && npm install && npm run build && npm start -- --port 3001"
```

## Files Updated

### ✅ Completed
- [x] `INFRASTRUCTURE_CONFIG.md` - Main infrastructure configuration
- [x] `mcp-blue-green/package.json` - MCP package metadata
- [x] `mcp-blue-green/server.js` - MCP server configuration

### 🔄 In Progress
- [ ] Deployment scripts (*.sh)
- [ ] GitHub workflows (.github/workflows/*.yml)
- [ ] Documentation files (*.md)
- [ ] Windsurf workflows (.windsurf/workflows/*.md)
- [ ] Configuration files (*.json, *.js)

## Migration Checklist

### Phase 1: Configuration Files ✅
- [x] Update INFRASTRUCTURE_CONFIG.md
- [x] Update MCP blue-green configuration
- [ ] Update package.json references
- [ ] Update environment files

### Phase 2: Deployment Scripts
- [ ] Update deploy-production.sh
- [ ] Update deploy-production-complete.sh
- [ ] Update sync-staging-to-production.sh
- [ ] Update all wmacs-*.sh scripts
- [ ] Update apex-*.sh scripts

### Phase 3: GitHub Workflows
- [ ] Update .github/workflows/deploy-production.yml
- [ ] Update .github/workflows/staging-to-production.yml
- [ ] Update .github/workflows/deploy.yml
- [ ] Update .github/workflows/mcp-ci-cd.yml

### Phase 4: Documentation
- [ ] Update README.md
- [ ] Update all deployment guides
- [ ] Update WMACS documentation
- [ ] Update APEX documentation

### Phase 5: Windsurf Workflows
- [ ] Update /bump workflow
- [ ] Update /deploy workflow
- [ ] Update /release workflow
- [ ] Update /sync workflow
- [ ] Update /ssh-theoshift-green workflow

### Phase 6: Server Configuration
- [ ] Rename containers on Proxmox
- [ ] Update hostnames
- [ ] Create database and user
- [ ] Update nginx configuration
- [ ] Update HAProxy configuration
- [ ] Update PM2 process names

## Rollback Plan

If issues arise, legacy URLs will continue to work:
- `theoshift.com` → redirects to `theoshift.com`
- `blue.theoshift.com` → redirects to `standby.theoshift.com`
- Old database credentials will remain valid during transition

## Testing Checklist

- [ ] Verify container hostnames
- [ ] Test SSH access with new shortcuts
- [ ] Verify database connectivity
- [ ] Test application deployment
- [ ] Verify health endpoints
- [ ] Test blue-green traffic switching
- [ ] Validate environment variables
- [ ] Test rollback procedures

## Notes

- All changes maintain backward compatibility during transition
- Legacy URLs will redirect to new URLs
- Database migration will be coordinated separately
- Container renaming requires Proxmox access

---

**Last Updated:** December 19, 2025  
**Updated By:** Cascade AI Assistant
