# Staff notifications — design

Date: 2026-10-06 (revised after code review the same day)
Repos: `oneohm` (backend, web, `@tejas96/shared`), `oneohm-mobile` (EPC staff app, Android only)

## Goal

Staff can see what was given to them, what is late, and (for admins) what is
late across the company. Today only payment approvals and low stock make a
staff notification, and no phone gets a push at all.

## Delivery rules

- **Web:** in-app only — the existing bell and a new full list page. No browser push.
- **Mobile:** in-app list **and** a phone push (FCM).
- One event makes one `notifications` row. `NotificationService.create()` already
  saves the row and sends the push, so every row reaches the bell, the mobile
  list and the phone.
- No notification when:
  - you assign the work to yourself;
  - the work is unassigned (assignee cleared);
  - the recipient is inactive or deleted (`users.status <> 'active'` or `deleted_at` set);
  - the item is already finished (task `done`; ticket `resolved`/`closed`;
    follow-up `completed`/`cancelled`).
- When one action gives many items to one person, that person gets one grouped
  notification.

## What exists (do not rebuild)

- Table `notifications` (`apps/backend/src/modules/notifications/entities/notification.entity.ts`):
  `type`, `title`, `body`, `severity`, `link`, `metadata` jsonb, nullable `dedupe_key`
  with `UNIQUE (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL`, `read_at`.
  Type/severity checks were dropped (`1835000000000-DropNotificationConstraints.ts`),
  so new types need no migration. No FK to users.
- `NotificationService.create()` (`notifications/services/notification.service.ts:37-94`):
  dedupe check → insert → push. The push is sent only after a successful insert, so a
  dedupe skip or a unique-index race sends no push. Never throws. Does **not** check
  the user's status.
- FCM (`notifications/services/fcm.service.ts`) sends a `notification` block
  (title/body), `android.priority: high`, `channelId: 'default'`. Android shows it
  when the app is in the background or closed. Data values are stringified.
  Disabled when `FIREBASE_PROJECT_ID` is missing — it is missing on Fly today.
- Endpoints: `GET /notifications` (`{ data, meta }`, returns `metadata`),
  `GET /notifications/unread-count`, `POST /notifications/mark-all-read`,
  `PATCH /notifications/:id/read`.
- Device tokens: `POST /users/device-token` upserts on `token`, so when a second
  user signs in on the same phone the token moves to them.
- DB session time zone is IST (`database/datasource.ts:53`), so `CURRENT_DATE` and
  `date_trunc('day', now())` are IST dates.
- Web bell `apps/web/components/layout/notification-bell.tsx`, hooks
  `apps/web/lib/hooks/resources/notifications.ts` (30 s poll).
- House pattern: `notifications/listeners/consumer-notification.listener.ts` —
  `@OnEvent(..., { async: true })`, recipients resolved with raw SQL through `DataSource`.
- Payment approval notifications (`payment-approval-notifier.service.ts`) stay as they are.

## Part 1 — Event list

### A. Instant (sent the moment work is given)

| # | Type | Trigger | Recipient | Title / body example |
|---|---|---|---|---|
| 1 | `task_assigned` | task assignee set or changed on an existing project | new assignee | "New task" / "Panel install – Patil 5kW" |
| 2 | `project_assigned` | project created from a quote | each team member and each task assignee, **one per person** | "Added to project" / "Patil 5kW as Project Manager · 6 tasks" |
| 3 | `task_blocked` | task status changes to `blocked` | project manager(s) of that project, minus the actor | "Task blocked" / "Net meter – Patil 5kW" |
| 4 | `project_team_added` | person added to the team of an existing project | that person | "Added to project" / "Patil 5kW as Site Engineer" |
| 5 | `lead_assigned` | lead assignee set or changed | new assignee | "New lead" / "Ramesh Kale, Pune" |
| 6 | `followup_assigned` | follow-up created for / reassigned to someone; next follow-up booked on complete | new assignee; `reassignMany` grouped per assignee | "Follow-up" / "Ramesh Kale · call · 7 Oct 11:00" |
| 7 | `site_visit_assigned` | `customer_properties.site_visit_assignee` changes | new assignee | "Site visit" / "Kale house, Pune" |
| 8 | `site_survey_assigned` | `customer_properties.site_survey_assignee` changes | new assignee | "Site survey" / "Kale house, Pune" |
| 9 | `service_ticket_assigned` | ticket assignee set or changed | new assignee's user | "Ticket #142" / "Inverter error – Patil" |

Severity: `info` for all, except `task_blocked` = `warning`.

