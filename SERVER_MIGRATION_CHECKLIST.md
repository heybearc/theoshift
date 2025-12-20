# Theocratic Shift Scheduler - Server-Side Migration Checklist

**Migration Date:** December 19, 2025  
**DNS Status:** ✅ Already configured (blue.theoshift.com, green.theoshift.com)

---

## Pre-Migration Checklist

- [ ] **Backup current data**
  - [ ] Database dump from Container 131
  - [ ] Application files from Container 134 (blue-theoshift) (blue)
  - [ ] Application files from Container 132 (green-theoshift) (green)
  - [ ] Configuration files (.env, nginx, etc.)

- [ ] **Verify DNS records** (Already in place per user)
  - [x] blue.theoshift.com → 10.92.3.24
  - [x] green.theoshift.com → 10.92.3.22
  - [x] theoshift.com → Load balancer

---

## Step 1: Rename Proxmox Containers

**Container 134 (blue-theoshift) (Blue)**
```bash
# SSH to Proxmox host
ssh root@10.92.0.5

# Stop container
pct stop 134

# Rename container hostname
pct set 134 --hostname blue-theoshift

# Update container description
pct set 134 --description "Theocratic Shift Scheduler - Blue Environment (Standby/Live)"

# Start container
pct start 134

# Verify
pct exec 134 -- hostname
# Should output: blue-theoshift
```

**Container 132 (green-theoshift) (Green)**
```bash
# Stop container
pct stop 132

# Rename container hostname
pct set 132 --hostname green-theoshift

# Update container description
pct set 132 --description "Theocratic Shift Scheduler - Green Environment (Live/Standby)"

# Start container
pct start 132

# Verify
pct exec 132 -- hostname
# Should output: green-theoshift
```

**Container 131 (Database)**
```bash
# Optional: Update database container for consistency
pct set 131 --hostname database-theoshift
pct set 131 --description "Theocratic Shift Scheduler - PostgreSQL Database"
```

---

## Step 2: Database Migration

**On Database Container (131 - 10.92.3.21)**

```bash
# SSH to database container
ssh root@10.92.3.21

# Switch to postgres user
sudo -u postgres psql

# Create new database
CREATE DATABASE theoshift_scheduler;

# Create new user
CREATE USER theoshift_user WITH PASSWORD 'theoshift_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE theoshift_scheduler TO theoshift_user;

# Exit psql
\q

# Migrate data from old database to new (if needed)
sudo -u postgres pg_dump theoshift_scheduler > /tmp/jw_backup.sql
sudo -u postgres psql theoshift_scheduler < /tmp/jw_backup.sql

# Verify
sudo -u postgres psql -c "\l" | grep theoshift
```

**Keep old database for rollback:**
- Do NOT drop `theoshift_scheduler` database yet
- Keep for 30 days as backup

---

## Step 3: Update Blue Container (134)

**On Blue Container (10.92.3.24)**

```bash
# SSH to blue container
ssh root@10.92.3.24

# Stop current application
pm2 stop all
# OR
pkill -f 'next.*3001'

# Rename application directory
cd /opt
mv theoshift theoshift

# Update git remote (if needed)
cd /opt/theoshift
git remote -v
# Update if necessary

# Create new environment file
cat > /opt/theoshift/.env.blue << 'EOF'
NODE_ENV=production
PORT=3001
NEXTAUTH_URL=https://blue.theoshift.com
NEXT_PUBLIC_APP_URL=https://blue.theoshift.com
DATABASE_URL=postgresql://theoshift_user:theoshift_password@10.92.3.21:5432/theoshift_scheduler
NEXTAUTH_SECRET=blue-secret-2025-theoshift
EOF

# Link to .env for compatibility
ln -sf /opt/theoshift/.env.blue /opt/theoshift/.env

# Pull latest code (with migration changes)
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start npm --name "theoshift-blue" -- start -- --port 3001
pm2 save

# Verify
curl -I http://localhost:3001
curl -I https://blue.theoshift.com
```

---

## Step 4: Update Green Container (132)

**On Green Container (10.92.3.22)**

```bash
# SSH to green container
ssh root@10.92.3.22

# Stop current application
pm2 stop all
# OR
pkill -f 'next.*3001'

# Rename application directory
cd /opt
mv theoshift theoshift

# Create new environment file
cat > /opt/theoshift/.env.green << 'EOF'
NODE_ENV=production
PORT=3001
NEXTAUTH_URL=https://green.theoshift.com
NEXT_PUBLIC_APP_URL=https://green.theoshift.com
DATABASE_URL=postgresql://theoshift_user:theoshift_password@10.92.3.21:5432/theoshift_scheduler
NEXTAUTH_SECRET=green-secret-2025-theoshift
EOF

# Link to .env for compatibility
ln -sf /opt/theoshift/.env.green /opt/theoshift/.env

# Pull latest code (with migration changes)
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start npm --name "theoshift-green" -- start -- --port 3001
pm2 save

# Verify
curl -I http://localhost:3001
curl -I https://green.theoshift.com
```

---

