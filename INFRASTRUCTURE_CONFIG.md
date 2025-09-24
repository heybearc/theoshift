# JW ATTENDANT SCHEDULER - IMMUTABLE INFRASTRUCTURE CONFIGURATION
## Container and Network Configuration - AUTHORITATIVE SOURCE

**📅 Last Updated:** September 23, 2025  
**🛡️ Status:** IMMUTABLE - DO NOT MODIFY WITHOUT EXPLICIT APPROVAL  
**⚠️ Authority:** This file overrides all other infrastructure references

---

## 🏗️ CONTAINER INFRASTRUCTURE

### **STAGING ENVIRONMENT**
```
Container ID: 134
IP Address: 10.92.3.24
Port: 3001
Purpose: Development and testing
URL: https://jw-staging.cloudigan.net
SSH: ssh root@10.92.3.24
```

### **PRODUCTION ENVIRONMENT**
```
Container ID: 132
IP Address: 10.92.3.22
Port: 3001
Purpose: Live application
URL: https://jw-production.cloudigan.net
SSH: ssh root@10.92.3.22
```

### **DATABASE ENVIRONMENT**
```
Container ID: 131
IP Address: 10.92.3.21
Port: 5432
Purpose: PostgreSQL database server (shared)
Service: PostgreSQL 15+
SSH: ssh root@10.92.3.21
```

---

## 🔄 CI/CD DEPLOYMENT PIPELINE

### **DEPLOYMENT FLOW:**
```
Local Development → Staging (134/10.92.3.24) → Production (132/10.92.3.22)
```

### **DEPLOYMENT COMMANDS:**
```bash
# Deploy to Staging
ssh root@10.92.3.24 "cd /opt/jw-attendant-scheduler && git pull origin staging && npm install && npm run dev -- --port 3001"

# Deploy to Production  
ssh root@10.92.3.22 "cd /opt/jw-attendant-scheduler && git pull origin main && npm install && npm run build && npm start -- --port 3001"
```

### **DATABASE CONNECTION:**
```bash
# From Staging
DATABASE_URL="postgresql://jw_user:jw_password@10.92.3.21:5432/jw_attendant_scheduler"

# From Production
DATABASE_URL="postgresql://jw_user:jw_password@10.92.3.21:5432/jw_attendant_scheduler"
```

---

## 🛡️ APEX GUARDIAN VALIDATION

### **CONTAINER VERIFICATION COMMANDS:**
```bash
# Verify Staging (Container 134)
ssh root@10.92.3.24 "hostname && ip addr show | grep '10.92.3.24'"

# Verify Production (Container 132)  
ssh root@10.92.3.22 "hostname && ip addr show | grep '10.92.3.22'"

# Verify Database (Container 131)
ssh root@10.92.3.21 "hostname && ip addr show | grep '10.92.3.21' && systemctl status postgresql"
```

### **APPLICATION STATUS CHECKS:**
```bash
# Check Staging Application
curl -I http://10.92.3.24:3001

# Check Production Application
curl -I http://10.92.3.22:3001

# Check Database Connection
ssh root@10.92.3.21 "sudo -u postgres psql -c '\l' | grep jw_attendant"
```

---

## 📊 ENVIRONMENT VARIABLES

### **STAGING (.env.staging):**
```env
NODE_ENV=development
PORT=3001
NEXTAUTH_URL=https://jw-staging.cloudigan.net
NEXT_PUBLIC_APP_URL=https://jw-staging.cloudigan.net
DATABASE_URL=postgresql://jw_user:jw_password@10.92.3.21:5432/jw_attendant_scheduler
NEXTAUTH_SECRET=staging-secret-2024-secure-fqdn
```

### **PRODUCTION (.env.production):**
```env
NODE_ENV=production
PORT=3001
NEXTAUTH_URL=https://jw-production.cloudigan.net
NEXT_PUBLIC_APP_URL=https://jw-production.cloudigan.net
DATABASE_URL=postgresql://jw_user:jw_password@10.92.3.21:5432/jw_attendant_scheduler
NEXTAUTH_SECRET=production-secret-2024-secure-fqdn
```

---

## 🚨 CRITICAL DEPLOYMENT RULES

### **RULE 1: EXACT CODE DEPLOYMENT**
- Deploy exact staging codebase to production
- No custom builds or modifications between environments
- Use git pull for deployments, never direct file copying

### **RULE 2: ENVIRONMENT ISOLATION**
- Only environment variables differ between staging/production
- Same dependencies, same build process, same configuration
- Database shared but with proper connection strings

### **RULE 3: VALIDATION REQUIREMENTS**
- Test on staging before production deployment
- Verify container IPs and connectivity
- Validate database connections before deployment

---

## 🔧 TROUBLESHOOTING

### **COMMON ISSUES:**
1. **Wrong Container IP:** Always verify with `ip addr show`
2. **Port Conflicts:** Ensure port 3001 is available
3. **Database Connection:** Verify 10.92.3.21:5432 accessibility
4. **SSH Access:** Confirm SSH keys and access permissions

### **RECOVERY COMMANDS:**
```bash
# Restart Staging Application
ssh root@10.92.3.24 "cd /opt/jw-attendant-scheduler && pkill -f 'next.*3001' && npm run dev -- --port 3001"

# Restart Production Application  
ssh root@10.92.3.22 "cd /opt/jw-attendant-scheduler && pkill -f 'next.*3001' && npm start -- --port 3001"

# Check Database Status
ssh root@10.92.3.21 "systemctl status postgresql && sudo -u postgres psql -c 'SELECT version();'"
```

---

**🛡️ APEX CASCADE RULES: This infrastructure configuration is IMMUTABLE and takes precedence over all other documentation. Any changes require explicit approval and must be updated in this authoritative source.**

**📋 VALIDATION:** All APEX tools and deployment scripts must reference this file for accurate container and network information.**