Not events (checked): creating a lead (`CustomerService.create` has no assignee
field); `completeSurvey` filling `site_visit_assignee` for attribution
(`customer-property.service.ts:983`); maintenance tickets (created unassigned by cron).

### B. Worker morning summary — `daily_summary`

One per user per day, sent only when at least one count is above 0.

| Count | Rule |
|---|---|
| Late tasks | assigned to the user, `end_date < CURRENT_DATE`, status ≠ `done`, task not deleted, **project status not `cancelled`/`completed`/`on_hold`** |
| Tasks due today | same, `end_date = CURRENT_DATE` |
| Missed follow-ups | `assigned_to_user_id = user`, `status = 'pending'`, `scheduled_at < date_trunc('day', now())` |
| Follow-ups due today | same, `scheduled_at` within today |
| Late tickets | assignee's user = user, status `open`/`in_progress`, `due_date` not null and `< CURRENT_DATE` |
| Late tasks in my projects | user `is_project_manager` on the project, task late (rule above), assigned to **someone else** |

Body example: "2 late tasks · 3 follow-ups today · 1 late ticket".
Severity `warning` if any late count > 0, else `info`.

**One late-task rule.** The late-task rule above lives in one place and is also
used by My Day (mobile) and My tasks (web), so the summary number always equals
what the screen shows. This **changes those screens**: tasks on cancelled,
completed and on-hold projects stop counting as late (today they stay late
forever, because cancelling a project does not close its tasks).

### C. Admin morning summary — `admin_daily_summary`

One per active user holding `admin` or `super_admin` (`ADMIN_BYPASS_ROLES`), per
day, only when at least one count is above 0.

- Late tasks, late tickets, missed follow-ups (all staff, same rules as B).
- Tickets with no owner: status `open`/`in_progress`, no assignee.
- Late customer payments: `MilestoneScheduleService.findStalledReceivables()`
  (`ledger/services/milestone-schedule.service.ts:142`), which today only logs.
- New leads and new projects created yesterday.

Body example: "12 late tasks · 4 late tickets · 2 tickets with no owner · 3 late payments".
An admin who also has their own work gets both summaries.

### Left out on purpose

Task done / started; "your item moved to someone else"; purchase orders and
dispatch. Each can be added later as one event + one handler.

## Part 2 — Backend

### Events

New file `notifications/events/staff-notification.events.ts`: `STAFF_EVENTS`
names + one payload class per event. Every payload carries
`actorUserId: string | null`. Emit sites must pass the signed-in user; where the
method has no actor today, add it:
`ProjectTeamService.addMember` (controller ignores `_currentUser`,
`project-team.controller.ts:37`), `assignCustomer` (`updatedBy` optional),
`CustomerPropertyService.update` (`updatedBy` optional).

**Emit only after the final commit.** An event that fires inside a transaction can
notify for a save that later rolls back.

| Event | Emit site | Notes |
|---|---|---|
| task assigned | `project-task.service.ts`: `create` (:99), `update` (:268, old = `existingTask.assignedToUserId`), `assignTask` (:477, already compares at :511), `updateTaskCrossProject` (:1321, old at :1349) | only when the new assignee is non-null and differs from the old |
| project assigned | `project.service.ts` `convertFromQuote` (:424), after commit, next to `PROJECT_ONBOARDED` (:550) | **not** inside `applyTaskAssignments` (:1168) or `addTeamMembers` (:1107) — both run inside the creation transaction (:874). Payload: team members (role, PM flag) + task assignee ids; actor = `createdBy` |
| task blocked | `create` (status set), `updateStatus` (:394, also via :1214), `moveTask` (after :725), `updateTaskCrossProject` (:1375) | only when old status ≠ `blocked`. No automatic blocking exists. |
| team added | `project-team.service.ts` `addMember` (:38) | existing projects only |
| lead assigned | `customer.service.ts` `assignCustomer` (:766) | keep the old value from `findById` (:773), which is thrown away today |
| follow-up assigned | `followup.service.ts`: `create` (:41), `update` (:190, old at :198), `reassign` (:377, old at :378), `reassignMany` (:393, keep old values read at :403; one event per new assignee), `complete` (:265, next follow-up, after the transaction at :298) | |
| site visit / survey assigned | `customer-property.service.ts` `update` (:513), after the transaction (:585), beside the loan-sync emit (:643-650) | old values from `locked` (:586) |
| ticket assigned | `service-ticket.service.ts`: `create` (:54, after its transaction at :59), `update` (:158, `assigneeChanged` at :173) | |

If work after the commit throws (e.g. `seedProjectBom`, schedule updates), the
event may not fire. Accepted: the save itself still succeeded and the item still
shows in the summaries.

### Listener

