# TheoShift release testing

Published gate for D-066. qa-01 runs this from `scripts/release-test.sh` instead of the full Playwright suite.

## What each release runs

A fixed gate, plus the area the change touched, plus the generated test for that release.

| Area | What it covers |
|------|----------------|
| `gate` | Pin a chat message, and assign or clear a keyman on Volunteers |
| `positions` | Day board, shift bulk edit, and assignment conflicts |
| `volunteers` | Volunteer list filters and CSV import onto the roster |
| `auth` | Overseer login when the email capitalization differs |
| `full` | The complete Playwright suite |

Login, sign-in, and database schema changes run `full`. Everything else runs `gate` alone when no area matches.

Page-load smoke is not this gate.

## Run it

```bash
RELEASE_BASE_URL=https://green.theoshift.com bash scripts/release-test.sh gate
BASE_REV=<previous-tag> bash scripts/release-test.sh detect
```

`RELEASE_BASE_URL` is the current STANDBY host. After a traffic switch that is the color that is not serving https://theoshift.com.
