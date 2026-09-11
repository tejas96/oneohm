# WhatsApp Step Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a task of a ticked workflow step is done, the customer gets one WhatsApp template message ten minutes later, and the task drawer shows what happened to it.

**Architecture:** A step opts in with `whatsapp_since` (set when ticked) and `customer_update_text`. A cron job in the notifications module finds tasks done at least 10 minutes ago, claims each one atomically in `task_whatsapp_messages`, and sends the Meta template `project_step_update` through the existing `IntegrationService`. The existing WhatsApp webhook emits status events that update the same row. `GET /tasks/:id` returns one computed `customerWhatsapp` line for the drawer. The only change to task code is that `PATCH /tasks/:id` now writes `completed_at`.

**Tech Stack:** NestJS + TypeORM (Postgres, raw SQL through `DataSource`), `@nestjs/schedule`, `@nestjs/event-emitter` 3.1, Next.js web (react-hook-form, zod, MUI + Tailwind), Nx monorepo, `@tejas96/shared` read from source through TS path aliases.

**Spec:** `docs/superpowers/specs/2026-09-11-whatsapp-step-alerts-design.md`

## Global Constraints

- Part 1 (`docs/superpowers/plans/2026-09-11-conditional-workflow-tasks.md`) must be finished first. Several anchors below are lines that Part 1 adds.
- No new unit test files (owner rule). Existing tests must keep passing. Verify by walking the real screens; pair every database check with the screen that shows it.
- To clear a field, send `null`, never `undefined`. The backend tells "absent" from `null` with `Object.prototype.hasOwnProperty.call`.
- Template: name `project_step_update`, language `en`, named body parameters `customer_name`, `project_number`, `update`.
- Wait 10 minutes after `completed_at`. At most 50 tasks per run. A row stuck in `sending` for 10 minutes becomes `failed`. A completion more than 24 hours old is skipped.
- Row statuses, exactly: `sending`, `sent`, `delivered`, `read`, `failed`, `skipped`.
- Reason strings, exactly: `Project cancelled`, `Done more than 24 hours before sending`, `No valid phone`, `Send interrupted`.
- Screen copy, exactly: section "Customer WhatsApp"; tick box "WhatsApp the customer when this step is done"; field "Update text"; help line "Sent 10 minutes after a task is done, for tasks done after you tick this."; drawer lines as in Task 7.
- **Local safety.** The local database is a production restore with real customer phones. The job does not run unless `NODE_ENV === 'production'` or `TASK_WHATSAPP_ALLOW_LOCAL=true`. Only set that flag while testing on a customer whose phone is the owner's, and remove it afterwards.
- Migration timestamp: `1857120000000`.
- Every commit ends with the trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## Before you start (one time)

- [ ] **Branch.** Part 1 ships as its own PR. When it is merged to `main` (squash merge), start Part 2 from `main`:

```bash
cd /Volumes/works-space/oneohm/oneohm-conditional-tasks
git fetch origin main
git switch -c feat/whatsapp-step-alerts origin/main
```

If Part 1 is not merged yet, branch from `feat/conditional-workflow-tasks` instead. After Part 1's squash merge, rebase onto `origin/main` before opening the PR — a squash-merged branch never looks merged to git.

- [ ] **Servers.** Use the worktree servers from Part 1's "Before you start" (`backend-tasks` on 8085, `web-tasks` on 3001).

- [ ] **Baseline.** Run and note any failure that exists before your change:

```bash
npm run typecheck:libs && npm run typecheck:backend && npm run typecheck:web
npx nx test shared && npx nx test backend && npx nx test web
```

## File structure

| File | Change | Responsibility |
|---|---|---|
| `apps/backend/src/modules/projects/services/project-task.service.ts` | Modify | `PATCH /tasks/:id` writes `completed_at`; task detail gains `customerWhatsapp` |
| `libs/shared/src/utils/customer-update-text.ts` | Create | Normalise and check the update text (one home for the rules) |
| `libs/shared/src/utils/index.ts` | Modify | Export it |
| `libs/shared/src/types/interfaces/task.interface.ts` | Modify | `WorkflowStep` WhatsApp fields, `CustomerWhatsappStatus`, `MyTask.customerWhatsapp` |
| `libs/shared/src/schemas/workflow-step.schema.ts` | Modify | Form fields and validation |
| `apps/backend/src/database/migrations/1857120000000-AddTaskWhatsappMessages.ts` | Create | Step columns and the message table |
| `apps/backend/src/modules/projects/entities/workflow-step.entity.ts` | Modify | Map the two step columns |
| `apps/backend/src/modules/projects/dto/workflow-steps/create-workflow-step.dto.ts` | Modify | Accept `whatsappOnDone`, `customerUpdateText` |
| `apps/backend/src/modules/projects/dto/workflow-steps/workflow-step-response.dto.ts` | Modify | Return them |
| `apps/backend/src/modules/projects/services/workflow-step.service.ts` | Modify | Map the tick box to `whatsapp_since`; validate the text |
| `apps/web/components/features/admin/workflow-steps/components/admin-workflow-steps-page.tsx` | Modify | "Customer WhatsApp" form section and row chip |
| `apps/web/components/features/admin/workflow-steps/utils/workflow-step-payload.ts` | Modify | Send the two fields |
| `apps/backend/src/modules/notifications/constants/task-whatsapp.constants.ts` | Create | Template name, wait, batch, limits |
| `apps/backend/src/modules/notifications/services/task-whatsapp.service.ts` | Create | The minute job: find, claim, skip, send, unstick |
| `apps/backend/src/modules/notifications/notifications.module.ts` | Modify | Import `IntegrationsModule`; register the job and the listener |
| `apps/backend/src/modules/integrations/events/whatsapp.events.ts` | Create | Status event name and payload |
| `apps/backend/src/modules/integrations/controllers/whatsapp-webhook.controller.ts` | Modify | Emit a status event per status entry |
| `apps/backend/src/modules/notifications/listeners/whatsapp-status.listener.ts` | Create | Update the message row from Meta's status |
| `apps/backend/src/modules/projects/dto/project-tasks/my-task-response.dto.ts` | Modify | Expose `customerWhatsapp` |
| `apps/web/components/features/tasks/components/task-drawer-whatsapp.tsx` | Create | The drawer line |
| `apps/web/components/features/tasks/components/task-drawer.tsx` | Modify | Render the line in the sidebar |

---

### Task 1: `PATCH /tasks/:id` writes `completed_at`

**Files:**
- Modify: `apps/backend/src/modules/projects/services/project-task.service.ts` (inside `updateTaskCrossProject`, the status block near line 1300)

**Interfaces:**
- Consumes: nothing new.
- Produces: every way to finish a task sets `project_tasks.completed_at`, and every way to reopen one clears it. Task 5 relies on this.

- [ ] **Step 1: Set and clear `completed_at` in the My Work path**

Replace:

```ts
        const sMeta = statusMap.get(dto.status)?.metadata ?? {};
        if (sMeta.autoSetStartDate && !task.startDate) {
          updateData.startDate = new Date();
        }
        if (sMeta.isFinal) {
          if (!task.endDate) updateData.endDate = new Date();
          if (sMeta.autoCompletePct !== undefined)
            updateData.completionPercentage = sMeta.autoCompletePct;
        }
```

with:

