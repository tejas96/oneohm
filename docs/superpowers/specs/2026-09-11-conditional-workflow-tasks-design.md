# Conditional workflow tasks

- Date: 2026-09-11
- Status: approved design, ready for an implementation plan
- Repo: `oneohm` (shared, backend, web)
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

A step can carry a rule: "only when the site needs a loan", and a list of
property types. A new project gets only the steps whose rule matches its site.

The loan part also follows the site after the project starts. When staff turn a
site's loan on or off, its live project gains or loses the loan tasks. A
one-time cleanup removes the loan tasks that projects without a loan never
needed.

Property types stay simple. They decide what a new project gets, and nothing
else.

## Decisions

1. A rule has two optional parts: a "loan only" tick box and a list of property
   types. No type ticked means every type. When both parts are set, both must
   match. A step with no rule goes into every project, as today.
2. Only baseline steps take a rule. Change-request steps keep their own
   mechanism.
3. A new project gets only the steps whose rule matches its site. The wizard
   hides the rest.
4. When `wants_loan` changes on a site with a live project, the project gains
   the loan-only tasks that now apply. It loses the ones that no longer apply
   and have not started. Started tasks stay. This runs inside the same save.
5. Property types only shape new projects. A change to a site's property type,
   or to a step's type list, never adds or removes a task on an existing
   project.
6. A rule edit changes new projects only. Nothing spreads it to live projects.
7. The deploy ticks "loan only" on the 8 loan steps. Admins set property types on
   the steps page.
8. A one-time cleanup removes loan-only tasks from live projects without a loan:
   the done ones, because that work never happened, and the ones not started.
   Started tasks stay.
9. The system never brings back a task a person deleted.
10. No new unit tests. Verification walks the real screens.

## Non-goals

These were considered and cut to keep the change small.

- A "no loan only" option, and rules on other site facts.
- Syncing property types to existing projects, in either direction.
- An action that spreads a rule edit to live projects.
- An hourly repair job. The loan sync is part of the save, so nothing needs
  repair.
- A "Not needed for this site" chip on tasks.
- Notifications about task changes, and a mobile follow-up for them.
- A history line or audit row for synced tasks.
- Auto-assigning synced tasks. They start unassigned.
- Linking existing tasks to a newly added task. Only the added task gets its own
  dependencies.
- A loan application turning `wants_loan` on.
- A sync after a change-request write-back.
- Any change to the ledger's loan logic (`MilestoneService.isLoanFinanced`) or to
  payment terms.
- WhatsApp alerts (Part 2).

## Data model

One migration adds the three columns and sets the starting rule. A second
migration runs the cleanup.

| Column | Type | Meaning |
|---|---|---|
| `workflow_steps.loan_only` | boolean, not null, default false | The step goes only to sites with `wants_loan = true`. |
| `workflow_steps.property_types` | varchar[], nullable | The step goes only to sites of these types. `NULL` means every type. |
| `project_tasks.removal_reason` | varchar(40), nullable | Set only when the system removes a task: `rule_not_applicable` by the loan sync, `rule_cleanup` by the cleanup. `NULL` on a deleted task means a person deleted it. |

- An empty `property_types` list is stored as `NULL`, so it can never mean "no
  type".
- The backend refuses `loan_only = true` or a type list on a step with
  `isSpecial` or `changeRequestType`, beside `assertChangeRequestShape`.
- The admin form clears the type list by sending `propertyTypes: null`. The
  service tells "absent" from `null` with `hasOwnProperty`, so the clear is not
  dropped.
- `removal_reason` is written in the same statement as `deleted_at`.

Shared additions (`libs/shared`):

- `WorkflowStep.loanOnly: boolean` and
  `WorkflowStep.propertyTypes: PropertyType[] | null`, with matching fields in
  `workflowStepSchema`.
- `SiteTaskFacts { wantsLoan: boolean; propertyType: PropertyType }`.
- `PROPERTY_TYPE_LABELS`. Shared has none yet.

## The rule

In `libs/shared/src/utils/workflow-step-selection.ts`, beside
`isProjectBaselineStep`:

