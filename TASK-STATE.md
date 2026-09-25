# TheoShift Task State

**Last updated:** 2026-09-25  
**Branch:** `main`  
**Production:** **LIVE** **BLUE** `10.92.3.24` · **STANDBY** **GREEN** `10.92.3.22` — both **v4.32.3**.

---

## Current Task

**Idle after v4.32.3** — pick next backlog item (mobile Positions/Volunteers, FB-036, or chat increment).

### What I'm doing right now

Overseer/admin login matches email case-insensitively. Day board remains the default Positions tab.

### Recent completions

- ✅ **v4.32.3** — Case-insensitive overseer login; qa-01 gate; switched + synced (`185e2062`); color hostnames map to their node (D-TS-048)
- ✅ **v4.32.2** — Positions day board default; PIN login removed; volunteer notes persist
- ✅ **v4.32.1** — Event clone parity

### Next steps

1. Triage `/admin/feedback` (none NEW as of end-day).
2. Pick next: mobile Positions/Volunteers, FB-036 profile fields, or chat increment.

## Exact next command

Open `/admin/feedback` or start the next backlog item on STANDBY.

---

## Known issues

**Current**

- None blocking.

**Infrastructure**

- Blue-green via HAProxy; do not assume container color without `get_deployment_status`.
- If MCP `haproxy.backend` is `error`, read `use_backend … if is_theoshift` before `/release` (D-TS-047).
- Color hostnames must stay on their node: `blue.theoshift.com` → BLUE, `green.theoshift.com` → GREEN (D-TS-048). After a switch, set qa-01 `STANDBY_URL=` to the new STANDBY color host.
- qa-01 `detect-standby.sh` can hang on Proxmox HAProxy SSH; prefer `STANDBY_URL=` in `.env.test`. Fetch tags before the gate if the baseline is a new tag.