```ts
        const sMeta = statusMap.get(dto.status)?.metadata ?? {};
        if (sMeta.autoSetStartDate && !task.startDate) {
          updateData.startDate = new Date();
        }
        if (sMeta.isFinal) {
          if (!task.endDate) updateData.endDate = new Date();
          if (sMeta.autoCompletePct !== undefined)
            updateData.completionPercentage = sMeta.autoCompletePct;
          // Same as updateStatus and moveTask. Without it a task finished from
          // My Work never counted as complete for a payment milestone, and never
          // triggered the customer's WhatsApp update.
          updateData.completedAt = new Date();
        } else if (task.completedAt) {
          updateData.completedAt = null;
        }
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck:backend`
Expected: PASS.

- [ ] **Step 3: Verify on the screen**

1. Open `http://localhost:3001` → My Work. Open a task that is not done. Press "Mark complete". The drawer shows it done.
2. Check the row (read-only):

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "SELECT code, status, completed_at FROM project_tasks WHERE code = '<TASK CODE FROM THE DRAWER HEADER>';"
```

Expected: `status = done`, `completed_at` = now.

3. In the drawer, set the status back to "In progress". Run the same query. Expected: `completed_at` is empty.

- [ ] **Step 4: Run the existing backend tests**

Run: `npx nx test backend`
Expected: same result as the baseline.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/projects/services/project-task.service.ts
git commit -m "$(cat <<'EOF'
fix(tasks): write completed_at when a task is finished from My Work

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Shared types, text rules and form schema

**Files:**
- Create: `libs/shared/src/utils/customer-update-text.ts`
- Modify: `libs/shared/src/utils/index.ts`
- Modify: `libs/shared/src/types/interfaces/task.interface.ts`
- Modify: `libs/shared/src/schemas/workflow-step.schema.ts`

**Interfaces:**
- Consumes: Part 1's `WorkflowStep.propertyTypes` and schema field `propertyTypes` (as anchors).
- Produces:
  - `CUSTOMER_UPDATE_TEXT_MAX = 200`
  - `normalizeCustomerUpdateText(text: string | null | undefined): string | null`
  - `customerUpdateTextProblem(text: string): string | null`
  - `WorkflowStep.whatsappOnDone?: boolean`, `WorkflowStep.customerUpdateText?: string | null`
  - `type CustomerWhatsappState = 'waiting' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped'`
  - `interface CustomerWhatsappStatus { state: CustomerWhatsappState; at: string | null; reason: string | null }`
  - `MyTask.customerWhatsapp?: CustomerWhatsappStatus | null`
  - form fields `whatsappOnDone` (boolean, default false) and `customerUpdateText` (string | null)

- [ ] **Step 1: Create the text rules**

Create `libs/shared/src/utils/customer-update-text.ts`:

```ts
/**
 * The one-line update a customer gets on WhatsApp when a step is done.
 *
 * It travels as the {{update}} parameter of the `project_step_update` template,
 * and Meta refuses a parameter that holds a new line, a tab or a run of four or
 * more spaces. The admin form and the backend both check with these, so the form
 * refuses exactly what the API would.
 */
export const CUSTOMER_UPDATE_TEXT_MAX = 200;

/** Trim, and drop trailing full stops: the template adds its own. */
export function normalizeCustomerUpdateText(text: string | null | undefined): string | null {
  const cleaned = (text ?? '').trim().replace(/\.+$/, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Why Meta would refuse this text, or null when it is fine. */
export function customerUpdateTextProblem(text: string): string | null {
  if (text.length > CUSTOMER_UPDATE_TEXT_MAX) {
    return `Keep the update to ${CUSTOMER_UPDATE_TEXT_MAX} characters`;
  }
  if (/[\r\n]/.test(text)) return 'Write the update on one line';
  if (/\t/.test(text)) return 'Remove the tab from the update';
  if (/ {4,}/.test(text)) return 'Remove the extra spaces from the update';
  return null;
}
```

- [ ] **Step 2: Export it**

In `libs/shared/src/utils/index.ts`, after `export * from './workflow-step-selection';` add:

```ts
export * from './customer-update-text';
```

- [ ] **Step 3: Add the types**

In `libs/shared/src/types/interfaces/task.interface.ts`, inside `interface WorkflowStep`, after Part 1's line `propertyTypes?: PropertyType[] | null;` add:

```ts
  /** Customer WhatsApp: send the update when a task of this step is done. */
  whatsappOnDone?: boolean;
  /** The {{update}} text of the WhatsApp template. */
  customerUpdateText?: string | null;
```

After Part 1's `TaskRuleSyncResult` interface add:

```ts
export type CustomerWhatsappState =
  | 'waiting'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'skipped';

/** What happened to a task's customer WhatsApp update, for the task drawer. */
export interface CustomerWhatsappStatus {
  state: CustomerWhatsappState;
  /** waiting: when it goes out. sent, delivered, read: when that happened. */
  at: string | null;
  reason: string | null;
}
```

Inside `interface MyTask`, replace:

```ts
  dependencyCodes?: string[];
  hasDependencyBlockers?: boolean;
}
```

with:

```ts
  dependencyCodes?: string[];
  hasDependencyBlockers?: boolean;
  /** Only on the task detail response. */
  customerWhatsapp?: CustomerWhatsappStatus | null;
}
```

- [ ] **Step 4: Add the form fields and validation**

In `libs/shared/src/schemas/workflow-step.schema.ts`:

Add this import below the existing imports:

```ts
import {
  customerUpdateTextProblem,
  normalizeCustomerUpdateText,
} from '../utils/customer-update-text';
```

After Part 1's field `propertyTypes: z.array(z.nativeEnum(PropertyType)).default([]),` add:

```ts
    whatsappOnDone: z.boolean().default(false),
    customerUpdateText: z.string().nullable().optional(),
```

Inside `.superRefine((data, ctx) => {`, after the change-request check, add:

```ts
    // The same rules the backend applies: required when ticked, and nothing Meta
    // would refuse inside a template parameter.
    const updateText = normalizeCustomerUpdateText(data.customerUpdateText);
    if (data.whatsappOnDone && !updateText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Write the update the customer gets',
        path: ['customerUpdateText'],
      });
    } else if (updateText) {
      const problem = customerUpdateTextProblem(updateText);
      if (problem) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem, path: ['customerUpdateText'] });
      }
    }
```

- [ ] **Step 5: Typecheck and run the existing shared tests**

Run: `npm run typecheck:libs && npx nx test shared`
Expected: PASS.

- [ ] **Step 6: Quick check of the text rules (no test file)**

```bash
npx ts-node --transpile-only -O '{"module":"commonjs"}' -e "
const t = require('./libs/shared/src/utils/customer-update-text.ts');
console.log(t.normalizeCustomerUpdateText('  Your solar panels are installed.. '));
console.log(t.customerUpdateTextProblem('two\nlines'));
console.log(t.customerUpdateTextProblem('Your solar panels are installed'));
"
```

Expected output:

```
Your solar panels are installed
Write the update on one line
null
```

- [ ] **Step 7: Commit**