## Step 5: Update Nginx Configuration

**On Blue Container (134)**

```bash
# Update nginx config
cat > /etc/nginx/sites-available/theoshift << 'EOF'
server {
    listen 80;
    server_name blue.theoshift.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name blue.theoshift.com;
    
    # SSL configuration (update with actual cert paths)
    ssl_certificate /etc/letsencrypt/live/blue.theoshift.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blue.theoshift.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/theoshift /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/theoshift

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

**On Green Container (132)**

```bash
# Update nginx config
cat > /etc/nginx/sites-available/theoshift << 'EOF'
server {
    listen 80;
    server_name green.theoshift.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name green.theoshift.com;
    
    # SSL configuration (update with actual cert paths)
    ssl_certificate /etc/letsencrypt/live/green.theoshift.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/green.theoshift.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/theoshift /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/theoshift

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

---

## Step 6: Update HAProxy Configuration (if applicable)

**On HAProxy Container (10.92.3.26)**

```bash
# Update backend configuration
cat >> /etc/haproxy/haproxy.cfg << 'EOF'

# Theocratic Shift Scheduler Backend
backend theoshift
    mode http
    balance roundrobin
    option httpchk GET /api/health
    
    # Blue server (can be live or standby)
    server blue-theoshift 10.92.3.24:3001 check
    
    # Green server (can be live or standby)
    server green-theoshift 10.92.3.22:3001 check

# Frontend for theoshift.com
frontend theoshift_frontend
    bind *:443 ssl crt /etc/haproxy/certs/theoshift.com.pem
    mode http
    default_backend theoshift
EOF

# Test configuration
haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload HAProxy
systemctl reload haproxy
```

---

## Step 7: Update SSH Configuration

**On your local machine**

Update `~/.ssh/config`:

```bash
# Add new SSH shortcuts
cat >> ~/.ssh/config << 'EOF'

# Theocratic Shift Scheduler - Blue Environment
Host blue-theoshift
    HostName 10.92.3.24
    User root
    IdentityFile ~/.ssh/id_rsa

# Theocratic Shift Scheduler - Green Environment
Host green-theoshift
    HostName 10.92.3.22
    User root
    IdentityFile ~/.ssh/id_rsa

# Theocratic Shift Scheduler - Database
Host database-theoshift
    HostName 10.92.3.21
    User root
    IdentityFile ~/.ssh/id_rsa
EOF

# Test SSH connections
ssh blue-theoshift "hostname"
ssh green-theoshift "hostname"
```

---

## Step 8: Update MCP Server Configuration

**Update MCP server on your local machine**

The MCP server configuration has already been updated in the codebase. After running the migration script, reinstall the MCP server:

```bash
cd /Users/cory/Documents/Cloudy-Work/applications/theoshift/mcp-blue-green

# Reinstall with new configuration
npm install

# Restart MCP server (if running as service)
# Or restart Windsurf IDE to reload MCP configuration
```

---

## Step 9: Verification & Testing

**Test Blue Environment**
```bash
# Health check
curl -I https://blue.theoshift.com/api/health

# Login page
curl -I https://blue.theoshift.com/login

# Database connection
ssh blue-theoshift "cd /opt/theoshift && npm run db:test"
```

**Test Green Environment**
```bash
# Health check
curl -I https://green.theoshift.com/api/health

# Login page
curl -I https://green.theoshift.com/login

# Database connection
ssh green-theoshift "cd /opt/theoshift && npm run db:test"
```

**Test Main Domain**
```bash
# Should route to live server (controlled by load balancer)
curl -I https://theoshift.com
```

**Test Blue-Green Switching**
```bash
# Use MCP tools to switch traffic
# This should be tested in a controlled manner
```

---

## Step 10: Update Monitoring & Alerts

- [ ] Update monitoring dashboards with new container names
- [ ] Update alert configurations with new hostnames
- [ ] Update backup scripts with new paths
- [ ] Update log aggregation with new service names

---

## Rollback Plan

If issues arise, rollback procedure:

1. **Restore container hostnames**
   ```bash
   pct set 134 --hostname jw-staging
   pct set 132 --hostname jw-production
   ```

2. **Restore application directories**
   ```bash
   ssh root@10.92.3.24 "cd /opt && mv theoshift theoshift"
   ssh root@10.92.3.22 "cd /opt && mv theoshift theoshift"
   ```

3. **Restore environment files**
   ```bash
   # Restore from backup
   # Point to old database
   ```

4. **Restore nginx configuration**
   ```bash
   # Re-enable old site configs
   # Reload nginx
   ```

5. **Restore PM2 processes**
   ```bash
   pm2 delete all
   pm2 start old-config.json
   ```

---

## Post-Migration Cleanup (After 30 days)

- [ ] Remove old database `theoshift_scheduler`
- [ ] Remove old nginx configurations
- [ ] Remove old SSH shortcuts
- [ ] Archive old backups
- [ ] Update documentation to remove legacy references

---

**Migration Status:** Ready to execute  
**Estimated Time:** 2-3 hours  
**Recommended Window:** Low-traffic period

