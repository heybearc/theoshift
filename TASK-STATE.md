# TheoShift Task State

**Last updated:** 2026-09-13  
**Branch:** `main`  
**Production:** **LIVE** **GREEN** `10.92.3.22` · **STANDBY** **BLUE** `10.92.3.24` — both **v4.32.1**.

---

## Current Task

**Positions redesign — publish gate** — NEXT

### What I'm doing right now

Day-board preview is live in **v4.32.0+** (optional via **Try new layout**). Classic Positions remains the default Positions tab until explicitly published. Clone parity shipped in **v4.32.1**.

### Recent completions

- ✅ **v4.32.1** — Event clone parity (roster flag, oversight columns, shiftDate/volunteersNeeded, fresh lanyards, scoped permission remap); qa-01 gate + ship + sync
- ✅ **v4.32.0** — Positions day-board preview (stations by day, collapse UX, day-scoped auto-assign, thin bulk setup, help)
- ✅ **v4.31.0** — Availability filter; assign-time edits; safer Positions notifications; chat push copy; mobile polish

### Next steps

1. Smoke day board on production (`Try new layout`).
2. When ready: publish gate — make day board the default Positions nav target.
3. Optional: reconcile pending handoff `theoshift` (chat notify blast) — may already be covered by v4.29.4+ bulk-email safety; close or re-scope.

## Exact next command

Open an event → Positions → **Try new layout** on https://theoshift.com (or confirm publish).

---

## Known issues

**Current**

- **PIN column** — Still in DB; magic links are primary UI.
- **Positions redesign** — Preview only; not published as default.
- **Handoff (pending):** chat notify blast safeguards — review vs later bulk-email confirm/throttle/abort.

**Infrastructure**

- Blue-green via HAProxy; do not assume container color without `get_deployment_status`.
- qa-01 `detect-standby.sh` can hang on Proxmox HAProxy SSH; prefer `STANDBY_URL=` in `.env.test` (patched early-exit on qa-01).
