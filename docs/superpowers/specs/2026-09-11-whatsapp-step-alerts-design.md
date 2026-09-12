# WhatsApp alerts for completed steps

- Date: 2026-09-11
- Status: approved design, ready for an implementation plan
- Repo: `oneohm` (shared, backend, web)
- Part 2 of 2. It builds on Part 1, conditional workflow tasks
  (`2026-09-11-conditional-workflow-tasks-design.md`), so an alert can only fire
  for a task the site really has.

## Problem

Customers do not hear about progress on their project. When a step such as
panel installation is done, nothing tells them, so they phone the office to ask.

The pieces to fix this already exist:

- **WhatsApp keys.** The `integrations` row "WhatsApp Production" (provider
  `whatsapp-business-api`) is active. Quotes send through it with the Meta
  template `quotation_pdf` (`QuoteService.shareOnWhatsapp`).
- **Delivery statuses.** `POST /integrations/whatsapp/webhook` already receives
  them from Meta, and only logs them.
- **Recipients.** Every customer on a live project has a phone and a first name
  (215 of 215).

Two facts shape the design:

- WhatsApp only lets a business start a conversation with a template that Meta
  has approved. So the alert is a template message, and one new template is
  needed.
- Tasks go back out of done. Of 5,003 tasks marked done, 77 were moved back
  within 10 minutes. An alert sent at once would tell those customers something
  false.

One bug stands in the way. `PATCH /tasks/:id` (the My Work drawer and board)
marks a task done without writing `completed_at`, and the alert keys on
`completed_at`.

## The idea

An admin ticks "WhatsApp the customer when done" on a step and writes a one-line
update. Ten minutes after a task of that step is done, a job sends the update to
the customer through one Meta template. If the task was reopened in those ten
minutes, nothing is sent. Each task sends at most one successful message. Meta's
delivery result comes back through the existing webhook, and the task drawer
shows what happened.

## Decisions

1. One Meta template for every step. Its name, `project_step_update`, is fixed
   in code, the way quotes fix `quotation_pdf`. English only.
2. A step opts in with a tick box and a one-line update text. The text is
   required when the box is ticked.
3. `completed_at` is the trigger. All three ways to finish a task write it, which
   means the My Work path now writes it too. No other change to the task code is
   needed.
4. A job that runs every minute sends messages for tasks done more than 10
   minutes ago. A task reopened within the 10 minutes has no `completed_at`, so
   the job never picks it.
5. One successful message per task. Finishing a task again sends again only if
   the last attempt failed or was skipped.
6. Only completions after the step was ticked send. Ticking a step never messages
   old completions.
7. Nothing is sent for a cancelled project, a customer without a valid phone, or a
   completion more than 24 hours old. Each is logged as skipped, with the reason.
8. Every attempt is logged in one row per task. The webhook updates that row to
   delivered, read or failed.
9. The task drawer shows one line from that row.
10. A WhatsApp problem never blocks or fails a task update.
11. No new unit tests. Verification walks the real screens.

## Non-goals

These were considered and cut to keep the change small.

- A "Send again" button.
- A per-customer "No WhatsApp updates" switch.
- The same update as an app push.
- Combining several updates into one message.
- A template per step, or a template with a PDF.
- Languages other than English.
- A staff alert when a message fails.
- Fixing the change-request write-back on the board and My Work paths. It is
  tracked as a separate task.

## The template

Created once in Meta WhatsApp Manager, before release.

| Field | Value |
|---|---|
| Name | `project_step_update` |
| Category | Utility |
| Language | English (`en`) |
| Body | `Hello {{customer_name}}, here is an update on your solar project {{project_number}}: {{update}}. Thank you for choosing OneOhm.` |

- The wording can change in Meta. The code depends only on the name, the
  language and the three parameter names.
- The parameters are named, as in `quotation_pdf`. The provider already sends
  named body parameters.
- Sample values for Meta's review: `Ramesh`, `PRJ-ONEOHM_EPC-2026-0123`,
  `Your solar panels are installed`.
- Until Meta approves the template, every send fails with Meta's reason, and the
  drawer shows it.

## Data model

One migration adds the step columns and the message table.

### `workflow_steps`

| Column | Type | Meaning |
|---|---|---|
| `whatsapp_since` | timestamptz, nullable | Set to now when the box is ticked, and cleared when it is unticked. `NULL` means off. Only completions at or after this time send. |
| `customer_update_text` | varchar(200), nullable | The `{{update}}` text. |

