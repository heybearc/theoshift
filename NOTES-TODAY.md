---
date: 2026-10-28
purpose: Scratchpad for today's discoveries (promote on /end-day)
---

## Today

### Focus
- Checkpoint after v4.33.10 ship. No new app work.

### Discoveries / Notes
- v4.33.10 is LIVE on BLUE and synced to GREEN (`cb3628ed`). Switch #100.
- Release gate passed: volunteers area plus bulk-edit and admin phone tests.
- Bulk edit now lists event overseers and keymen. Users, Locations, and Feedback have phone cards.
- qa-01 `STANDBY_URL` is `https://green.theoshift.com`.
- Chat-notify handoff from 2026-07-28 is already covered by v4.29.4 safeguards. Mark it done. No new code.
- Urgent new feedback: 0.

### Decisions to Promote
- FB-036 stays blocked until age format, who can see age and photo, and photo storage are chosen.

### Blockers / Risks
- FB-036 cannot start until those three product choices are made.

### Links / Commands
- Release: https://github.com/heybearc/theoshift/releases/tag/v4.33.10
- STANDBY: https://green.theoshift.com

### Mid-day
- Shipped v4.33.11 (`78a82424`). LIVE GREEN `10.92.3.22` CT 132. STANDBY BLUE `10.92.3.24` CT 134. Switch #101, then synced.
- Selected rows show a count on a bottom bar. Volunteers Per page stays visible, including All and one-page lists.
- Release gate on GREEN passed (17 passed, 2 skipped) plus the new selection-count test. qa-01 lockfile was dirty; cleared with checkout before the rerun.
- qa-01 `STANDBY_URL` must move to `https://blue.theoshift.com` before the next gate.
- Urgent new feedback: 0.
- Next: FB-036 still blocked on age format, visibility, and photo storage.
