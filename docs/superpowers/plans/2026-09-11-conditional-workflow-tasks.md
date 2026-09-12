# Conditional Workflow Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Workflow steps get a "loan only" rule and a property-type rule. New projects get only the tasks whose rule matches the site. A change to a site's loan flag adds or removes loan tasks on its live project. A one-time cleanup removes the loan tasks that live projects without a loan never needed.

**Architecture:** Two rule columns on `workflow_steps`, checked by one shared function `stepAppliesToSite` in `libs/shared` that the backend and the project wizard both call. Project creation filters steps with it. `CustomerPropertyService.update` saves inside a transaction and, when `wants_loan` changed, awaits `emitAsync('site.loan-changed')`; a listener in the projects module runs `LoanTaskSyncService` with that same transaction, so the save and the task changes land together. Two TypeORM migrations: columns plus the starting rule, then the cleanup.

**Tech Stack:** NestJS + TypeORM (Postgres), `@nestjs/event-emitter` 3.1, Next.js web (react-hook-form, zod, MUI + Tailwind, TanStack Query), Nx monorepo, `@tejas96/shared` read from source through TS path aliases.

**Spec:** `docs/superpowers/specs/2026-09-11-conditional-workflow-tasks-design.md`

## Global Constraints

- Work in the worktree `/Volumes/works-space/oneohm/oneohm-conditional-tasks`, branch `feat/conditional-workflow-tasks`. Never edit `/Volumes/works-space/oneohm/oneohm` (it holds someone's uncommitted work).
- No new unit test files (owner rule). Existing tests must keep passing. Verify by walking the real screens; pair every database check with the screen that shows it.
- To clear a field, send `null`, never `undefined`. The backend tells "absent" from `null` with `Object.prototype.hasOwnProperty.call`.
- **Live project** = `projects.status` in (`planning`, `active`, `on_hold`) and not deleted.
- **Not started** = task status `backlog` and no ticked checklist item (`checklist_override`, falling back to `checklist`).
- `removal_reason` values, exactly: `rule_not_applicable` (loan sync), `rule_cleanup` (cleanup). `NULL` on a deleted task means a person deleted it.
- Property types only shape new projects. Nothing adds or removes a task on an existing project because of a property type.
- Screen copy, exactly: section "When to add this step"; tick box "Only when the site needs a loan"; help line "Rules decide which tasks a new project gets. The loan rule also follows a site's loan changes."; wizard line "N steps skipped by rules"; toast "PRJ-…: 8 loan tasks added" / "… loan tasks removed" / "… started task kept".
- Migration timestamps: `1857100000000` (columns + starting rule), `1857110000000` (cleanup).
- Every commit ends with the trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## Before you start (one time)

- [ ] **Confirm the worktree and branch.**

```bash
cd /Volumes/works-space/oneohm/oneohm-conditional-tasks
git branch --show-current
```

Expected: `feat/conditional-workflow-tasks`.

- [ ] **Install dependencies** (the worktree has no `node_modules`):

```bash
npm ci
```

- [ ] **Copy the local env files** (they are not in git):

```bash
cp /Volumes/works-space/oneohm/oneohm/apps/backend/.env apps/backend/.env
cp /Volumes/works-space/oneohm/oneohm/apps/web/.env.local apps/web/.env.local
```

- [ ] **Back up the local database.** Task 8 deletes (soft) about 1,300 task rows.

```bash
docker exec oneohm-postgres pg_dump -U root -d oneohm_epc -Fc > /Volumes/works-space/oneohm/oneohm_epc_before_task_rules_20260911.dump
ls -lh /Volumes/works-space/oneohm/oneohm_epc_before_task_rules_20260911.dump
```

- [ ] **Run the worktree servers.** A backend from the old checkout may already hold port 8085:

```bash
lsof -nP -iTCP -sTCP:LISTEN | grep -E ':3001|:8085'
```

Ask the owner before stopping a server they started. Then add these two entries to the `configurations` array in `/Volumes/works-space/oneohm/.claude/launch.json` (outside git) and start them with `preview_start`:

```json
    {
      "name": "backend-tasks",
      "cwd": "oneohm-conditional-tasks",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "backend:dev:watch"],
      "port": 8085
    },
    {
      "name": "web-tasks",
      "cwd": "oneohm-conditional-tasks",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "web:dev"],
      "port": 3001
    }
```

The browser session on `http://localhost:3001` is already signed in. If the Browser pane is hidden, call `resize_window` with a desktop width before judging a layout.

- [ ] **Baseline.** Run and note any failure that exists before your change:

```bash
npm run typecheck:libs && npm run typecheck:backend && npm run typecheck:web
npx nx test shared && npx nx test backend && npx nx test web
```

## File structure

| File | Change | Responsibility |
|---|---|---|
| `libs/shared/src/types/enums/customer.enum.ts` | Modify | `PROPERTY_TYPE_LABELS` beside `PropertyType` |
| `libs/shared/src/types/interfaces/task.interface.ts` | Modify | Rule fields on `WorkflowStep`; `SiteTaskFacts`; `TaskRuleSyncResult` |
| `libs/shared/src/utils/workflow-step-selection.ts` | Modify | `stepAppliesToSite`, `describeStepRule` |
| `libs/shared/src/schemas/workflow-step.schema.ts` | Modify | Form fields `loanOnly`, `propertyTypes` |
| `apps/backend/src/database/migrations/1857100000000-AddWorkflowStepRules.ts` | Create | Three columns; loan steps become loan only |
| `apps/backend/src/modules/projects/entities/workflow-step.entity.ts` | Modify | Map `loan_only`, `property_types` |
| `apps/backend/src/modules/projects/entities/project-task.entity.ts` | Modify | Map `removal_reason` |
| `apps/backend/src/modules/projects/dto/workflow-steps/create-workflow-step.dto.ts` | Modify | Accept the rule fields |
| `apps/backend/src/modules/projects/dto/workflow-steps/workflow-step-response.dto.ts` | Modify | Return them |
| `apps/backend/src/modules/projects/services/workflow-step.service.ts` | Modify | Refuse rules on change-request steps; store an empty list as NULL |
| `apps/web/components/features/admin/workflow-steps/components/admin-workflow-steps-page.tsx` | Modify | "When to add this step" section; rule chip |
| `apps/web/components/features/admin/workflow-steps/utils/workflow-step-payload.ts` | Modify | Send the rule fields |
| `apps/backend/src/modules/projects/utils/task-from-step.ts` | Create | The columns every task built from a step starts with (creation and sync share it) |
| `apps/backend/src/modules/projects/services/project.service.ts` | Modify | Creation filters steps by rule |
| `apps/web/components/features/projects/components/project-create-wizard/steps/step-5-tasks-milestones.tsx` | Modify | Hide steps that do not match; skipped line |
| `apps/web/components/features/projects/components/project-create-wizard/hooks/use-project-create-submit.ts` | Modify | Auto-assign only matching steps |
| `apps/backend/src/modules/projects/events/site-loan-changed.event.ts` | Create | Event name and payload |
| `apps/backend/src/modules/projects/services/loan-task-sync.service.ts` | Create | Add or remove loan tasks on a live project |
| `apps/backend/src/modules/projects/listeners/site-loan-changed.listener.ts` | Create | Runs the sync for the event |
| `apps/backend/src/modules/projects/services/index.ts` | Modify | Export the sync service |
| `apps/backend/src/modules/projects/projects.module.ts` | Modify | Register service and listener |
| `apps/backend/src/modules/customers/repositories/customer-property.repository.ts` | Modify | `update` and `findById` accept a transaction manager |
| `apps/backend/src/modules/customers/services/customer-property.service.ts` | Modify | Save and sync in one transaction |
| `apps/backend/src/modules/customers/dto/customer-property-response.dto.ts` | Modify | `taskRuleSync` on the response |
| `apps/web/components/features/properties/hooks/use-properties.ts` | Modify | Toast with the sync result |
| `apps/backend/src/database/migrations/1857110000000-RemoveLoanTasksWithoutLoan.ts` | Create | One-time cleanup |

---

### Task 1: Shared rule types, labels and check

**Files:**
- Modify: `libs/shared/src/types/enums/customer.enum.ts`
- Modify: `libs/shared/src/types/interfaces/task.interface.ts`
- Modify: `libs/shared/src/utils/workflow-step-selection.ts`
- Modify: `libs/shared/src/schemas/workflow-step.schema.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `PROPERTY_TYPE_LABELS: Record<PropertyType, string>` (from `@tejas96/shared/types`)
  - `WorkflowStep.loanOnly?: boolean`, `WorkflowStep.propertyTypes?: PropertyType[] | null`
  - `interface SiteTaskFacts { wantsLoan: boolean; propertyType: PropertyType }`
  - `interface TaskRuleSyncResult { projectId: string; projectNumber: string; projectName: string; added: number; removed: number; kept: number; completed: boolean }`
  - `stepAppliesToSite(step: { loanOnly?: boolean | null; propertyTypes?: PropertyType[] | null }, site: SiteTaskFacts): boolean` (from `@tejas96/shared/utils`)
  - `describeStepRule(step: { loanOnly?: boolean | null; propertyTypes?: PropertyType[] | null }, options?: { short?: boolean }): string | null`
  - form fields `loanOnly` (boolean, default `false`) and `propertyTypes` (`PropertyType[]`, default `[]`)

- [ ] **Step 1: Labels**

In `libs/shared/src/types/enums/customer.enum.ts`, directly after the closing brace of `export enum PropertyType { … }` add:

```ts

/**
 * Screen labels for property types. Same wording as PROPERTY_TYPE_OPTIONS in
 * apps/web/lib/config/constants.ts.
 */
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.RESIDENTIAL]: 'Residential',
  [PropertyType.RESIDENTIAL_APARTMENT]: 'Apartment',
  [PropertyType.COMMERCIAL]: 'Commercial',
  [PropertyType.INDUSTRIAL]: 'Industrial',
  [PropertyType.AGRICULTURAL]: 'Agricultural',
  [PropertyType.INSTITUTIONAL]: 'Institutional',
};
```

- [ ] **Step 2: Types**

In `libs/shared/src/types/interfaces/task.interface.ts`:

Add below `import { ChangeRequestType } from '../enums/change-request.enum';`:

```ts
import { type PropertyType } from '../enums/customer.enum';
```

Inside `interface WorkflowStep`, after `changeRequestType?: ChangeRequestType | null;` add:

```ts
  /** Task rule: only sites that want a loan get this step's task. */
  loanOnly?: boolean;
  /** Task rule: only these property types get this step's task. Null means every type. */
  propertyTypes?: PropertyType[] | null;
