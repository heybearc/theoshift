# TheoShift Task State

**Last updated:** 2026-10-26  
**Branch:** `main`  
**Production:** **LIVE** **GREEN** `10.92.3.22` · **STANDBY** **BLUE** `10.92.3.24` — both **v4.33.9** (`2865d196`). Switch #99 and sync 2026-10-26.

---

## Current Task

**Idle after v4.33.9** — pick next backlog item (FB-036, or the next mobile admin tables).

### What I'm doing right now

Nothing in progress. v4.33.9 is live. No undeployed work on `main`.

### Recent completions

- ✅ **v4.33.9** — Volunteer notes stay on the list; phone layout for Positions and Volunteers (`2865d196`, released 2026-10-26)
- ✅ **v4.33.8** — Phone chat alerts use the event name; station checkbox is on the left (`a108daa0`, released 2026-10-26)
- ✅ **v4.33.7** — Collapsed stations stay one row; Station box sets this day’s overseer/keyman (`5e0acd65`, released 2026-10-26)
- ✅ **v4.33.6** — Bulk create on Positions opens again (`03cbb210`, released 2026-10-26)
- ✅ **v4.33.5** — Shift-click stays checked on every multi-select; volunteer export respects filters (`2d8193c8`, released 2026-10-25)
- ✅ **v4.33.4** — Station checkbox selects that day’s shifts (`3176ea58`, released 2026-10-20)
- ✅ **v4.33.3** — Shift select on collapsed stations; last shift-click checkbox stays checked
- ✅ **v4.33.2** — Position oversight lists stay on this event
- ✅ **v4.33.1** — Choose which shifts get an overseer or keyman; skip changeme availability emails
- ✅ **v4.33.0** — Classic Positions bulk tools on the day board
- ✅ **v4.32.5** — CSV import puts people on the volunteer roster; chat channel list no longer rewrites every position

### Next steps

1. Pick next: **FB-036** volunteer age and photo, or mobile admin tables.
2. FB-039 (volunteer notes) is resolved in v4.33.9.

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
- qa-01 `detect-standby.sh` cannot read HAProxy (Proxmox CT 136 is missing on that host) and falls back to `STANDBY_URL` in `/opt/tests/theoshift/.env.test`. After the 2026-10-26 v4.33.9 switch, STANDBY is BLUE, so that value must be `https://blue.theoshift.com`. Fetch tags before the gate if the baseline is a new tag.
- qa-01 clone can be left dirty on `package-lock.json` after `npm install`. `git checkout -- package-lock.json` before the gate if the script reports a dirty tree.
