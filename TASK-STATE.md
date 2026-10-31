# TheoShift Task State

**Last updated:** 2026-10-31  
**Branch:** `main`  
**Production:** **LIVE** **BLUE** `10.92.3.24` **v4.38.0** (`84574e9e`). **STANDBY** **GREEN** `10.92.3.22` synced. Switch #110.

---

## Current Task

Volunteer phone app is on production through v4.38.0. FB-036 still blocked. My volunteers is phone-only.

### What I'm doing right now

Put My volunteers on the website volunteer dashboard for keymen and overseers.

### Recent completions

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

1. Add My volunteers to the website volunteer dashboard. The rest of the phone screens are already there.
2. FB-036 stays blocked until age format, visibility, and photo storage are chosen.

## Exact next command

Add My volunteers to `/volunteer/dashboard` for keymen and overseers. Phone app stays Expo Go against `https://theoshift.com`.

---

## Known issues

**Current**

- None blocking.

**Infrastructure**

- Blue-green via HAProxy; do not assume container color without `get_deployment_status`.
- If MCP `haproxy.backend` is `error`, read `use_backend … if is_theoshift` before `/release` (D-TS-047).
- Color hostnames must stay on their node: `blue.theoshift.com` → BLUE, `green.theoshift.com` → GREEN (D-TS-048). After a switch, set qa-01 `STANDBY_URL=` to the new STANDBY color host.
- qa-01 `detect-standby.sh` cannot read HAProxy (Proxmox CT 136 is missing on that host) and falls back to `STANDBY_URL` in `/opt/tests/theoshift/.env.test`. After the 2026-10-31 v4.38.0 switch, STANDBY is GREEN. Set `STANDBY_URL` to `https://green.theoshift.com` before the next gate. Pass the release commit, not only the tag name. Fetch tags before the gate if the baseline is a new tag.
- qa-01 clone can be left dirty on `package-lock.json` after `npm install`. `git checkout -- package-lock.json` before the gate if the script reports a dirty tree.
