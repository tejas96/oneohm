# Conditional workflow tasks

- Date: 2026-09-11
- Status: approved design, ready for an implementation plan
- Repo: `oneohm` (shared, backend, web). Mobile follow-on in Phases.
- Part 1 of 2. Part 2, WhatsApp alerts when a step completes, is a separate spec
  that builds on this one.

## Problem

Every active baseline workflow step becomes a task on every new project. A step
cannot say which sites it is for.

The request assumed a rule already exists: "if the property needs a loan, add
the loan tasks". It does not. `ProjectService.applyWorkflowStepsWithMilestones`
never reads `wants_loan` or `property_type`, and neither does the project create
wizard.

Measured on the local database (production restore of 2026-09-04) on 2026-09-11:

| What | Count |
|---|---|
| Projects | 235 (215 live, 13 cancelled, 7 completed) |
| Projects without a loan that carry the 8 loan tasks | 174 of 174 |
| Loan tasks on those projects: open / done | 695 / 696 |
| Commercial and industrial projects carrying PM Surya Ghar subsidy tasks | 7, all 21 tasks open |
| Projects created with a step excluded in the wizard | 0 |

What it costs:

- **Progress never reaches 100%.** An open loan task on a cash project holds the
  project below 100%, so it never auto-completes.
- **Staff record fake work.** To clear the list they mark loan tasks done. On
  live projects without a loan each loan step is about 50% done, against about
  80% on loan projects. They are closed in batches, often several in the same
  minute. One of 644 has a ticked checklist item.
- **Customers see a stage that is not theirs.** The consumer app builds its
  timeline from task milestone names, so a cash customer sees "Loan Processing".
- **Part 2 cannot ship on top of this.** A WhatsApp alert on a loan step would
  reach customers who have no loan.

## The idea

A step carries a small rule: which financing and which property types it is for.
One shared function decides whether a step applies to a site. Project creation
uses it. A sync keeps each live project in line when its site changes. An action
on the steps page spreads a rule edit to live projects, after a preview.

## Decisions

1. A rule has two optional fields: financing (`loan` or `no_loan`) and property
   types (a list). When both are set, both must match. There is no free rule
   builder.
2. Only baseline steps take a rule. Change-request steps keep their own
   mechanism.
3. The loan fact is `customer_properties.wants_loan`. Creating a loan
   application sets it.
4. When a live project's site changes its loan flag or property type, the
   project's tasks sync. Tasks that now apply are added. Tasks that no longer
   apply are removed if untouched. Touched tasks stay and are marked "Not needed
   for this site".
5. Editing a step's rule, or adding a step, changes new projects only. "Apply to
   live projects" on a step spreads it, after a preview in which projects can be
   unticked.
6. A one-time cleanup applies the starting rules to live projects. It also
   removes the done loan tasks on projects without a loan, because that work
   never happened.
7. Reassigning a task or changing its priority does not count as touching it.
8. The system never re-adds a task a person deleted, never adds a step excluded
   on the project, and never changes a completed or cancelled project.
9. A task the sync adds is assigned by the step's default role, with the same
   rule the wizard uses.
10. No new unit tests. Verification walks the real screens.

## Non-goals

- Rules on other site facts (connection type, load, DISCOM, system size). The
  JSON shape leaves room; nothing reads them now.
- Spreading step edits to live projects on save.
- Any change to the ledger's loan logic (`MilestoneService.isLoanFinanced`) or to
  payment terms.
- Creating commercial-only steps. Admins add them on the steps page.
- Re-wiring the dependencies of existing tasks, beyond linking a task the sync
  adds.
- WhatsApp alerts (Part 2).

## Data model

One schema migration adds the three columns below. The starting-rules migration
and the cleanup migration follow it, in that order.

### `workflow_steps.applies_when` — jsonb, nullable

```ts
// libs/shared
export interface StepAppliesWhen {
  financing?: 'loan' | 'no_loan';
  propertyTypes?: PropertyType[];
}
```

- `null`, `{}`, or both keys absent: the step applies to every site.
- `propertyTypes` holds distinct values. An empty list is dropped on write, and
  an object left with no keys is stored as `null`. An empty list can never mean
  "no site".
