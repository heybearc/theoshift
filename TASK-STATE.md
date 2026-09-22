# TheoShift Task State

**Last updated:** 2026-09-22  
**Branch:** `main`  
**Production:** **LIVE** **GREEN** `10.92.3.22` · **STANDBY** **BLUE** `10.92.3.24` — both **v4.32.2**.

---

## Current Task

**Idle after v4.32.2** — pick next backlog item (mobile Positions/Volunteers, FB-036, or chat increment).

### What I'm doing right now

Day board is the default Positions tab. Classic remains at `/positions` via **Use classic layout**. Volunteer PIN login is gone (magic link only).

### Recent completions

- ✅ **v4.32.2** — Positions day board default; PIN login/admin/schema removed; volunteer notes persist (FB-039); qa-01 gate + both nodes aligned (`62465c1d`)
- ✅ **v4.32.1** — Event clone parity
- ✅ **v4.32.0** — Positions day-board preview

### Next steps

1. Triage `/admin/feedback` (none NEW as of mid-day).
2. Pick next: mobile Positions/Volunteers, FB-036 profile fields, or chat increment.

## Exact next command

Open `/admin/feedback` or start the next backlog item on STANDBY.

---

## Known issues

**Current**

- None blocking. PIN `pinHash` dropped. Publish gate closed.

**Infrastructure**

- Blue-green via HAProxy; do not assume container color without `get_deployment_status`.
- If MCP `haproxy.backend` is `error`, read HAProxy `use_backend … if is_theoshift` before `/release` (D-TS-047).
- qa-01 `detect-standby.sh` can hang on Proxmox HAProxy SSH; prefer `STANDBY_URL=` in `.env.test`.
