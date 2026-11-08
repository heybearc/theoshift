---
date: 2026-11-04
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

### Mid-day (2026-11-04)
- v4.43.0 is LIVE on BLUE (`b9234509`). STANDBY GREEN has the phone branding (`8db1c4cd`). No traffic switch after that commit.
- Android version code 4 finished: https://expo.dev/accounts/corya92/projects/theoshift/builds/0fd17525-0fb5-417f-ad31-718b353d0549
- Bundle for manual upload: `/Users/cory/Downloads/theoshift-android-1.0.0-vc4.aab`
- `eas submit` failed. No Google service account key for non-interactive submit.
- Unbranded version code 3 build was canceled.
- Urgent feedback: 0. FB-036 and iOS still blocked.

### Afternoon (2026-11-04)
- App Store record is TheoShift, bundle `app.theoshift.volunteer`, SKU `theoshift`, team `S42AL6JZDB`.
- iOS 1.0.0 (5) was the first TestFlight build. Build 6 added Message someone. Build 8 is the chat-fix build and is submitted.
- Message someone 404 was LIVE missing `/api/events/.../chat/people`. Switch #117 moved LIVE to GREEN (`becb1ee4`).
- Both nodes synced to `becb1ee4`. STANDBY is BLUE `10.92.3.24`.
- Android 1.0.0 (6) finished: https://expo.dev/accounts/corya92/projects/theoshift/builds/acb57bbe-024a-4245-ab5f-1e0de3c883ee
- Phone push uses an Expo token on the existing chat subscription table. iOS push key is created. Android alerts still need that build installed.
- Urgent feedback: 0. FB-036 still blocked.

### Mid-day (2026-11-07)
- v4.44.0 is LIVE on BLUE (`6d4f26d3`). STANDBY GREEN `10.92.3.22` is synced. Switch #118.
- Lost-phone sign-out and the store review sign-in code are on the website. The review email and code are not saved yet.
- iOS 1.0.0 (9) finished and is not submitted: https://expo.dev/accounts/corya92/projects/theoshift/builds/0a11b84b-e30a-4746-bd61-7318604d184e
- Android 1.0.0 (6) is still not in Play internal testing.
- Urgent feedback: 0. FB-036 still blocked.
- qa-01 fallback `STANDBY_URL` should be `https://green.theoshift.com` after switch #118.

### Mid-day (2026-11-08)
- Tools tab opens website event and admin pages from the phone. Assignments and chat stay native. D-TS-055.
- Sign-in fix `411e040b` is on STANDBY GREEN `10.92.3.22`. LIVE is still v4.44.0 (`6d4f26d3`). Switch #118.
- iOS 1.0.0 (11) uploaded to TestFlight. Build 10 was the first tools build and does not have the sign-in fix.
- Android store submit did not start. Expo free Android builds are used up until 2026-12-01.
- Urgent feedback: 0 open. FB-036 still blocked.

### Later (2026-11-08)
- Chat alerts set the icon badge and show on the lock screen. Android uses a high-importance channel. On STANDBY (`a1bbec37`). D-TS-056.
- iOS 1.0.0 (12) is in App Store Connect. Live still sends the old alert payload until `/release`.
- Local Fastlane releases are in `mobile/`. D-TS-057. Android version code 5 is on the Play internal track (`245407d8`).
- iOS local upload did not run. This Mac has command-line tools only, no Xcode.
- STANDBY GREEN `10.92.3.22` is `245407d8`. LIVE is still v4.44.0 (`6d4f26d3`). Switch #118.
- Urgent feedback: 0 open. FB-036 still blocked.