- The backend refuses a rule on a step with `isSpecial` or `changeRequestType`,
  beside `assertChangeRequestShape`.
- The admin form clears a rule by sending `appliesWhen: null`. The service tells
  "absent" from `null` with `hasOwnProperty`, so the clear is not dropped.

### `projects.task_rule_facts` — jsonb, nullable

```ts
// libs/shared
export interface SiteTaskFacts {
  wantsLoan: boolean;
  propertyType: PropertyType;
}
```

The site facts the project's tasks were last synced for. Project creation, every
sync and the cleanup write it.

### `project_tasks.removal_reason` — varchar(40), nullable

| Value | Meaning |
|---|---|
| `rule_not_applicable` | A sync removed the task. |
| `rule_cleanup` | The one-time cleanup removed the task. |
| `NULL` on a deleted task | A person deleted it. |

It is written in the same statement as `deleted_at`.

### Shared additions (`libs/shared`)

- `StepAppliesWhen`, `SiteTaskFacts`, and a zod `stepAppliesWhenSchema` that
  `workflowStepSchema` uses.
- `WorkflowStep.appliesWhen?: StepAppliesWhen | null`.
- `PROPERTY_TYPE_LABELS`. Shared has none yet.
- `TaskActivityType` gains `'added_by_rule'`.
- `NotificationType` gains `TASKS_SYNCED_BY_RULE = 'tasks_synced_by_rule'`.

The shared version auto-bumps on merge. Nothing forces a mobile bump: the new
fields are optional, and the employee app routes an unknown notification type to
My Day.

## The rule

In `libs/shared/src/utils/workflow-step-selection.ts`, beside
`isProjectBaselineStep`:

```ts
stepAppliesToSite(step: { appliesWhen?: StepAppliesWhen | null }, site: SiteTaskFacts): boolean

describeStepRule(
  appliesWhen: StepAppliesWhen | null | undefined,
  options?: { short?: boolean },
): string | null
// full:  "Loan only", "Residential, Residential apartment", "No loan · Commercial"
// short: "Loan only", "Residential +1", "No loan · Commercial"

describeRuleMismatch(appliesWhen: StepAppliesWhen | null | undefined, site: SiteTaskFacts): string | null
// "Loan only. This site has no loan." — null when the step applies

pickDefaultAssignee(
  defaultRoleCode: string | null | undefined,
  members: Array<{ userId: string; roleCodes: string[] }>,
): string | null
```

- Financing `loan` matches `wantsLoan === true`. `no_loan` matches `false`.
- Property types match by exact enum value.
- Project creation, the sync, the preview and the wizard all call
  `stepAppliesToSite`. The only other copy is the SQL in the cleanup migration,
  which is a frozen snapshot of today's rule.
- `pickDefaultAssignee` is the wizard's current role match (case-insensitive,
  first matching team member), moved here so the wizard and the sync share it.

## The loan fact

- `LoanApplicationService.create` sets `wants_loan = true` on its property when
  it is false, in the same transaction as the insert. It writes through the
  entity manager, not `CustomersModule`, because `CustomersModule` already
  imports `LoanFinanceModule`.
- `LoanApplicationService.update` does the same when `propertyId` changes. The
  old property keeps its flag; a person decides.
- Deleting a loan application does not change the flag.
- After a flag change it raises the site-change event (see Triggers).

Today no loan application sits on a property whose flag is off, so this changes
no current data.

## Sync

### `TaskRulesService` (projects module)

- `plan(projectId, scope)` reads only and returns `{ facts, add, remove, keep }`.
- `sync(projectId, scope, trigger, actorUserId)` opens a transaction, locks the
  project row with `SELECT … FOR UPDATE`, plans again inside the lock, applies
  the plan, and returns `{ projectId, projectNumber, added, removed, kept }`.
- `syncForProperty(propertyId, trigger, actorUserId)` finds the property's live
  project and calls `sync`. A property has at most one live project
  (`findLiveByPropertyId`).

A **live** project has status `planning`, `active` or `on_hold` and is not
deleted. Every other project is skipped.

### Scopes