```

Replace:

```ts
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// Project Task
```

with:

```ts
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/** The site facts a step's task rule is checked against. */
export interface SiteTaskFacts {
  wantsLoan: boolean;
  propertyType: PropertyType;
}

/** What a change to a site's loan flag did to its live project's tasks. */
export interface TaskRuleSyncResult {
  projectId: string;
  projectNumber: string;
  projectName: string;
  added: number;
  removed: number;
  kept: number;
  /** The change took the project to 100%, so it completed. */
  completed: boolean;
}

// ============================================================================
// Project Task
```

- [ ] **Step 3: The check and its words**

Replace the whole of `libs/shared/src/utils/workflow-step-selection.ts` with:

```ts
import { PROPERTY_TYPE_LABELS, type PropertyType } from '../types/enums/customer.enum';
import { type SiteTaskFacts } from '../types/interfaces/task.interface';

/**
 * Which workflow steps a brand-new project turns into tasks.
 *
 * Change-request templates (`isSpecial`) are instantiated only when a property
 * actually has a pending request, never as part of a project's baseline task
 * list. Project creation has always dropped them; the create wizard used to list
 * them anyway, so it promised more tasks than the project would get.
 *
 * Both sides call this, so the rule cannot drift between what the wizard shows
 * and what the backend builds. Deactivated steps are excluded separately, by the
 * `isActive` filter on the query that feeds this.
 */
export function isProjectBaselineStep(step: {
  isSpecial?: boolean | null;
  changeRequestType?: string | null;
}): boolean {
  return !step.isSpecial && !step.changeRequestType;
}

interface StepRule {
  loanOnly?: boolean | null;
  propertyTypes?: PropertyType[] | null;
}

/**
 * Whether a step's task rule lets its task onto a site.
 *
 * No rule: every site. "Loan only": the site must want a loan. A type list: the
 * site's type must be in it; an empty or missing list means every type. When
 * both are set, both must match.
 *
 * Project creation, the loan sync and the create wizard all call this, so what
 * the wizard shows is what the project gets.
 */
export function stepAppliesToSite(step: StepRule, site: SiteTaskFacts): boolean {
  if (step.loanOnly && !site.wantsLoan) return false;
  const types = step.propertyTypes ?? [];
  if (types.length > 0 && !types.includes(site.propertyType)) return false;
  return true;
}

/**
 * The rule in words, or null when the step has no rule.
 * Full: "Loan only · Residential, Commercial". Short: "Loan only · Residential +1".
 */
export function describeStepRule(step: StepRule, options: { short?: boolean } = {}): string | null {
  const parts: string[] = [];
  if (step.loanOnly) parts.push('Loan only');

  const types = step.propertyTypes ?? [];
  if (types.length > 0) {
    const labels = types.map((type) => PROPERTY_TYPE_LABELS[type] ?? type);
    parts.push(
      options.short && labels.length > 1
        ? `${labels[0]} +${labels.length - 1}`
        : labels.join(', '),
    );
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}
```

- [ ] **Step 4: Form fields**

In `libs/shared/src/schemas/workflow-step.schema.ts`:

Add below `import { ChangeRequestType } from '../types/enums/change-request.enum';`:

```ts
import { PropertyType } from '../types/enums/customer.enum';
```

Replace:

```ts
    checklistTemplate: z.array(checklistItemSchema).optional().default([]),
  })
```

with:

```ts
    checklistTemplate: z.array(checklistItemSchema).optional().default([]),
    loanOnly: z.boolean().default(false),
    propertyTypes: z.array(z.nativeEnum(PropertyType)).default([]),
  })
```

- [ ] **Step 5: Typecheck and the existing shared tests**

Run: `npm run typecheck:libs && npx nx test shared`
Expected: PASS.

- [ ] **Step 6: Quick check of the rule (no test file)**

```bash
npx ts-node --transpile-only -O '{"module":"commonjs"}' -e "
const u = require('./libs/shared/src/utils/workflow-step-selection.ts');
const home = { wantsLoan: false, propertyType: 'residential' };
console.log(u.stepAppliesToSite({ loanOnly: true }, home));
console.log(u.stepAppliesToSite({ propertyTypes: ['residential', 'commercial'] }, home));
console.log(u.stepAppliesToSite({ propertyTypes: ['commercial'] }, home));
console.log(u.stepAppliesToSite({ propertyTypes: [] }, home));
console.log(u.describeStepRule({ loanOnly: true, propertyTypes: ['residential', 'commercial'] }));
console.log(u.describeStepRule({ propertyTypes: ['residential', 'commercial'] }, { short: true }));
console.log(u.describeStepRule({}));
"
```

Expected output:

```
false
true
false
true
Loan only · Residential, Commercial
Residential +1
null
```

- [ ] **Step 7: Commit**

```bash
git add libs/shared/src/types/enums/customer.enum.ts libs/shared/src/types/interfaces/task.interface.ts libs/shared/src/utils/workflow-step-selection.ts libs/shared/src/schemas/workflow-step.schema.ts
git commit -m "$(cat <<'EOF'
feat(shared): task rules on workflow steps

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Rule columns, starting rule and step API

**Files:**
- Create: `apps/backend/src/database/migrations/1857100000000-AddWorkflowStepRules.ts`
- Modify: `apps/backend/src/modules/projects/entities/workflow-step.entity.ts`
- Modify: `apps/backend/src/modules/projects/entities/project-task.entity.ts`
- Modify: `apps/backend/src/modules/projects/dto/workflow-steps/create-workflow-step.dto.ts`
- Modify: `apps/backend/src/modules/projects/dto/workflow-steps/workflow-step-response.dto.ts`
- Modify: `apps/backend/src/modules/projects/services/workflow-step.service.ts`

**Interfaces:**
- Consumes: `PropertyType` from `@tejas96/shared/types`.
- Produces:
  - columns `workflow_steps.loan_only boolean NOT NULL DEFAULT false`, `workflow_steps.property_types varchar(50)[] NULL`, `project_tasks.removal_reason varchar(40) NULL`
  - `WorkflowStepEntity.loanOnly: boolean`, `WorkflowStepEntity.propertyTypes?: PropertyType[] | null`, `ProjectTaskEntity.removalReason?: string | null`
  - in `workflow-step.service.ts`: module function `normalizePropertyTypes(types): PropertyType[] | null`, private method `assertRuleShape(step)`, and a `changes` object in `update` (Part 2 edits these by name)

- [ ] **Step 1: The migration**

Create `apps/backend/src/database/migrations/1857100000000-AddWorkflowStepRules.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task rules on workflow steps, and a marker for tasks the system removes.
 *
 * `loan_only` and `property_types` decide which sites a step's task goes to
 * (stepAppliesToSite in libs/shared). `removal_reason` is written only when the
 * system soft-deletes a task — the loan sync or the one-time cleanup — so a NULL
 * reason on a deleted task means a person deleted it, and the loan sync never
 * brings that task back.
 *
 * Starting rule: every live baseline step typed `loan` becomes loan only. It is
 * keyed on `type`, not on codes: codes in this catalogue have been re-coded
 * before (LIA-0xx → EXE-0xx), and one loan code even carries a space
 * ("LOAN -02"). Property types are left for admins to set on the steps page.
 */
export class AddWorkflowStepRules1857100000000 implements MigrationInterface {
  name = 'AddWorkflowStepRules1857100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS loan_only boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS property_types varchar(50)[] NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS removal_reason varchar(40) NULL`,
    );

    // On postgres, UPDATE … RETURNING comes back as [rows, affectedCount].
    const [rows] = (await queryRunner.query(`
      UPDATE workflow_steps
         SET loan_only = true, updated_at = CURRENT_TIMESTAMP
       WHERE type = 'loan'
         AND deleted_at IS NULL
         AND is_special = false
         AND change_request_type IS NULL
      RETURNING code, name
    `)) as [Array<{ code: string; name: string }>, number];

    console.warn(`[migration] Marked ${rows.length} loan step(s) as loan only.`);
    for (const row of rows) {
      console.warn(`[migration]   ${row.code} — ${row.name}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE project_tasks DROP COLUMN IF EXISTS removal_reason`);
    await queryRunner.query(`ALTER TABLE workflow_steps DROP COLUMN IF EXISTS property_types`);
    await queryRunner.query(`ALTER TABLE workflow_steps DROP COLUMN IF EXISTS loan_only`);
  }
}
```

- [ ] **Step 2: Map the step columns**

In `apps/backend/src/modules/projects/entities/workflow-step.entity.ts`:

Replace the first line:

```ts
import { type TaskChecklist, ChangeRequestType, WorkflowStepType } from '@tejas96/shared/types';
```

with:

```ts
import {
  type PropertyType,
  type TaskChecklist,
  ChangeRequestType,
  WorkflowStepType,
} from '@tejas96/shared/types';
```

After:

```ts
  @Column({ name: 'change_request_type', type: 'varchar', length: 50, nullable: true })
  changeRequestType?: ChangeRequestType | null;
```

add:

```ts

  /** Task rule: only sites that want a loan get this step's task. */
  @Column({ name: 'loan_only', type: 'boolean', default: false })
  loanOnly!: boolean;

  /** Task rule: only these property types get this step's task. NULL means every type. */
  @Column({ name: 'property_types', type: 'varchar', length: 50, array: true, nullable: true })
  propertyTypes?: PropertyType[] | null;
```

- [ ] **Step 3: Map the task column**

In `apps/backend/src/modules/projects/entities/project-task.entity.ts`, after:

```ts
  @Column({ name: 'source_change_request_index', type: 'integer', nullable: true })
  sourceChangeRequestIndex?: number;
```

add:

```ts

  /**
   * Why the system removed this task: `rule_not_applicable` (loan sync) or
   * `rule_cleanup` (one-time cleanup). NULL on a deleted task means a person
   * deleted it, and the loan sync never brings such a task back.
   */
  @Column({ name: 'removal_reason', type: 'varchar', length: 40, nullable: true })
  removalReason?: string | null;
