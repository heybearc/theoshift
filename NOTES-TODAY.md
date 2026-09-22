---
date: 2026-09-22
purpose: Scratchpad for today's discoveries (promote on /end-day)
---

## Today

### Focus
- Mid-day checkpoint after v4.32.2 ship (2026-09-15)

### Discoveries / Notes
- LIVE GREEN / STANDBY BLUE, both v4.32.2; MCP HAProxy now reports `green` (was `error` during ship)
- Positions default is day board; classic at `/positions`
- PIN login/admin/`pinHash` removed
- qa-01 dirty `package-lock.json` after pull can HARD FAIL the gate — checkout before re-run
- qa-01 needs `git fetch --tags` for `v4.32.1` baseline

### Decisions to Promote
- D-TS-047 recorded (HAProxy truth when MCP backend is error; no switch if LIVE already on candidate)

### Blockers / Risks
- None. 0 NEW feedback.

### Links / Commands
- https://github.com/heybearc/theoshift/releases/tag/v4.32.2