```bash
git add libs/shared/src/utils/customer-update-text.ts libs/shared/src/utils/index.ts libs/shared/src/types/interfaces/task.interface.ts libs/shared/src/schemas/workflow-step.schema.ts
git commit -m "$(cat <<'EOF'
feat(shared): customer WhatsApp fields for workflow steps and tasks

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Step columns, message table and step API

**Files:**
- Create: `apps/backend/src/database/migrations/1857120000000-AddTaskWhatsappMessages.ts`
- Modify: `apps/backend/src/modules/projects/entities/workflow-step.entity.ts`
- Modify: `apps/backend/src/modules/projects/dto/workflow-steps/create-workflow-step.dto.ts`
- Modify: `apps/backend/src/modules/projects/dto/workflow-steps/workflow-step-response.dto.ts`
- Modify: `apps/backend/src/modules/projects/services/workflow-step.service.ts`

**Interfaces:**
- Consumes: `normalizeCustomerUpdateText`, `customerUpdateTextProblem` (Task 2); Part 1's `assertRuleShape`, `normalizePropertyTypes` and `changes` object in `WorkflowStepService`.
- Produces:
  - columns `workflow_steps.whatsapp_since timestamptz NULL`, `workflow_steps.customer_update_text varchar(200) NULL`
  - table `task_whatsapp_messages` (Tasks 5, 6, 7 read and write it with SQL)
  - entity fields `WorkflowStepEntity.whatsappSince?: Date | null`, `customerUpdateText?: string | null`
  - API fields `whatsappOnDone: boolean`, `customerUpdateText: string | null`

- [ ] **Step 1: Write the migration**

Create `apps/backend/src/database/migrations/1857120000000-AddTaskWhatsappMessages.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Customer WhatsApp alerts for completed steps.
 *
 * `workflow_steps.whatsapp_since` is set when an admin ticks "WhatsApp the
 * customer when this step is done" and cleared when they untick it. Only a
 * completion at or after it sends, so ticking a step never messages the
 * customers of work that was finished before.
 *
 * `task_whatsapp_messages` holds one row per task: its latest attempt. A task
 * has no row while it waits out the 10 minutes after being done; the send job
 * claims the task by inserting the row as `sending`, and the WhatsApp webhook
 * moves it to delivered, read or failed.
 */
export class AddTaskWhatsappMessages1857120000000 implements MigrationInterface {
  name = 'AddTaskWhatsappMessages1857120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS whatsapp_since timestamptz NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS customer_update_text varchar(200) NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_whatsapp_messages (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_task_id     uuid NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
        project_id          uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        task_completed_at   timestamptz NOT NULL,
        phone               varchar(20) NULL,
        update_text         varchar(200) NULL,
        status              varchar(20) NOT NULL,
        reason              text NULL,
        provider_message_id varchar(255) NULL,
        sent_at             timestamptz NULL,
        delivered_at        timestamptz NULL,
        read_at             timestamptz NULL,
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_task_whatsapp_messages_task UNIQUE (project_task_id),
        CONSTRAINT chk_task_whatsapp_messages_status
          CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed', 'skipped'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_whatsapp_messages_provider_id
        ON task_whatsapp_messages (provider_message_id)
        WHERE provider_message_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS task_whatsapp_messages`);
    await queryRunner.query(`ALTER TABLE workflow_steps DROP COLUMN IF EXISTS customer_update_text`);
    await queryRunner.query(`ALTER TABLE workflow_steps DROP COLUMN IF EXISTS whatsapp_since`);
  }
}
```

- [ ] **Step 2: Map the step columns**

In `apps/backend/src/modules/projects/entities/workflow-step.entity.ts`, after Part 1's `propertyTypes` column add:

```ts
  /**
   * Customer WhatsApp: when the admin ticked it. Only completions at or after
   * this time send. NULL means off.
   */
  @Column({ name: 'whatsapp_since', type: 'timestamptz', nullable: true })
  whatsappSince?: Date | null;

  /** The {{update}} text of the `project_step_update` WhatsApp template. */
  @Column({ name: 'customer_update_text', type: 'varchar', length: 200, nullable: true })
  customerUpdateText?: string | null;
```

- [ ] **Step 3: Accept the fields**

In `create-workflow-step.dto.ts`, after Part 1's `propertyTypes` property add:

```ts
  @ApiPropertyOptional({
    description: 'Customer WhatsApp: send an update when a task of this step is done.',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  whatsappOnDone?: boolean;

  @ApiPropertyOptional({
    description: 'The one-line update the customer gets. Required when whatsappOnDone is true.',
    maxLength: 200,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  customerUpdateText?: string | null;
```

(`UpdateWorkflowStepDto` is `PartialType(CreateWorkflowStepDto)`, so it picks these up.)

- [ ] **Step 4: Return the fields**

In `workflow-step-response.dto.ts`, after Part 1's `propertyTypes` property add:

```ts
  @ApiProperty({ description: 'Customer WhatsApp is on for this step' })
  @Expose()
  @Transform(({ obj }) => (obj as { whatsappSince?: Date | null }).whatsappSince != null)
  whatsappOnDone!: boolean;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  customerUpdateText?: string | null;
```

- [ ] **Step 5: Map the tick box and check the text in the service**

In `apps/backend/src/modules/projects/services/workflow-step.service.ts`:

Add this import below the `@tejas96/shared/types` import:

```ts
import {
  customerUpdateTextProblem,
  normalizeCustomerUpdateText,
} from '@tejas96/shared/utils';
```

Replace the whole `create` method with:

```ts
  async create(
    createDto: Partial<WorkflowStepEntity> & { code: string; whatsappOnDone?: boolean },
    currentUserId: string,
  ): Promise<WorkflowStepEntity> {
    const codeExists = await this.stepRepository.existsByCode(createDto.code);
    if (codeExists) {
      throw new BadRequestException(`Workflow step with code ${createDto.code} already exists`);
    }

    await this.assertChangeRequestShape(createDto);
    this.assertRuleShape(createDto);

    // `whatsappOnDone` is the tick box; the column is the time it was ticked.
    const { whatsappOnDone, ...stepFields } = createDto;
    const customerUpdateText = normalizeCustomerUpdateText(stepFields.customerUpdateText);
    this.assertWhatsappShape(whatsappOnDone === true, customerUpdateText);

    return this.stepRepository.create({
      ...stepFields,
      propertyTypes: normalizePropertyTypes(stepFields.propertyTypes),
      customerUpdateText,
      whatsappSince: whatsappOnDone ? new Date() : null,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    } as Partial<WorkflowStepEntity>);
  }
```

In `update`, change the parameter type from:

```ts
    updateDto: Partial<WorkflowStepEntity>,
```

to:

```ts
    updateDto: Partial<WorkflowStepEntity> & { whatsappOnDone?: boolean },
```

and replace Part 1's block:

```ts
    const changes: Partial<WorkflowStepEntity> = { ...updateDto };
    if (Object.prototype.hasOwnProperty.call(updateDto, 'propertyTypes')) {
      changes.propertyTypes = normalizePropertyTypes(updateDto.propertyTypes);
    }
```

with:

```ts
    const { whatsappOnDone, ...stepFields } = updateDto;
    const changes: Partial<WorkflowStepEntity> = { ...stepFields };
    if (Object.prototype.hasOwnProperty.call(updateDto, 'propertyTypes')) {
      changes.propertyTypes = normalizePropertyTypes(updateDto.propertyTypes);
    }
    if (Object.prototype.hasOwnProperty.call(updateDto, 'customerUpdateText')) {
      changes.customerUpdateText = normalizeCustomerUpdateText(updateDto.customerUpdateText);
    }
    if (whatsappOnDone !== undefined) {
      // Saving an already-ticked step keeps its time, so completions made since
      // the first tick still send. Unticking clears it.
      changes.whatsappSince = whatsappOnDone ? (existing.whatsappSince ?? new Date()) : null;
    }
    this.assertWhatsappShape(
      whatsappOnDone ?? existing.whatsappSince != null,
      Object.prototype.hasOwnProperty.call(changes, 'customerUpdateText')
        ? (changes.customerUpdateText ?? null)
        : (existing.customerUpdateText ?? null),
    );
```

Add this private method after `assertRuleShape`:

```ts
  /**
   * A ticked step needs text, and no text may hold what Meta refuses inside a
   * template parameter. The form checks the same with the shared rules.
   */
  private assertWhatsappShape(whatsappOn: boolean, text: string | null): void {
    if (text) {
      const problem = customerUpdateTextProblem(text);
      if (problem) throw new BadRequestException(problem);
    }
    if (whatsappOn && !text) {
      throw new BadRequestException('Write the update the customer gets on WhatsApp');
    }
  }
```

- [ ] **Step 6: Run the migration and typecheck**

```bash
cd apps/backend && npm run migration:run && cd ../..
npm run typecheck:backend
```

Expected: the migration runs with no error; typecheck PASS.

- [ ] **Step 7: Check the columns and table (read-only)**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "\d task_whatsapp_messages" -c "SELECT count(*) FROM workflow_steps WHERE whatsapp_since IS NOT NULL;"
```

Expected: the table exists with the columns above; the count is 0. The screen check comes in Task 4.

- [ ] **Step 8: Run the existing backend tests**

Run: `npx nx test backend`
Expected: same result as the baseline.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/database/migrations/1857120000000-AddTaskWhatsappMessages.ts apps/backend/src/modules/projects/entities/workflow-step.entity.ts apps/backend/src/modules/projects/dto/workflow-steps apps/backend/src/modules/projects/services/workflow-step.service.ts
git commit -m "$(cat <<'EOF'
feat(projects): customer WhatsApp setting on workflow steps

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Admin step form and row chip

**Files:**
- Modify: `apps/web/components/features/admin/workflow-steps/components/admin-workflow-steps-page.tsx`
- Modify: `apps/web/components/features/admin/workflow-steps/utils/workflow-step-payload.ts`

**Interfaces:**
- Consumes: form fields `whatsappOnDone`, `customerUpdateText` (Task 2); API fields (Task 3).
- Produces: admins can tick a step and write its update.

- [ ] **Step 1: Form defaults**

In `StepFormSheet`, add these two lines to the `defaultValues` object and to the create branch of `form.reset(...)` (both end with `checklistTemplate: [],`):

```ts
      whatsappOnDone: false,
      customerUpdateText: '',
```

In the edit branch of `form.reset(...)`, after `changeRequestType: step.changeRequestType ?? null,` add:

```ts
        whatsappOnDone: step.whatsappOnDone ?? false,
        customerUpdateText: step.customerUpdateText ?? '',
```

- [ ] **Step 2: The form section**

Insert this block directly above `{/* ─── Section: Change Request ─── */}` (so it sits after Part 1's "When to add this step" section):

```tsx
          {/* ─── Section: Customer WhatsApp ─── */}
          <fieldset className="space-y-4 rounded-lg shadow-e2 p-4">
            <legend className="px-2 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
              Customer WhatsApp
            </legend>