```

- [ ] **Step 4: Accept the rule fields**

In `create-workflow-step.dto.ts`, change the shared import to:

```ts
import {
  type TaskChecklist,
  ChangeRequestType,
  PropertyType,
  WorkflowStepType,
} from '@tejas96/shared/types';
```

After the `changeRequestType` property (the last one in the class) add:

```ts

  @ApiPropertyOptional({
    description: 'Task rule: the step goes only to sites that want a loan.',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  loanOnly?: boolean;

  @ApiPropertyOptional({
    description:
      'Task rule: the step goes only to these property types. Null or empty means every type.',
    enum: PropertyType,
    isArray: true,
    nullable: true,
  })
  @IsArray()
  @IsEnum(PropertyType, { each: true })
  @IsOptional()
  propertyTypes?: PropertyType[] | null;
```

(`UpdateWorkflowStepDto` is `PartialType(CreateWorkflowStepDto)`, so it picks these up.)

- [ ] **Step 5: Return the rule fields**

In `workflow-step-response.dto.ts`, after:

```ts
  @ApiPropertyOptional()
  @Expose()
  changeRequestType?: string;
```

add:

```ts

  @ApiProperty({ description: 'Task rule: the step goes only to sites that want a loan.' })
  @Expose()
  loanOnly!: boolean;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @Expose()
  propertyTypes?: string[] | null;
```

- [ ] **Step 6: Guard and normalise in the service**

In `apps/backend/src/modules/projects/services/workflow-step.service.ts`:

Change the shared import to:

```ts
import {
  type ChangeRequestType,
  type PaginatedResponse,
  type PropertyType,
  type StatisticsResponse,
} from '@tejas96/shared/types';
```

Add this function directly above `@Injectable()`:

```ts
/** An empty type list is stored as NULL, so it can never read as "no property type". */
function normalizePropertyTypes(
  types: PropertyType[] | null | undefined,
): PropertyType[] | null {
  if (!types || types.length === 0) return null;
  return [...new Set(types)];
}
```

In `create`, replace:

```ts
    await this.assertChangeRequestShape(createDto);

    return this.stepRepository.create({
      ...createDto,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    } as Partial<WorkflowStepEntity>);
```

with:

```ts
    await this.assertChangeRequestShape(createDto);
    this.assertRuleShape(createDto);

    return this.stepRepository.create({
      ...createDto,
      propertyTypes: normalizePropertyTypes(createDto.propertyTypes),
      createdBy: currentUserId,
      updatedBy: currentUserId,
    } as Partial<WorkflowStepEntity>);
```

In `update`, replace:

```ts
    await this.assertChangeRequestShape({ ...existing, ...updateDto }, id);
```

with:

```ts
    await this.assertChangeRequestShape({ ...existing, ...updateDto }, id);
    this.assertRuleShape({ ...existing, ...updateDto });

    const changes: Partial<WorkflowStepEntity> = { ...updateDto };
    if (Object.prototype.hasOwnProperty.call(updateDto, 'propertyTypes')) {
      changes.propertyTypes = normalizePropertyTypes(updateDto.propertyTypes);
    }
```

and in the same method replace:

```ts
      const updated = await this.stepRepository.update(
        id,
        {
          ...updateDto,
          updatedBy: currentUserId,
        },
        manager,
      );
```

with:

```ts
      const updated = await this.stepRepository.update(
        id,
        {
          ...changes,
          updatedBy: currentUserId,
        },
        manager,
      );
```

Add this method directly after `assertChangeRequestShape`:

```ts
  /**
   * A change-request step is created only for a matching request, never from the
   * baseline catalogue, so a task rule on it would never be read. Refuse it
   * rather than store a rule that silently does nothing.
   */
  private assertRuleShape(step: {
    isSpecial?: boolean;
    changeRequestType?: ChangeRequestType | null;
    loanOnly?: boolean;
    propertyTypes?: PropertyType[] | null;
  }): void {
    const isChangeRequestStep = Boolean(step.isSpecial || step.changeRequestType);
    const hasRule = Boolean(step.loanOnly) || (step.propertyTypes?.length ?? 0) > 0;
    if (isChangeRequestStep && hasRule) {
      throw new BadRequestException('A change request step cannot have task rules');
    }
  }
```

- [ ] **Step 7: Run the migration**

```bash
cd apps/backend && npm run migration:run && cd ../..
```

Expected log:

```
[migration] Marked 8 loan step(s) as loan only.
[migration]   LOAN-001 — Loan Document Collection
…
```

(8 lines, including `LOAN -02 — Jan Samarth Portal Registration`.)

- [ ] **Step 8: Typecheck and the existing backend tests**

```bash
npm run typecheck:backend
npx nx test backend
```

Expected: PASS; tests as the baseline.

- [ ] **Step 9: Check the rows (read-only)**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "SELECT code, loan_only, property_types FROM workflow_steps WHERE deleted_at IS NULL AND loan_only ORDER BY sequence_order;"
```

Expected: 8 rows, `property_types` empty. The screen that shows them is checked in Task 3.

- [ ] **Step 10: Commit**

```bash
git add apps/backend/src/database/migrations/1857100000000-AddWorkflowStepRules.ts apps/backend/src/modules/projects/entities apps/backend/src/modules/projects/dto/workflow-steps apps/backend/src/modules/projects/services/workflow-step.service.ts
git commit -m "$(cat <<'EOF'
feat(projects): task rule columns on workflow steps

Loan steps start as loan only. removal_reason marks tasks the system
removes, so a task a person deleted is never brought back.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Admin step form and rule chip

**Files:**
- Modify: `apps/web/components/features/admin/workflow-steps/components/admin-workflow-steps-page.tsx`
- Modify: `apps/web/components/features/admin/workflow-steps/utils/workflow-step-payload.ts`

**Interfaces:**
- Consumes: `describeStepRule` (Task 1); form fields `loanOnly`, `propertyTypes` (Task 1); API fields (Task 2); `SelectableChip` from `@/components/shared/forms`; `PROPERTY_TYPE_OPTIONS` from `@/lib/config/constants`.
- Produces: admins can set and clear both rule parts. Part 2 inserts its section above the Change Request section and its chip after the rule chip.

- [ ] **Step 1: Imports**

In `admin-workflow-steps-page.tsx`, below the `@tejas96/shared/types` import add:

```tsx
import { describeStepRule } from '@tejas96/shared/utils';
```

Below `import { TablePagination } from '@/components/shared/data-table';` add:

```tsx
import { SelectableChip } from '@/components/shared/forms';
```

Below `import { Textarea } from '@/components/ui/textarea';` add:

```tsx
import { PROPERTY_TYPE_OPTIONS } from '@/lib/config/constants';
```

- [ ] **Step 2: The rule chip on each row**

In `WorkflowStepRow`, replace:

```tsx
}: WorkflowStepRowProps): React.JSX.Element {
  return (
```

with:

```tsx
}: WorkflowStepRowProps): React.JSX.Element {
  const ruleShort = describeStepRule(step, { short: true });
  const ruleFull = describeStepRule(step);

  return (
```

and replace:

```tsx
        {step.isSpecial ? (
          <Badge variant="warning" className="text-xs">
            Change Request
          </Badge>
        ) : null}
```

with:

```tsx
        {step.isSpecial ? (
          <Badge variant="warning" className="text-xs">
            Change Request
          </Badge>
        ) : null}
        {ruleShort && (
          <Badge variant="info" className="text-xs" title={ruleFull ?? undefined}>
            {ruleShort}
          </Badge>
        )}
```

- [ ] **Step 3: Form defaults**

In `StepFormSheet`, the `defaultValues` object and the create branch of `form.reset(...)` each contain `changeRequestType: null,`. After it, in both places, add:

```tsx
      loanOnly: false,
      propertyTypes: [],
```

In the edit branch of `form.reset(...)`, after `changeRequestType: step.changeRequestType ?? null,` add:

```tsx
        loanOnly: step.loanOnly ?? false,
        propertyTypes: step.propertyTypes ?? [],
```

- [ ] **Step 4: Clear the rule when a step becomes a change-request step**

Replace:

```tsx
                onCheckedChange={(checked) => {
                  const on = checked === true;
                  form.setValue('isSpecial', on);
                  if (!on) form.setValue('changeRequestType', null);
                }}
```

with:

```tsx
                onCheckedChange={(checked) => {
                  const on = checked === true;
                  form.setValue('isSpecial', on);
                  if (!on) form.setValue('changeRequestType', null);
                  // A change-request step never takes a task rule.
                  if (on) {
                    form.setValue('loanOnly', false);
                    form.setValue('propertyTypes', []);
                  }
                }}
```

- [ ] **Step 5: The form section**

Insert this block directly above `{/* ─── Section: Change Request ─── */}`:

```tsx
          {/* ─── Section: When to add this step ─── */}
          {!form.watch('isSpecial') && (
            <fieldset className="space-y-4 rounded-lg shadow-e2 p-4">
              <legend className="px-2 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                When to add this step
              </legend>

              <Alert variant="info" appearance="minimal" className="text-xs">
                Rules decide which tasks a new project gets. The loan rule also follows a
                site&apos;s loan changes.
              </Alert>

              <div className="rounded-md p-3 shadow-e1">
                <Checkbox
                  id="loanOnly"
                  checked={form.watch('loanOnly') ?? false}
                  onCheckedChange={(checked) => form.setValue('loanOnly', checked === true)}
                  label="Only when the site needs a loan"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Property types</Label>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TYPE_OPTIONS.map((option) => {
                    const selected = form.watch('propertyTypes') ?? [];
                    const active = selected.includes(option.value);
                    return (
                      <SelectableChip
                        key={option.value}
                        active={active}
                        onClick={() =>
                          form.setValue(
                            'propertyTypes',
                            active
                              ? selected.filter((value) => value !== option.value)
                              : [...selected, option.value],
                          )
                        }
                      >
                        {option.label}
                      </SelectableChip>
                    );
                  })}
                </div>
                <p className="text-xs text-foreground-tertiary">None picked means every type.</p>
              </div>
            </fieldset>
          )}

```

- [ ] **Step 6: Send the rule fields**

In `workflow-step-payload.ts`, replace:

```ts
    dependsOnTaskCodes: depCodes,
```

with:

```ts
    dependsOnTaskCodes: depCodes,
    // A change-request step never takes a rule; the backend refuses one.
    loanOnly: data.isSpecial ? false : (data.loanOnly ?? false),
    // No type picked means every type, and travels as null so an emptied list clears.
    propertyTypes: data.isSpecial || !data.propertyTypes?.length ? null : data.propertyTypes,
```

- [ ] **Step 7: Typecheck, lint, the existing payload test**

```bash
npm run typecheck:web
npx nx lint web
npx nx test web --testPathPatterns=workflow-step-payload
```

Expected: PASS. If lint reports import order, run `npx nx lint web --fix` and check the diff.

- [ ] **Step 8: Verify on the screen**

1. Open `http://localhost:3001/admin/workflow-steps`. The 8 loan steps show a "Loan only" chip (the migration's rows, now on screen).
2. Open "DSS Work" (DES-001). Tick "Only when the site needs a loan", pick Residential and Commercial, save. The row chip reads "Loan only · Residential +1". Hover it: "Loan only · Residential, Commercial".
3. Reopen DES-001. Both parts are still set.
4. Untick the loan box and unpick both types. Save. The chip is gone. Reopen: nothing is ticked. Check (read-only):

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "SELECT code, loan_only, property_types FROM workflow_steps WHERE code = 'DES-001';"
```

Expected: `f` and an empty `property_types` — the clear really reached the database.

5. Open any step and tick "This is a change request step". The "When to add this step" section disappears. Close without saving.

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/features/admin/workflow-steps
git commit -m "$(cat <<'EOF'
feat(web): task rules on the workflow step form

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: New projects get only matching tasks

**Files:**
- Create: `apps/backend/src/modules/projects/utils/task-from-step.ts`
- Modify: `apps/backend/src/modules/projects/services/project.service.ts`

**Interfaces:**
- Consumes: `stepAppliesToSite`, `SiteTaskFacts` (Task 1); `WorkflowStepEntity.loanOnly`, `propertyTypes` (Task 2).
- Produces: `buildTaskFromStep(params: { step: WorkflowStepEntity; projectId: string; code: string; baseDate: Date; createdBy: string | null; milestone?: { name: string | null; order: number | null }; milestoneNameToOrder?: Map<string, number> }): Partial<ProjectTaskEntity>` (Task 6 uses it).

- [ ] **Step 1: The shared task builder**

Create `apps/backend/src/modules/projects/utils/task-from-step.ts`:

```ts
import { TaskStatus } from '@tejas96/shared/types';
import { canonicalMilestoneOrder } from '@tejas96/shared/utils';

import { type ProjectTaskEntity } from '../entities/project-task.entity';
import { type WorkflowStepEntity } from '../entities/workflow-step.entity';

/** Tasks sort on the board by their step's sequence, spaced for manual reordering. */
const KANBAN_ORDER_MULTIPLIER = 100;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * The columns every task built from a workflow step starts with.
 *
 * Project creation and the loan sync both build tasks here, so a task the sync
 * adds later looks exactly like one the project was created with.
 *
 * `milestone` is the wizard's override when there is one; otherwise the step's
 * default name and order apply. A name with a canonical lifecycle position always
 * takes that order.
 */
export function buildTaskFromStep(params: {
  step: WorkflowStepEntity;
  projectId: string;
  code: string;
  baseDate: Date;
  createdBy: string | null;
  milestone?: { name: string | null; order: number | null };
  milestoneNameToOrder?: Map<string, number>;
}): Partial<ProjectTaskEntity> {
  const { step, projectId, code, baseDate, createdBy, milestone, milestoneNameToOrder } = params;

  let milestoneName: string | null;
  let milestoneOrder: number | null;
  if (milestone !== undefined) {
    milestoneName = milestone.name;
    milestoneOrder =
      milestone.order ??
      (milestoneName ? (milestoneNameToOrder?.get(milestoneName) ?? null) : null);
  } else {
    milestoneName = step.defaultMilestoneName ?? null;
    milestoneOrder =
      step.defaultMilestoneOrder ??
      (milestoneName ? (milestoneNameToOrder?.get(milestoneName) ?? null) : null);
  }

  if (milestoneName) {
    const canonical = canonicalMilestoneOrder(milestoneName);
    if (canonical !== undefined) {
      milestoneOrder = canonical;
    }
  }

  return {
    projectId,
    workflowStepId: step.id,
    code,
    kanbanOrder: step.sequenceOrder * KANBAN_ORDER_MULTIPLIER,
    endDate: step.effortDays != null ? addDays(baseDate, step.effortDays) : undefined,
    status: TaskStatus.BACKLOG,
    milestoneName,
    milestoneOrder,
    createdBy: createdBy ?? undefined,
    updatedBy: createdBy ?? undefined,
  };
}
```

- [ ] **Step 2: Imports and constants in `project.service.ts`**

Replace:

```ts
import {
  type PaymentMilestone,
  ProjectPriority,
  ProjectStatus,
  PropertyStatus,
  QuoteStatus,
  TaskStatus,
} from '@tejas96/shared/types';
import {
  canonicalMilestoneOrder,
  compareMilestoneSequence,
  isProjectBaselineStep,
} from '@tejas96/shared/utils';
```

with:

```ts
import {
  type PaymentMilestone,
  ProjectPriority,
  ProjectStatus,
  PropertyStatus,
  QuoteStatus,
  type SiteTaskFacts,
  TaskStatus,
} from '@tejas96/shared/types';
import {
  compareMilestoneSequence,
  isProjectBaselineStep,
  stepAppliesToSite,
} from '@tejas96/shared/utils';
```

Replace:

```ts
} from '../repositories';

