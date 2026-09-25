---
purpose: Archive of rolled daily notes
---


## 2026-07-26

_Rolled from NOTES-TODAY.md_

---
date: 2026-07-26
purpose: Scratchpad for today's discoveries (promote on /end-day)
---

## Today

### Focus
- Mid-day checkpoint after IVS + phone formatting releases (v4.26–v4.28)

### Discoveries / Notes
- LIVE + STANDBY both on **v4.28.0** (GREEN live / BLUE standby) — no undeployed work
- IVS: import template (STATUS + EARLY ENTRY), department contacts remove, approval-date clear on non-Approved, phone normalize app-wide
- Department contacts stay Approvals (manage) + Early Check-In lookup (incl. volunteer Early Check-In for IVS team) — user confirmed keep as-is
- Backlog item “import early-entry from spreadsheet” — **done** (v4.26+)

### Decisions to Promote
- Keep IVS department contacts placement (Approvals manage / Early Check-In lookup only)

### Blockers / Risks
- 

### Links / Commands
- Deploy contract: commit → push → STANDBY after each completed fix/feature

## 2026-07-28

_Rolled from NOTES-TODAY.md_

---
date: 2026-07-26
purpose: Scratchpad for today's discoveries (promote on /end-day)
---

## Today

### Focus
- Positions Option C: shift volunteersNeeded + capacity-aware auto-assign; redesign backloged

### Discoveries / Notes
- Multiple volunteers per shift already allowed; auto-assign treated any assignment as full; position oversight is 1:1 per position
- Shift-level OVERSEER role exists and is preferred for pool/display when present

### Decisions to Promote
- Option C on live page; full Positions redesign out-of-band (PLAN backlog)

### Blockers / Risks
- 

### Links / Commands
- Deploy STANDBY with runMigrations: true after Option C

## 2026-09-25

_Rolled from NOTES-TODAY.md_

---
date: 2026-09-25
purpose: Scratchpad for today's discoveries (promote on /end-day)
---

## Today

### Focus
- Ship v4.32.3 case-insensitive overseer login

### Discoveries / Notes
- LIVE BLUE / STANDBY GREEN, both v4.32.3 (`185e2062`)
- Color hostnames had been collapsed onto GREEN; restored per D-TS-048
- qa-01 `STANDBY_URL` must track the current STANDBY color host after switch

### Decisions to Promote
- D-TS-048 recorded

### Blockers / Risks
- None. 0 NEW feedback.

### Links / Commands
- https://github.com/heybearc/theoshift/releases/tag/v4.32.3