            <Alert variant="info" appearance="minimal" className="text-xs">
              Sent 10 minutes after a task is done, for tasks done after you tick this.
            </Alert>

            <div className="rounded-md p-3 shadow-e1">
              <Checkbox
                id="whatsappOnDone"
                checked={form.watch('whatsappOnDone') ?? false}
                onCheckedChange={(checked) =>
                  form.setValue('whatsappOnDone', checked === true, {
                    shouldValidate: form.formState.isSubmitted,
                  })
                }
                label="WhatsApp the customer when this step is done"
              />
            </div>

            {form.watch('whatsappOnDone') && (
              <div className="space-y-1.5">
                <Label>Update text *</Label>
                <Input
                  {...form.register('customerUpdateText')}
                  maxLength={200}
                  placeholder="e.g. Your solar panels are installed"
                />
                {form.formState.errors.customerUpdateText && (
                  <p className="text-xs text-error">
                    {form.formState.errors.customerUpdateText.message}
                  </p>
                )}
              </div>
            )}
          </fieldset>
```

- [ ] **Step 3: The row chip**

In `WorkflowStepRow`, directly after Part 1's rule chip, add:

```tsx
        {step.whatsappOnDone && (
          <Badge variant="success" className="text-xs">
            WhatsApp
          </Badge>
        )}
```

- [ ] **Step 4: Send the fields**

In `workflow-step-payload.ts`, after Part 1's `propertyTypes: …` line add:

```ts
    whatsappOnDone: data.whatsappOnDone ?? false,
    // Emptied text travels as null, or the column keeps its old value.
    customerUpdateText: textOrNull(data.customerUpdateText),
```

- [ ] **Step 5: Typecheck, lint and the existing payload test**

```bash
npm run typecheck:web
npx nx lint web
npx nx test web --testPathPatterns=workflow-step-payload
```

Expected: PASS.

- [ ] **Step 6: Verify on the screen**

1. Open `http://localhost:3001/admin/workflow-steps`. Open "Panel Installation" (EXEC-005).
2. Tick "WhatsApp the customer when this step is done". Leave the text empty and press Save. The form shows "Write the update the customer gets" and does not save.
3. Type `Your solar panels are installed.` and save. The row shows a "WhatsApp" chip.
4. Reopen the step. The box is ticked and the text reads `Your solar panels are installed` (the full stop is dropped).
5. Check (read-only): `docker exec oneohm-postgres psql -U root -d oneohm_epc -c "SELECT code, whatsapp_since, customer_update_text FROM workflow_steps WHERE code = 'EXEC-005';"` → `whatsapp_since` set.
6. Save again without changes and run the query again. `whatsapp_since` has not changed.
7. Untick and save. The chip is gone. Reopen: unticked, and the text is still there. The query shows `whatsapp_since` empty.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/features/admin/workflow-steps
git commit -m "$(cat <<'EOF'
feat(web): customer WhatsApp section on the workflow step form

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: The send job

**Files:**
- Create: `apps/backend/src/modules/notifications/constants/task-whatsapp.constants.ts`
- Create: `apps/backend/src/modules/notifications/services/task-whatsapp.service.ts`
- Modify: `apps/backend/src/modules/notifications/notifications.module.ts`

**Interfaces:**
- Consumes: `IntegrationService.sendTemplateMessage(message: ITemplateMessage, provider?: IntegrationProvider): Promise<IMessageResponse>` (throws `BadRequestException` on failure); `normalizePhoneToE164(phone): string` from `@tejas96/shared/utils`; `completed_at` on every finish path (Task 1); `workflow_steps.whatsapp_since`, `customer_update_text` and `task_whatsapp_messages` (Task 3).
- Produces:
  - `TASK_WHATSAPP_DELAY_MINUTES = 10` (Task 7 uses it)
  - `TaskWhatsappService.run(): Promise<void>` (cron `notifications:task-whatsapp`)
  - rows in `task_whatsapp_messages` with `provider_message_id` (Task 6 matches on it)

- [ ] **Step 1: Constants**

Create `apps/backend/src/modules/notifications/constants/task-whatsapp.constants.ts`:

```ts
/**
 * Customer WhatsApp alerts for completed steps.
 *
 * The template is created and approved in Meta WhatsApp Manager. Its wording can
 * change there; the code depends only on the name, the language and the three
 * named body parameters: customer_name, project_number, update.
 */
export const PROJECT_STEP_UPDATE_TEMPLATE = {
  name: 'project_step_update',
  language: 'en',
} as const;

/** 77 of 5,003 tasks marked done went back within 10 minutes (2026-09-11). */
export const TASK_WHATSAPP_DELAY_MINUTES = 10;

export const TASK_WHATSAPP_BATCH_SIZE = 50;

/** A row left in `sending` this long belongs to a run that stopped mid-send. */
export const TASK_WHATSAPP_STUCK_MINUTES = 10;

/** Older completions are skipped rather than sent late, e.g. after an outage. */
export const TASK_WHATSAPP_MAX_AGE_HOURS = 24;
```

- [ ] **Step 2: The job**

Create `apps/backend/src/modules/notifications/services/task-whatsapp.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { IntegrationProvider, MessageType, ProjectStatus } from '@tejas96/shared/types';
import { normalizePhoneToE164 } from '@tejas96/shared/utils';
import { DataSource } from 'typeorm';

import { IntegrationService } from '../../integrations/services';
import {
  PROJECT_STEP_UPDATE_TEMPLATE,
  TASK_WHATSAPP_BATCH_SIZE,
  TASK_WHATSAPP_DELAY_MINUTES,
  TASK_WHATSAPP_MAX_AGE_HOURS,
  TASK_WHATSAPP_STUCK_MINUTES,
} from '../constants/task-whatsapp.constants';

interface DueTask {
  taskId: string;
  projectId: string;
  completedAt: Date;
}

interface SendContext {
  projectStatus: string;
  projectNumber: string;
  firstName: string | null;
  phone: string | null;
  updateText: string | null;
}

const VALID_E164 = /^\+\d{11,15}$/;

/**
 * Sends a customer their step update on WhatsApp, 10 minutes after a task of a
 * ticked step is done.
 *
 * `completed_at` is the only trigger, so no task code has to call this: a task
 * reopened inside the 10 minutes has lost its `completed_at` and is never picked.
 * Each task is claimed in one INSERT … ON CONFLICT before sending, so two
 * instances during a rolling deploy cannot both send it.
 *
 * It reads tasks with plain SQL, as ConsumerNotificationListener does, so the
 * notifications module does not import the projects module.
 */
@Injectable()
export class TaskWhatsappService {
  private readonly logger = new Logger(TaskWhatsappService.name);
  private running = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly integrationService: IntegrationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'notifications:task-whatsapp' })
  async run(): Promise<void> {
    // The local database is a production restore with real customer phones.
    if (process.env.NODE_ENV !== 'production' && process.env.TASK_WHATSAPP_ALLOW_LOCAL !== 'true') {
      return;
    }
    // A slow Meta call must not let the next minute's run overlap this one.
    if (this.running) return;
    this.running = true;

    try {
      await this.unstick();
      const due = await this.findDue();
      for (const task of due) {
        await this.process(task);
      }
    } catch (error) {
      this.logger.error('Task WhatsApp run failed', error);
    } finally {
      this.running = false;
    }
  }

  private async unstick(): Promise<void> {
    await this.dataSource.query(
      `UPDATE task_whatsapp_messages
          SET status = 'failed', reason = 'Send interrupted', updated_at = now()
        WHERE status = 'sending'
          AND updated_at < now() - make_interval(mins => $1)`,
      [TASK_WHATSAPP_STUCK_MINUTES],
    );
  }

  private async findDue(): Promise<DueTask[]> {
    return this.dataSource.query(
      `SELECT t.id AS "taskId", t.project_id AS "projectId", t.completed_at AS "completedAt"
         FROM project_tasks t
         JOIN workflow_steps s ON s.id = t.workflow_step_id
    LEFT JOIN task_whatsapp_messages m ON m.project_task_id = t.id
        WHERE t.deleted_at IS NULL
          AND t.status = 'done'
          AND t.completed_at IS NOT NULL
          AND s.whatsapp_since IS NOT NULL
          AND t.completed_at >= s.whatsapp_since
          AND t.completed_at <= now() - make_interval(mins => $1)
          AND (
                m.id IS NULL
             OR (m.status IN ('failed', 'skipped') AND m.task_completed_at < t.completed_at)
              )
        ORDER BY t.completed_at ASC
        LIMIT $2`,
      [TASK_WHATSAPP_DELAY_MINUTES, TASK_WHATSAPP_BATCH_SIZE],
    );
  }

  /** The row id when this run won the task; null when another run has it or it was already sent. */
  private async claim(task: DueTask): Promise<string | null> {
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `INSERT INTO task_whatsapp_messages (project_task_id, project_id, task_completed_at, status)
       VALUES ($1, $2, $3, 'sending')
       ON CONFLICT (project_task_id) DO UPDATE
          SET status = 'sending',
              task_completed_at = EXCLUDED.task_completed_at,
              phone = NULL,
              update_text = NULL,
              reason = NULL,
              provider_message_id = NULL,
              sent_at = NULL,
              delivered_at = NULL,
              read_at = NULL,
              updated_at = now()
        WHERE task_whatsapp_messages.status IN ('failed', 'skipped')
          AND task_whatsapp_messages.task_completed_at < EXCLUDED.task_completed_at
       RETURNING id`,
      [task.taskId, task.projectId, task.completedAt],
    );
    return rows[0]?.id ?? null;
  }

  private async process(task: DueTask): Promise<void> {
    const messageId = await this.claim(task);
    if (!messageId) return;

    try {
      const context = await this.loadContext(task.taskId);
      const skipReason = this.skipReason(task, context);
      if (skipReason || !context) {
        await this.dataSource.query(
          `UPDATE task_whatsapp_messages SET status = 'skipped', reason = $2, updated_at = now() WHERE id = $1`,
          [messageId, skipReason ?? 'Task not found'],
        );
        return;
      }

      const phone = normalizePhoneToE164(context.phone);
      const updateText = context.updateText as string;

      const result = await this.integrationService.sendTemplateMessage(
        {
          to: phone,
          type: MessageType.TEMPLATE,
          templateName: PROJECT_STEP_UPDATE_TEMPLATE.name,
          templateLanguage: PROJECT_STEP_UPDATE_TEMPLATE.language,
          templateParameters: {
            body: {
              customer_name: context.firstName?.trim() || 'Customer',
              project_number: context.projectNumber,
              update: updateText,
            },
          },
          metadata: { entityType: 'project_task', entityId: task.taskId },
        },
        IntegrationProvider.WHATSAPP_BUSINESS,
      );

      await this.dataSource.query(
        `UPDATE task_whatsapp_messages
            SET status = 'sent', provider_message_id = $2, sent_at = now(),
                phone = $3, update_text = $4, reason = NULL, updated_at = now()
          WHERE id = $1`,
        [messageId, result.messageId, phone, updateText],
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Send failed';
      await this.dataSource.query(
        `UPDATE task_whatsapp_messages SET status = 'failed', reason = $2, updated_at = now() WHERE id = $1`,
        [messageId, reason],
      );
      this.logger.warn(`WhatsApp update for task ${task.taskId} failed: ${reason}`);
    }
  }

  private async loadContext(taskId: string): Promise<SendContext | null> {
    const rows: SendContext[] = await this.dataSource.query(
      `SELECT p.status               AS "projectStatus",
              p.project_number       AS "projectNumber",
              c.first_name           AS "firstName",
              c.phone                AS "phone",
              s.customer_update_text AS "updateText"
         FROM project_tasks t
         JOIN projects p             ON p.id = t.project_id
         JOIN customer_properties cp ON cp.id = p.property_id
         JOIN customer_profiles c    ON c.id = cp.customer_id
         JOIN workflow_steps s       ON s.id = t.workflow_step_id
        WHERE t.id = $1`,
      [taskId],
    );
    return rows[0] ?? null;
  }

  private skipReason(task: DueTask, context: SendContext | null): string | null {
    if (!context) return 'Task not found';
    if (context.projectStatus === ProjectStatus.CANCELLED) return 'Project cancelled';
    const ageMs = Date.now() - new Date(task.completedAt).getTime();
    if (ageMs > TASK_WHATSAPP_MAX_AGE_HOURS * 3_600_000) {
      return 'Done more than 24 hours before sending';
    }
    if (!VALID_E164.test(normalizePhoneToE164(context.phone))) return 'No valid phone';
    if (!context.updateText) return 'Step has no update text';
    return null;
  }
}
```

- [ ] **Step 3: Register it**

Replace `apps/backend/src/modules/notifications/notifications.module.ts` with:

```ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationController } from './controllers/notification.controller';
import { NotificationEntity } from './entities/notification.entity';
import { ConsumerNotificationListener } from './listeners/consumer-notification.listener';
import { NotificationRepository } from './repositories/notification.repository';
import { FcmService } from './services/fcm.service';
import { NotificationService } from './services/notification.service';
import { TaskWhatsappService } from './services/task-whatsapp.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]),
    forwardRef(() => UsersModule),
    // Sends the customer WhatsApp updates. IntegrationsModule imports neither
    // this module nor the projects module, so there is no cycle.
    IntegrationsModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    FcmService,
    ConsumerNotificationListener,
    TaskWhatsappService,
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
```

Task 6 adds the webhook status listener to this module.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck:backend`
Expected: PASS.

- [ ] **Step 5: Verify: waiting, reopen, skip (job enabled locally)**

Safety first. Use a test project whose customer phone is the owner's number. Ask the owner for the number and the project; never tick a step for real customers locally.

1. In `apps/backend/.env` add `TASK_WHATSAPP_ALLOW_LOCAL=true`. The watch server restarts.
2. On the steps page, tick EXEC-005 with text `Your solar panels are installed` (Task 4).
3. **Reopen.** On the test project's board, drag its "Panel Installation" task to Done, then back within a minute. After 11 minutes: `docker exec oneohm-postgres psql -U root -d oneohm_epc -c "SELECT count(*) FROM task_whatsapp_messages;"` → 0.
4. **Skipped.** On the test customer, set the phone to `12345` (customer edit screen). Mark the task done. After 11 minutes the query `SELECT status, reason FROM task_whatsapp_messages;` → `skipped | No valid phone`.
5. **Retry.** Put the owner's number back. Reopen the task and mark it done again. After 11 minutes the row is `sent` (template approved) or `failed` with Meta's reason (template not approved or keys unusable locally). Either way the task itself stayed done.
6. **Once.** Reopen and finish it again. After 11 minutes the row is unchanged and nothing new arrives on the phone.
7. Remove `TASK_WHATSAPP_ALLOW_LOCAL` from `apps/backend/.env`, untick EXEC-005, and restore the test task.

The drawer line for these states is checked in Task 7.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/notifications/constants apps/backend/src/modules/notifications/services/task-whatsapp.service.ts apps/backend/src/modules/notifications/notifications.module.ts
git commit -m "$(cat <<'EOF'
feat(notifications): send the customer a WhatsApp update when a step is done

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Delivery results from the webhook

**Files:**
- Create: `apps/backend/src/modules/integrations/events/whatsapp.events.ts`
- Modify: `apps/backend/src/modules/integrations/controllers/whatsapp-webhook.controller.ts`
- Create: `apps/backend/src/modules/notifications/listeners/whatsapp-status.listener.ts`
- Modify: `apps/backend/src/modules/notifications/notifications.module.ts`

**Interfaces:**
- Consumes: `task_whatsapp_messages.provider_message_id` (Task 5).
- Produces: `WHATSAPP_EVENTS.MESSAGE_STATUS = 'whatsapp.message.status'`; `class WhatsappMessageStatusEvent(providerMessageId: string, status: string, timestamp: string | null, errors: WhatsappStatusError[])`; `WhatsappStatusListener`.

- [ ] **Step 1: The event**

Create `apps/backend/src/modules/integrations/events/whatsapp.events.ts`:

```ts
/**
 * One delivery status from Meta's WhatsApp webhook. The webhook only logged
 * these; anything that tracks its own messages (the customer step updates)
 * listens for this instead of the integrations module knowing about it.
 */
export const WHATSAPP_EVENTS = {
  MESSAGE_STATUS: 'whatsapp.message.status',
} as const;

export interface WhatsappStatusError {
  code?: number | string;
  title?: string;
  message?: string;
  error_data?: { details?: string };
}

export class WhatsappMessageStatusEvent {
  constructor(
    public readonly providerMessageId: string,
    /** sent, delivered, read or failed */
    public readonly status: string,
    /** Meta's Unix time in seconds, as sent. */
    public readonly timestamp: string | null,
    public readonly errors: WhatsappStatusError[],
  ) {}
}
```

- [ ] **Step 2: Emit it from the webhook**

In `whatsapp-webhook.controller.ts`:

Add these imports:

```ts
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  WHATSAPP_EVENTS,
  WhatsappMessageStatusEvent,
  type WhatsappStatusError,
} from '../events/whatsapp.events';
```

Replace the constructor with:

```ts
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
```

In `processWebhookEvents`, replace:

```ts
          if (messageStatus === 'failed') {
            this.logger.error(
              `WhatsApp delivery failed, recipient ${String(recipient)}, message ${messageId}: ${JSON.stringify(errors)}`,
            );
          } else {
            this.logger.log(
              `WhatsApp ${messageStatus}, recipient ${String(recipient)}, message ${messageId}`,
            );
          }
