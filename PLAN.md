# TheoShift Plan

**Last updated:** 2026-09-13  
**Current phase:** Feature Development + Platform Infrastructure  
**Status:** **v4.32.1 LIVE** (GREEN). Positions redesign preview at `/positions-next` (classic remains default). Event clone parity fixed in v4.32.1.

---

## Product feedback (operating model)

This follows the usual small-team pattern: **one system of record in the app**, **email when something new arrives**, **people triage into the roadmap** (not auto-generated git files).

| What | Where |
|------|--------|
| **Source of truth** | Database `feedback` table — review as **ADMIN** at `/admin/feedback` (e.g. `https://theoshift.com/admin/feedback`). |
| **Notifications** | On every successful submit (JSON, simple, and file-upload APIs), the app emails every **ADMIN** user, if mail is configured. Optional: set **`FEEDBACK_NOTIFY_EMAILS`** on the server (comma-separated) to also notify a distribution list (e.g. coordinators who are not ADMIN). |
| **PLAN / TASK-STATE** | We do **not** auto-write `PLAN.md` from production (avoids merge noise and keeps secrets out of git). When you plan work, open the admin list, filter **new**, and **copy promoted items** into this file or the backlog in one line each (e.g. `FB-042 — short title`). |
| **From this repo (no DB URL in git)** | Run `scripts/ssh-query-feedback.sh` or `scripts/ssh-query-feedback.sh new` — SSH to `green-theoshift` (override with `FEEDBACK_SSH_HOST`), load `/opt/theoshift/.env.green` on the host, query Postgres. Requires your SSH config (same as deploy docs). |
| **Session habits** | Use your existing checkpoints (e.g. mid-day / end-day) to scan **new** feedback and move status or add backlog entries. |

---

## Current Phase

### Active Work
- **Positions redesign — publish gate** — Day board at `/positions-next` (v4.32.0+); classic remains default until explicit publish.
- **Mobile readiness across TheoShift** — Positions + Volunteers pages next (narrow viewport). Early Check-In volunteer path done through **v4.29.7**.

### Recently Completed (2026-09-05 → 2026-09-13)
- ✅ **v4.32.1** — Event clone parity: `onVolunteerRoster` + role flags; department overseer/keyman columns; `shiftDate`/`volunteersNeeded`; fresh lanyards; POSITION `scopeIds` remap; assignment overseer/keyman; help + release notes; shipped + synced
- ✅ **v4.32.0** — Positions day-board preview (stations by day, collapse UX, day-scoped auto-assign, thin bulk setup, help)

### Recently Completed (2026-07-31)
- ✅ **v4.30.1** — Request Volunteer eligibility = active roster on IVS-enabled event (aligned with Early Check-In; **D-TS-046**)
- ✅ **v4.30.0** — IVS volunteer intake from dashboard (Pending → Approvals; email/phone required; staff columns + export)
- ✅ **v4.29.14** — Early check-in list reachable when scrolling on tablet/mobile
- ✅ **v4.29.13** — Document publish targets Volunteers roster only (not IVS-only)
- ✅ **v4.29.12** — My Profile + secure self-service account deletion (FB-038)

### Recently Completed (2026-07-27 → 2026-07-28)
- ✅ **v4.29.7** — Mobile Early Check-In UI harden (touch/safe-area/16px search) + staff `/volunteer/early-checkin` middleware; Playwright mobile matrix 5/5 on STANDBY
- ✅ **v4.29.6** — Event roster members can use Early Check-In without a position assignment
- ✅ **v4.29.5** — Mobile PWA Check-In `eventId` wiring + access alignment
- ✅ **v4.29.4** — Safe bulk email (roster-only, confirm, throttle, abort) for chat/broadcast/availability/document paths
- ✅ **v4.29.3** — Promote IVS-only people onto Volunteers roster (`onVolunteerRoster`)
- ✅ **v4.29.0–v4.29.2** — Shift capacity / bulk create / add-volunteer-by-email fixes

