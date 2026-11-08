# TheoShift Task State

**Last updated:** 2026-11-08  
**Branch:** `main`  
**Production:** **LIVE** **GREEN** `10.92.3.22` **v4.45.0** (`a2840643`). **STANDBY** **BLUE** `10.92.3.24` synced. Switch #119.

---

## Current Task

v4.45.0 is live. Phone store builds are TestFlight 13 and Play internal version code 5. FB-036 still blocked.

### What I'm doing right now

Nothing in progress. Next store upload is iOS build 14 and Android version code 6, and only from Terminal.

### Recent completions

- ✅ **v4.45.0** — Phone Tools opens the website. Chat can alert the lock screen. Shipped and synced (`a2840643`, 2026-11-08).
- ✅ **TestFlight 13** — Local Fastlane upload from Terminal (`5bdda529`). Cursor’s shell deadlocks `actool`.
- ✅ **Play internal** — Android 1.0.0 version code 5 uploaded (`245407d8`, 2026-11-08).
- ✅ **Phone chat alerts** — Icon badge and lock-screen notification. On STANDBY (`a1bbec37`). iOS 1.0.0 (12) is in App Store Connect. Not released, so live still sends the old payload.
- ✅ **Local Fastlane** — `mobile/` can build and upload both stores (`80d68a80`). iOS lane needs Xcode.
- ✅ **Phone tools + sign-in fix** — Tools opens the website. Sign-in no longer keeps the previous person. On STANDBY (`411e040b`, 2026-11-08). Not released. iOS 1.0.0 (11) uploaded to TestFlight.
- ✅ **v4.44.0** — Lost-phone sign-out and a store review sign-in code. Shipped and synced (`6d4f26d3`, 2026-11-05). iOS build 9 was superseded by builds 10 and 11.
- ✅ **Phone branding** — Website logo, navy and blue, larger menus and buttons. Version code 4 `.aab` is in Downloads (`8db1c4cd`, 2026-11-03).
- ✅ **v4.43.0** — Clone dates move shifts. Failed clone keeps the dialog. Android contacts dial digits only (2026-11-03).
- ✅ **v4.42.1** — Public privacy page for the website and phone app (`55eb8b89`, released 2026-11-03). Android production `.aab` is built.
- ✅ **v4.42.0** — Phone counts, contacts, station diagram, pinned announcements. Submitted counts stay locked (`0dffca3c`, released 2026-10-31)
- ✅ **v4.41.0** — Lanyard check-in keeps who had the badge (`08fc3d3a`, released 2026-10-31)
- ✅ **v4.40.0** — Assignment links open the station; optional station diagram (`b2eb01cd`, released 2026-10-31)
- ✅ **v4.39.0** — Staff people list on Volunteers; volunteer count page shows only that assignment; group counts name the submitter (`9cbf69f8`, released 2026-10-31)
- ✅ **v4.38.0** — My volunteers, position filter, assignments, count times, check-in, lanyards; documents follow a later assignment (`84574e9e`, released 2026-10-31)
- ✅ **v4.37.0** — Phone availability, documents, profile, and early check-in (`5d03f922`, released 2026-10-30)
- ✅ **v4.36.0** — Volunteer phone app sign-in, assignments, and chat (`a4bbf879`, released 2026-10-30)
- ✅ **v4.35.0** — Support role for users and event permissions (`75315d46`, released 2026-10-30)
- ✅ **v4.34.0** — Pinned announcement stays on the volunteer dashboard until acknowledged (`bb4dfdbd`, released 2026-10-30)
- ✅ **v4.33.14** — Count groups save when a counter is left blank (`09746a01`, released 2026-10-29)
- ✅ **v4.33.13** — Volunteers see one count at a time; shift line shows who is assigned (`8a1bbe3c`, released 2026-10-29)
- ✅ **v4.33.12** — Station card shows the keyman; filled count is the shift, not the overseer (`39d2623f`, released 2026-10-28)
- ✅ **v4.33.11** — Selected-row count stays on screen; Volunteers page size stays available (`78a82424`, released 2026-10-28)
- ✅ **v4.33.10** — Bulk edit lists overseers and keymen; phone layout for Users, Locations, and Feedback (`cb3628ed`, released 2026-10-27)
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

1. Install TestFlight build 13: https://appstoreconnect.apple.com/apps/6830737568/testflight/ios
2. FB-036 stays blocked until age format, visibility, and photo storage are chosen.

## Exact next command

Install TestFlight build 13.

---

## Known issues

**Current**

- None blocking.

**Infrastructure**

- Blue-green via HAProxy; do not assume container color without `get_deployment_status`.
- If MCP `haproxy.backend` is `error`, read `use_backend … if is_theoshift` before `/release` (D-TS-047).
- Color hostnames must stay on their node: `blue.theoshift.com` → BLUE, `green.theoshift.com` → GREEN (D-TS-048). After a switch, set qa-01 `STANDBY_URL=` to the new STANDBY color host.
- After switch #119, STANDBY is BLUE. qa-01 `STANDBY_URL` should be `https://blue.theoshift.com` if HAProxy detection falls back. D-069: the next `/ship` also uploads phone builds when `mobile/` changed, and that upload must start from Terminal.
- qa-01 clone can be left dirty on `package-lock.json` after `npm install`. `git checkout -- package-lock.json` before the gate if the script reports a dirty tree.