const PROJECT_CONSTANTS = {
  ALL_TASKS_LIMIT: 10000,
  KANBAN_ORDER_MULTIPLIER: 100,
} as const;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
```

with:

```ts
} from '../repositories';
import { buildTaskFromStep } from '../utils/task-from-step';

const PROJECT_CONSTANTS = {
  ALL_TASKS_LIMIT: 10000,
} as const;
```

- [ ] **Step 3: Read the site facts at creation**

In `orchestrateProjectCreation`, replace:

```ts
      const converted = await manager
        .getRepository(CustomerPropertyEntity)
        .findOne({ where: { id: propertyId }, select: { id: true, customerId: true } });
```

with:

```ts
      const converted = await manager.getRepository(CustomerPropertyEntity).findOne({
        where: { id: propertyId },
        select: { id: true, customerId: true, wantsLoan: true, propertyType: true },
      });
```

and replace:

```ts
      await this.applyWorkflowStepsWithMilestones(
        project.id,
        createdBy,
        milestoneNameToOrder,
        taskMilestoneOverrides ?? [],
        excludedStepIds,
        project.startDate,
        manager,
      );
```

with:

```ts
      await this.applyWorkflowStepsWithMilestones(
        project.id,
        createdBy,
        milestoneNameToOrder,
        taskMilestoneOverrides ?? [],
        excludedStepIds,
        project.startDate,
        manager,
        converted
          ? { wantsLoan: converted.wantsLoan, propertyType: converted.propertyType }
          : null,
      );