### Completed This Phase
- ✅ **Positions Option C (regional multi-body shifts)** — `volunteersNeeded`, fill progress, capacity-aware auto-assign (**v4.29.0**)
- ✅ **v4.22.0 — In-app notifications UX (2026-06)** — Toast notifications and inline confirm/prompt dialogs replace browser `alert`/`confirm`/`prompt` app-wide; `AppUiProvider` in `_app`; release-gate test updated. Shipped `/ship` + `/sync`. Tag `v4.22.0` (`fe17b1d6`, `9c04d150`).
- ✅ **v4.21.9 — IVS access & bulk (2026-05)** — Overseers and keymen can import/export/add IVS volunteers; Approvals bulk status (incl. congregation/department); manual add single volunteer. Commits `509dbe92`, `31c709e1`, `872996b1`, tag/release `c7e8b224`.
- ✅ **Volunteer count assignments & simulation (2026-05)** — Dashboard shows station counts only for **confirmed** assignees (`isSuggested: false`); suggestions from Apply Suggestions are draft until saved. Grouped stations exclude duplicate station-level UI; exclusions use `count_session_group_positions`. View-as uses **normalized staff roles** + Enter Count / mobile links / KEYMAN parity. Decision **D-TS-043**. Commits `bef4f7dd`, `4935b31f`, `8e937f66`, `d9fd40b3`.
- ✅ v4.21.2: IVS Module mobile layouts (Approvals cards on small screens; Early Check-In full-width actions + stacked rows)
- ✅ v4.21.2: Event shell + overview mobile-first tweaks (viewport-fit=cover; momentum scroll utility; stacked toolbar; 44px tab targets; overflow/wrapping fixes)
- ✅ v4.20.1: Chat navigation UX (New message + searchable position channels) for staff + volunteers
- ✅ v4.20.1: Staff DMs correctly recognize Admin→Users volunteer link when the volunteer is on the event roster
- ✅ v4.20.1: Release gate updated for new chat composer placeholder; qa-01 /test-release passing; traffic switched + synced
- ✅ IVS Approvals: inline status updates in grid; Early Entry toggle aligned to PATCH API (`e2ae3bc6`)
- ✅ v4.18.0 patch: fixed volunteer event date drift (UTC-safe `@db.Date` serialization + shared calendar-date formatter)
- ✅ IVS approvals export fixed: frontend now uses POST with JSON body (matches API; resolves 405)
- ✅ IVS export access expanded: ADMIN/OVERSEER/ASSISTANT_OVERSEER or event ADMIN/COORDINATOR
- ✅ Release cycle completed for these fixes (`/release` + `/sync`) — both nodes healthy
- ✅ v4.18.0 prep: grouped count workflow, volunteer dashboard count groups, view-as / availability fixes
- ✅ Release notes: semver ordering for “latest” detection (`src/lib/releaseNotes.ts`)
- ✅ Cloudy-Work: bump/release command docs + D-042; TheoShift submodule synced
- ✅ v4.17.1 release: volunteers overseer/keyman removal reliability fixes
- ✅ Inactive-volunteer oversight update handling fixed
- ✅ `/test-release` default suite reduced to smoke + release-gate (full suite retained as `test:e2e:full`)
- ✅ qa-01 validation for release gate (3 passed, 1 skipped)
- ✅ Traffic switched and STANDBY synced (LIVE=BLUE, STANDBY=GREEN) — *verify nodes after future bumps per updated workflow*
- ✅ Early Check-In tab visibility fix (v4.15.8)
- ✅ Early Check-In mobile page access fix
- ✅ Availability request scoping bug fix (173 volunteers → correct subset)
- ✅ Select All checkbox filtering bug fix
- ✅ Promoted frontend filtering patterns to control plane (D-035)
- ✅ 2-day production monitoring — no issues reported

---

## Prioritized Backlog

### High Priority
- **Positions page redesign (out-of-band)** — Rebuild Positions UX/logic for multi-body shifts, rotating per-shift overseers, and regional multi-day stations without overloading the current page. Ship Option C first on the live page; redesign in a parallel branch/surface and publish when ready (do not break events using today’s layout).
  - Status: Preview shipped (**v4.32.0** `/positions-next`); **publish gate** still open (classic = default)
  - Effort: XL (remaining: publish + cutover)
  - Constraint: Current page remains source of truth until redesigned page is explicitly published
  - Drivers: 4+ volunteers per shift; different overseer per shift; 3-day regionals; auto-assign + position oversight mismatch
- **TheoShift Native In-App Chat (Event-Scoped, Magic-Link Compatible)** — Real-time communication for overseers and volunteers inside TheoShift
  - Status: Planned (approved direction)
  - Effort: L (MVP) / XL (full rollout)
  - Scope: TheoShift first; cross-app platform deferred
  - Core constraint: Volunteers use dashboard magic-link auth (no full app login)