- The API field `whatsappOnDone: boolean` maps to `whatsapp_since`. Saving `true`
  on a step that is already on keeps the old time. Saving `false` clears it.
- `customerUpdateText` is trimmed, and trailing full stops are dropped, because
  the template adds one. It is required when `whatsappOnDone` is true. It is one
  line of at most 200 characters, with no tab and no run of 4 or more spaces,
  because Meta refuses those in a parameter.
- The text stays when the box is unticked, so ticking again brings it back. The
  form clears the text by sending `null`.

Shared (`libs/shared`): `WorkflowStep.whatsappOnDone: boolean` and
`WorkflowStep.customerUpdateText: string | null`, with the same rules in
`workflowStepSchema`.

### `task_whatsapp_messages` (new)

One row per task. It holds the latest attempt.

| Column | Type | Meaning |
|---|---|---|
| `id` | uuid | |
| `project_task_id` | uuid, unique, FK `project_tasks`, on delete cascade | |
| `project_id` | uuid, FK `projects` | |
| `task_completed_at` | timestamptz | The completion this attempt answers. |
| `phone` | varchar(20), nullable | The number used. |
| `update_text` | varchar(200), nullable | The text sent. |
| `status` | varchar(20) | `sending`, `sent`, `delivered`, `read`, `failed` or `skipped`. |
| `reason` | text, nullable | Why it failed or was skipped. |
| `provider_message_id` | varchar(255), nullable, indexed | Meta's message id. |
| `sent_at`, `delivered_at`, `read_at` | timestamptz, nullable | |
| `created_at`, `updated_at` | timestamptz | |

"Waiting" is not stored. A task is waiting when its step is ticked, it is done
with `completed_at >= whatsapp_since`, and it has no row for that completion.

## The job

`TaskWhatsappService` lives in the notifications module, which now imports
`IntegrationsModule`. There is no cycle, because the integrations module imports
neither the notifications module nor the projects module. The service reads
tasks with plain SQL through the data source, as `ConsumerNotificationListener`
does, so it does not import the projects module.

`@Cron(CronExpression.EVERY_MINUTE)`, named `notifications:task-whatsapp`. Each
run does five things.

1. **Find due tasks**, at most 50 per run, oldest first. A task is due when all
   of these are true:
   - it is not deleted, its status is `done`, and `completed_at` is set;
   - its step has `whatsapp_since` set, and `completed_at >= whatsapp_since`;
   - `completed_at` is at least 10 minutes old;
   - it has no message row, or its row is `failed` or `skipped` for an older
     `task_completed_at`.
2. **Claim** each task in one statement. The statement inserts the row as
   `sending`, or updates a `failed` or `skipped` row whose `task_completed_at` is
   older (`INSERT … ON CONFLICT (project_task_id) DO UPDATE … WHERE … RETURNING`).
   Only the run that gets the row back sends. So two instances during a rolling
   deploy cannot send twice.
3. **Skip** the claimed task, with a reason on its row, when:
   - the project is cancelled: "Project cancelled";
   - `completed_at` is more than 24 hours old: "Done more than 24 hours before
     sending";
   - the customer's phone is not valid after `normalizePhoneToE164` (valid means
     `+` and 11 to 15 digits): "No valid phone".
