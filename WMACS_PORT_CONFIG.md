# WMACS IMMUTABLE PORT CONFIGURATION

## 🔒 IMMUTABLE REFERENCE - DO NOT CHANGE

**Theocratic Shift Scheduler Port Assignment:**
- **PORT: 3001** (IMMUTABLE)
- **Protocol: HTTP**
- **Binding: 0.0.0.0:3001**

## 🎯 Environment Assignments

### Staging Environment
- **Server:** LXC 131 (10.92.3.24)
- **URL:** http://10.92.3.24:3001
- **Status:** ✅ ACTIVE

### Production Environment  
- **Server:** LXC 132 (10.92.3.22)
- **URL:** http://10.92.3.22:3001
- **Status:** 🔄 NEEDS UPDATE TO PORT 3001

## 🚨 CRITICAL DEPLOYMENT RULE

**ALL THEOCRATIC SHIFT SCHEDULER DEPLOYMENTS MUST USE PORT 3001**

This includes:
- ✅ Development environments
- ✅ Staging environments  
- ✅ Production environments
- ✅ Testing environments
- ✅ CI/CD pipelines

## 📋 Configuration Files That Must Reference Port 3001

1. **Environment Variables (.env)**
   ```
   PORT=3001
   NEXTAUTH_URL=http://[server-ip]:3001
   ```

2. **Systemd Service Files**
   ```
   Environment=PORT=3001
   ```

3. **Next.js Configuration**
   ```
   npm start -- --port 3001
   ```

4. **Docker/Container Configurations**
   ```
   EXPOSE 3001
   ```

## 🔧 WMACS Guardian Enforcement

This configuration is enforced by WMACS Guardian deployment scripts.
Any deployment attempting to use a different port will be automatically corrected to port 3001.

## 📅 Last Updated
- Date: 2025-09-22
- By: WMACS Guardian System
- Reason: User specified port 3001 as immutable standard

---
**⚠️ WARNING: This is an immutable configuration. Do not modify without explicit user authorization.**