#### TheoShift Native Chat — Implementation Spec (MVP)

**Goal**
- Provide reliable real-time chat for event teams (overseers + volunteers) within TheoShift using existing auth and event permission models.

**Architecture choice**
- App-native chat in TheoShift (PostgreSQL + Prisma + WebSocket layer), not Matrix/Dendrite for MVP.
- Rationale: Direct fit to event-scoped permissions and magic-link volunteer flow with lower infrastructure complexity.

**Auth and identity model**
- Admin/oversight users authenticate via existing app session.
- Volunteers authenticate via existing magic-link dashboard session.
- Chat auth handshake must validate server-side session and derive identity from session only.
- Never trust client-supplied role, event, or user identifiers.

**Authorization rules**
- Membership is always `eventId` scoped.
- Volunteers can access only channels for events where they are registered/assigned.
- Overseers/coordinators can access channels within events they can manage.
- No cross-event message visibility.

**Channel model (MVP)**
- `event-announcements` (staff-posted; volunteer reply policy configurable)
- `event-general` (all event participants)
- `position-{positionId}` (assigned volunteers + relevant oversight)

**Proposed data model (Prisma-level)**
- `event_chat_channels`
  - `id`, `eventId`, `type`, `name`, `positionId?`, `isArchived`, timestamps
- `event_chat_members`
  - `id`, `channelId`, `userId?`, `volunteerId?`, `role`, `mutedUntil?`, timestamps
  - Unique constraints for channel+member identity
- `event_chat_messages`
  - `id`, `channelId`, `senderUserId?`, `senderVolunteerId?`, `body`, `kind`, `editedAt?`, `deletedAt?`, timestamps
- `event_chat_reads`
  - `id`, `channelId`, `userId?`, `volunteerId?`, `lastReadMessageId`, `lastReadAt`
- Optional after MVP: `event_chat_message_reactions`, `event_chat_attachments`

**Transport/API contract**
- WebSocket namespace per event (or global namespace with event-scoped rooms).
- Server events: `chat:join-channel`, `chat:leave-channel`, `chat:message:create`, `chat:message:edit`, `chat:message:delete`, `chat:read`.
- REST bootstrap endpoints:
  - `GET /api/events/[id]/chat/channels`
  - `GET /api/events/[id]/chat/channels/[channelId]/messages?cursor=...`
  - `POST /api/events/[id]/chat/channels/[channelId]/messages`

**Security and moderation (MVP minimum)**
- Server-side content length limits and rate limiting.
- Soft delete for messages; audit metadata retained.
- Staff moderation permissions per event (delete/mute).
- Basic profanity/abuse handling deferred unless required by feedback.

**Delivery plan (3 increments)**
- **Increment 1: Data + permissions**
  - Create schema/migrations and channel membership resolver.
  - Seed default channels per event.
  - Add server authorization tests for role/event boundaries.
- **Increment 2: Real-time messaging UX**
  - Add chat UI to staff event pages and volunteer dashboard event view.
  - Implement live send/receive, pagination, and unread badges.
  - Add announcement channel posting controls.
- **Increment 3: Operational hardening**
  - Add read receipts (per channel last-read), mute/archive, and basic moderation.
  - Add notifications bridge (in-app first; push/email follow-up).
  - Add smoke and release-gate tests for chat critical paths.

**Acceptance criteria (MVP)**
- Volunteer with valid magic-link session can chat only in authorized event channels.
- Overseer can post announcements and moderate within authorized events.
- Messages deliver in real time to connected participants and persist to DB.
- Reconnect restores channel state and unread counts correctly.
- Cross-event and unauthorized channel access is denied server-side.

**Test plan (release-gate additions)**
- Volunteer magic-link session joins only permitted event channels.
- Unauthorized volunteer cannot join non-member channel.
- Overseer announcement post appears to volunteers in real time.
- Message persistence + reload history + unread state correctness.
- Authorization regression test for every chat write endpoint/socket event.
  
- **Mobile/PWA Optimization** — Continue mobile-first improvements
  - Admin pages mobile optimization (overflow fixes, responsive tables)
  - Offline capability for critical features
  
- **User Feedback Items** — See **Product feedback (operating model)** above; triage `/admin/feedback` and promote to this list

