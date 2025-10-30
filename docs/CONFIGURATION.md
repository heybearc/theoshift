# Configuration Management

## Overview

This application uses **two separate configuration systems**:

1. **`.env.production`** - Application environment variables (secrets, URLs, etc.)
2. **`ecosystem.config.js`** - PM2 process manager settings

**CRITICAL:** These must remain separate. Never put environment variables in `ecosystem.config.js`.

---

## Environment Variables (.env.production)

### What Goes Here
- Database URLs
- API keys and secrets
- NextAuth configuration
- Feature flags
- Upload directories

### Example
```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/db"
NEXTAUTH_URL="https://attendant.cloudigan.net"
NEXTAUTH_SECRET="your-secret-here"
UPLOAD_DIR="/opt/jw-attendant-scheduler/public/uploads"
```

### Important Notes
- ✅ This file is in `.gitignore` (never commit secrets)
- ✅ Next.js automatically loads this when `NODE_ENV=production`
- ✅ This is the **single source of truth** for all env vars

---

## PM2 Configuration (ecosystem.config.js)

### What Goes Here
- Process name
- Start command
- Restart policies
- Memory limits
- Instance count

### Example
```javascript
module.exports = {
  apps: [{
    name: 'jw-attendant',
    script: 'npm',
    args: 'start -- --port 3001',
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G'
  }]
}
```

### Important Notes
- ✅ This file is in `.gitignore` (server-specific)
- ✅ Use `ecosystem.config.template.js` as a starting point
- ❌ **NEVER add `env:` object here** - use `.env.production` instead

---

## Validation

### Automatic Validation
Every time you run `npm run build`, the configuration is validated:

```bash
npm run build
# Runs: validate-config → checks ecosystem.config.js → then builds
```

### Manual Validation
```bash
npm run validate-config
```

This checks for:
- Environment variables in `ecosystem.config.js` (forbidden)
- `env:` object in `ecosystem.config.js` (forbidden)

---

## Deployment Checklist

### On Each Server

1. **Copy template to config**
   ```bash
   cp ecosystem.config.template.js ecosystem.config.js
   ```

2. **Verify .env.production exists**
   ```bash
   ls -la .env.production
   ```

3. **Validate configuration**
   ```bash
   npm run validate-config
   ```

4. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

---

## Troubleshooting

### Authentication Fails
**Symptom:** "Invalid credentials" error

**Cause:** `NEXTAUTH_SECRET` mismatch between what's in `.env.production` and what was used to create password hashes

**Fix:**
1. Check `.env.production` has correct `NEXTAUTH_SECRET`
2. Ensure `ecosystem.config.js` has NO `env:` object
3. Restart PM2: `pm2 restart all`

### Environment Variables Not Loading
**Symptom:** App can't connect to database or other services

**Cause:** `ecosystem.config.js` has `env:` object that's overriding `.env.production`

**Fix:**
1. Run `npm run validate-config`
2. Remove `env:` object from `ecosystem.config.js`
3. Restart PM2: `pm2 restart all`

---

## Best Practices

### ✅ DO
- Keep all secrets in `.env.production`
- Use `ecosystem.config.template.js` as a starting point
- Run `npm run validate-config` before deploying
- Document any new environment variables

### ❌ DON'T
- Put environment variables in `ecosystem.config.js`
- Commit `.env.production` or `ecosystem.config.js` to git
- Duplicate variables between files
- Skip validation before deployment

---

## History

**2025-10-30:** Separated environment variables from PM2 config to fix authentication issues caused by `NEXTAUTH_SECRET` mismatch.
