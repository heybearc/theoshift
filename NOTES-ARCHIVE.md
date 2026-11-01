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

## 2026-10-15

_Rolled from NOTES-TODAY.md_

---
date: 2026-09-28
purpose: Scratchpad for today's discoveries (promote on /end-day)
---

## Today

### Focus
- Volunteers page: keep filters/search after volunteer edits

### Discoveries / Notes
- Volunteer row saves were doing a full page reload, which reset Inactive/search to Active defaults
- Fix: patch roster in place + success toast; URL/sessionStorage keep list state 

### Decisions to Promote
- 

### Blockers / Risks
- 

### Links / Commands
- 

## 2026-10-27

_Rolled from NOTES-TODAY.md_

---
date: 2026-10-26
purpose: Scratchpad for today's discoveries (promote on /end-day)
---

## Today

### Focus
- Mid-day checkpoint. No feature work in this session.

### Discoveries / Notes
- Repo is **v4.33.9** (`2865d196`). LIVE **GREEN** `10.92.3.22`, STANDBY **BLUE** `10.92.3.24`. Switch #99 and sync 2026-10-26. Both nodes healthy.
- Volunteer notes stay on the list. Phone layout for Positions and Volunteers. qa-01 positions and volunteers gate passed on STANDBY before the switch (17 passed, 2 skipped, plus the generated note test).
- qa-01 `STANDBY_URL` set to `https://blue.theoshift.com` after the switch.
- **FB-039** resolved in v4.33.9.

### Decisions to Promote
- None.

### Blockers / Risks
- **FB-039** resolved in v4.33.9. No open urgent feedback item from this session.

### Links / Commands
- STANDBY: `https://blue.theoshift.com`
- LIVE: `https://theoshift.com` (GREEN)

## 2026-10-31

_Rolled from NOTES-TODAY.md_

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

## 2026-10-29

- Shipped v4.33.12 (`39d2623f`). LIVE BLUE `10.92.3.24`. STANDBY GREEN synced. Switch #102.
- STANDBY only, not shipped: assigned names on the shift line (`d586a675`); Set overseer/keyman includes checked stations (`44cb4ddc`); volunteers prefetch and service-worker 503 (`2ddf3841`).
- Positions does not call `volunteers?isActive&overseerId&perPage=-1`. That URL is the Volunteers page. The tab prefetch ran the heavy roster query.
- qa-01 `STANDBY_URL` is already `https://green.theoshift.com`.
- Urgent new feedback: 0.
- Next: review green, then `/ship`. FB-036 still blocked.

## 2026-10-30

- Shipped v4.33.13 (`8a1bbe3c`) then v4.33.14 (`09746a01`). LIVE BLUE `10.92.3.24` CT 134. STANDBY GREEN `10.92.3.22` CT 132 synced. Switch #104.
- Volunteers assigned to more than one count see only the current count until the next count time. Counts less than an hour apart wait out that hour.
- Count groups save when a counter is left blank. Empty string was rejected as an invalid payload, so new groups never stuck.
- Browser `content.js` “No Listener” errors are an extension, not the app. Volunteer and availability saves succeeded.
- qa-01 `STANDBY_URL` is `https://green.theoshift.com`, which matches STANDBY after the switch.
- Urgent new feedback: 0.
- Next: FB-036 still blocked on age format, visibility, and photo storage.
- Shipped v4.34.0 (`bb4dfdbd`) then v4.35.0 (`75315d46`). LIVE GREEN `10.92.3.22` CT 132. STANDBY BLUE `10.92.3.24` CT 134 synced. Switch #107.
- GREEN was suspended by a backup earlier today. Traffic stayed on BLUE until this release.
- Support is a user role and an event permission. It cannot create or delete events or change permissions.
- Amber Allen and Shannon Hamm are Support on the October circuit assembly. They need to sign out and sign in again.
- qa-01 `STANDBY_URL` is now `https://blue.theoshift.com`.
- Release gate passed on GREEN before the switch: 5 suite tests plus the Support grant test. qa-01 lockfile was dirty; cleared with checkout before the rerun.
- Urgent new feedback: 0.
- Shipped v4.36.0 (`a4bbf879`). LIVE BLUE `10.92.3.24` CT 134. STANDBY GREEN `10.92.3.22` CT 132 synced. Switch #108.
- Volunteer app is Expo in `mobile/`. Same email link, then assignments and chat. Confirmed on an iPhone with Expo Go against https://theoshift.com.
- Kept TheoShift APIs. Did not move chat to Mattermost or Matrix (D-TS-050).
- Next app screens: availability, documents, pinned announcement, early check-in. Then push. Stores last.
- qa-01 `STANDBY_URL` set to `https://green.theoshift.com`. Gate baseline must be the commit, not the annotated tag object.
- Release gate passed on BLUE before the switch: 5 suite tests plus 4 phone sign-in tests. qa-01 lockfile was dirty; cleared with checkout before the rerun.
- Urgent new feedback: 0.