```ts
stepAppliesToSite(
  step: { loanOnly?: boolean; propertyTypes?: PropertyType[] | null },
  site: SiteTaskFacts,
): boolean

describeStepRule(
  step: { loanOnly?: boolean; propertyTypes?: PropertyType[] | null },
  options?: { short?: boolean },
): string | null
// full:  "Loan only", "Residential, Commercial", "Loan only · Commercial"
// short: "Loan only", "Residential +1", "Loan only · Commercial"
```

- `loanOnly` matches only `wantsLoan === true`.
- An empty or `null` type list matches every type. Otherwise the site's type must
  be in the list.
- Project creation, the loan sync and the wizard all call `stepAppliesToSite`.
  The only other copy is the cleanup SQL, a frozen snapshot of the loan part.

## New projects

- `applyWorkflowStepsWithMilestones` keeps a step when
  `isProjectBaselineStep(step) && stepAppliesToSite(step, facts)`. It reads the
  facts from the property inside the creation transaction.
- A dependency on a rule-skipped step is dropped with a debug log. Unknown codes
  keep today's warning.
- The wizard reads the facts from the selected property and hides the steps that
  do not match. The backend reads the facts again at creation. If the site
  changed after the preview, the backend wins.

## Loan sync (live projects)

**When.** `CustomerPropertyService.update` saves a change to `wantsLoan`, and the
property has a live project. Web and mobile both save through this method. A
**live** project has status `planning`, `active` or `on_hold` and is not deleted.

**Which steps.** Every baseline step with `loan_only = true`. For each, the rule
is checked with the old loan value and with the new one. Both checks use the
site's property type from before the save, so a type change in the same save
still changes no task:

| Applies with old value | Applies with new value | Action |
|---|---|---|
| no | yes | Add, if allowed |
| yes | no | Remove if not started, else keep |

In every other case nothing happens.

**Definitions.**

- **Not started:** status is `backlog` and no checklist item is ticked.
- **Add is allowed** when all are true: the step is active; the project has no
  live task for the step; the step is not in `projects.excluded_step_ids`; and
  no deleted task for the step on the project has `removal_reason IS NULL`.

**Adding a task.** The same fields as project creation, built by one shared
private helper:

- `code` from `generateTaskCode`, status backlog, `kanbanOrder` from
  `sequenceOrder`.
- The step's default milestone, with its canonical order.
- `endDate` = today + `effortDays`.
- `createdBy` = the person who saved. No assignee.
- `depends_on_task_ids` = the live tasks whose step code is in the step's
  `dependsOnTaskCodes`.

**Removing a task.** Soft delete with `removal_reason = 'rule_not_applicable'`.
Then take its id out of every `depends_on_task_ids` on the project, as
`ProjectTaskService.remove` does.

**One transaction.**

- The customers module cannot import the projects module. So `update` runs in a
  transaction and awaits `eventEmitter.emitAsync('site.loan-changed', …)`, with
  the entity manager in the payload. The projects module's listener runs the
  sync with that manager and lets errors propagate. A failed sync rolls back the
  whole save, and the user sees the error.
- The sync recomputes `progress_percentage` inside the transaction. If the
  project reaches 100%, it completes, as today. After the commit, `update` emits
  the consumer "project completed" event for that case.
- The listener returns `{ projectId, projectNumber, added, removed, kept,
  completed }`. `update` returns it as `taskRuleSync` on its response.

## Starting rule (migration)

- `loan_only = true` on every step with `type = 'loan'` that is not deleted and
  not a change-request step. Today that is the 8 loan steps, including
  `LOAN -02` (Jan Samarth). The migration logs each row.
- No property types are set. Admins set them on the steps page.
- `down()` drops the three columns.

## One-time cleanup (migration)

Runs after the starting rule, in one transaction, on live projects only.

1. A live task is **not needed** when its step has `loan_only = true` and the
   project's site has `wants_loan = false`.
2. Remove a not-needed task if it is `done`, or if it has not started. Set
   `deleted_at` and `removal_reason = 'rule_cleanup'`.
3. Take the removed ids out of the remaining tasks' `depends_on_task_ids`.
4. Recompute `progress_percentage` on changed projects. Do **not** change
   `status`. Log any project that reaches 100%, for a person to complete in the
   UI. None is expected.