```

with:

```ts
          if (messageStatus === 'failed') {
            this.logger.error(
              `WhatsApp delivery failed, recipient ${String(recipient)}, message ${messageId}: ${JSON.stringify(errors)}`,
            );
          } else {
            this.logger.log(
              `WhatsApp ${messageStatus}, recipient ${String(recipient)}, message ${messageId}`,
            );
          }

          this.eventEmitter.emit(
            WHATSAPP_EVENTS.MESSAGE_STATUS,
            new WhatsappMessageStatusEvent(
              messageId,
              messageStatus,
              typeof status.timestamp === 'string' ? status.timestamp : null,
              errors as WhatsappStatusError[],
            ),
          );
```

- [ ] **Step 3: The listener**

Create `apps/backend/src/modules/notifications/listeners/whatsapp-status.listener.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
  WHATSAPP_EVENTS,
  WhatsappMessageStatusEvent,
  type WhatsappStatusError,
} from '../../integrations/events/whatsapp.events';

function describeWhatsappError(errors: WhatsappStatusError[]): string {
  const first = errors[0];
  if (!first) return 'WhatsApp reported a failure';
  const title = first.title ?? first.message ?? `WhatsApp error ${first.code ?? ''}`.trim();
  const details = first.error_data?.details;
  return details && details !== title ? `${title}: ${details}` : title;
}