**Fact change.** Used by site changes and the hourly check. It compares the old
facts (`task_rule_facts`) with the current ones, for each baseline step that has
a rule:

| Applies with old facts | Applies with new facts | Action |
|---|---|---|
| no | yes | Add, if allowed |
| yes | no | Remove if untouched, else keep |
| no | no | Nothing |
| yes | yes | Nothing |

- Both columns use the step's current rule.
- Steps without a rule are never touched by this scope, so a fact change never
  spreads a step edit.
- If `task_rule_facts` is `null`, the sync writes the current facts, changes no
  task, and logs a warning.

**One step.** Used by "Apply to live projects". For that step on each chosen
project:

- It applies, and the project has no live task for it: add, if allowed.
- It does not apply, and a live task exists: remove if untouched, else keep.

The action is hidden for change-request steps and disabled for inactive steps.

### Definitions

- **Untouched task:** status is `backlog`, `completion_percentage` is 0, no
  checklist item is ticked, and every activity entry that has a `userId` is of
  type `assigned` or `priority_changed`. A task a person added carries a
  `created` entry with their id, so it is never untouched.
- **Add is allowed** when all are true: the step is active and baseline; the
  project has no live task for the step; the step is not in
  `projects.excluded_step_ids`; and no deleted task for the step on the project
  has `removal_reason IS NULL`.

### Adding a task

The same fields as project creation, built by one shared private helper:

- `code` from `generateTaskCode`, `status` backlog, `kanbanOrder` from
  `sequenceOrder`.
- Milestone name and order from the step default, with the canonical order.
- `endDate` = today + `effortDays`.
- `activity_log` = one `added_by_rule` entry with no `userId`. Its `newValue` is
  the reason, for example "Site needs a loan".
- `assignedToUserId` from `pickDefaultAssignee` over the project team.
  Unassigned if nobody matches.
- `depends_on_task_ids` = the live tasks whose step code is in the step's
  `dependsOnTaskCodes`.
- Every live **backlog** task whose step lists the new step's code gains the new
  task as a dependency, unless that makes a cycle (the existing detector checks).

### Removing a task

- Soft delete with `removal_reason = 'rule_not_applicable'`.
- Take its id out of every `depends_on_task_ids` on the project, as
  `ProjectTaskService.remove` does.

### After a change

Inside the transaction:

- Write `task_rule_facts`.
- Write one `audit_logs` row: entity `project`, action `task_rule_sync`, new
  values = trigger, facts, and the task codes added, removed and kept. Deleted
  tasks are invisible in the UI; this row is their history.

After the commit:

- Recompute progress through the same path as a status change
  (`updateAllProgress`, made reusable). A project that reaches 100% completes,
  and the consumer "project completed" event fires, exactly as today.
- Notify the project managers (fallback: the project creator) with type
  `tasks_synced_by_rule`, title "Tasks updated on PRJ-…", a body such as "Site
  now needs a loan: 8 added, 0 removed, 1 kept", and link
  `/projects/:id?tab=tasks`. A fact-change sync notifies when anything was
  added, removed or kept. An apply notifies only when something was added or
  removed.

### Triggers

| Trigger | Where | Scope |
|---|---|---|
| Project created | `applyWorkflowStepsWithMilestones` filters with `stepAppliesToSite`, with facts read inside the creation transaction, and writes `task_rule_facts` | — |
| Property edited (web, mobile) | `CustomerPropertyService.update`, when `wantsLoan` or `propertyType` changed | Fact change |
| Change request written back | `ChangeRequestTaskService.applyPropertyWriteBack`, when the update includes `propertyType` | Fact change |
| Loan application created, or moved to another property | `LoanApplicationService` | Fact change |
| Apply to live projects | new workflow step endpoints | One step |
| Hourly check | `@Cron(EVERY_HOUR)` named `projects:task-rule-facts-drift`, over live projects whose `task_rule_facts` differ from the site | Fact change |

- The customers and loan-finance modules cannot import the projects module. They
  raise `site.task-facts.changed` with `eventEmitter.emitAsync` and await it. The
  listener in the projects module runs `syncForProperty`, catches its own
  errors, logs them and returns `null`. A failed sync never fails the save, and
  the hourly check repairs it.