## 2026-10-31

- Shipped v4.37.0 (`5d03f922`) then v4.38.0 (`84574e9e`). LIVE BLUE `10.92.3.24` CT 134. STANDBY GREEN `10.92.3.22` CT 132 synced. Switch #110.
- Phone app More: availability, documents, profile, early check-in, and My volunteers. My positions filters the oversight list. Count times show when assigned.
- A later position assignment receives documents that were published to everyone. Selected-only documents do not.
- My volunteers is not on the website. Dashboard, chat, documents, availability, profile, and early check-in already are.
- Release gates passed on standby. qa-01 lockfile was dirty once; cleared with checkout. Positions gate was clicking a hidden nav link; it now uses the event Positions link.
- Next gate needs qa-01 `STANDBY_URL=https://green.theoshift.com`.
- Urgent new feedback: 0.
- Next: add My volunteers to the website volunteer dashboard. FB-036 still blocked.

### Mid-day
- Shipped v4.39.0 (`9cbf69f8`). LIVE GREEN `10.92.3.22` CT 132. STANDBY BLUE `10.92.3.24` CT 134 synced. Switch #111.
- Staff Volunteers page opens one keyman or overseer's people. Check-in shows only when IVS is on.
- View-as on a phone uses the volunteer bar. Enter count shows that person's assignment. Opening an assignment shows the shift and oversight.
- Group counts store the volunteer who submitted. Older rows show the group's primary counter when no name was stored.
- Release gate passed. Schema change ran the smoke plus release-gate suite, then the new submitter tests. qa-01 lockfile was dirty; cleared with checkout.
- Next gate needs qa-01 `STANDBY_URL=https://blue.theoshift.com`.
- Urgent new feedback: 0.
- Next: FB-036 still blocked. Recommend a new session (v4.39.0 shipped).

### Mid-day (evening)
- Shipped v4.40.0 (`b2eb01cd`) then v4.41.0 (`08fc3d3a`). LIVE GREEN `10.92.3.22` CT 132. STANDBY BLUE `10.92.3.24` CT 134 synced. Switch #113.
- Assignment names open that station on Positions. Counter duty opens the count. Optional station diagram is one file, opened from the assignment.
- Lanyards keeps who had a badge after check-in. Badge 49’s earlier name was already cleared and is not in history.
- Release gates passed on GREEN before each switch. qa-01 lockfile was dirty; cleared with checkout. Schema change ran smoke plus the release-gate suite.
- qa-01 `STANDBY_URL` is `https://blue.theoshift.com`.
- Urgent new feedback: 0.
- Next: FB-036 still blocked. Recommend a new session (v4.41.0 shipped).

### Mid-day (counts)
- Not shipped. STANDBY BLUE `10.92.3.24` is `d3ee3165`. LIVE stays GREEN v4.41.0 (`08fc3d3a`).
- A submitted count is grey for the volunteer. Overseer, keyman, or event staff can change it.
- The next count opens one hour after the previous count time. Count times and view details refresh every 15 seconds.
- Roster Total, Active, and Inactive show the number once.
- Session progress counts a submitted zero and keeps group totals when station rows exist. Each assigned station has its own count.
- Urgent new feedback: 0.
- Next: check counts on https://blue.theoshift.com, then release. FB-036 still blocked.