/**
 * Moves a customer step update along as Meta reports it. Statuses for messages
 * this app did not log (quotes, OTPs) match no row and change nothing.
 *
 * Order rules: delivered never overwrites read; failed never overwrites
 * delivered or read, because Meta can report them out of order.
 */
@Injectable()
export class WhatsappStatusListener {
  private readonly logger = new Logger(WhatsappStatusListener.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @OnEvent(WHATSAPP_EVENTS.MESSAGE_STATUS, { async: true })
  async handle(event: WhatsappMessageStatusEvent): Promise<void> {
    const at =
      event.timestamp && /^\d+$/.test(event.timestamp)
        ? new Date(Number(event.timestamp) * 1000)
        : new Date();

    try {
      if (event.status === 'delivered') {
        await this.dataSource.query(
          `UPDATE task_whatsapp_messages
              SET status = 'delivered', delivered_at = $2, updated_at = now()
            WHERE provider_message_id = $1 AND status NOT IN ('delivered', 'read')`,
          [event.providerMessageId, at],
        );
      } else if (event.status === 'read') {
        await this.dataSource.query(
          `UPDATE task_whatsapp_messages
              SET status = 'read', read_at = $2, updated_at = now()
            WHERE provider_message_id = $1 AND status <> 'read'`,
          [event.providerMessageId, at],
        );
      } else if (event.status === 'failed') {
        await this.dataSource.query(
          `UPDATE task_whatsapp_messages
              SET status = 'failed', reason = $2, updated_at = now()
            WHERE provider_message_id = $1 AND status NOT IN ('delivered', 'read')`,
          [event.providerMessageId, describeWhatsappError(event.errors)],
        );
      }
      // 'sent' is already recorded by the send itself.
    } catch (error) {
      this.logger.error(
        `Could not record WhatsApp ${event.status} for message ${event.providerMessageId}`,
        error,
      );
    }
  }
}
```

Register it in `apps/backend/src/modules/notifications/notifications.module.ts`. Below `import { ConsumerNotificationListener } from './listeners/consumer-notification.listener';` add:

```ts
import { WhatsappStatusListener } from './listeners/whatsapp-status.listener';
```

and in `providers`, after `TaskWhatsappService,` add:

```ts
    WhatsappStatusListener,
```

- [ ] **Step 4: Typecheck and the existing tests**

```bash
npm run typecheck:backend
npx nx test backend
```

Expected: PASS; tests as the baseline.

- [ ] **Step 5: Verify with a sample payload**

Meta cannot reach a local webhook, so this is the one step outside the UI. Use a row from Task 5 that has a `provider_message_id`; if none was sent locally, give a `failed` row a fake id first:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "UPDATE task_whatsapp_messages SET provider_message_id = 'wamid.LOCALTEST', status = 'sent', sent_at = now(), reason = NULL WHERE id = (SELECT id FROM task_whatsapp_messages ORDER BY updated_at DESC LIMIT 1);"
curl -s -X POST http://localhost:8085/api/v1/integrations/whatsapp/webhook -H 'Content-Type: application/json' -d '{"entry":[{"changes":[{"value":{"statuses":[{"id":"wamid.LOCALTEST","status":"delivered","timestamp":"1757590000","recipient_id":"919999999999"}]}}]}]}'
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "SELECT status, delivered_at FROM task_whatsapp_messages WHERE provider_message_id = 'wamid.LOCALTEST';"
```

Expected: `{"received":true}`, then `delivered` with a time. Repeat the curl with `"status":"read"` → `read`. Repeat with `"status":"failed","errors":[{"code":131026,"title":"Message undeliverable"}]` → still `read` (failed never overwrites read).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/integrations/events apps/backend/src/modules/integrations/controllers/whatsapp-webhook.controller.ts apps/backend/src/modules/notifications/listeners/whatsapp-status.listener.ts apps/backend/src/modules/notifications/notifications.module.ts
git commit -m "$(cat <<'EOF'
feat(notifications): record WhatsApp delivery results for step updates

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: The WhatsApp line in the task drawer

**Files:**
- Modify: `apps/backend/src/modules/projects/services/project-task.service.ts` (`getTaskDetailCrossProject`, new private method)
- Modify: `apps/backend/src/modules/projects/dto/project-tasks/my-task-response.dto.ts`
- Create: `apps/web/components/features/tasks/components/task-drawer-whatsapp.tsx`
- Modify: `apps/web/components/features/tasks/components/task-drawer.tsx`

**Interfaces:**
- Consumes: `CustomerWhatsappStatus`, `CustomerWhatsappState` (Task 2); `TASK_WHATSAPP_DELAY_MINUTES` (Task 5); `WorkflowStepEntity.whatsappSince` (Task 3). `findByIdCrossProject` already joins `task.workflowStep`.
- Produces: `GET /tasks/:id` → `customerWhatsapp: CustomerWhatsappStatus | null`; `TaskDrawerWhatsapp({ status })`.

- [ ] **Step 1: Compute the line on the backend**

In `project-task.service.ts`:

Add to the `@tejas96/shared/types` import: `type CustomerWhatsappState`, `type CustomerWhatsappStatus`.

Add this import:

```ts
import { TASK_WHATSAPP_DELAY_MINUTES } from '../../notifications/constants/task-whatsapp.constants';
```

In `getTaskDetailCrossProject`, replace:

```ts
    return this.enrichMyTask(
      task,
      today,
      depNameMap,
      depStatusMap,
      depCodeMap,
      statusMap,
      priorityMap,
    );
  }

  async updateTaskCrossProject(
```

with:

```ts
    const enriched = this.enrichMyTask(
      task,
      today,
      depNameMap,
      depStatusMap,
      depCodeMap,
      statusMap,
      priorityMap,
    );
    return { ...enriched, customerWhatsapp: await this.resolveCustomerWhatsapp(task) };
  }

  /**
   * The customer WhatsApp line for the task drawer: the task's send log, or
   * "waiting" while a ticked step's completion sits in the 10-minute wait (or
   * waits to retry a failed or skipped attempt). Null when there is nothing to
   * say — the step is not ticked, or the task was done before the tick.
   */
  private async resolveCustomerWhatsapp(
    task: ProjectTaskEntity,
  ): Promise<CustomerWhatsappStatus | null> {
    const rows: Array<{
      status: Exclude<CustomerWhatsappState, 'waiting'>;
      reason: string | null;
      task_completed_at: Date;
      sent_at: Date | null;
      delivered_at: Date | null;
      read_at: Date | null;
      updated_at: Date;
    }> = await this.dataSource.query(
      `SELECT status, reason, task_completed_at, sent_at, delivered_at, read_at, updated_at
         FROM task_whatsapp_messages
        WHERE project_task_id = $1`,
      [task.id],
    );
    const row = rows[0];

    const since = task.workflowStep?.whatsappSince ? new Date(task.workflowStep.whatsappSince) : null;
    const completedAt = task.completedAt ? new Date(task.completedAt) : null;
    const waiting =
      since !== null &&
      completedAt !== null &&
      task.status === TaskStatus.DONE &&
      completedAt >= since &&
      (!row ||
        ((row.status === 'failed' || row.status === 'skipped') &&
          new Date(row.task_completed_at) < completedAt));

    if (waiting && completedAt) {
      return {
        state: 'waiting',
        at: new Date(completedAt.getTime() + TASK_WHATSAPP_DELAY_MINUTES * 60_000).toISOString(),
        reason: null,
      };
    }
    if (!row) return null;

    const at =
      row.status === 'read'
        ? row.read_at
        : row.status === 'delivered'
          ? row.delivered_at
          : row.status === 'sent'
            ? row.sent_at
            : row.updated_at;
    return { state: row.status, at: at ? new Date(at).toISOString() : null, reason: row.reason };
  }

  async updateTaskCrossProject(
```

- [ ] **Step 2: Expose it**

In `my-task-response.dto.ts`:

Change the class-transformer import to:

```ts
import { Expose, Transform, Type } from 'class-transformer';
```

Add below it:

```ts
import { type CustomerWhatsappStatus } from '@tejas96/shared/types';
```

After:

```ts
  @ApiProperty({ example: 'Smith Residence Solar', description: 'Project name' })
  @Expose()
  projectName!: string;
```

add:

```ts
  @ApiPropertyOptional({
    description: 'What happened to the customer WhatsApp update for this task (detail only)',
    nullable: true,
  })
  @Expose()
  @Transform(({ obj }) => (obj as { customerWhatsapp?: unknown }).customerWhatsapp ?? null)
  customerWhatsapp?: CustomerWhatsappStatus | null;
```

- [ ] **Step 3: The drawer line**

Create `apps/web/components/features/tasks/components/task-drawer-whatsapp.tsx`:

```tsx
'use client';

import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { Box, Typography } from '@mui/material';
import type { CustomerWhatsappStatus } from '@tejas96/shared/types';

import { SectionHeading } from './task-drawer-main-content';

function formatWhen(iso: string | null, withDate: boolean): string {
  if (!iso) return '';
  const date = new Date(iso);
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (!withDate) return time;
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
}

/** The one line that says what happened to the customer's WhatsApp update. */
function describeCustomerWhatsapp(status: CustomerWhatsappStatus): string {
  switch (status.state) {
    case 'waiting':
      return `WhatsApp to customer at ${formatWhen(status.at, false)}`;
    case 'sending':
      return 'Sending WhatsApp to customer';
    case 'sent':
      return `WhatsApp sent to customer, ${formatWhen(status.at, true)}`;
    case 'delivered':
      return `WhatsApp delivered, ${formatWhen(status.at, true)}`;
    case 'read':
      return `WhatsApp read by customer, ${formatWhen(status.at, true)}`;
    case 'failed':
      return `WhatsApp failed: ${status.reason ?? 'no reason given'}`;
    case 'skipped':
      return `WhatsApp not sent: ${status.reason ?? 'no reason given'}`;
  }
}

export function TaskDrawerWhatsapp({
  status,
}: {
  status: CustomerWhatsappStatus;
}): React.JSX.Element {
  const isProblem = status.state === 'failed' || status.state === 'skipped';
  return (
    <Box sx={{ mt: 3 }}>
      <SectionHeading>Customer WhatsApp</SectionHeading>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <WhatsAppIcon
          sx={{
            fontSize: 16,
            mt: '2px',
            color: isProblem ? 'error.main' : 'var(--ds-text-tertiary)',
          }}
        />
        <Typography
          sx={{
            fontSize: 13,
            lineHeight: 1.5,
            color: isProblem ? 'error.main' : 'var(--ds-text-secondary)',
          }}
        >
          {describeCustomerWhatsapp(status)}
        </Typography>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Render it in the sidebar**

In `task-drawer.tsx`, add below `import { TaskDrawerMetadata } from './task-drawer-metadata';`:

```tsx
import { TaskDrawerWhatsapp } from './task-drawer-whatsapp';
```

Replace:

```tsx
                    onDueDateChange={handleDueDateChange}
                  />
                </Box>
```

with:

```tsx
                    onDueDateChange={handleDueDateChange}
                  />
                  {task.customerWhatsapp && <TaskDrawerWhatsapp status={task.customerWhatsapp} />}
                </Box>
```

- [ ] **Step 5: Typecheck, lint, tests**

```bash
npm run typecheck:backend && npm run typecheck:web
npx nx lint backend && npx nx lint web
npx nx test backend && npx nx test web
```

Expected: PASS; tests as the baseline.

- [ ] **Step 6: Verify on the screen**

Use the test project from Task 5 (owner's phone).

1. With EXEC-005 ticked, open the test project → Tasks → "Panel Installation". Mark it done from the drawer. Reopen the drawer: "WhatsApp to customer at <time + 10 min>".
2. Move it back to In progress. The line is gone.
3. A task of a step done **before** the tick shows no WhatsApp line.
4. Mark it done again and wait for the job (Task 5 flag on). The line reads "WhatsApp sent to customer, <date, time>" or "WhatsApp failed: <reason>".
5. With the sample webhook calls from Task 6 Step 5 on this row, reopen the drawer after each: "WhatsApp delivered, …", then "WhatsApp read by customer, …".
6. Open the same task from My Work. The same line shows.
7. Remove the local flag and untick the step again.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/projects/services/project-task.service.ts apps/backend/src/modules/projects/dto/project-tasks/my-task-response.dto.ts apps/web/components/features/tasks/components/task-drawer-whatsapp.tsx apps/web/components/features/tasks/components/task-drawer.tsx
git commit -m "$(cat <<'EOF'
feat(tasks): show the customer WhatsApp result in the task drawer

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Final walk-through and regression

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything above.
- Produces: evidence that the spec's Verification list holds.

- [ ] **Step 1: Walk the spec's Verification list**

With the local flag on and the owner's test customer, walk `docs/superpowers/specs/2026-09-11-whatsapp-step-alerts-design.md` → Verification, items 1–10. Items 1 (Task 4 Step 6), 2–4 (Task 7 Step 6), 5–7 (Task 5 Step 5), 8 (Task 6 Step 5), 9 (Task 5 Step 5), 10 (Task 1 Step 3) were each checked once; repeat them in one pass now, on the finished build, and write down what each screen showed.

- [ ] **Step 2: Full regression**

```bash
npm run typecheck:libs && npm run typecheck:backend && npm run typecheck:web
npx nx lint backend && npx nx lint web && npx nx lint shared
npx nx test shared && npx nx test backend && npx nx test web
npx knip
```

Expected: typecheck and lint PASS; tests match the baseline; knip reports nothing new from these files (ignore the 21 duplicated root dependencies it always lists).

- [ ] **Step 3: Clean up local test state**

Remove `TASK_WHATSAPP_ALLOW_LOCAL` from `apps/backend/.env`. Untick every step you ticked. Restore the test customer's phone.

- [ ] **Step 4: Release notes for the owner**

Before this is deployed, the Meta template `project_step_update` must exist and be approved (spec → The template). Until then every alert fails with Meta's reason. Say this in the PR description.