4. **Send** with `IntegrationService.sendTemplateMessage` and provider
   `WHATSAPP_BUSINESS`: template `project_step_update`, language `en`, and body
   parameters `customer_name` (the customer's first name, else "Customer"),
   `project_number`, and `update` (the step's current `customer_update_text`).
   - On success the row gets `sent`, `provider_message_id`, `sent_at`, `phone`
     and `update_text`.
   - On any error the row gets `failed`, with the error message as `reason`.
     This covers WhatsApp not configured, the template not approved, and Meta
     refusals.
5. **Unstick.** A row left in `sending` for more than 10 minutes, because the
   process stopped during a send, becomes `failed` with "Send interrupted". It is
   not retried automatically, because Meta may have accepted it.

## Webhook

`WhatsappWebhookController.processWebhookEvents` keeps its logging. For every
status entry it also emits `whatsapp.message.status` with
`{ providerMessageId, status, timestamp, errors }`. A listener in the
notifications module updates the matching `task_whatsapp_messages` row:

| Meta status | Row change |
|---|---|
| `sent` | None. The send already set `sent`. |
| `delivered` | `delivered` and `delivered_at`, unless the row is `read`. |
| `read` | `read` and `read_at`. |
| `failed` | `failed`, with `reason` from the first error, unless the row is `delivered` or `read`. |

- The times come from Meta's `timestamp`.
- Statuses for other messages, such as quotes, match no row and are ignored.

## Completion fix

`ProjectTaskService.updateTaskCrossProject` (`PATCH /tasks/:id`) gets the same
`completed_at` handling as `updateStatus` and `moveTask`. It sets `completed_at`
when the task moves into a final status, and clears it when the task moves out.

This also lets a payment milestone fall due when its stage is finished from My
Work, which today it cannot.

## Screens (web)

### Admin → Workflow steps

- New form section **Customer WhatsApp**, after "When to add this step":
  - Tick box: "WhatsApp the customer when this step is done".
  - Text field "Update text", shown when the box is ticked. It is required, holds
    200 characters, and has the example "Your solar panels are installed".
  - One help line: "Sent 10 minutes after a task is done, for tasks done after you
    tick this."
- Each ticked step's row shows a "WhatsApp" chip.

### Task drawer

`GET /tasks/:id` gains `customerWhatsapp: { state, at, reason } | null`. It is
`null` when the task has no row and is not waiting, for example when its step is
not ticked, or when it was done before the tick. The shared `TaskDrawer`, which
the project Tasks tab and My Work both use, shows one line:

| State | Line |
|---|---|
| `waiting` | "WhatsApp to customer at 4:20 PM" |
| `sending` | "Sending WhatsApp to customer" |
| `sent` | "WhatsApp sent to customer, 11 Sep, 4:20 PM" |
| `delivered` | "WhatsApp delivered, 11 Sep, 4:21 PM" |
| `read` | "WhatsApp read by customer, 11 Sep, 4:30 PM" |
| `failed` | "WhatsApp failed: {reason}" |
| `skipped` | "WhatsApp not sent: {reason}" |

For `waiting`, `at` is `completed_at` plus 10 minutes.

## Phases

1. **Before release: the Meta template.** Create and submit it. Approval can take
   from minutes to days. Until then, alerts fail with a clear reason.
2. **This spec: one `oneohm` PR**, after Part 1. Shared, backend, migration, web.

## Verification

Walk every step on the real screens (web on 3001, API on 8085). Pair each
database check with the screen that shows it.

A real send needs working WhatsApp keys and the approved template. If the local
setup has neither, check the failure path locally, and the success path after
deploy with a test customer whose phone is your own.

1. **Admin.** Tick the box on a step and save with no text. The form refuses.
   Add text and save. The chip shows. Untick and reopen. The text is still there.
2. **Old completions.** A task of that step that was done before the tick shows
   no WhatsApp line, and the job sends nothing for it.
3. **Waiting.** Mark a task of that step done on the project board. The drawer
   shows "WhatsApp to customer at …".
4. **Reopen.** Move it back within 10 minutes. The line goes away, and nothing is
   sent.
5. **Send.** Mark it done from My Work. After 10 minutes the drawer shows "sent",
   and the phone gets the message.
6. **Once.** Reopen the task and finish it again. After 10 minutes nothing new is
   sent.
7. **Skipped.** For a test customer with an invalid phone, finish a ticked task.
   The drawer shows "WhatsApp not sent: No valid phone". Fix the phone, reopen and
   finish the task again. It sends.
8. **Delivery.** The drawer moves to "delivered" and then "read" as the phone gets
   and opens the message. Locally, Meta cannot reach the webhook, so post one
   sample status payload to it. This is the one step outside the UI, because the
   real caller is Meta.
9. **Failure.** With the template not approved or the keys missing, the drawer
   shows "WhatsApp failed" with the reason, and the task update itself worked.
10. **completed_at.** Finish a task from My Work. Its `completed_at` is set.
11. **Regression.** `tsc` for shared, backend and web; lint; the existing test
    suites; knip.

## Known limits

- Meta charges for each template message. Tick only the steps customers care
  about.
- The webhook does not check Meta's signature. A forged call could change the
  status a message shows. It cannot send a message.
- A message interrupted during a send is marked failed and not retried, to avoid
  a double send.
- A task finished more than 24 hours before the job reaches it is skipped, for
  example after a long outage.
- The update text is read at send time. An edit during the 10-minute wait
  changes that message.