New file `notifications/listeners/staff-notification.listener.ts`, registered in
`notifications.module.ts`. Per event:

1. Resolve the recipient user id (raw SQL through `DataSource`). Tickets store an
   `employee_profiles.id` → join `employee_profiles.user_id` (NOT NULL).
2. Skip per the delivery rules: self, unassigned, inactive/deleted user, finished item.
   The listener re-reads the item's current status, so a stale event cannot notify
   about finished work.
3. Build title, body, `link`, `metadata`.
4. `NotificationService.create()` with no dedupe key.

Every handler is wrapped in try/catch and logs; a notification failure never
breaks the action that caused it.

**Metadata rule.** `NotificationService` spreads `metadata` after `type`, `link`,
`severity` and `notificationId` in the push data, so a clashing key overwrites
them. Staff notifications put only `mobilePath` and entity ids (`projectId`,
`taskId`, `customerId`, `followupId`, `propertyId`, `ticketId`) in metadata.

### Morning summaries

New file `notifications/services/daily-summary.service.ts`:

- `@Cron(process.env.DAILY_SUMMARY_CRON ?? '*/30 9-10 * * *', { timeZone: 'Asia/Kolkata' })`
  — runs at 09:00, 09:30, 10:00 and 10:30. A deploy or restart at 09:00 is covered
  by the later runs.
- Dedupe keys `summary:<userId>:<YYYY-MM-DD>` and `admin-summary:<userId>:<YYYY-MM-DD>`.
  The unique index makes later runs and a second machine no-ops; no push is sent
  for a skipped row. Someone with nothing at 09:00 but a due-today item by 09:30
  gets their summary at 09:30 — accepted.
- Only `users.status = 'active'` and `deleted_at IS NULL`.
- One SQL query per count group, grouped by user — a fixed number of queries per run.
- The late-work queries live in one `LateWorkService`, used by both summaries,
  `GET /late-work`, and the existing My Day / My tasks late filters.

### Late work endpoint

`GET /late-work` in the notifications module. Admin-only: inline
`hasAdminBypassRole(currentUser.roles)` → `ForbiddenException` (pattern from
`projects/controllers/project.controller.ts:619-623`). Returns four lists:
late tasks (task, project, assignee, days late), late + no-owner tickets, missed
follow-ups (customer, assignee, days late), late payments (project, milestone,
amount, days late).

### Cleanup

New nightly cron in the notifications module (02:00 IST): delete
`daily_summary` / `admin_daily_summary` rows older than 30 days and all other
rows older than 180 days. Today the table is never cleaned.

### Links

`link` = web path. `metadata.mobilePath` = app path (no `oneohm://`).

| Type | `link` (web) | `metadata.mobilePath` |
|---|---|---|
| task_assigned / task_blocked | `/projects/<projectId>?tab=tasks` | `projects/<projectId>` |
| project_assigned / project_team_added | `/projects/<projectId>` | `projects/<projectId>` |
| lead_assigned | `/customers/<customerId>` | `leads/<customerId>` |
| followup_assigned | `followupRecordHref(...)` (`components/features/followups/lib/followup-href.ts:20-40` — move or mirror it so the backend builds the same URL) | `more/followups/<followupId>` |
| site_visit_assigned / site_survey_assigned | `/properties/<propertyId>` | `more/site-activity/job/<propertyId>/visit` or `/survey` |
| service_ticket_assigned | `/service/<ticketId>` | `more/service-tickets/<ticketId>` |
| daily_summary | `/projects/my-tasks` | `my-day` |
| admin_daily_summary | `/late-work` | `my-day/notifications` |

Mobile paths verified against `oneohm-mobile/src/app/routes.tsx` (tabs add
`my-day`/`leads`/`projects`/`more`; groups add nothing). Task notifications open
the project because the mobile task detail screen is still a placeholder; the web
project page has no per-task URL, so web opens the Tasks tab.

### Shared package

Add the new values to `libs/shared/src/types/enums/notification.enum.ts`, and
export a shared `Notification` type (web defines its own at
`apps/web/lib/hooks/resources/notifications.ts:14-24`).

### Sign-out

`POST /auth/logout` accepts an optional `{ deviceToken }` and sets that token
`is_active = false` for the signed-in user (`auth.service.ts:402-405` only logs
today). The mobile app already calls logout **before** it clears its tokens, so
the call is still authenticated. No new endpoint. (A shared phone that someone
else signs in on is already handled by the token upsert.)

### Small fix

`GET /notifications`: cap `limit` at 50 (no maximum today).

## Part 3 — Web and mobile

### Web

