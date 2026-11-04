---
date: 2026-11-03
purpose: Scratchpad for today's discoveries (promote on /end-day)
---

## Today

### Focus
- v4.42.0 is shipped and synced.

### Discoveries / Notes
- LIVE BLUE `10.92.3.24` and STANDBY GREEN `10.92.3.22` are both v4.42.0 (`0dffca3c`). Switch #114.
- Release gate passed on BLUE before the switch. qa-01 `STANDBY_URL` is `https://green.theoshift.com`.
- The phone app can enter a count. It is still Expo Go, not in the stores.

### Decisions to Promote
- 

### Blockers / Risks
- FB-036 stays blocked until age format, who can see age and photo, and photo storage are chosen.

### Links / Commands
- STANDBY: https://green.theoshift.com
- LIVE: https://theoshift.com

### Mid-day (2026-11-03)
- Store prep is on STANDBY GREEN (`7dce865f`). Privacy page is https://green.theoshift.com/privacy. LIVE https://theoshift.com/privacy is still 404.
- Android production build finished: https://expo.dev/accounts/corya92/projects/theoshift/builds/9365bfdf-f395-4380-b359-e6855981016b
- iOS build did not start. No Apple distribution certificate. Needs an interactive `eas build` signed into the Apple Developer account.
- Google Play still needs a Console app before `eas submit`.
- FB-036 still blocked.

### Evening (2026-11-03)
- Play internal testing is created. Opt-in link works in a new tab. “Item not found” was the Play Store account/tab, not a missing bundle.
- Service account is only for `eas submit`. Manual Play upload does not need it.
- Cloned “Attendants - Circuit Assembly with Branch Rep” kept October 31 shifts and copied no documents. Database repair moved 84 shifts to 2027-05-16 and copied 3 documents.
- Clone date dialog and “save start date moves shifts” are on STANDBY BLUE (`112d9eb3`), not LIVE.
- iOS still blocked on Apple Developer review. FB-036 still blocked.
