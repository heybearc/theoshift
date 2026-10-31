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
