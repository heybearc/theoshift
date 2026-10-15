# TheoShift Task State

**Last updated:** 2026-10-15  
**Branch:** `main`  
**Production:** **LIVE** **GREEN** `10.92.3.22` · **STANDBY** **BLUE** `10.92.3.24` — both **v4.32.5**.

---

## Current Task

**Idle after v4.32.5** — pick next backlog item (mobile Positions/Volunteers, FB-036, or chat increment).

### What I'm doing right now

Nothing in progress. v4.32.5 is live and both nodes are synced.

### Recent completions

- ✅ **v4.32.5** — CSV import puts people on the volunteer roster; chat channel list no longer rewrites every position; qa-01 gate passed; switched + synced (`dc3b934d`)
- ✅ **v4.32.4** — Volunteers list keeps Inactive/search after an edit (`804d4e97`)
- ✅ **v4.32.3** — Case-insensitive overseer login; color hostnames map to their node (D-TS-048)

### Next steps

1. Triage `/admin/feedback`.
2. Pick next: mobile Positions/Volunteers, FB-036 profile fields, or chat increment.

## Exact next command

Open `/admin/feedback` or start the next backlog item on STANDBY (`https://blue.theoshift.com`).

---

## Known issues

**Current**

- None blocking.

**Infrastructure**

- Blue-green via HAProxy; do not assume container color without `get_deployment_status`.
- If MCP `haproxy.backend` is `error`, read `use_backend … if is_theoshift` before `/release` (D-TS-047).
- Color hostnames must stay on their node: `blue.theoshift.com` → BLUE, `green.theoshift.com` → GREEN (D-TS-048). After a switch, set qa-01 `STANDBY_URL=` to the new STANDBY color host.
- qa-01 `detect-standby.sh` cannot read HAProxy (Proxmox CT 136 is missing on that host) and falls back to `STANDBY_URL` in `/opt/tests/theoshift/.env.test`. As of 2026-10-15 that value is `https://blue.theoshift.com` (STANDBY). Fetch tags before the gate if the baseline is a new tag.
- qa-01 clone can be left dirty on `package-lock.json` after `npm install`. `git checkout -- package-lock.json` before the gate if the script reports a dirty tree.
