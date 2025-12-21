---
description: Switch traffic to STANDBY (making it LIVE) after bump and testing
---

# Release Workflow

Switches traffic to STANDBY after you've tested and approved the changes. STANDBY becomes the new LIVE.

**Prerequisites:** Must run `/bump` workflow first to prepare the release on STANDBY.

**Works for:** Theocratic Shift Scheduler (jw-attendant) and LDC Tools (ldc-tools)

## Usage

Simply say: **"release"** or **"/release"**

This is your approval to switch traffic to the version currently on STANDBY.

## What This Workflow Does

### Step 1: Verify STANDBY Ready
- Checks that STANDBY has newer version than LIVE
- Verifies STANDBY is healthy and responding
- Confirms you've tested on STANDBY

### Step 2: Switch Traffic
- MCP uses HAProxy to switch traffic to STANDBY
- STANDBY becomes new LIVE
- Old LIVE becomes new STANDBY
- Zero downtime switch
- Updates state tracking file

### Step 3: Verify Switch
- Confirms traffic is now going to new LIVE
- Checks new LIVE is healthy
- Monitors for any immediate issues

### Step 4: Report Status
- Shows current LIVE and STANDBY status
- Displays version running on each
- Confirms successful release

**Note:** After release, run `/sync` to update new STANDBY with LIVE code.

## Example

**After running "bump" and testing on STANDBY:**

**You say:** "release"

**Cascade does:**
```
1. ✅ Verify STANDBY ready: v2.4.1 (Blue)
2. ✅ Verify LIVE: v2.4.0 (Green)
3. ✅ Switch HAProxy traffic: Green → Blue
4. ✅ Update state tracking
5. ✅ Confirm switch successful

🎉 RELEASE COMPLETE

New LIVE: Blue (10.92.3.22:3001) - v2.4.1 ← Users now here
New STANDBY: Green (10.92.3.24:3001) - v2.4.0 ← Old version

Next: Run "sync" to update STANDBY with v2.4.1
```

## Safety Features

### Pre-Switch Validation
- ✅ MCP dynamically identifies current LIVE/STANDBY
- ✅ Verifies STANDBY is healthy
- ✅ Checks HAProxy is operational
- ✅ Validates both environments responding
- ✅ Works identically for theoshift and ldc-tools

### Zero-Downtime Switch
- ✅ HAProxy switches traffic instantly
- ✅ No service interruption
- ✅ Maintains active connections
- ✅ Rollback capability preserved

## Rollback

If issues are found after traffic switch:

**You say:** "release" (again)

**Cascade does:**
1. Immediately switches traffic back to old LIVE
2. Updates state tracking
3. Failed release stays on STANDBY for debugging

**Note:** Running "release" again just swaps LIVE/STANDBY back.

## After Release

**Next step:** Run `/sync` to update new STANDBY with LIVE code

This ensures both environments are running the same version and you can start developing the next release.

## Complete Release Flow

```
1. "bump" → Version bump + deploy to STANDBY
2. Test on STANDBY
3. "release" → Switch traffic (STANDBY becomes LIVE)
4. "sync" → Update new STANDBY to match LIVE
```

## Related Workflows
- `/bump` - Version bump and deploy to STANDBY
- `/sync` - Sync STANDBY with LIVE
- `/staging-first-development` - Full CI/CD workflow

## Notes
- Must run `/bump` first
- Only switches traffic, doesn't deploy
- Zero downtime switch
- Rollback available immediately after switch