```

- [ ] **Step 4: Quiet the expected missing codes in the cycle check**

Replace:

```ts
  private detectDependencyCycles(
    steps: { code: string; dependsOnTaskCodes?: string[] | null }[],
  ): void {
```

with:

```ts
  private detectDependencyCycles(
    steps: { code: string; dependsOnTaskCodes?: string[] | null }[],
    ruleSkippedCodes: ReadonlySet<string> = new Set(),
  ): void {
```

and replace:

```ts
          if (!codeSet.has(dep)) {
            this.logger.warn(`Step "${s.code}" depends on missing code "${dep}" — skipping dep`);
            continue;
          }
```

with:

```ts
          if (!codeSet.has(dep)) {
            // A step left out by a task rule is expected to be missing here.
            if (!ruleSkippedCodes.has(dep)) {
              this.logger.warn(`Step "${s.code}" depends on missing code "${dep}" — skipping dep`);
            }
            continue;
          }
```

- [ ] **Step 5: Filter by rule and build through the helper**

Replace the whole `applyWorkflowStepsWithMilestones` method — from its JSDoc `/** Apply workflow steps to a new project, …` down to its closing brace, just above `private async addTeamMembers(` — with:

```ts
  /**
   * Apply workflow steps to a new project, setting milestone_name and milestone_order
   * directly on each task. Overrides from the wizard take precedence over step defaults.
   *
   * A step whose task rule the site fails (stepAppliesToSite) never becomes a task.
   * `siteFacts` is read inside the creation transaction, so the rule sees the site
   * exactly as the project is created against it.
   */
  private async applyWorkflowStepsWithMilestones(
    projectId: string,
    createdBy: string,
    milestoneNameToOrder: Map<string, number>,
    taskMilestoneOverrides: Array<{
      workflowStepId: string;
      milestoneName: string | null;
      milestoneOrder: number | null;
    }>,
    excludedStepIds?: string[],
    projectStartDate?: Date,
    manager?: EntityManager,
    siteFacts?: SiteTaskFacts | null,
  ): Promise<void> {
    let steps = await this.workflowStepRepository.findAllActive(manager);

    if (steps.length === 0) return;

    if (excludedStepIds && excludedStepIds.length > 0) {
      const excludeSet = new Set(excludedStepIds);
      steps = steps.filter((s) => !excludeSet.has(s.id));
    }

    // Change-request templates are only instantiated when property has pending requests.
    steps = steps.filter(isProjectBaselineStep);

    // Task rules: a step whose rule this site fails never becomes a task.
    const ruleSkippedCodes = new Set<string>();
    if (siteFacts) {
      steps = steps.filter((step) => {
        const applies = stepAppliesToSite(step, siteFacts);
        if (!applies) ruleSkippedCodes.add(step.code);
        return applies;
      });
    }

    if (steps.length === 0) return;

    this.detectDependencyCycles(steps, ruleSkippedCodes);

    const orgCode = COMPANY.code;

    // Build override lookup keyed by workflowStepId
    const overrideMap = new Map(taskMilestoneOverrides.map((o) => [o.workflowStepId, o]));

    const codeToTaskId = new Map<string, string>();
    const baseDate = projectStartDate ? new Date(projectStartDate) : new Date();
    baseDate.setHours(0, 0, 0, 0);

    for (const step of steps) {
      let taskCode: string;
      try {
        taskCode = await this.taskRepository.generateTaskCode(orgCode, manager);
      } catch {
        taskCode = step.code;
      }

      const override = overrideMap.get(step.id);

      const task = await this.taskRepository.create(
        buildTaskFromStep({
          step,
          projectId,
          code: taskCode,
          baseDate,
          createdBy,
          milestone: override
            ? { name: override.milestoneName, order: override.milestoneOrder }
            : undefined,
          milestoneNameToOrder,
        }),
        manager,
      );

      codeToTaskId.set(step.code, task.id);
    }

    // Wire up task dependencies
    for (const step of steps) {
      if (step.dependsOnTaskCodes && step.dependsOnTaskCodes.length > 0) {
        const taskId = codeToTaskId.get(step.code);
        if (!taskId) continue;

        const dependsOnTaskIds: string[] = [];
        for (const depCode of step.dependsOnTaskCodes) {
          const depTaskId = codeToTaskId.get(depCode);
          if (depTaskId) {
            dependsOnTaskIds.push(depTaskId);
          } else if (ruleSkippedCodes.has(depCode)) {
            this.logger.debug(
              `Task dependency skipped: "${depCode}" is left out by a task rule (step "${step.code}")`,
            );
          } else {
            this.logger.warn(
              `Task dependency resolution: code "${depCode}" not found for step "${step.code}"`,
            );
          }
        }

        if (dependsOnTaskIds.length > 0) {
          await this.taskRepository.updateById(taskId, { dependsOnTaskIds }, manager);
        }
      }
    }
  }
```

- [ ] **Step 6: Typecheck, lint, the existing backend tests**

```bash
npm run typecheck:backend
npx nx lint backend
npx nx test backend
```

Expected: PASS; tests as the baseline.

- [ ] **Step 7: Verify on the screen**

1. Find an accepted quote on a residential site without a loan that has no project yet (read-only helper query):

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "SELECT q.quote_number, cp.property_name, cp.property_type, cp.wants_loan FROM quotes q JOIN customer_properties cp ON cp.id = q.property_id WHERE q.status = 'accepted' AND q.voided_at IS NULL AND cp.status <> 'converted' AND cp.deleted_at IS NULL ORDER BY q.updated_at DESC LIMIT 10;"
```

If none is residential without a loan, create one through the UI: Customers → a customer → add a site (Residential, "Wants loan" off) → create a quote → mark it accepted.

2. Projects → New project. Pick that quote and go through the wizard to the end. (Step 5 still lists loan steps — Task 5 fixes the wizard; the backend is what decides.)
3. Open the new project → Tasks. No "Loan …" or "Bank Account Opening" or "Jan Samarth" task is there.
4. Pair it with the rows (read-only), using the project number from the header:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "SELECT count(*) FILTER (WHERE s.loan_only) AS loan_tasks, count(*) AS all_tasks FROM project_tasks t JOIN workflow_steps s ON s.id = t.workflow_step_id WHERE t.deleted_at IS NULL AND t.project_id = (SELECT id FROM projects WHERE project_number = '<PROJECT NUMBER>');"
```

Expected: `loan_tasks = 0`.

5. The backend log for the conversion shows no `Task dependency resolution: code "LOAN…" not found` warning.

Keep this project: Task 6 uses it.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/modules/projects/utils/task-from-step.ts apps/backend/src/modules/projects/services/project.service.ts
git commit -m "$(cat <<'EOF'
feat(projects): new projects get only the tasks their site's rules allow

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: The wizard hides steps that do not match

**Files:**
- Modify: `apps/web/components/features/projects/components/project-create-wizard/steps/step-5-tasks-milestones.tsx`
- Modify: `apps/web/components/features/projects/components/project-create-wizard/hooks/use-project-create-submit.ts`

**Interfaces:**
- Consumes: `stepAppliesToSite` (Task 1); `useProperty(propertyId)` from `@/components/features/customers/hooks` (returns `wantsLoan: boolean`, `propertyType: PropertyType`); form field `propertyId`.
- Produces: step 5 shows exactly the tasks the backend will create.

- [ ] **Step 1: Filter in step 5**

In `step-5-tasks-milestones.tsx`:

Replace:

```tsx
import { isProjectBaselineStep } from '@tejas96/shared/utils';
```

with:

```tsx
import { isProjectBaselineStep, stepAppliesToSite } from '@tejas96/shared/utils';
```

Below `import { MUITypography } from '@/components/ui';` add:

```tsx
import { useProperty } from '@/components/features/customers/hooks';
```

Replace:

```tsx
  const { items: rawTemplates, isLoading: stepsLoading } = useAllActiveWorkflowSteps();
  // Same rule the backend applies when it builds the tasks. Without it the wizard
  // lists the change-request templates and promises tasks the project never gets.
  const templates: WorkflowStep[] = useMemo(
    () => (rawTemplates as WorkflowStep[]).filter(isProjectBaselineStep),
    [rawTemplates],
  );
```

with:

```tsx
  const propertyId: string = watch('propertyId');
  const { data: property, isLoading: propertyLoading } = useProperty(propertyId);

  const { items: rawTemplates, isLoading: stepsLoading } = useAllActiveWorkflowSteps();
  // The same two rules the backend applies when it builds the tasks:
  // change-request templates never join a new project, and a step whose task rule
  // this site fails is left out. Without them the wizard promises tasks the
  // project never gets.
  const baselineTemplates: WorkflowStep[] = useMemo(
    () => (rawTemplates as WorkflowStep[]).filter(isProjectBaselineStep),
    [rawTemplates],
  );
  const templates: WorkflowStep[] = useMemo(
    () =>
      property
        ? baselineTemplates.filter((step) =>
            stepAppliesToSite(step, {
              wantsLoan: property.wantsLoan,
              propertyType: property.propertyType,
            }),
          )
        : baselineTemplates,
    [baselineTemplates, property],
  );
  const skippedByRules = baselineTemplates.length - templates.length;
```

Replace:

```tsx
      {stepsLoading ? (
```

with:

```tsx
      {skippedByRules > 0 && (
        <MUITypography variant="body" className="text-foreground-secondary mb-3">
          {skippedByRules} step{skippedByRules > 1 ? 's' : ''} skipped by rules
        </MUITypography>
      )}

      {stepsLoading || propertyLoading ? (
```

- [ ] **Step 2: Auto-assign only matching steps**

In `use-project-create-submit.ts`:

Replace:

```ts
import { isProjectBaselineStep } from '@tejas96/shared/utils';
```

with:

```ts
import { isProjectBaselineStep, stepAppliesToSite } from '@tejas96/shared/utils';
```

Replace:

```ts
import { buildRoute, ROUTES } from '@/lib/config/routes';
```

with:

```ts
import { useProperty } from '@/components/features/customers/hooks';
import { buildRoute, ROUTES } from '@/lib/config/routes';
```

Replace:

```ts
  const { items: rawWorkflowSteps = [] } = useAllActiveWorkflowSteps();
  // Only baseline steps become tasks, so only they can carry an auto-assignment.
  const workflowSteps = useMemo(
    () => rawWorkflowSteps.filter(isProjectBaselineStep),
    [rawWorkflowSteps],
  );
```

with:

```ts
  const { items: rawWorkflowSteps = [] } = useAllActiveWorkflowSteps();
  const { data: property } = useProperty(form.watch('propertyId'));
  // Only steps that become tasks can carry an auto-assignment: baseline steps
  // whose task rule this site passes — the same filter step 5 shows.
  const workflowSteps = useMemo(
    () =>
      rawWorkflowSteps
        .filter(isProjectBaselineStep)
        .filter((step) =>
          property
            ? stepAppliesToSite(step, {
                wantsLoan: property.wantsLoan,
                propertyType: property.propertyType,
              })
            : true,
        ),
    [rawWorkflowSteps, property],
  );
```

- [ ] **Step 3: Typecheck and lint**

```bash
npm run typecheck:web
npx nx lint web
```

Expected: PASS.

- [ ] **Step 4: Verify on the screen**

1. Projects → New project. Pick an accepted quote on a residential site without a loan (the query in Task 4 Step 7 lists candidates). Go to step 5 (Tasks & Milestones).
2. No loan step is listed. The line above the groups reads "8 steps skipped by rules". The "N/M tasks" counts leave the loan steps out.
3. On the steps page, give "DSS Work" (DES-001) the type "Commercial" only. Back in the wizard (reload step 5): DSS Work is gone and the line reads "9 steps skipped by rules".
4. If an unconverted accepted quote on a loan site exists, pick it: loan steps are listed and the line counts only DES-001. If none exists, open the residential candidate's site at `/properties/<id>/edit`, turn on "Wants loan", save, check step 5, then turn it back off.
5. Remove the type from DES-001 again. Leave the wizard without creating a project.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/features/projects/components/project-create-wizard
git commit -m "$(cat <<'EOF'
feat(web): project wizard shows only the tasks the site's rules allow

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Loan sync when a site's loan changes

**Files:**
- Create: `apps/backend/src/modules/projects/events/site-loan-changed.event.ts`
- Create: `apps/backend/src/modules/projects/services/loan-task-sync.service.ts`
- Create: `apps/backend/src/modules/projects/listeners/site-loan-changed.listener.ts`
- Modify: `apps/backend/src/modules/projects/services/index.ts`
- Modify: `apps/backend/src/modules/projects/projects.module.ts`
- Modify: `apps/backend/src/modules/customers/repositories/customer-property.repository.ts`
- Modify: `apps/backend/src/modules/customers/services/customer-property.service.ts`
- Modify: `apps/backend/src/modules/customers/dto/customer-property-response.dto.ts`

**Interfaces:**
- Consumes: `stepAppliesToSite`, `isProjectBaselineStep`, `TaskRuleSyncResult`, `SiteTaskFacts` (Task 1); `WorkflowStepEntity.loanOnly`, `ProjectTaskEntity.removalReason` (Task 2); `buildTaskFromStep` (Task 4); `ProjectTaskRepository.create(data, manager)`, `generateTaskCode(orgCode, manager)`, `updateById(id, data, manager)`, `computeProgress(projectId, manager)`; `ProjectRepository.updateProgressById(projectId, progress, manager)`.
- Produces:
  - `SITE_EVENTS.LOAN_CHANGED = 'site.loan-changed'` and `class SiteLoanChangedEvent(propertyId, wantsLoanBefore, wantsLoanAfter, propertyTypeBefore, actorUserId, manager)`
  - `LoanTaskSyncService.syncForLoanChange(event: SiteLoanChangedEvent): Promise<TaskRuleSyncResult | null>`
  - `CustomerPropertyRepository.update(id, updates, manager?)`, `findById(id, manager?)`
  - `PATCH /customer-properties/:id` response field `taskRuleSync?: TaskRuleSyncResult` (Task 7 reads it)

- [ ] **Step 1: The event**

Create `apps/backend/src/modules/projects/events/site-loan-changed.event.ts`:

```ts
import { type PropertyType } from '@tejas96/shared/types';
import { type EntityManager } from 'typeorm';

/**
 * Raised by CustomerPropertyService.update, inside its transaction, when a save
 * changes `wants_loan`. The customers module cannot import the projects module,
 * so the loan sync listens for this instead of being called.
 *
 * Emit with `emitAsync` and await it: `manager` is the save's transaction, the
 * sync runs in it, and a failed sync rolls the whole save back.
 */
export const SITE_EVENTS = {
  LOAN_CHANGED: 'site.loan-changed',
} as const;

export class SiteLoanChangedEvent {
  constructor(
    public readonly propertyId: string,
    public readonly wantsLoanBefore: boolean,
    public readonly wantsLoanAfter: boolean,
    /** The type before the save, so a type change in the same save changes no task. */
    public readonly propertyTypeBefore: PropertyType,
    public readonly actorUserId: string | null,
    public readonly manager: EntityManager,
  ) {}
}
```

- [ ] **Step 2: The sync**

Create `apps/backend/src/modules/projects/services/loan-task-sync.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { COMPANY } from '@tejas96/shared/constants';
import {
  ProjectStatus,
  type SiteTaskFacts,
  type TaskRuleSyncResult,
  TaskStatus,
} from '@tejas96/shared/types';
import { isProjectBaselineStep, stepAppliesToSite } from '@tejas96/shared/utils';
import { type EntityManager, In, IsNull } from 'typeorm';

import { ProjectTaskEntity } from '../entities/project-task.entity';
import { ProjectEntity } from '../entities/project.entity';
import { WorkflowStepEntity } from '../entities/workflow-step.entity';
import { type SiteLoanChangedEvent } from '../events/site-loan-changed.event';
import { ProjectTaskRepository } from '../repositories/project-task.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { buildTaskFromStep } from '../utils/task-from-step';

const LIVE_PROJECT_STATUSES = [ProjectStatus.PLANNING, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD];

/** A task nobody has started: still in backlog, with no checklist item ticked. */
function isNotStarted(task: ProjectTaskEntity): boolean {
  if (task.status !== TaskStatus.BACKLOG) return false;
  const checklist = task.checklistOverride ?? task.checklist;
  return !(checklist?.items ?? []).some((item) => item.isCompleted);
}

/**
 * Keeps a live project's loan-only tasks in line with its site's loan flag.
 *
 * Only `loan_only` steps are considered. Each is checked with the old and the
 * new loan value, against the property type from before the save:
 * - it now applies → add its task, unless the project already has a live one,
 *   excludes the step, or a person deleted that task;
 * - it no longer applies → remove its task if nobody started it, else keep it.
 *
 * Runs inside the property save's transaction and throws on failure, so a half
 * sync can never be committed.
 */
@Injectable()
export class LoanTaskSyncService {
  private readonly logger = new Logger(LoanTaskSyncService.name);

  constructor(
    private readonly taskRepository: ProjectTaskRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  /** Null when the site has no live project or nothing changed. */
  async syncForLoanChange(event: SiteLoanChangedEvent): Promise<TaskRuleSyncResult | null> {
    const { manager } = event;

    const project = await manager.getRepository(ProjectEntity).findOne({
      where: {
        propertyId: event.propertyId,
        status: In(LIVE_PROJECT_STATUSES),
        deletedAt: IsNull(),
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (!project) return null;

    const steps = (
      await manager.getRepository(WorkflowStepEntity).find({
        where: { loanOnly: true, deletedAt: IsNull() },
        order: { sequenceOrder: 'ASC' },
      })
    ).filter(isProjectBaselineStep);
    if (steps.length === 0) return null;

    const before: SiteTaskFacts = {
      wantsLoan: event.wantsLoanBefore,
      propertyType: event.propertyTypeBefore,
    };
    const after: SiteTaskFacts = {
      wantsLoan: event.wantsLoanAfter,
      propertyType: event.propertyTypeBefore,
    };

    const allTasks = await manager.getRepository(ProjectTaskEntity).find({
      where: { projectId: project.id },
      relations: { workflowStep: true },
      withDeleted: true,
    });
    const liveTasks = allTasks.filter((task) => !task.deletedAt);
    const excluded = new Set(project.excludedStepIds ?? []);

    const toAdd: WorkflowStepEntity[] = [];
    const toRemove: ProjectTaskEntity[] = [];
    let kept = 0;

    for (const step of steps) {
      const appliedBefore = stepAppliesToSite(step, before);
      const appliesAfter = stepAppliesToSite(step, after);
      if (appliedBefore === appliesAfter) continue;

      const stepTasks = liveTasks.filter((task) => task.workflowStepId === step.id);

      if (appliesAfter) {
        const deletedByPerson = allTasks.some(
          (task) =>
            task.workflowStepId === step.id && task.deletedAt && task.removalReason == null,
        );
        if (step.isActive && stepTasks.length === 0 && !excluded.has(step.id) && !deletedByPerson) {
          toAdd.push(step);
        }
      } else {
        for (const task of stepTasks) {
          if (isNotStarted(task)) toRemove.push(task);
          else kept += 1;
        }
      }
    }

    if (toAdd.length === 0 && toRemove.length === 0 && kept === 0) return null;

    if (toRemove.length > 0) {
      await this.removeTasks(
        project.id,
        toRemove.map((task) => task.id),
        manager,
      );
    }
    if (toAdd.length > 0) {
      const remaining = liveTasks.filter((task) => !toRemove.includes(task));
      await this.addTasks(project.id, toAdd, remaining, event.actorUserId, manager);
    }

    const { done, total } = await this.taskRepository.computeProgress(project.id, manager);
    const progress = total > 0 ? Math.round((100 * done) / total) : 0;
    // Completes the project at 100%, exactly as a status change does.
    await this.projectRepository.updateProgressById(project.id, progress, manager);

    this.logger.log(
      `Loan sync on ${project.projectNumber}: ${toAdd.length} added, ${toRemove.length} removed, ${kept} kept`,
    );

    return {
      projectId: project.id,
      projectNumber: project.projectNumber,
      projectName: project.name,
      added: toAdd.length,
      removed: toRemove.length,
      kept,
      completed: progress === 100,
    };
  }

  private async removeTasks(
    projectId: string,
    taskIds: string[],
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .getRepository(ProjectTaskEntity)
      .update({ id: In(taskIds) }, { deletedAt: new Date(), removalReason: 'rule_not_applicable' });

    // The same clean-up ProjectTaskService.remove does, so nothing waits on a
    // task that no longer exists.
    for (const taskId of taskIds) {
      await manager.query(
        `UPDATE project_tasks
            SET depends_on_task_ids = array_remove(depends_on_task_ids, $1::uuid)
          WHERE project_id = $2
            AND deleted_at IS NULL
            AND $1::uuid = ANY(depends_on_task_ids)`,
        [taskId, projectId],
      );
    }
  }

  private async addTasks(
    projectId: string,
    steps: WorkflowStepEntity[],
    existingTasks: ProjectTaskEntity[],
    actorUserId: string | null,
    manager: EntityManager,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step code → live task id, for dependency links.
    const taskIdByCode = new Map<string, string>();
    for (const task of existingTasks) {
      const code = task.workflowStep?.code;
      if (code && !taskIdByCode.has(code)) taskIdByCode.set(code, task.id);
    }

    const created: Array<{ step: WorkflowStepEntity; taskId: string }> = [];
    for (const step of steps) {
      let code: string;
      try {
        code = await this.taskRepository.generateTaskCode(COMPANY.code, manager);
      } catch {
        code = step.code;
      }

      const task = await this.taskRepository.create(
        buildTaskFromStep({ step, projectId, code, baseDate: today, createdBy: actorUserId }),
        manager,
      );
      taskIdByCode.set(step.code, task.id);
      created.push({ step, taskId: task.id });
    }

    for (const { step, taskId } of created) {
      const dependsOnTaskIds = (step.dependsOnTaskCodes ?? [])
        .map((depCode) => taskIdByCode.get(depCode))
        .filter((id): id is string => Boolean(id));
      if (dependsOnTaskIds.length > 0) {
        await this.taskRepository.updateById(taskId, { dependsOnTaskIds }, manager);
      }
    }
  }
}
```

- [ ] **Step 3: The listener**

Create `apps/backend/src/modules/projects/listeners/site-loan-changed.listener.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { type TaskRuleSyncResult } from '@tejas96/shared/types';

import { SITE_EVENTS, SiteLoanChangedEvent } from '../events/site-loan-changed.event';
import { LoanTaskSyncService } from '../services/loan-task-sync.service';

@Injectable()
export class SiteLoanChangedListener {
  constructor(private readonly loanTaskSyncService: LoanTaskSyncService) {}

  /**
   * Not `async: true`, and `suppressErrors: false` (the library default is true):
   * the property save awaits this through `emitAsync` inside its transaction and
   * must fail when the sync fails.
   */
  @OnEvent(SITE_EVENTS.LOAN_CHANGED, { suppressErrors: false })
  handle(event: SiteLoanChangedEvent): Promise<TaskRuleSyncResult | null> {
    return this.loanTaskSyncService.syncForLoanChange(event);
  }
}
```

- [ ] **Step 4: Register them**

In `apps/backend/src/modules/projects/services/index.ts`, add:

```ts
export * from './loan-task-sync.service';
```

In `projects.module.ts`, replace:

```ts
  WorkflowStepService,
  ChangeRequestTaskService,
} from './services';
```

with:

```ts
  WorkflowStepService,
  ChangeRequestTaskService,
  LoanTaskSyncService,
} from './services';
import { SiteLoanChangedListener } from './listeners/site-loan-changed.listener';
```

and replace:

```ts
    ChangeRequestTaskService,
    ProjectTeamService,
    ProjectChatService,
    ProjectAnalyticsService,
    // Guards
```

with:

```ts
    ChangeRequestTaskService,
    LoanTaskSyncService,
    SiteLoanChangedListener,
    ProjectTeamService,
    ProjectChatService,
    ProjectAnalyticsService,
    // Guards
```

- [ ] **Step 5: Let the property repository join a transaction**

In `customer-property.repository.ts`, replace:

```ts
  async findById(id: string): Promise<CustomerPropertyEntity | null> {
    return this.repository.findOne({
```

with:

```ts
  async findById(id: string, manager?: EntityManager): Promise<CustomerPropertyEntity | null> {
    return this.getRepo(manager).findOne({
```

and replace:

```ts
  async update(
    id: string,
    updates: Partial<CustomerPropertyEntity>,
  ): Promise<CustomerPropertyEntity | null> {
    // Use type assertion to avoid TypeScript recursion issues with circular entity references
    await this.repository.update({ id }, updates as Record<string, unknown>);
    return this.findById(id);
  }
```

with:

```ts
  async update(
    id: string,
    updates: Partial<CustomerPropertyEntity>,
    manager?: EntityManager,
  ): Promise<CustomerPropertyEntity | null> {
    // Use type assertion to avoid TypeScript recursion issues with circular entity references
    await this.getRepo(manager).update({ id }, updates as Record<string, unknown>);
    return this.findById(id, manager);
  }
```

- [ ] **Step 6: Save and sync in one transaction**

In `customer-property.service.ts`:

Add `type TaskRuleSyncResult,` to the `@tejas96/shared/types` import (after `SiteStatus,`).

Replace:

```ts
import {
  CONSUMER_EVENTS,
  PropertyCreatedEvent,
} from '../../notifications/events/consumer-notification.events';
```

with:

```ts
import {
  CONSUMER_EVENTS,
  ProjectCompletedEvent,
  PropertyCreatedEvent,
} from '../../notifications/events/consumer-notification.events';
import { SITE_EVENTS, SiteLoanChangedEvent } from '../../projects/events/site-loan-changed.event';
```

In `update`, replace:

```ts
    const updated = await this.propertyRepository.update(id, updatePayload);

    if (!updated) {
      throw new NotFoundException(`Property with ID '${id}' not found`);
    }

    if (hasUtilityFieldUpdate(updateDto)) {
      assertUtilityDetailsComplete(updated);
    }

    this.logger.log(`Property updated successfully: ${id}`);
    return updated;
  }
```

with:

```ts
    // The loan sync lands with the save or not at all: a site that says "no loan"
    // while its project still waits on loan tasks is the state this exists to end.
    const loanChanged =
      updateDto.wantsLoan !== undefined && updateDto.wantsLoan !== property.wantsLoan;

    const { updated, taskRuleSync } = await this.dataSource.transaction(async (manager) => {
      const saved = await this.propertyRepository.update(id, updatePayload, manager);
      if (!saved) {
        throw new NotFoundException(`Property with ID '${id}' not found`);
      }

      let sync: TaskRuleSyncResult | null = null;
      if (loanChanged) {
        const results: unknown[] = await this.eventEmitter.emitAsync(
          SITE_EVENTS.LOAN_CHANGED,
          new SiteLoanChangedEvent(
            id,
            property.wantsLoan,
            updateDto.wantsLoan === true,
            property.propertyType,
            updatedBy ?? null,
            manager,
          ),
        );
        sync = (results.find(Boolean) as TaskRuleSyncResult | undefined) ?? null;
      }

      return { updated: saved, taskRuleSync: sync };
    });

    // After the commit, so a rolled-back save never tells a customer their
    // project is complete.
    if (taskRuleSync?.completed) {
      this.eventEmitter.emit(
        CONSUMER_EVENTS.PROJECT_COMPLETED,
        new ProjectCompletedEvent(taskRuleSync.projectId, id, taskRuleSync.projectName),
      );
    }

    if (hasUtilityFieldUpdate(updateDto)) {
      assertUtilityDetailsComplete(updated);
    }

    this.logger.log(`Property updated successfully: ${id}`);
    return taskRuleSync ? Object.assign(updated, { taskRuleSync }) : updated;
  }
```

- [ ] **Step 7: Put the result on the response**

In `customer-property-response.dto.ts`:

Add `type TaskRuleSyncResult,` to the `@tejas96/shared/types` import.

After:

```ts
  @ApiPropertyOptional({
    description: 'Whether the property has an active (initiated/applied) loan application',
  })
  @Expose()
  hasActiveLoan?: boolean;
```

add:

```ts

  @ApiPropertyOptional({
    description:
      'Only on a save that changed the loan flag: what that did to the live project’s loan tasks',
  })
  @Expose()
  @Transform(({ obj }) => (obj as { taskRuleSync?: TaskRuleSyncResult }).taskRuleSync)
  taskRuleSync?: TaskRuleSyncResult;
```

- [ ] **Step 8: Typecheck, lint, the existing backend tests**

```bash
npm run typecheck:backend
npx nx lint backend
npx nx test backend
```

Expected: PASS; tests as the baseline. If lint reports import order, run `npx nx lint backend --fix` and check the diff. A customer-property service test that builds the service by hand needs no change: the constructor did not change.

- [ ] **Step 9: Verify on the screen**

Use the project created in Task 4 (residential, no loan, no loan tasks).

1. **Loan on.** Open its site at `http://localhost:3001/properties/<propertyId>/edit` (the site's detail page → Edit). Turn on "Wants loan" and save. In the Browser pane, `read_network_requests` for `customer-properties` shows the PATCH response with `taskRuleSync: { added: 8, removed: 0, kept: 0, … }`.
2. Open the project → Tasks. The 8 loan tasks are there, in backlog. "Loan File Submission to bank" waits on "Loan Document Collection" (task drawer → dependencies).
3. **Loan off.** On the board, drag "Loan Document Collection" to In progress. Turn "Wants loan" off and save. The response says `removed: 7, kept: 1`. The Tasks tab shows only the started loan task.
4. Pair it with the rows (read-only):

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "SELECT s.code, t.status, t.deleted_at IS NOT NULL AS deleted, t.removal_reason FROM project_tasks t JOIN workflow_steps s ON s.id = t.workflow_step_id WHERE s.loan_only AND t.project_id = (SELECT id FROM projects WHERE project_number = '<PROJECT NUMBER>') ORDER BY s.sequence_order, t.created_at;"
```

Expected: 7 rows deleted with `rule_not_applicable`, 1 live `in_progress`.

5. **Person delete.** Turn the loan on again (7 come back as new tasks). Delete "Loan Site Visit" from its row menu on the Tasks tab. Turn the loan off, then on. "Loan Site Visit" does not come back; the other loan tasks do.
6. **Type change.** On the edit page change the property type to Commercial and save. The Tasks tab does not change. Change it back.
7. Leave the project as it is; Task 7 repeats step 1 and 3 for the toast.

- [ ] **Step 10: Commit**

```bash
git add apps/backend/src/modules/projects/events apps/backend/src/modules/projects/services/loan-task-sync.service.ts apps/backend/src/modules/projects/listeners apps/backend/src/modules/projects/services/index.ts apps/backend/src/modules/projects/projects.module.ts apps/backend/src/modules/customers/repositories/customer-property.repository.ts apps/backend/src/modules/customers/services/customer-property.service.ts apps/backend/src/modules/customers/dto/customer-property-response.dto.ts
git commit -m "$(cat <<'EOF'
feat(projects): a site's loan change adds or removes its project's loan tasks

The save and the sync share one transaction, so neither lands alone.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Toast after a property save

**Files:**
- Modify: `apps/web/components/features/properties/hooks/use-properties.ts`

**Interfaces:**
- Consumes: response field `taskRuleSync?: TaskRuleSyncResult` (Task 6); `projectKeys.all()` from `@/components/features/projects/hooks/use-projects`.
- Produces: every caller of `useUpdateProperty` (site edit page, site data modal, temperature toggle) shows the result.

- [ ] **Step 1: Type, message and toast**

In `use-properties.ts`:

Add `TaskRuleSyncResult,` to the `import type { … } from '@tejas96/shared/types';` list.

Below `import { showToast } from '@/components/ui';` add:

```ts
import { projectKeys } from '@/components/features/projects/hooks/use-projects';
```

In `interface Property`, after `hasActiveLoan?: boolean;` add:

```ts
  /** Only on a save that changed the loan flag: what it did to the project's loan tasks. */
  taskRuleSync?: TaskRuleSyncResult;
```

Directly above `export function useUpdateProperty()` add:

```ts
/** "PRJ-0123: 8 loan tasks added" — what a loan change did to the project's tasks. */
function describeTaskRuleSync(result: TaskRuleSyncResult): string {
  const parts: string[] = [];
  if (result.added > 0) {
    parts.push(`${result.added} loan task${result.added === 1 ? '' : 's'} added`);
  }
  if (result.removed > 0) {
    parts.push(`${result.removed} loan task${result.removed === 1 ? '' : 's'} removed`);
  }
  if (result.kept > 0) {
    parts.push(`${result.kept} started task${result.kept === 1 ? '' : 's'} kept`);
  }
  return `${result.projectNumber}: ${parts.join(', ')}`;
}
```

In `useUpdateProperty`, replace:

```ts
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
```

with:

```ts
    onSuccess: (response) => {
      if (response.taskRuleSync) {
        showToast.success(describeTaskRuleSync(response.taskRuleSync));
        void queryClient.invalidateQueries({ queryKey: projectKeys.all() });
      }
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
```

- [ ] **Step 2: Typecheck and lint**

```bash
npm run typecheck:web
npx nx lint web
```

Expected: PASS.

- [ ] **Step 3: Verify on the screen**

On the Task 4 project's site edit page:

1. Turn "Wants loan" on and save. Two toasts: "Site updated successfully" and "PRJ-…: 7 loan tasks added" (the started one from Task 6 is still there; "Loan Site Visit" stays deleted).
2. Turn it off and save: "PRJ-…: 7 loan tasks removed, 1 started task kept".
3. Change only the lead temperature on the site's overview. No task toast appears.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/features/properties/hooks/use-properties.ts
git commit -m "$(cat <<'EOF'
feat(web): show what a loan change did to the project's tasks

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: One-time cleanup

**Files:**
- Create: `apps/backend/src/database/migrations/1857110000000-RemoveLoanTasksWithoutLoan.ts`

**Interfaces:**
- Consumes: `workflow_steps.loan_only`, `project_tasks.removal_reason` (Task 2).
- Produces: live projects without a loan carry no done or unstarted loan task.

- [ ] **Step 1: Count what the cleanup will do (read-only)**

Run this right before the migration. Its numbers are what the migration log must show:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "
WITH t AS (
  SELECT t.project_id, t.status,
         (t.status = 'backlog' AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(COALESCE(t.checklist_override, t.checklist) -> 'items') = 'array'
                   THEN COALESCE(t.checklist_override, t.checklist) -> 'items' ELSE '[]'::jsonb END) i
             WHERE i ->> 'isCompleted' = 'true')) AS not_started
    FROM project_tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN customer_properties cp ON cp.id = p.property_id
    JOIN workflow_steps s ON s.id = t.workflow_step_id
   WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL
     AND p.status IN ('planning', 'active', 'on_hold')
     AND cp.wants_loan = false AND s.loan_only = true)
SELECT count(DISTINCT project_id) FILTER (WHERE status = 'done' OR not_started) AS projects,
       count(*) FILTER (WHERE status = 'done') AS done,
       count(*) FILTER (WHERE not_started) AS not_started,
       count(*) FILTER (WHERE status <> 'done' AND NOT not_started) AS kept
  FROM t;"
```

On the 2026-09-11 data this was `160 | 644 | 634 | 1`. The test projects from Tasks 4–7 can move it slightly; the numbers from this run are the ones to match.

- [ ] **Step 2: Write the migration**

Create `apps/backend/src/database/migrations/1857110000000-RemoveLoanTasksWithoutLoan.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

const REASON = 'rule_cleanup';

const RECOMPUTE_PROGRESS = `
  UPDATE projects p
     SET progress_percentage = x.pct,
         updated_at = CURRENT_TIMESTAMP
    FROM (
          SELECT t.project_id,
                 ROUND(100.0 * COUNT(*) FILTER (WHERE t.status = 'done') / COUNT(*))::int AS pct
            FROM project_tasks t
           WHERE t.deleted_at IS NULL
             AND t.project_id = ANY($1::uuid[])
           GROUP BY t.project_id
         ) x
   WHERE p.id = x.project_id
  RETURNING p.project_number, p.progress_percentage
`;

/**
 * One-time cleanup: loan-only tasks on live projects whose site has no loan.
 *
 * Until task rules existed every project got all 8 loan tasks. On a production
 * restore (2026-09-11), 174 of 174 projects without a loan carried them; on live
 * projects 634 sat unstarted and 644 had been marked done only to clear the list
 * (each loan step ~50% "done" on cash projects against ~80% on loan projects,
 * closed in batches, one with a ticked checklist item).
 *
 * On live projects (planning / active / on_hold) whose property has
 * wants_loan = false, it soft-deletes every task of a `loan_only` step that is
 * done or not started (backlog, no ticked checklist item), marked
 * `removal_reason = 'rule_cleanup'`. A started task stays.
 *
 * Progress is recomputed on the changed projects, but status is NOT changed: a
 * project that would reach 100% is logged for a person to complete in the UI,
 * so no project completes — and no customer is told so — from a migration.
 *
 * REVERTING: down() restores every task carrying REASON and recomputes progress.
 * The dependency links this removed from other tasks are not restored.
 */
export class RemoveLoanTasksWithoutLoan1857110000000 implements MigrationInterface {
  name = 'RemoveLoanTasksWithoutLoan1857110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [removed] = (await queryRunner.query(
      `UPDATE project_tasks t
          SET deleted_at = CURRENT_TIMESTAMP,
              removal_reason = $1,
              updated_at = CURRENT_TIMESTAMP
         FROM projects p, customer_properties cp, workflow_steps s
        WHERE p.id = t.project_id
          AND cp.id = p.property_id
          AND s.id = t.workflow_step_id
          AND t.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND p.status IN ('planning', 'active', 'on_hold')
          AND cp.wants_loan = false
          AND s.loan_only = true
          AND (
                t.status = 'done'
             OR (t.status = 'backlog'
                 AND NOT EXISTS (
                   SELECT 1
                     FROM jsonb_array_elements(
                            CASE WHEN jsonb_typeof(COALESCE(t.checklist_override, t.checklist) -> 'items') = 'array'
                                 THEN COALESCE(t.checklist_override, t.checklist) -> 'items'
                                 ELSE '[]'::jsonb END) AS item
                    WHERE item ->> 'isCompleted' = 'true'))
              )
       RETURNING t.id, t.project_id, t.status`,
      [REASON],
    )) as [Array<{ id: string; project_id: string; status: string }>, number];

    const removedIds = removed.map((row) => row.id);
    const projectIds = [...new Set(removed.map((row) => row.project_id))];
    const doneCount = removed.filter((row) => row.status === 'done').length;

    console.warn(
      `[migration] Removed ${removed.length} loan task(s) from ${projectIds.length} live project(s) without a loan: ${doneCount} done, ${removed.length - doneCount} not started.`,
    );

    const kept: Array<{ n: number }> = await queryRunner.query(`
      SELECT count(*)::int AS n
        FROM project_tasks t
        JOIN projects p ON p.id = t.project_id
        JOIN customer_properties cp ON cp.id = p.property_id
        JOIN workflow_steps s ON s.id = t.workflow_step_id
       WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL
         AND p.status IN ('planning', 'active', 'on_hold')
         AND cp.wants_loan = false AND s.loan_only = true
    `);
    console.warn(`[migration] Kept ${kept[0]?.n ?? 0} started loan task(s).`);

    if (removedIds.length === 0) return;

    await queryRunner.query(
      `UPDATE project_tasks
          SET depends_on_task_ids = ARRAY(
                SELECT dep FROM unnest(depends_on_task_ids) AS dep
                 WHERE dep <> ALL($1::uuid[]))
        WHERE deleted_at IS NULL
          AND depends_on_task_ids && $1::uuid[]`,
      [removedIds],
    );

    const [progress] = (await queryRunner.query(RECOMPUTE_PROGRESS, [projectIds])) as [
      Array<{ project_number: string; progress_percentage: number }>,
      number,
    ];
    const atHundred = progress.filter((row) => row.progress_percentage === 100);
    if (atHundred.length > 0) {
      console.warn(
        `[migration] ${atHundred.length} project(s) now at 100%; complete them in the UI: ${atHundred
          .map((row) => row.project_number)
          .join(', ')}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [restored] = (await queryRunner.query(
      `UPDATE project_tasks
          SET deleted_at = NULL, removal_reason = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE removal_reason = $1
       RETURNING project_id`,
      [REASON],
    )) as [Array<{ project_id: string }>, number];

    const projectIds = [...new Set(restored.map((row) => row.project_id))];
    if (projectIds.length > 0) {
      await queryRunner.query(RECOMPUTE_PROGRESS, [projectIds]);
    }
    console.warn(
      `[migration] Restored ${restored.length} loan task(s) on ${projectIds.length} project(s).`,
    );
  }
}
```

- [ ] **Step 3: Run it**

```bash
cd apps/backend && npm run migration:run && cd ../..
```

Expected log: `Removed <done + not_started> loan task(s) from <projects> live project(s) without a loan: <done> done, <not_started> not started.` and `Kept <kept> started loan task(s).` — the Step 1 numbers. No "now at 100%" line.

- [ ] **Step 4: Recount**

Run the Step 1 query again. Expected: `projects = 0`, `done = 0`, `not_started = 0`, `kept` unchanged.

- [ ] **Step 5: Verify on the screen**

1. List three changed projects (read-only):

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "SELECT p.project_number, count(*) AS removed FROM project_tasks t JOIN projects p ON p.id = t.project_id WHERE t.removal_reason = 'rule_cleanup' GROUP BY p.project_number ORDER BY removed DESC LIMIT 3;"
```

2. Open each in `http://localhost:3001` → Tasks. No loan task is listed. The progress figure on the header matches done ÷ total of the tasks shown.
3. Open the site of one of them: "Wants loan" is off.

- [ ] **Step 6: Check the undo**

```bash
cd apps/backend && npm run migration:revert && cd ../..
```

Expected: `Restored <same total> loan task(s) on <same projects> project(s).` Run the Step 1 query: the original numbers are back. Then run it forward again:

```bash
cd apps/backend && npm run migration:run && cd ../..
```

Expected: the same log as Step 3.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/database/migrations/1857110000000-RemoveLoanTasksWithoutLoan.ts
git commit -m "$(cat <<'EOF'
feat(projects): remove loan tasks from live projects without a loan

One-time cleanup of the done-to-clear and never-started loan tasks every
project was given before task rules existed. Started tasks stay; the
migration reverts by removal_reason.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Final walk-through and regression

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything above.
- Produces: evidence that the spec's Verification list holds.

- [ ] **Step 1: Walk the spec's Verification list on the finished build**

Walk `docs/superpowers/specs/2026-09-11-conditional-workflow-tasks-design.md` → Verification, items 1–8, in one pass, and write down what each screen showed:

1. Admin rule — as Task 3 Step 8.
2. Wizard, loan — as Task 5 Step 4, items 1–2, then finish the wizard and confirm the project has no loan task (Task 4 Step 7 items 3–4).
3. Wizard, types — as Task 5 Step 4, item 3, plus a commercial site that does get the step.
4. Loan on — as Task 6 Step 9 items 1–2, with the toast (Task 7).
5. Loan off — as Task 6 Step 9 items 3–4, with the toast.
6. Person delete — as Task 6 Step 9 item 5.
7. Type change — as Task 6 Step 9 item 6.
8. Rule edit — give a step a type, confirm an existing project's tasks did not change, create a new project and confirm it follows the rule; then remove the type.

Item 9 (cleanup) was checked in Task 8.

- [ ] **Step 2: Full regression**

```bash
npm run typecheck:libs && npm run typecheck:backend && npm run typecheck:web
npx nx lint shared && npx nx lint backend && npx nx lint web
npx nx test shared && npx nx test backend && npx nx test web
npx knip
```

Expected: typecheck and lint PASS; tests match the baseline; knip reports nothing new from these files (ignore the 21 duplicated root dependencies it always lists).

- [ ] **Step 3: Tidy the test data**

Delete or cancel the test projects created in Tasks 4–7 through the UI if the owner does not want them. Remove any temporary rule set on DES-001.

- [ ] **Step 4: Hand over**

Report to the owner: the commits, what each screen showed, the cleanup numbers from the log, and that Part 2 (`docs/superpowers/plans/2026-09-11-whatsapp-step-alerts.md`) can start once this PR is merged.