### Medium Priority
- **Matrix/Dendrite Chat Platform (Deferred)** — Keep as future interoperability option, not current implementation path
  - Status: Deferred pending TheoShift native chat MVP outcomes
  - Revisit trigger: Need cross-app shared chat fabric or external Matrix client interoperability

- **Edit Assignment Time Feature** — Allow editing shift times after assignment (and **in-place edits** in the assignment flow; production feedback **FB-032** closed as non-blocker — work tracked here when prioritized)
  - Deferred from previous sprint
  - Not a deployment blocker; pick up when this backlog line is scheduled

- **Volunteer page: filter by availability status** — On the event **Volunteers** page (`/events/[id]/volunteers`), add filters so coordinators can narrow the roster by **availability** (e.g. responded available, unavailable, pending / awaiting response, no request yet — exact states must match whatever the app already stores per volunteer×event).
  - **Why:** Quickly find who still needs follow-up or who is available before assigning positions.
  - **Scope:** Toolbar or filter row + client/query or API params; reuse existing availability fields — avoid duplicate truth.
  - **Effort:** S–M (depends on current volunteers list and availability APIs).

- **Mobile optimization: Event Positions + Volunteers pages** — Reduce reliance on horizontal scrolling tables; add card views under `md`, make filters/actions usable with one hand.
  - Targets: `/events/[id]/positions`, `/events/[id]/volunteers`
  - Acceptance: 44px controls, clear primary actions, no clipped text, safe-area friendly on iOS.

- **Mobile optimization: Admin tables** — Pick the top 3 admin surfaces used on phones and apply the same patterns (stacked toolbars, card lists under `md`, overflow scroll with momentum when needed).
  
- **Enhanced Reporting** — Additional export formats and report types
  - Volunteer attendance reports
  - Position coverage analytics
  
- **Email Template Improvements** — More customization options
  - Custom branding per event
  - Template library

### Feature implementation: volunteer / attendant profile enhancements (FB-036)

*Promoted from production feedback **FB-036** (item closed in admin with requirements recorded here for implementation when scheduled).*

**Goal**  
Give coordinators better context when assigning and reviewing people: **age** (or age band) and an optional **photo** on the volunteer/attendant profile used across events.

**User-requested value**

| Need | Rationale |
|------|-----------|
| **Age** | Helps ensure older publishers are placed appropriately (comfort, access, dignity). |
| **Photo** | Helps identify the correct brother when assigning or reviewing positions (especially large events). |

**Proposed scope (draft)**

1. **Data model** — Fields on volunteer (or event-attendant association if profile is per-event): e.g. date of birth or age range category; image asset URL or upload id; consent / visibility flags if required.
2. **Admin / oversight** — Where trustworthy editors set or verify age and upload crop-safe photo (permissions aligned with existing volunteer management).
3. **Volunteer-facing** — Optional self-service update where policy allows; otherwise read-only from volunteer view.
4. **Consumption** — Display on positions/assignment UI where useful (toggle by role); avoid clutter on volunteer mobile dashboard unless needed.

**Open decisions before build**

- Privacy & retention (who sees photo/age, export in reports, deletion).
- Storage (existing upload pipeline vs dedicated avatars).
- Whether age is exact DOB, age only, or bracket (e.g. 60+).

**Effort (estimate)**  
Medium–Large (schema + migrations + admin + display surfaces + permissions).

**Tracking**  
Feedback **FB-036** closed as deferred; all scope lives in this section until an epic or ticket is opened.

### Low Priority
- **UI Terminology Cleanup** — Replace remaining "attendant" references
  - ~50+ places in help pages, labels, buttons
  - Database tables/columns already use "attendant" (backward compatible via @map)
  - Documented as TD-001 in TECH-DEBT.md
  
- **Advanced Search Filters** — More granular filtering options
  - Multi-select filters
  - Saved filter presets

---

## Known Issues