5. Log the totals. Send no notifications.

`down()` restores the tasks with `removal_reason = 'rule_cleanup'` and
recomputes progress. It does not restore the dependency links it removed.

Expected on today's local data:

| | Count |
|---|---|
| Projects changed | 160 |
| Done loan tasks removed | 644 |
| Not-started loan tasks removed | 634 |
| Started loan tasks kept | 1 |
| Projects reaching 100% | 0 |

Property-type tasks are not touched. The 21 subsidy tasks on the 7 commercial and
industrial projects stay.

Side effects, all intended:

- Dashboard and workload task counts drop by the removed tasks.
- Cash customers stop seeing "Loan Processing" in the consumer app.
- No payment milestone moves. `v_milestone_completion` matches tasks to payment
  milestones by name. The removed tasks carry "Loan Processing" and "Planning",
  and no payment milestone has those names.

## Screens (web)

### Admin → Workflow steps

- New form section **When to add this step**, after Execution Rules:
  - Tick box: "Only when the site needs a loan".
  - Property types: six toggle chips. None ticked means every type.
  - One help line: "Rules decide which tasks a new project gets. The loan rule
    also follows a site's loan changes."
  - Hidden while "This is a change request step" is ticked. Ticking it clears
    both parts.
- Each row shows one rule chip with the short form of `describeStepRule`. The
  full form is its tooltip.

### Project create wizard, step 5

- Steps that do not match the selected property are hidden.
- One line above the milestone groups: "8 steps skipped by rules". Hidden when
  nothing is skipped.
- The submit's auto-assignment skips hidden steps.

### Property save

- When `taskRuleSync` is present, the save toast adds the result, for example
  "PRJ-0123: 8 loan tasks added" or "PRJ-0123: 7 loan tasks removed, 1 started
  task kept".

## Phases

1. **This spec: one `oneohm` PR.** Shared, backend, migrations, web.
2. **Part 2: WhatsApp alerts** for completed steps, in
   `2026-09-11-whatsapp-step-alerts-design.md`. It relies on this one, so an
   alert only fires for tasks a site really has. It also makes
   `PATCH /tasks/:id` write `completed_at`.

## Verification

Walk every step on the real screens (web on 3001, API on 8085). Pair each
database check with the screen that shows it.

1. **Admin rule.** Tick "loan only" and two types on a step. The chip shows, and
   reopening the form shows both. Untick every type. Reopening shows none
   ticked.
2. **Wizard, loan.** Convert a quote on a residential site with no loan. Step 5
   hides the loan steps and shows the skipped line. The project has no loan task.
3. **Wizard, types.** Give a step "Residential" and "Commercial". A residential
   site and a commercial site both get it. Change it to "Commercial" only. A new
   residential project no longer gets it.
4. **Loan on.** On a live project's property, turn on "Wants loan". The toast
   shows 8 added. The Tasks tab shows the loan tasks with their dependencies.
5. **Loan off.** Start one loan task, then turn the loan off. The not-started
   loan tasks disappear. The started one stays, and the toast says so.
6. **Person delete.** Delete a loan task by hand, then turn the loan off and on
   again. That task does not come back.
7. **Type change.** Change a live project's property type. Its tasks do not
   change.
8. **Rule edit.** Change a step's types. Existing projects do not change. A new
   project follows the new rule.
9. **Cleanup.** Run the migrations on the local copy of production. Compare the
   logged totals with the table above. Open three changed projects.
10. **Regression.** `tsc` for shared, backend and web; lint; the existing test
    suites; knip.

## Known limits

- A rejected bank loan blocks turning `wants_loan` off
  (`CustomerPropertyService.update`). That site keeps its loan tasks, and staff
  delete them.
- A property type change does not change an existing project's tasks. Staff add
  or delete tasks by hand.
- A rule edit does not reach live projects.
- Tasks that the loan sync adds start unassigned.
- A new loan application does not turn `wants_loan` on. Staff turn it on.
- Undoing the cleanup restores the tasks, but not the dependency links it
  removed.
