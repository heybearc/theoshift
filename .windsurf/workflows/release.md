---
description: Switch traffic from STANDBY to GREEN (after bump and testing)
---

# Release Workflow

Switches traffic from STANDBY to GREEN after you've tested and approved the changes.

**Prerequisites:** Must run `/bump` workflow first to prepare the release on STANDBY.

## Usage

Simply say: **"release"** or **"/release"**

This is your approval to switch traffic to the version currently on STANDBY.

## What This Workflow Does

### Step 1: Verify STANDBY Ready
- Checks that STANDBY has newer version than GREEN
- Verifies STANDBY is healthy and responding
- Confirms you've tested on STANDBY

### Step 2: Switch Traffic
- Uses HAProxy to switch traffic from GREEN to STANDBY
- STANDBY becomes new GREEN
- Old GREEN becomes new STANDBY
- Zero downtime switch

### Step 3: Verify Switch
- Confirms traffic is now going to new GREEN
- Checks new GREEN is healthy
- Monitors for any immediate issues

### Step 4: Report Status
- Shows current GREEN and STANDBY status
- Displays version running on each
- Confirms successful release

**Note:** After release, run `/sync` to update new STANDBY with GREEN code.

## Example

**After running "bump" and testing on STANDBY:**

**You say:** "release"

**Cascade does:**
```
1. ✅ Verify STANDBY ready: v2.4.1 (Blue)
2. ✅ Verify GREEN: v2.4.0 (Green)
3. ✅ Switch HAProxy traffic: Green → Blue
4. ✅ Confirm switch successful

🎉 RELEASE COMPLETE

New GREEN: Blue (10.92.3.22:3001) - v2.4.1
New STANDBY: Green (10.92.3.24:3001) - v2.4.0

Next: Run "sync" to update STANDBY with v2.4.1
```

## Safety Features

### Pre-Switch Validation
- ✅ Verifies STANDBY has newer version
- ✅ Confirms STANDBY is healthy
- ✅ Checks HAProxy is operational
- ✅ Validates both environments responding

### Zero-Downtime Switch
- ✅ HAProxy switches traffic instantly
- ✅ No service interruption
- ✅ Maintains active connections
- ✅ Rollback capability preserved

## Rollback

If issues are found after traffic switch:

**You say:** "rollback"

**Cascade does:**
1. Immediately switches traffic back to old GREEN
2. Logs the rollback
3. Failed release stays on STANDBY for debugging

## After Release

**Next step:** Run `/sync` to update new STANDBY with GREEN code

This ensures both environments are running the same version and you can start developing the next release.

## Complete Release Flow

```
1. "bump" → Version bump + deploy to STANDBY
2. Test on STANDBY
3. "release" → Switch traffic
4. "sync" → Update new STANDBY
```

## Related Workflows
- `/bump` - Version bump and deploy to STANDBY
- `/sync` - Sync STANDBY with GREEN
- `/staging-first-development` - Full CI/CD workflow

## Notes
- Must run `/bump` first
- Only switches traffic, doesn't deploy
- Zero downtime switch
- Rollback available immediately after switch