### Current
- **Volunteer Login via Node IP** — Cannot test volunteer login on STANDBY via node IP (http://10.92.3.24:3001)
  - Root cause: NEXTAUTH_URL=https://theoshift.com forces Secure cookies (HTTPS only)
  - Browser rejects secure cookies over HTTP connection to node IP
  - Solution: Must test via domain (https://theoshift.com) after traffic switch
  - Fixes implemented:
    - ✅ Removed global NextAuth signIn page (prevents redirect to /auth/signin)
    - ✅ Added server-side auth to volunteer dashboard (getServerSideProps)
    - ✅ Manual redirect handling in volunteer login (redirect: false)
    - ✅ CSRF token explicit fetching
    - ✅ Comprehensive logging for debugging
  - Status: Ready to test on LIVE or via domain after traffic switch

### Technical Debt
- **UI Terminology (TD-001):** ~50+ "attendant" references in UI (help pages, labels, buttons)
  - Database already migrated to "volunteer" terminology
  - UI cleanup is cosmetic, not functional
  - Low priority

### Pre-existing Non-blocking
- Lint warning in `positions.tsx` line 677: `Argument of type 'string' is not assignable to parameter of type 'never'`
  - Does not affect functionality
  - Can be addressed during next positions page refactor

---

## Roadmap

### Phase: Security & Stability (COMPLETE - Feb 2026)
**Objective:** Harden platform security and eliminate technical debt

**Completed:**
- ✅ v4.15.5 — Next.js 14→15.5.12 upgrade, 0 actionable npm audit vulns
- ✅ v4.15.4 — xlsx→exceljs migration (CVE remediation)
- ✅ v4.15.3 — Security dependency patches + OS patches
- ✅ v4.15.2 — Volunteer role fixes, bulk operations
- ✅ All 9 technical debt items resolved
- ✅ Test suite cleanup (131 passed, 25 skipped, 0 failed)

### Phase: Bug Fixes & Monitoring (COMPLETE - Apr 2026)
**Objective:** Fix critical production bugs and validate stability

**Completed:**
- ✅ Early Check-In tab visibility (IVS module check)
- ✅ Early Check-In mobile page access
- ✅ Availability request scoping (event-specific filtering)
- ✅ Select All checkbox (filtered vs unfiltered)
- ✅ 2-day production monitoring — no issues
- ✅ Frontend filtering patterns promoted to control plane

### Phase: Feature Development (CURRENT)
**Objective:** Deliver high-value features from backlog

**Next Steps:**
1. Review production feedback for new items
2. Pick next priority feature (Matrix/Dendrite or Edit Assignment Time)
3. Implement on STANDBY
4. Test with `/test-release`
5. Version bump with `/bump`
6. Release with `/release`
7. Sync with `/sync`

### Phase: Platform Infrastructure (PLANNED)
**Objective:** Shared services for all apps

**Deliverables:**
- Matrix/Dendrite chat platform
- Shared authentication improvements
- Cross-app analytics
- Unified notification system

---

## Recent Completions

### v4.15.8 (Apr 2026) — Bug Fixes
- Early Check-In tab visibility fix
- Early Check-In mobile page access fix
- Availability request scoping fix
- Select All checkbox filtering fix
- All fixes stable in production

### v4.15.5 (Feb 2026) — Security Sprint
- Next.js 14→15.5.12 upgrade
- xlsx→exceljs migration
- Security dependency patches
- OS patches on both nodes
- 0 actionable npm audit vulnerabilities

### v4.15.0 (Feb 2026) — Features
- Global Announcements Banner
- PWA Service Worker v2.0.0
- Offline caching improvements
- Test suite cleanup

### v4.13.0 (Feb 2026) — Conflict Management
- FB-017: Conflict detection on positions page
- Email improvements
- D-024 feedback compliance

### Earlier Releases
- v4.2.0: Location Library with Google Maps
- v4.1.1: Volunteer login redirect bug fix
- v4.0.2: Test infrastructure & stability
- v3.11.0: UI Modernization

---

## Version History

**Current:** v4.30.1 (IVS dashboard intake; LIVE BLUE + STANDBY GREEN synced)  
**Previous:** v4.30.0 (IVS intake initial ship) / v4.29.14 (early check-in scroll)  
**Baseline:** v4.0.0 (production-ready platform)

---

## Notes

- **Test Suite:** 131 passed, 25 skipped (intentional), 0 failed
- **Deployment:** Blue-green via MCP tools (`deploy_to_standby`, `/release`, `/sync`).
- **Environments:** Do not trust static LIVE/STANDBY labels in git — verify with **`get_deployment_status`** (app: `theoshift`) or HAProxy (D-008). Example snapshot from TASK-STATE: LIVE BLUE `10.92.3.24`, STANDBY GREEN `10.92.3.22` (may differ after a release).
- **Database:** PostgreSQL on CT131 (10.92.3.21)
- **Monitoring:** Prometheus + Grafana
- **Backups:** Automated daily backups

---

**For detailed task state and exact next steps, see TASK-STATE.md**