- Bell: icon per type (task, project, lead, follow-up, ticket, summary) and a "See all" link.
- New page `/notifications`: paged list, unread filter, mark all read, each row opens
  `link`. `lib/rbac/route-map.ts`: ALWAYS_OPEN.
- New page `/late-work`: the four lists from `GET /late-work`, each row opens its item.
  `lib/rbac/route-map.ts`: admin-only (unmapped routes are open by default). Not in
  the nav rail; reached from the admin summary.
- My tasks late group uses the shared late-task rule.

### Mobile (`oneohm-mobile`)

- Bell (Feather icon, `react-native-vector-icons`) with unread count beside the
  avatar in `MyDayHeader` (`src/features/myday/components/MyDayHeader.tsx:58-118`),
  also in the compact scrolled bar. Resellers see it too (they use this app).
- New screen: notification list at `my-day/notifications`. Uses the endpoints and
  query keys already declared (`src/core/api/endpoints.ts:261-266`,
  `src/core/query/keys.ts:168-171`, `src/core/query/filters.ts:258-261`).
  Tap → mark read → open `metadata.mobilePath`.
- Unread count refreshes when a push arrives and when the app returns to the
  front (`AppState`); the app has no polling or focus refetch today.
- Opening a path: convert `mobilePath` with the app's own linking config
  (`getStateFromPath` from `src/app/linking.ts`) and dispatch it. Unknown or
  missing path → My Day.
- **Cold-start fix:** a push tapped while the app was closed is replayed while only
  the `Loading` screen exists (`routes.tsx:555-559`) and is dropped. Hold the pending
  target until the session is `signedIn` and `MainTabs` is mounted, then navigate.
- Push setup:
  - Create Android channel `default` in `MainApplication.kt`.
  - Ask for `POST_NOTIFICATIONS` with `PermissionsAndroid` after sign-in (targetSdk 36).
  - `setBackgroundMessageHandler` in `index.js` (no-op; Android shows the
    notification block itself).
  - Foreground: `initPushHandlers()` (`src/app/index.tsx:37`) gets an
    `onForegroundMessage` callback that shows an in-app banner (app-wide host for
    the existing `Toast`, `src/shared/ui/Feedback.tsx:67`) and refreshes the unread count.
  - `targetForMessage` (`src/core/push/handlers.ts:89-112`) uses
    `metadata.mobilePath` first, then the existing type mapping.
- Sign-out (`src/core/auth/session.store.ts:193-205`): send the FCM token in the
  `POST /auth/logout` body.
- `android/app/google-services.json` for `com.oneohm.epc` (supplied by the owner).

## Part 4 — Rollout and testing

### Order (each PR merged before the next starts)

1. **oneohm PR 1 — instant events:** shared enum + type, events, listener, emits,
   actor plumbing, `/notifications` page, bell changes, logout token, limit cap, cleanup cron.
2. **oneohm-mobile PR — inbox + push:** bell, list screen, push setup, cold-start
   fix, sign-out token, `google-services.json`. Starts after PR 1 merges and the
   shared package is published.
3. **oneohm PR 2 — summaries:** `LateWorkService` (and My Day / My tasks switched to
   it), daily summary service, `GET /late-work`, `/late-work` page.

### Force update

After the mobile release, set **both** min and recommended EPC versions to the new
version (Fly secrets on `oneohm-epc-backend`). The app shows nothing for
"recommended" alone (`UpdateGate.tsx:46-54` blocks only on `force`).

### Steps for the owner (cannot be done from code)

1. Firebase console → project `oneohm-prod` → add Android app `com.oneohm.epc` →
   download `google-services.json`.
2. `oneohm-prod` service account key → Fly secrets on `oneohm-epc-backend`:
   `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

**Side effect of step 2:** push turns on for the consumer app too. Its existing
notifications (property, quote, project onboarded/completed, chat) start reaching
customers' phones.

### Testing

No new unit tests. Verify by using each screen with two local users (web on 3001,
API on 8085):

- Each of the 9 instant events, done through the web UI as user A → user B sees it
  in the bell, on `/notifications`, in the mobile list, and as a push on the Android
  emulator; tapping opens the right screen.
- No notification for: assigning to yourself, clearing an assignee, reassigning a
  completed follow-up, an inactive user.
- Convert a quote with several tasks → one notification per person.
- Push tapped with the app closed (cold start) → opens the right screen.
- Set `DAILY_SUMMARY_CRON` to the next minute → one summary per user with work; a
  second run adds nothing; the admin summary's counts equal `/late-work`; My Day and
  My tasks show the same late counts; a task on a cancelled project is not counted.
- `/late-work` as a non-admin → denied on web and 403 from the API.
- Sign out on the phone → no further pushes to that phone.
