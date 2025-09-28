# APEX System Configuration - Shared Standards

## 🛡️ Universal APEX Guardian Standards

This document defines the **immutable standards** that ALL APEX-managed systems must follow.

### 🎯 **Core Principles**

1. **Environment Isolation:** Zero cross-contamination between environments
2. **Artifact-Based Deployment:** Identical code, environment-specific config
3. **Port Immutability:** Port 3001 is sacred and unchangeable
4. **Clean Slate Deployments:** Fresh deployments prevent configuration drift
5. **Version Control Everything:** All changes tracked and reversible

### 🏗️ **Standard Directory Structure**

```
/opt/
├── {app-name}-staging/          # Staging environment
├── {app-name}-production/       # Production environment
└── {app-name}-backup-{date}/    # Automated backups
```

### 📋 **Standard Environment Variables**

#### **Required for ALL Applications:**
```bash
NODE_ENV=production              # Always production for deployed apps
PORT=3001                       # Immutable port requirement
NEXTAUTH_SECRET={env-specific}   # Unique per environment
NEXTAUTH_URL={env-specific}      # Environment-specific URL
DATABASE_URL={env-specific}      # Separate databases per environment
```

#### **Environment-Specific Patterns:**
```bash
# Staging
NEXTAUTH_URL=http://10.92.3.24:3001
DATABASE_URL=postgresql://user_staging:pass@db:5432/app_staging

# Production  
NEXTAUTH_URL=http://10.92.3.22:3001
DATABASE_URL=postgresql://user_prod:pass@db:5432/app_production
```

### 🔧 **Standard Systemd Service Template**

```ini
[Unit]
Description={App Name} ({Environment})
After=network.target

[Service]
Type=exec
User=root
Group=root
WorkingDirectory=/opt/{app-name}-{environment}
Environment=PATH=/usr/bin:/bin
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/npm start
ExecReload=/bin/kill -s HUP $MAINPID
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 🚀 **Standard Deployment Process**

#### **1. Pre-Deployment Checklist:**
- [ ] Code tested locally
- [ ] Build successful locally
- [ ] No hardcoded environment references
- [ ] Environment variables validated
- [ ] Backup created

#### **2. Deployment Commands:**
```bash
# Stop service
systemctl stop {service-name}

# Clean deployment
rm -rf /opt/{app-name}-{environment}
mkdir -p /opt/{app-name}-{environment}

# Deploy application code only
rsync -av --exclude='apex-*' --exclude='test-*' \
  --exclude='.github/' --exclude='scripts/' \
  src/ package.json package-lock.json configs/ \
  root@{server}:/opt/{app-name}-{environment}/

# Inject environment-specific configuration
cat > /opt/{app-name}-{environment}/.env << EOF
{environment-specific-variables}
EOF

# Build and start
cd /opt/{app-name}-{environment}
npm install
npm run build
systemctl start {service-name}
```

#### **3. Post-Deployment Verification:**
```bash
# Verify no cross-environment references
grep -r "{other-environment-ip}" /opt/{app-name}-{environment}/ \
  --exclude-dir=node_modules --exclude-dir=.git

# Test service
systemctl status {service-name}
curl -s http://{server}:3001/health

# Monitor logs
journalctl -u {service-name} -f
```

### 🔍 **Standard Monitoring**

#### **Health Check Endpoints:**
- `/health` - Basic service health
- `/api/auth/providers` - Authentication health
- `/api/health/db` - Database connectivity

#### **Log Locations:**
- Service logs: `journalctl -u {service-name}`
- Application logs: `/var/log/{app-name}.log`
- Error logs: `/var/log/{app-name}-error.log`

### 🚨 **Emergency Procedures**

#### **Service Down:**
1. Check service status: `systemctl status {service-name}`
2. Check logs: `journalctl -u {service-name} -n 50`
3. Restart service: `systemctl restart {service-name}`
4. If failed, rollback to backup deployment

#### **Cross-Environment Contamination:**
1. **IMMEDIATE:** Stop affected services
2. **VERIFY:** Check environment configurations
3. **CLEAN:** Deploy fresh artifacts with correct configs
4. **TEST:** Validate each environment independently

### 📊 **Standard Success Metrics**

- ✅ **Uptime:** >99.9% service availability
- ✅ **Response Time:** <500ms average response
- ✅ **Zero Cross-Contamination:** No environment mixing
- ✅ **Clean Deployments:** All deployments artifact-based
- ✅ **Port Compliance:** All services on port 3001

### 🛠️ **Required Tools**

Every APEX system must include:
- `apex-clean-deploy.sh` - Clean deployment script
- `apex-health-check.sh` - Health monitoring script
- `apex-backup.sh` - Automated backup script
- `CASCADE_APEX_GUARDIAN_RULE.md` - Guardian rules

### 🔐 **Security Standards**

- **Secrets Management:** Environment-specific secrets only
- **Access Control:** Root access for deployments only
- **Network Security:** Port 3001 only, no additional ports
- **Backup Security:** Encrypted backups with rotation

---

## 🎯 **Implementation Checklist**

For any new APEX system:
- [ ] Implement standard directory structure
- [ ] Create environment-specific configurations
- [ ] Deploy APEX Guardian tools
- [ ] Set up standard monitoring
- [ ] Test emergency procedures
- [ ] Validate success metrics

**This configuration is IMMUTABLE and applies to ALL APEX-managed systems.**
