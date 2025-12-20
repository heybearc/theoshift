---
description: Sync STANDBY with GREEN code after release
---

# Sync Workflow

Synchronizes the STANDBY environment with GREEN code after a release, ensuring both environments are running the same version.

**Prerequisites:** Must run `/release` workflow first to switch traffic.

## Usage

Simply say: **"sync"** or **"/sync"**

This updates the STANDBY environment to match GREEN.

## What This Workflow Does

### Step 1: Identify Environments
- Determines current GREEN environment
- Identifies current STANDBY environment
- Verifies GREEN version

### Step 2: Deploy to STANDBY
- Deploys GREEN code to STANDBY
- Runs: `git pull && npm install && npm run build && pm2 restart`
- Ensures STANDBY matches GREEN exactly

### Step 3: Verify Sync
- Checks STANDBY version matches GREEN
- Verifies STANDBY is healthy
- Confirms both environments in sync

### Step 4: Report Status
- Shows both environments running same version
- Confirms ready for next development cycle
- STANDBY ready for next `/bump`

## Example

**After running "release":**

**You say:** "sync"

**Cascade does:**
```
1. ✅ Identify GREEN: Blue (v2.4.1)
2. ✅ Identify STANDBY: Green (v2.4.0)
3. ✅ Deploy v2.4.1 to Green
4. ✅ Verify sync successful

🔄 SYNC COMPLETE

GREEN: Blue (10.92.3.22:3001) - v2.4.1
STANDBY: Green (10.92.3.24:3001) - v2.4.1

Both environments in sync. Ready for next development cycle.
```

## Why Sync?

### After Release:
- GREEN has new version (e.g., v2.4.1)
- STANDBY has old version (e.g., v2.4.0)
- Need to sync STANDBY before next development

### Benefits:
- ✅ Both environments identical
- ✅ STANDBY ready for next `/bump`
- ✅ Clean slate for development
- ✅ Maintains blue-green capability

## Complete Release Flow

```
1. "bump" → Version bump + deploy to STANDBY
   PROD: v2.4.0 (Green)
   STANDBY: v2.4.1 (Blue)

2. Test on STANDBY

3. "release" → Switch traffic
   PROD: v2.4.1 (Blue) ← Traffic switched
   STANDBY: v2.4.0 (Green) ← Old version

4. "sync" → Update STANDBY
   PROD: v2.4.1 (Blue)
   STANDBY: v2.4.1 (Green) ← Now synced

Ready for next "bump"!
```

## Safety Features

### Validation
- ✅ Verifies GREEN is healthy
- ✅ Confirms STANDBY is accessible
- ✅ Checks git repository status
- ✅ Validates deployment successful

### No Impact on GREEN
- ✅ Only touches STANDBY
- ✅ GREEN unchanged
- ✅ No traffic impact
- ✅ Safe to run anytime

## When to Run

### Required After:
- Every `/release` (to sync environments)
- Traffic switch (to update STANDBY)

### Optional:
- After hotfix directly to GREEN
- To reset STANDBY to known good state
- Before starting new development cycle

## Troubleshooting

### Issue: Sync fails
- Check STANDBY PM2 status
- Verify git repository access
- Review build errors
- Check environment variables

### Issue: Versions don't match after sync
- Verify git pull successful
- Check package.json version
- Confirm build completed
- Restart PM2 process

## Related Workflows
- `/bump` - Version bump and deploy to STANDBY
- `/release` - Switch traffic to STANDBY
- `/staging-first-development` - Full CI/CD workflow

## Notes
- Run after every release
- Only affects STANDBY
- Ensures environments in sync
- Required before next bump
- Safe to run multiple times
