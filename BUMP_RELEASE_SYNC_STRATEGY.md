# Bump/Release/Sync Strategy

## ✅ Unified Workflow for Both Apps

This workflow works **identically** for:
- **Theocratic Shift Scheduler** (theoshift)
- **LDC Construction Tools** (ldc-tools)

The MCP server dynamically identifies which server is LIVE and which is STANDBY, so you never need to specify server names.

---

## 🔄 The Three-Step Process

### 1️⃣ BUMP
**What it does:**
1. **Bumps version number** based on work performed (patch/minor/major)
2. **Writes user-friendly release notes** (following TEMPLATE.md)
3. **Adds in-app announcement banner** about new release
4. **Updates help pages** and creates new help topics if needed
5. **Commits and pushes** to production-gold-standard branch
6. **Deploys to STANDBY** (whichever server isn't LIVE)

**Command:** `bump` or `bump patch` or `bump minor` or `bump major`

**Result:**
- LIVE: v2.4.0 (Green) ← Users still here
- STANDBY: v2.4.1 (Blue) ← New version ready for testing

**Next:** Test on STANDBY, then say "release"

---

### 2️⃣ RELEASE
**What it does:**
1. **Verifies STANDBY is healthy** and ready
2. **Switches HAProxy traffic** to STANDBY
3. **STANDBY becomes new LIVE**
4. **Old LIVE becomes new STANDBY**
5. **Updates state tracking** file

**Command:** `release`

**Result:**
- LIVE: v2.4.1 (Blue) ← Users now here
- STANDBY: v2.4.0 (Green) ← Old version

**Next:** Say "sync" to update new STANDBY

---

### 3️⃣ SYNC
**What it does:**
1. **Identifies current LIVE** environment
2. **Deploys LIVE code to STANDBY**
3. **Ensures both environments match**
4. **Verifies sync successful**

**Command:** `sync`

**Result:**
- LIVE: v2.4.1 (Blue) ← Users here
- STANDBY: v2.4.1 (Green) ← Now synced

**Next:** Ready for next development cycle

---

## 📊 Complete Flow Example

```
┌─────────────────────────────────────────────────────────────┐
│ INITIAL STATE                                               │
├─────────────────────────────────────────────────────────────┤
│ LIVE:    v2.4.0 (Green - 10.92.3.24)  ← Users here         │
│ STANDBY: v2.4.0 (Blue - 10.92.3.22)   ← Ready for deploy   │
└─────────────────────────────────────────────────────────────┘

                           ↓
                    You say: "bump"
                           ↓

┌─────────────────────────────────────────────────────────────┐
│ AFTER BUMP                                                  │
├─────────────────────────────────────────────────────────────┤
│ LIVE:    v2.4.0 (Green - 10.92.3.24)  ← Users still here   │
│ STANDBY: v2.4.1 (Blue - 10.92.3.22)   ← New version!       │
│                                                             │
│ Actions performed:                                          │
│ ✅ Version bumped to 2.4.1                                 │
│ ✅ Release notes created                                   │
│ ✅ Announcement banner added                               │
│ ✅ Help pages updated                                      │
│ ✅ Deployed to STANDBY (Blue)                              │
│                                                             │
│ 🧪 TEST URL: http://10.92.3.22:3001                        │
└─────────────────────────────────────────────────────────────┘

                           ↓
                You test on STANDBY
                           ↓
                   You say: "release"
                           ↓

┌─────────────────────────────────────────────────────────────┐
│ AFTER RELEASE                                               │
├─────────────────────────────────────────────────────────────┤
│ LIVE:    v2.4.1 (Blue - 10.92.3.22)   ← Users now here! 🎉 │
│ STANDBY: v2.4.0 (Green - 10.92.3.24)  ← Old version        │
│                                                             │
│ Actions performed:                                          │
│ ✅ HAProxy traffic switched to Blue                        │
│ ✅ Blue is now LIVE                                        │
│ ✅ Green is now STANDBY                                    │
│ ✅ State tracking updated                                  │
└─────────────────────────────────────────────────────────────┘

                           ↓
                    You say: "sync"
                           ↓

┌─────────────────────────────────────────────────────────────┐
│ AFTER SYNC                                                  │
├─────────────────────────────────────────────────────────────┤
│ LIVE:    v2.4.1 (Blue - 10.92.3.22)   ← Users here         │
│ STANDBY: v2.4.1 (Green - 10.92.3.24)  ← Now synced!        │
│                                                             │
│ Actions performed:                                          │
│ ✅ Deployed v2.4.1 to Green (STANDBY)                      │
│ ✅ Both environments now identical                         │
│ ✅ Ready for next development cycle                        │
└─────────────────────────────────────────────────────────────┘

                           ↓
              Ready for next "bump"!
```

---

## 🎯 Key Principles

### 1. MCP Handles Everything
- **You never specify server names** (Blue/Green)
- MCP reads HAProxy to determine LIVE/STANDBY
- Works identically for both apps
- State tracking prevents confusion

### 2. LIVE is Sacred
- **Bump** deploys to STANDBY only
- **Release** switches traffic (requires approval)
- **Sync** updates STANDBY only
- LIVE is never touched during development

### 3. Always in Sync
- After release, run sync immediately
- Keeps both environments identical
- STANDBY ready for next bump
- Clean development cycle

### 4. Rollback is Easy
- Just say "release" again
- Swaps LIVE/STANDBY back
- Zero downtime
- Old version still on STANDBY

---

## 📝 What Bump Includes

### Version Bump
- Reads current version from `package.json`
- Increments based on type (patch/minor/major)
- Updates `package.json` with new version

### Release Notes
- Creates `release-notes/v{version}.md`
- User-friendly language (no technical jargon)
- Categorizes changes: Bug Fixes, New Features, Improvements
- Follows TEMPLATE.md format strictly

### Announcement Banner
- Creates in-app announcement in database
- Shows banner to users about new release
- Links to release notes page
- Auto-dismissible after viewing

### Help Documentation
- Updates existing help topics for changed features
- Creates new help topics for new features
- Ensures help content matches functionality
- Reviews help index for completeness

### Deployment
- Commits all changes
- Pushes to production-gold-standard
- Deploys to STANDBY only
- Verifies deployment successful

---

## 🔒 Safety Features

### Pre-Deployment
- ✅ Verifies on production-gold-standard branch
- ✅ Checks for uncommitted changes
- ✅ Validates version format
- ✅ Ensures release notes created

### During Deployment
- ✅ MCP identifies STANDBY dynamically
- ✅ Never touches LIVE
- ✅ Health checks after deployment
- ✅ Rollback if health check fails

### Traffic Switch
- ✅ Requires explicit approval
- ✅ Verifies STANDBY healthy
- ✅ Zero downtime switch
- ✅ Updates state tracking
- ✅ Immediate rollback available

---

## 🚀 App-Specific Details

### Theocratic Shift Scheduler (theoshift)
- **Branch:** production-gold-standard
- **Blue:** 10.92.3.22 (Container 132)
- **Green:** 10.92.3.24 (Container 134)
- **State File:** /var/lib/haproxy/jw-deployment-state.json
- **PM2 Processes:** theoshift-blue, theoshift-green

### LDC Construction Tools (ldc-tools)
- **Branch:** main
- **Blue:** 10.92.3.23 (Container 133)
- **Green:** 10.92.3.25 (Container 135)
- **State File:** /var/lib/haproxy/ldc-deployment-state.json
- **PM2 Processes:** ldc-production, ldc-staging

**Note:** MCP handles all these details automatically. You just say bump/release/sync.

---

## 🔍 How to Check Status

**Command:** `mcp3_get_deployment_status(app: "theoshift")`

**Shows:**
- Which server is LIVE (currently serving users)
- Which server is STANDBY (ready for deployment)
- Health status of both
- HAProxy backend routing
- Last traffic switch time
- Total number of switches

---

## ❓ Common Questions

**Q: Which server should I deploy to?**
A: You don't choose. MCP automatically deploys to STANDBY.

**Q: How do I know which is LIVE?**
A: Run `mcp3_get_deployment_status` or check state file.

**Q: Can I skip sync?**
A: Not recommended. Sync keeps environments identical for next bump.

**Q: What if I find a bug after release?**
A: Say "release" again to rollback, or fix and bump again.

**Q: Do I need to specify the app?**
A: MCP defaults to theoshift. For LDC Tools, specify `app: "ldc-tools"`.

**Q: What if bump fails?**
A: Fix the issue, run bump again. Version increments automatically.

---

## 📚 Related Documentation

- `LIVE_STANDBY_WORKFLOW.md` - Detailed LIVE/STANDBY explanation
- `.windsurf/workflows/bump.md` - Bump workflow details
- `.windsurf/workflows/release.md` - Release workflow details
- `.windsurf/workflows/sync.md` - Sync workflow details
- `release-notes/TEMPLATE.md` - Release notes guidelines

---

**Last Updated:** December 21, 2025
**Status:** ✅ Production Ready
**Works For:** Both theoshift and ldc-tools identically