- `CustomerPropertyService.update` returns the result as `taskRuleSync` on its
  response when a project changed.
- At project creation, a dependency on a rule-skipped step is dropped with a
  debug log. Unknown codes keep today's warning.
- Two instances during a rolling deploy are safe. The row lock serialises them,
  and the second finds nothing left to do.

### Read-time flag

The project task list, board, task detail and cross-project task detail
responses gain `notNeededReason: string | null`, from
`describeRuleMismatch(step.appliesWhen, siteFacts)`. Site facts load once per
request, batched by project for cross-project reads.

The flag reads the current rule. After a rule edit, and before anyone applies
it, a task that no longer matches already shows the chip.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/workflow-steps/:id/live-projects-preview` | One-step plan for each live project where the step would add, remove or keep a task: project id, number, customer name, added, removed, kept |
| `POST` | `/workflow-steps/:id/apply-to-live-projects` | Body `{ projectIds: string[] }`. Syncs each project with the one-step scope and returns totals |

- `sync` plans again inside the lock, so a stale preview cannot remove a task
  someone touched after it loaded.
- The workflow step endpoints carry `appliesWhen`. The property update response
  carries `taskRuleSync`.
- Like the rest of the workflow step controller, the new endpoints use only
  `JwtAuthGuard`.

## Screens (web)

### Admin → Workflow steps

- New form section **When to add this step**, after Execution Rules:
  - Financing: Any / Loan only / No loan.
  - Property types: six toggle chips. None picked means all.
  - Hidden while "This is a change request step" is ticked. Ticking it clears
    the rule.
- The Dependencies section warns about a dependency that has a rule, for example
  "LOAN-001 is loan only. On other sites this link is skipped."
- Each row shows one rule chip with the short form of `describeStepRule`, for
  example "Loan only" or "Residential +1". The full form is its tooltip.
- The row's Edit, Activate and Delete buttons become one always-visible ⋮ menu:
  Edit, Apply to live projects, Activate/Deactivate, Delete.
- **Apply to live projects** opens a dialog fed by the preview endpoint:
  - One ticked row for each project that gains or loses a task: number, customer,
    "+2 / −1".
  - One line under the list: "N projects keep a started task."
  - The confirm button reads "Apply to N projects".
  - With nothing to change, the dialog says "No live project changes".
  - After apply, a toast gives the totals.

### Project create wizard, step 5

- Steps that do not apply to the selected property are hidden. The facts come
  from the property record.
- One line above the milestone groups: "11 steps skipped by rules: 8 loan only,
  3 residential only". Hidden when nothing is skipped.
- The submit's auto-assignment skips hidden steps and uses `pickDefaultAssignee`.
- The backend reads the facts again at creation. If the site changed after the
  preview, the backend wins.

### Project → Tasks

- The list row, the board card and the task drawer show a "Not needed for this
  site" chip when `notNeededReason` is set. The drawer also shows the reason.
- The activity card and the task history show `added_by_rule` as "added by
  rule", with no person's name.

### Property save

- When `taskRuleSync` is present, the save toast adds "PRJ-0123: 8 tasks added,
  0 removed, 1 kept".

### Notifications

- `/notifications` lists `tasks_synced_by_rule` like any other type. The link
  opens the project's Tasks tab.

## Starting rules (migration)

- Every step with `type = 'loan'`, not deleted and not a change-request step:
  `{"financing":"loan"}`. Today that is the 8 loan steps, including `LOAN -02`
  (Jan Samarth).
- `LIA-11` (PM Surya Ghar portal), `LIA-014` (Subsidy Application) and
  `LIA-016` (Subsidy Disbursement):
  `{"propertyTypes":["residential","residential_apartment"]}`.
- The migration logs each row it updates and warns about any code it does not
  find.
- `down()` sets `applies_when` back to `NULL` on those rows.

## One-time cleanup (migration)

Runs after the starting rules, in one transaction, on live projects only.

1. A live task is **not needed** when its step has a rule that the project's
   site fails. The SQL mirrors `stepAppliesToSite`.
2. Remove a not-needed task if it is `done`, or if it is untouched (definition
   above). Set `deleted_at` and `removal_reason = 'rule_cleanup'`.
3. Take the removed ids out of the remaining tasks' `depends_on_task_ids`.
4. Recompute `progress_percentage` on changed projects. Do **not** change
   `status`. Log any project that reaches 100%, for a person to complete in the
   UI. None is expected.
5. Write `task_rule_facts` on every live project.
6. Write one `audit_logs` row per changed project. Old values hold the
   dependency lists it rewrote. New values hold the removed task ids and codes.
7. Log the totals. Send no notifications.

`down()` restores the tasks with `removal_reason = 'rule_cleanup'`, puts the
dependency lists back from the audit rows, recomputes progress, and clears
`task_rule_facts`.

Expected on today's local data:

| | Count |
|---|---|
| Projects changed | 160 |
| Done tasks removed | 644 |
| Open, untouched tasks removed | 652 (631 loan, 21 subsidy) |
| Open, touched tasks kept | 4 |
| Projects reaching 100% | 0 |

Side effects, all intended:

- Dashboard and workload task counts drop by the removed tasks.
- Cash customers stop seeing "Loan Processing" in the consumer app.
- No payment milestone moves. `v_milestone_completion` matches tasks to payment
  milestones by name. The removed tasks carry "Loan Processing", "Planning" and
  the subsidy stages, and no payment milestone has those names.

## Phases

1. **This spec: one `oneohm` PR.** Shared, backend, migrations, web.
2. **Follow-on: `oneohm-mobile`.** Route the `tasks_synced_by_rule` push to the
   project instead of My Day, after the shared package publishes.
3. **Part 2: WhatsApp alerts** for completed steps. A separate spec. It relies on
   this one, so an alert only fires for tasks a site really has. It also gives
   task completion one path for its side effects. Today the three ways to finish
   a task disagree: `PATCH /tasks/:id` does not write `completed_at`, and only
   `PATCH …/status` writes a change request back to the property.

## Verification

Walk every step on the real screens (web on 3001, API on 8085). Pair each
database check with the screen that shows it.

1. **Admin rule.** Set "Loan only" on a step. The chip shows, and reopening the
   form shows the value. Clear it. Reopening shows it empty.
2. **Wizard.** Convert a quote on a residential site with no loan. Step 5 hides
   the loan steps and shows the skipped line. The project's Tasks tab has no
   loan task, and its progress count leaves them out.
3. **Loan on.** In the property drawer, turn on "wants loan". The toast shows 8
   added. The Tasks tab shows 8 loan tasks with their dependencies and default
   assignees. A task's history shows "added by rule". The project manager's bell
   shows the notification.
4. **Loan off.** Start one loan task, then turn the loan off. The untouched loan
   tasks disappear. The started one stays with the chip and its reason.
5. **Loan application.** On a site with the flag off, create a loan
   application. The flag turns on and the loan tasks appear.
6. **Property type.** Complete a "Property Type Change" change-request task to
   commercial through its status control. The untouched subsidy tasks
   disappear.
7. **Person delete.** Delete a loan task by hand, then turn the loan off and on
   again. That task does not come back.
8. **Apply.** Change a step's rule, open "Apply to live projects", untick one
   project, and confirm. Only the ticked projects change, and their managers get
   the notification.
9. **Hourly check.** This is the one step that uses SQL, because the UI cannot
   make a trigger fail. Change `wants_loan` in the database, trigger the check,
   and open the project.
10. **Cleanup.** Run the migrations on the local copy of production. Compare the
    logged totals with the table above. Open three changed projects and the
    steps page.
11. **Regression.** `tsc` for shared, backend and web; lint; the existing test
    suites; knip.

## Known limits

- A rejected bank loan blocks turning `wants_loan` off
  (`CustomerPropertyService.update`). That site keeps its loan tasks, and staff
  delete them.
- A kept, touched task needs a person to delete it.
- A fact-change sync reacts only to steps that have a rule. A new step without a
  rule reaches live projects only through "Apply to live projects".
- Until Part 2, a change-request task finished by dragging it on the board or
  through `PATCH /tasks/:id` does not write the property back, so no sync runs.
