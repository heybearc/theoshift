# Blue-Green Deployment - Quick Reference
**One-Page Cheat Sheet**

---

## 🚀 **Quick Deploy (3 Steps)**

```
1. "Check deployment status"
2. "Deploy to standby"
3. "Switch traffic to standby"
```

---

## 🖥️ **Servers**

| Name | IP | Container | SSH | Role |
|------|------------|-----------|-----|------|
| BLUE | 10.92.3.22 | 132 | `jwa` | PROD/STANDBY |
| GREEN | 10.92.3.24 | 134 | `jwg` | STANDBY/PROD |
| HAProxy | 10.92.3.26 | 136 | `haproxy` | Load Balancer |
| PostgreSQL | 10.92.3.21 | 131 | `postgres` | Database |

---

## 🤖 **MCP Commands**

### Check Status
```
Check deployment status
```

### Deploy
```
Deploy to standby
Deploy to standby with migrations
```

### Switch Traffic
```
Switch traffic to standby
Switch traffic without approval
Switch traffic with emergency mode
```

---

## 🔧 **Manual Commands**

### Check Servers
```bash
ssh jwa "pm2 list"
ssh jwg "pm2 list"
```

### Restart
```bash
ssh jwa "pm2 restart jw-attendant-blue"
ssh jwg "pm2 restart jw-attendant"
```

### View Logs
```bash
ssh jwa "pm2 logs jw-attendant-blue --lines 50"
ssh jwg "pm2 logs jw-attendant --lines 50"
```

### Check State
```bash
ssh haproxy "/usr/local/bin/jw-deployment-state.sh get"
```

### Check HAProxy
```bash
ssh haproxy "grep default_backend /etc/haproxy/haproxy.cfg | grep jw_attendant"
```

---

## 🌐 **URLs**

```
Production:    https://attendant.cloudigan.net
BLUE:          http://10.92.3.22:3001
GREEN:         http://10.92.3.24:3001
HAProxy Stats: http://10.92.3.26:8404
```

---

## 🔄 **Common Workflows**

### Standard Deploy
```
1. Check status
2. Deploy to standby
3. Test standby manually
4. Switch traffic
5. Monitor
```

### Emergency Rollback
```
1. "Switch traffic with emergency mode"
```

### Hotfix
```
1. Fix on STANDBY
2. Test
3. Switch traffic
4. Deploy to new STANDBY
```

---

## ⚠️ **Troubleshooting**

### Health Check Fails
```bash
# Check if running
ssh jwa "pm2 list"
ssh jwg "pm2 list"

# Restart
ssh jwa "pm2 restart jw-attendant-blue"
```

### State Out of Sync
```bash
# Check HAProxy
ssh haproxy "grep default_backend /etc/haproxy/haproxy.cfg"

# Check state
ssh haproxy "/usr/local/bin/jw-deployment-state.sh get"

# Fix manually
ssh haproxy "/usr/local/bin/jw-deployment-state.sh set blue green"
```

### Git Issues
```bash
# Test pull
ssh jwa "cd /opt/jw-attendant-scheduler && git pull"
ssh jwg "cd /opt/jw-attendant-scheduler && git pull"
```

---

## 📁 **Important Files**

```
MCP Server:
/Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler/mcp-blue-green/server.js

State File:
/var/lib/jw-deployment/state.json (on HAProxy)

SSH Config:
~/.ssh/config

Git Credentials:
~/.git-credentials

Application:
/opt/jw-attendant-scheduler/ (on BLUE and GREEN)
```

---

## 🎯 **Best Practices**

✅ Always test on STANDBY first  
✅ Monitor after switching  
✅ Keep STANDBY updated  
✅ Use migrations carefully  
✅ Document changes  

---

## 🆘 **Emergency Contacts**

**Full Guide:** `BLUE_GREEN_COMPLETE_GUIDE.md`  
**Backlog:** `BACKLOG.md` (INFRA-001, INFRA-002)  
**Git Setup:** `GIT_CREDENTIALS_SETUP.md`

---

**Version:** 1.0.0  
**Last Updated:** October 25, 2025
