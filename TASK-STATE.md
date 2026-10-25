# TheoShift Task State

**Last updated:** 2026-10-24  
**Branch:** `main`  
**Production:** **LIVE** **BLUE** `10.92.3.24` · **STANDBY** **GREEN** `10.92.3.22` — both **v4.33.4** (`3176ea58`). Last switch 2026-10-20; standby deploy succeeded.

---

## Current Task

**Idle after v4.33.4** — pick next backlog item (mobile Positions/Volunteers, FB-036, FB-039, or chat increment).

### What I'm doing right now

Nothing in progress. v4.33.4 is live. No undeployed work on `main`.

### Recent completions

- ✅ **v4.33.4** — Station checkbox selects that day’s shifts (`3176ea58`, released 2026-10-20)
- ✅ **v4.33.3** — Shift select on collapsed stations; last shift-click checkbox stays checked
- ✅ **v4.33.2** — Position oversight lists stay on this event
- ✅ **v4.33.1** — Choose which shifts get an overseer or keyman; skip changeme availability emails
- ✅ **v4.33.0** — Classic Positions bulk tools on the day board
- ✅ **v4.32.5** — CSV import puts people on the volunteer roster; chat channel list no longer rewrites every position

### Next steps

1. Triage `/admin/feedback`. Open urgent: **FB-039** (IN_PROGRESS, title “Note”).
2. Pick next: mobile Positions/Volunteers, FB-036 profile fields, or chat increment.

## Exact next command

Open `/admin/feedback` or start the next backlog item on STANDBY (`https://green.theoshift.com`).

---

## Known issues

**Current**

- None blocking.

**Infrastructure**

- Blue-green via HAProxy; do not assume container color without `get_deployment_status`.
- If MCP `haproxy.backend` is `error`, read `use_backend … if is_theoshift` before `/release` (D-TS-047).
- Color hostnames must stay on their node: `blue.theoshift.com` → BLUE, `green.theoshift.com` → GREEN (D-TS-048). After a switch, set qa-01 `STANDBY_URL=` to the new STANDBY color host.
- qa-01 `detect-standby.sh` cannot read HAProxy (Proxmox CT 136 is missing on that host) and falls back to `STANDBY_URL` in `/opt/tests/theoshift/.env.test`. After the 2026-10-20 switch, STANDBY is GREEN, so that value must be `https://green.theoshift.com`. Fetch tags before the gate if the baseline is a new tag.
- qa-01 clone can be left dirty on `package-lock.json` after `npm install`. `git checkout -- package-lock.json` before the gate if the script reports a dirty tree.
