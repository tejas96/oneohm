# Routine Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completed projects get a checkup service ticket every 3 months for 5 years, with a fixed inspection checklist on web and mobile, and a customer WhatsApp when the checkup opens and when it is done.

**Architecture:** Four new columns on `service_tickets` (`kind`, `visit_number`, `checklist`, `customer_whatsapp`). One hourly `@Cron` job in the service-tickets module makes the next visit 14 days before it is due and sends the two WhatsApp templates, copying the claim / record / unstick pattern of `TaskWhatsappService`. The checklist definition, the schedule maths and the "is it complete" rule live once in `@tejas96/shared` and are read by backend, web and mobile.

**Tech Stack:** NestJS + TypeORM (Postgres, raw SQL through `DataSource`), `@nestjs/schedule`, `@nestjs/event-emitter`, Next.js web (MUI, TanStack Query), React Native employee app (`oneohm-mobile`, TanStack Query), Nx monorepo, `@tejas96/shared` published to GitHub Packages.

**Spec:** `docs/superpowers/specs/2026-09-17-routine-maintenance-design.md`

## Global Constraints

- **Branches, no worktrees.** Work on `feat/routine-maintenance` in `/Volumes/works-space/oneohm/oneohm` and in `/Volumes/works-space/oneohm/oneohm-mobile`. Both are already cut from an up-to-date `main`. Do not create a worktree.
- **Parallel shell trap.** Never run commands for both repos in parallel Bash calls. Use absolute paths or `git -C <repo>`.
- **No new unit test files** (owner rule). Existing tests must keep passing. Verify by walking the real screens; pair every database check with the screen that shows it.
- **Local safety.** The local DB is a production restore with real phones. Sends run only when `NODE_ENV === 'production'` or `TASK_WHATSAPP_ALLOW_LOCAL === 'true'`. Only set that flag while testing on a customer whose phone is the owner's; remove it afterwards.
- **Never `migration:revert`** on the shared local DB as a test.
- Visits: 20, every 3 calendar months from `projects.end_date`. Month end clamps to the last day. Ticket made when due within **14** days. "Today" is the `Asia/Kolkata` date.
- Ticket values: title `Routine checkup {n} of 20`, description `Routine solar checkup, visit {n} of 20. Fill the inspection checklist before resolving.`, priority `medium`, status `open`, no assignee, `created_by` NULL.
- WhatsApp templates: `maintenance_visit_opened` (`customer_name`, `project_name`, `due_date`) and `maintenance_visit_closed` (`customer_name`, `project_name`, `visit_date`). Language `en`, UTILITY, `parameter_format: NAMED`.
- Sends need `MAINTENANCE_WHATSAPP_SINCE` (ISO date-time). Unset → no sends. Only events at or after it send.
- **Quiet hours:** sends happen only from 09:00 to 19:59 India time. Ticket creation runs every hour. (A send at 2 am is worse than a send at 9 am; the 48-hour age limit covers the wait.)
- Record statuses, exactly: `sending`, `sent`, `delivered`, `read`, `failed`, `skipped`. Reasons, exactly: `Project cancelled`, `No valid phone`, `Send interrupted`, `More than 48 hours old`, `Ticket not found`.
- **One fact, one home.** The title already says "Routine checkup 5 of 20", so there is no separate Visit column on web and no "5/20" label on mobile. Mobile shows a plain `Checkup` badge; web tells the kinds apart by tab.
- Screen copy, exactly: web tabs `Issues` / `Routine Maintenance`; card title `Inspection checklist`; buttons `OK`, `Issue`, `All OK`; progress `{done} of {total} done`; readings `Total generation (kWh)`, `Net meter reading`; mobile filter group `Type`, chips `Issues`, `Checkups`.
- Error copy, exactly: `Finish the inspection checklist first. Missing: {labels joined by ", "}.` and `Checkup tickets cannot be deleted.` and `Only checkup tickets have an inspection checklist.`
- Shared release order: `oneohm` publishes `@tejas96/shared` first; mobile bumps its range only after the version is really published (`npm view '@tejas96/shared' dist-tags`).
- Migration timestamp: `1857180000000`.
- Every commit ends with the trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## Before you start (one time)

- [ ] **Confirm branches.**

```bash
git -C /Volumes/works-space/oneohm/oneohm branch --show-current
git -C /Volumes/works-space/oneohm/oneohm-mobile branch --show-current
```

Expected: `feat/routine-maintenance` twice.

- [ ] **Servers.** Backend on 8085, web on 3001 (`lsof -nP -iTCP -sTCP:LISTEN | grep -E '3001|8085'`). Preview configs are in `/Volumes/works-space/oneohm/.claude/launch.json`.

- [ ] **Baseline.** Run and note any failure that exists before your change:

```bash
cd /Volumes/works-space/oneohm/oneohm
npm run typecheck:libs && npm run typecheck:backend && npm run typecheck:web
npx nx test shared && npx nx test backend
```

## File structure

| File | Change | Responsibility |
|---|---|---|
| `libs/shared/src/types/enums/service-ticket.enum.ts` | Modify | `ServiceTicketKind` |
| `libs/shared/src/types/interfaces/service-ticket-maintenance.interface.ts` | Create | Checklist and WhatsApp record types |
| `libs/shared/src/types/interfaces/index.ts` | Modify | Export it |
| `libs/shared/src/constants/maintenance.ts` | Create | Visit count, interval, lead days, checklist groups and readings |
| `libs/shared/src/constants/index.ts` | Modify | Export it |
| `libs/shared/src/utils/maintenance.ts` | Create | Schedule maths, India date, completeness |
| `libs/shared/src/utils/index.ts` | Modify | Export it |
| `libs/shared/package.json` | Modify | Version `1.13.0` |
| `apps/backend/src/database/migrations/1857180000000-AddRoutineMaintenanceToServiceTickets.ts` | Create | Columns, checks, indexes |
| `apps/backend/src/modules/service-tickets/entities/service-ticket.entity.ts` | Modify | Map the 4 columns |
| `apps/backend/src/modules/service-tickets/dto/service-ticket-query.dto.ts` | Modify | `kind` filter; `ServiceTicketStatsQueryDto` |
| `apps/backend/src/modules/service-tickets/dto/update-maintenance-checklist.dto.ts` | Create | Checklist PATCH body |
| `apps/backend/src/modules/service-tickets/dto/service-ticket-response.dto.ts` | Modify | `kind`, `visitNumber`, `checklist`, `customerWhatsapp` |
| `apps/backend/src/modules/service-tickets/dto/index.ts` | Modify | Export new DTO |
| `apps/backend/src/modules/service-tickets/repositories/service-ticket.repository.ts` | Modify | `kind` in list and stats |
| `apps/backend/src/modules/service-tickets/services/service-ticket.service.ts` | Modify | Checklist save, resolve/close guard, delete guard, `kind` on create |
| `apps/backend/src/modules/service-tickets/services/service-ticket.mapper.ts` | Modify | Map new fields |
| `apps/backend/src/modules/service-tickets/controllers/service-ticket.controller.ts` | Modify | `PATCH :id/checklist`, stats query |
| `apps/backend/src/modules/service-tickets/constants/maintenance.constants.ts` | Create | Cron, templates, batch, quiet hours |
| `apps/backend/src/modules/service-tickets/services/maintenance-ticket.service.ts` | Create | The hourly job |
| `apps/backend/src/modules/service-tickets/service-tickets.module.ts` | Modify | Register job, import `IntegrationsModule` |
| `apps/backend/src/modules/notifications/listeners/whatsapp-status.listener.ts` | Modify | Also update ticket records |
| `apps/web/components/features/service-tickets/hooks/use-service-tickets.ts` | Modify | Types, `kind` param, stats by kind, `saveChecklist` |
| `apps/web/components/features/service-tickets/constants.ts` | Modify | `kind` filter key |
| `apps/web/components/features/service-tickets/components/service-tickets-page.tsx` | Modify | Tabs |
| `apps/web/components/features/service-tickets/components/service-ticket-checklist-card.tsx` | Create | Checklist card |
| `apps/web/components/features/service-tickets/components/service-ticket-detail-page.tsx` | Modify | Show the card |
| `apps/web/components/features/tasks/components/task-drawer-whatsapp.tsx` | Modify | Export `describeCustomerWhatsapp` |
| `oneohm-mobile/package.json`, `package-lock.json` | Modify | `@tejas96/shared` `^1.13.0` |
| `oneohm-mobile/src/features/serviceTickets/list/tickets.api.ts` | Modify | `kind`, `visitNumber` on the list type |
| `oneohm-mobile/src/features/serviceTickets/list/ticketsModel.ts` | Modify | `Type` filter group |
| `oneohm-mobile/src/features/serviceTickets/list/TicketsFilterSheet.tsx` | Modify | Render the group |
| `oneohm-mobile/src/features/serviceTickets/list/TicketRow.tsx` | Modify | `Checkup` badge |
| `oneohm-mobile/src/core/api/endpoints.ts` | Modify | `checklist(id)` |
| `oneohm-mobile/src/features/serviceTickets/detail/ticketDetail.api.ts` | Modify | Detail type, `useSaveChecklist` |
| `oneohm-mobile/src/features/serviceTickets/detail/ChecklistCard.tsx` | Create | Checklist card |
| `oneohm-mobile/src/features/serviceTickets/detail/ServiceTicketDetailScreen.tsx` | Modify | Show the card |

---

### Task 1: Shared types, checklist and schedule maths

**Files:**
- Modify: `libs/shared/src/types/enums/service-ticket.enum.ts`
- Create: `libs/shared/src/types/interfaces/service-ticket-maintenance.interface.ts`
- Modify: `libs/shared/src/types/interfaces/index.ts`
- Create: `libs/shared/src/constants/maintenance.ts`
- Modify: `libs/shared/src/constants/index.ts`
- Create: `libs/shared/src/utils/maintenance.ts`
- Modify: `libs/shared/src/utils/index.ts`
- Modify: `libs/shared/package.json`

**Interfaces:**
- Produces: `ServiceTicketKind`, `MaintenanceChecklist`, `MaintenanceChecklistAnswer`, `MaintenanceItemResult`, `MaintenanceWhatsappEvent`, `TicketWhatsappRecord`, `TicketCustomerWhatsapp`, `TicketCustomerWhatsappStatus` (types); `MAINTENANCE_VISIT_COUNT`, `MAINTENANCE_VISIT_INTERVAL_MONTHS`, `MAINTENANCE_LEAD_DAYS`, `MAINTENANCE_CHECKLIST`, `MAINTENANCE_READINGS`, `MAINTENANCE_CHECKLIST_ITEM_KEYS`, `MAINTENANCE_CHECKLIST_TOTAL` (constants); `maintenanceVisitDueDate(endDate: string, visit: number): string`, `nextMaintenanceVisit(endDate: string, today: string): { visitNumber: number; dueDate: string } | null`, `addDaysToIsoDate(date: string, days: number): string`, `indiaToday(now?: Date): string`, `indiaHour(now?: Date): number`, `emptyMaintenanceChecklist(): MaintenanceChecklist`, `missingMaintenanceChecklist(list: MaintenanceChecklist | null): string[]`, `isMaintenanceChecklistComplete(list: MaintenanceChecklist | null): boolean`, `maintenanceChecklistDoneCount(list: MaintenanceChecklist | null): number` (utils).

- [ ] **Step 1: Add the kind enum.** Append to `libs/shared/src/types/enums/service-ticket.enum.ts`:

```ts
/**
 * `issue` is a complaint someone raised. `maintenance` is a routine checkup the
 * hourly job made after the project was completed. Only a maintenance ticket
 * carries a visit number and an inspection checklist.
 */
export enum ServiceTicketKind {
  ISSUE = 'issue',
  MAINTENANCE = 'maintenance',
}
```

- [ ] **Step 2: Create the interfaces file** `libs/shared/src/types/interfaces/service-ticket-maintenance.interface.ts`:

```ts
import type { CustomerWhatsappState, CustomerWhatsappStatus } from './task.interface';

export type MaintenanceItemResult = 'ok' | 'issue';

export interface MaintenanceChecklistAnswer {
  result: MaintenanceItemResult;
  /** Only meaningful when result is `issue`. */
  note?: string | null;
}

/**
 * Stored on `service_tickets.checklist`. An item key missing from `items` is
 * not answered yet. Keys come from `MAINTENANCE_CHECKLIST` and never change
 * once shipped.
 */
export interface MaintenanceChecklist {
  items: Record<string, MaintenanceChecklistAnswer>;
  readings: { generationKwh: number | null; netMeterReading: number | null };
}

export type MaintenanceWhatsappEvent = 'opened' | 'closed';

/** One send attempt, the same shape as a task's record minus the task fields. */
export interface TicketWhatsappRecord {
  status: Exclude<CustomerWhatsappState, 'waiting'>;
  updatedAt: string;
  phone?: string | null;
  reason?: string | null;
  providerMessageId?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
}

/** Stored on `service_tickets.customer_whatsapp`. */
export type TicketCustomerWhatsapp = Partial<Record<MaintenanceWhatsappEvent, TicketWhatsappRecord>>;

/** What the API returns for the detail screens. */
export type TicketCustomerWhatsappStatus = Record<
  MaintenanceWhatsappEvent,
  CustomerWhatsappStatus | null
>;
```

Add to `libs/shared/src/types/interfaces/index.ts`:

```ts
export * from './service-ticket-maintenance.interface';
```

- [ ] **Step 3: Create** `libs/shared/src/constants/maintenance.ts`:

```ts
/**
 * Routine maintenance: one checkup every 3 months for 5 years after a project
 * is completed. The job makes each ticket 14 days before it is due.
 */
export const MAINTENANCE_VISIT_COUNT = 20;
export const MAINTENANCE_VISIT_INTERVAL_MONTHS = 3;
export const MAINTENANCE_LEAD_DAYS = 14;

export interface MaintenanceChecklistItemDef {
  key: string;
  label: string;
}

export interface MaintenanceChecklistGroupDef {
  key: string;
  title: string;
  items: readonly MaintenanceChecklistItemDef[];
}

/**
 * The fixed inspection list. Keys are stored in the database: never rename or
 * reuse one. Labels can change freely.
 */
export const MAINTENANCE_CHECKLIST: readonly MaintenanceChecklistGroupDef[] = [
  {
    key: 'panels',
    title: 'Panels',
    items: [
      { key: 'panels.cleaned', label: 'Panels cleaned' },
      { key: 'panels.no_cracks', label: 'No cracked or broken glass' },
      { key: 'panels.no_hotspots', label: 'No burn marks, brown spots, or hot spots' },
      { key: 'panels.no_new_shade', label: 'No new shade (trees, new buildings, water tank)' },
      { key: 'panels.no_birds', label: 'No bird nests or droppings under panels' },
    ],
  },
  {
    key: 'structure',
    title: 'Structure',
    items: [
      { key: 'structure.no_rust', label: 'No rust on mounting structure' },
      { key: 'structure.bolts_tight', label: 'Bolts and clamps tight' },
      { key: 'structure.no_roof_leak', label: 'No roof leak near the structure legs' },
    ],
  },
  {
    key: 'dc',
    title: 'DC side',
    items: [
      { key: 'dc.connectors', label: 'MC4 connectors: no heat or burn marks' },
      { key: 'dc.cables', label: 'DC cables: no cuts, no rat damage, tied properly' },
      { key: 'dc.dcdb', label: 'DCDB fuses and surge protector OK' },
    ],
  },
  {
    key: 'inverter',
    title: 'Inverter',
    items: [
      { key: 'inverter.no_errors', label: 'No error code on display or app' },
      { key: 'inverter.vents_clean', label: 'Vents and fan clean' },
      { key: 'inverter.monitoring_online', label: 'Monitoring app is online' },
    ],
  },
  {
    key: 'ac',
    title: 'AC side and safety',
    items: [
      { key: 'ac.acdb', label: 'ACDB MCB and surge protector OK' },
      { key: 'ac.earthing', label: 'Earthing connections tight, no rust' },
      { key: 'ac.lightning_arrester', label: 'Lightning arrester connected' },
      { key: 'ac.warning_stickers', label: 'Warning stickers present' },
    ],
  },
] as const;

export const MAINTENANCE_READINGS = [
  { key: 'generationKwh', label: 'Total generation (kWh)' },
  { key: 'netMeterReading', label: 'Net meter reading' },
] as const;

export const MAINTENANCE_CHECKLIST_ITEM_KEYS: readonly string[] = MAINTENANCE_CHECKLIST.flatMap(
  (group) => group.items.map((item) => item.key),
);

/** 18 items + 2 readings. */
export const MAINTENANCE_CHECKLIST_TOTAL =
  MAINTENANCE_CHECKLIST_ITEM_KEYS.length + MAINTENANCE_READINGS.length;
```

Add to `libs/shared/src/constants/index.ts`:

```ts
export * from './maintenance';
```

- [ ] **Step 4: Create** `libs/shared/src/utils/maintenance.ts`:

```ts
import {
  MAINTENANCE_CHECKLIST,
  MAINTENANCE_READINGS,
  MAINTENANCE_VISIT_COUNT,
  MAINTENANCE_VISIT_INTERVAL_MONTHS,
} from '../constants/maintenance';
import type { MaintenanceChecklist } from '../types/interfaces/service-ticket-maintenance.interface';

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * `YYYY-MM-DD` plus 3×visit calendar months. A day the target month does not
 * have becomes its last day: 2026-11-30 visit 1 is 2027-02-28.
 */
export function maintenanceVisitDueDate(endDate: string, visit: number): string {
  const [year, month, day] = endDate.slice(0, 10).split('-').map(Number);
  const monthIndex = month - 1 + visit * MAINTENANCE_VISIT_INTERVAL_MONTHS;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = monthIndex % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return `${targetYear}-${pad(targetMonth + 1)}-${pad(Math.min(day, lastDay))}`;
}

/**
 * The first visit due today or later, or null after visit 20. A project
 * completed 13 months ago gets visit 5 — earlier visits are never made.
 * Both arguments are `YYYY-MM-DD`, which compare correctly as strings.
 */
export function nextMaintenanceVisit(
  endDate: string,
  today: string,
): { visitNumber: number; dueDate: string } | null {
  for (let visit = 1; visit <= MAINTENANCE_VISIT_COUNT; visit += 1) {
    const dueDate = maintenanceVisitDueDate(endDate, visit);
    if (dueDate >= today) return { visitNumber: visit, dueDate };
  }
  return null;
}

export function addDaysToIsoDate(date: string, days: number): string {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Today's date in India as `YYYY-MM-DD`. The server runs on UTC. */
export function indiaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

/** The hour (0–23) in India right now. */
export function indiaHour(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  );
}

export function emptyMaintenanceChecklist(): MaintenanceChecklist {
  return { items: {}, readings: { generationKwh: null, netMeterReading: null } };
}

/** Labels of everything not answered yet, in screen order. */
export function missingMaintenanceChecklist(list: MaintenanceChecklist | null): string[] {
  const missing: string[] = [];
  for (const group of MAINTENANCE_CHECKLIST) {
    for (const item of group.items) {
      if (!list?.items[item.key]?.result) missing.push(item.label);
    }
  }
  for (const reading of MAINTENANCE_READINGS) {
    const value = list?.readings[reading.key];
    if (typeof value !== 'number' || !Number.isFinite(value)) missing.push(reading.label);
  }
  return missing;
}

export function isMaintenanceChecklistComplete(list: MaintenanceChecklist | null): boolean {
  return missingMaintenanceChecklist(list).length === 0;
}

export function maintenanceChecklistDoneCount(list: MaintenanceChecklist | null): number {
  const total =
    MAINTENANCE_CHECKLIST.reduce((sum, group) => sum + group.items.length, 0) +
    MAINTENANCE_READINGS.length;
  return total - missingMaintenanceChecklist(list).length;
}
```

Add to `libs/shared/src/utils/index.ts`:

```ts
export * from './maintenance';
```

- [ ] **Step 5: Bump the version.** In `libs/shared/package.json` change `"version": "1.12.4"` to `"version": "1.13.0"`.

- [ ] **Step 6: Check the maths by hand** (a throwaway command, not a test file):

```bash
cd /Volumes/works-space/oneohm/oneohm
npx tsx -e "
import { maintenanceVisitDueDate as d, nextMaintenanceVisit as n, addDaysToIsoDate as a } from './libs/shared/src/utils/maintenance';
console.log(d('2026-11-30', 1), d('2027-11-30', 1), d('2026-01-15', 20));
console.log(n('2025-08-10', '2026-09-17'), n('2020-01-01', '2026-09-17'), a('2026-12-25', 14));
"
```

Expected: `2027-02-28 2028-02-29 2031-01-15`, then `{ visitNumber: 5, dueDate: '2026-11-10' } null 2027-01-08`.

- [ ] **Step 7: Typecheck and test.**

```bash
npm run typecheck:libs && npx nx test shared
```

Expected: both pass.

- [ ] **Step 8: Commit.**

```bash
git add libs/shared
git commit -m "feat(shared): routine maintenance checklist, schedule and types

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Migration and entity

**Files:**
- Create: `apps/backend/src/database/migrations/1857180000000-AddRoutineMaintenanceToServiceTickets.ts`
- Modify: `apps/backend/src/modules/service-tickets/entities/service-ticket.entity.ts`

**Interfaces:**
- Consumes: `ServiceTicketKind`, `MaintenanceChecklist`, `TicketCustomerWhatsapp` from Task 1.
- Produces: entity fields `kind: ServiceTicketKind`, `visitNumber: number | null`, `checklist: MaintenanceChecklist | null`, `customerWhatsapp: TicketCustomerWhatsapp | null`; unique index `uq_service_tickets_maintenance_visit`.

- [ ] **Step 1: Create the migration.**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Routine maintenance checkups live on service_tickets.
 *
 * `kind` tells a raised issue from a checkup the hourly job made. Every
 * existing row becomes `issue`. `visit_number` (1–20) is set exactly when the
 * ticket is a checkup, and the unique partial index makes it impossible to
 * create the same visit twice, even with two instances running the job.
 *
 * `customer_whatsapp` holds `{ opened?, closed? }`, one send record per event,
 * the same shape as `project_tasks.customer_whatsapp`.
 */
export class AddRoutineMaintenanceToServiceTickets1857180000000 implements MigrationInterface {
  name = 'AddRoutineMaintenanceToServiceTickets1857180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS kind varchar(20) NOT NULL DEFAULT 'issue'`,
    );
    await queryRunner.query(
      `ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS visit_number smallint NULL`,
    );
    await queryRunner.query(`ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS checklist jsonb NULL`);
    await queryRunner.query(
      `ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS customer_whatsapp jsonb NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE service_tickets
        ADD CONSTRAINT chk_service_tickets_kind CHECK (kind IN ('issue', 'maintenance'))
    `);
    await queryRunner.query(`
      ALTER TABLE service_tickets
        ADD CONSTRAINT chk_service_tickets_visit_number CHECK (
          (kind = 'maintenance') = (visit_number IS NOT NULL)
          AND (visit_number IS NULL OR visit_number BETWEEN 1 AND 20)
        )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_service_tickets_maintenance_visit
        ON service_tickets (project_id, visit_number)
        WHERE kind = 'maintenance'
    `);

    // The WhatsApp webhook finds a ticket by Meta's message id, per event.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_service_tickets_whatsapp_opened_message
        ON service_tickets ((customer_whatsapp -> 'opened' ->> 'providerMessageId'))
        WHERE customer_whatsapp IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_service_tickets_whatsapp_closed_message
        ON service_tickets ((customer_whatsapp -> 'closed' ->> 'providerMessageId'))
        WHERE customer_whatsapp IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_service_tickets_whatsapp_closed_message`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_service_tickets_whatsapp_opened_message`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_service_tickets_maintenance_visit`);
    await queryRunner.query(
      `ALTER TABLE service_tickets DROP CONSTRAINT IF EXISTS chk_service_tickets_visit_number`,
    );
    await queryRunner.query(`ALTER TABLE service_tickets DROP CONSTRAINT IF EXISTS chk_service_tickets_kind`);
    await queryRunner.query(`ALTER TABLE service_tickets DROP COLUMN IF EXISTS customer_whatsapp`);
    await queryRunner.query(`ALTER TABLE service_tickets DROP COLUMN IF EXISTS checklist`);
    await queryRunner.query(`ALTER TABLE service_tickets DROP COLUMN IF EXISTS visit_number`);
    await queryRunner.query(`ALTER TABLE service_tickets DROP COLUMN IF EXISTS kind`);
  }
}
```

- [ ] **Step 2: Map the columns.** In `service-ticket.entity.ts`, extend the shared import:

```ts
import {
  ServiceTicketKind,
  ServiceTicketPriority,
  ServiceTicketStatus,
  type MaintenanceChecklist,
  type ServiceTicketPhoto,
  type TicketCustomerWhatsapp,
} from '@tejas96/shared/types';
```

Add after the `status` column:

```ts
  /** `maintenance` tickets are made by MaintenanceTicketService, never by hand. */
  @Column({ type: 'varchar', length: 20, default: ServiceTicketKind.ISSUE })
  kind: ServiceTicketKind;

  /** 1–20 on a checkup, NULL on an issue. Unique per project. */
  @Column({ name: 'visit_number', type: 'smallint', nullable: true })
  visitNumber: number | null;

  /** Inspection answers and readings. Checkups only. */
  @Column({ type: 'jsonb', nullable: true })
  checklist: MaintenanceChecklist | null;

  /**
   * `{ opened?, closed? }` send records. Written only by the job and the
   * WhatsApp status listener, with raw SQL, so `updated_at` never moves.
   */
  @Column({ name: 'customer_whatsapp', type: 'jsonb', nullable: true })
  customerWhatsapp: TicketCustomerWhatsapp | null;
```

- [ ] **Step 3: Run the migration** on the local DB.

```bash
cd /Volumes/works-space/oneohm/oneohm/apps/backend && npm run migration:run
```

Expected: `AddRoutineMaintenanceToServiceTickets1857180000000 has been executed successfully.`

- [ ] **Step 4: Check the columns.**

```bash
psql "$DATABASE_URL" -c "SELECT kind, count(*) FROM service_tickets GROUP BY kind"
```

(Read `DATABASE_URL` from `apps/backend/.env` if it is not exported.) Expected: one row, `issue` with the existing count.

- [ ] **Step 5: Typecheck and commit.**

```bash
cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:backend
git add apps/backend/src/database/migrations/1857180000000-AddRoutineMaintenanceToServiceTickets.ts apps/backend/src/modules/service-tickets/entities/service-ticket.entity.ts
git commit -m "feat(service-tickets): add maintenance columns

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Service ticket API — kind filter, checklist, guards

**Files:**
- Modify: `apps/backend/src/modules/service-tickets/dto/service-ticket-query.dto.ts`
- Create: `apps/backend/src/modules/service-tickets/dto/update-maintenance-checklist.dto.ts`
- Modify: `apps/backend/src/modules/service-tickets/dto/index.ts`
- Modify: `apps/backend/src/modules/service-tickets/dto/service-ticket-response.dto.ts`
- Modify: `apps/backend/src/modules/service-tickets/repositories/service-ticket.repository.ts`
- Modify: `apps/backend/src/modules/service-tickets/services/service-ticket.service.ts`
- Modify: `apps/backend/src/modules/service-tickets/services/service-ticket.mapper.ts`
- Modify: `apps/backend/src/modules/service-tickets/controllers/service-ticket.controller.ts`

**Interfaces:**
- Consumes: Task 1 constants/utils; Task 2 entity fields.
- Produces: `GET /service-tickets?kind=`, `GET /service-tickets/stats?kind=`, `PATCH /service-tickets/:id/checklist` (body `UpdateMaintenanceChecklistDto`, returns `ServiceTicketResponseDto`). List items carry `kind: ServiceTicketKind` and `visitNumber: number | null`. Detail carries `checklist: MaintenanceChecklist | null` and `customerWhatsapp: TicketCustomerWhatsappStatus | null`.

- [ ] **Step 1: `kind` on the list query.** In `service-ticket-query.dto.ts` import `ServiceTicketKind` from `@tejas96/shared/types` and add as the first property of `ServiceTicketQueryDto`:

```ts
  @ApiPropertyOptional({ enum: ServiceTicketKind })
  @IsOptional()
  @IsEnum(ServiceTicketKind)
  kind?: ServiceTicketKind;
```

Append to the same file:

```ts
export class ServiceTicketStatsQueryDto {
  @ApiPropertyOptional({ enum: ServiceTicketKind })
  @IsOptional()
  @IsEnum(ServiceTicketKind)
  kind?: ServiceTicketKind;
}
```

- [ ] **Step 2: Create** `dto/update-maintenance-checklist.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { type MaintenanceChecklistAnswer } from '@tejas96/shared/types';
import { IsObject, IsOptional } from 'class-validator';

/**
 * A partial checklist. `items` merges by key; each reading present replaces the
 * stored one (send `null` to clear it). The service checks keys and values,
 * because class-validator cannot describe a keyed map.
 */
export class UpdateMaintenanceChecklistDto {
  @ApiPropertyOptional({
    example: { 'panels.cleaned': { result: 'ok' }, 'dc.cables': { result: 'issue', note: 'Rat bite' } },
  })
  @IsOptional()
  @IsObject()
  items?: Record<string, MaintenanceChecklistAnswer>;

  @ApiPropertyOptional({ example: { generationKwh: 4210.5, netMeterReading: 1033 } })
  @IsOptional()
  @IsObject()
  readings?: { generationKwh?: number | null; netMeterReading?: number | null };
}
```

Add to `dto/index.ts`:

```ts
export * from './update-maintenance-checklist.dto';
```

- [ ] **Step 3: Response DTO.** In `service-ticket-response.dto.ts` extend the import with `ServiceTicketKind, type MaintenanceChecklist, type TicketCustomerWhatsappStatus`. In `ServiceTicketListItemDto`, after `priority`:

```ts
  @ApiProperty({ enum: ServiceTicketKind })
  kind: ServiceTicketKind;

  @ApiPropertyOptional({ example: 5, nullable: true, description: 'Checkups only, 1–20' })
  visitNumber: number | null;
```

In `ServiceTicketResponseDto`, after `closedAt`:

```ts
  @ApiPropertyOptional({ type: 'object', nullable: true, description: 'Checkups only' })
  checklist: MaintenanceChecklist | null;

  @ApiPropertyOptional({ type: 'object', nullable: true, description: 'Checkups only' })
  customerWhatsapp: TicketCustomerWhatsappStatus | null;
```

- [ ] **Step 4: Mapper.** In `service-ticket.mapper.ts` add imports:

```ts
import {
  ServiceTicketKind,
  type CustomerWhatsappStatus,
  type TicketCustomerWhatsappStatus,
  type TicketWhatsappRecord,
} from '@tejas96/shared/types';
```

Add helpers above `toListItemDto`:

```ts
function toWhatsappStatus(record?: TicketWhatsappRecord): CustomerWhatsappStatus | null {
  if (!record) return null;
  const at =
    record.status === 'read'
      ? (record.readAt ?? null)
      : record.status === 'delivered'
        ? (record.deliveredAt ?? null)
        : record.status === 'sent'
          ? (record.sentAt ?? null)
          : null;
  return { state: record.status, at, reason: record.reason ?? null };
}

function customerWhatsappDto(ticket: ServiceTicketEntity): TicketCustomerWhatsappStatus | null {
  if (ticket.kind !== ServiceTicketKind.MAINTENANCE) return null;
  return {
    opened: toWhatsappStatus(ticket.customerWhatsapp?.opened),
    closed: toWhatsappStatus(ticket.customerWhatsapp?.closed),
  };
}
```

In `toListItemDto` add after `priority`:

```ts
    kind: ticket.kind,
    visitNumber: ticket.visitNumber ?? null,
```

In `toResponseDto` add after `closedAt`:

```ts
    checklist: ticket.checklist ?? null,
    customerWhatsapp: customerWhatsappDto(ticket),
```

- [ ] **Step 5: Repository.** In `findPaginated`, before the `status` filter:

```ts
    if (query.kind) {
      qb.andWhere('ticket.kind = :kind', { kind: query.kind });
    }
```

Change `getStats` to take a kind and apply it to all four queries. Replace its signature and add one helper line to each query builder:

```ts
  async getStats(kind?: ServiceTicketKind): Promise<{
```

and after every `.where('ticket.deletedAt IS NULL')` in `getStats` add:

```ts
      .andWhere(kind ? 'ticket.kind = :kind' : '1=1', { kind })
```

Add `ServiceTicketKind` to the `@tejas96/shared/types` import.

- [ ] **Step 6: Service.** In `service-ticket.service.ts`:

Imports:

```ts
import { COMPANY, MAINTENANCE_CHECKLIST_ITEM_KEYS } from '@tejas96/shared/constants';
import {
  ServiceTicketKind,
  ServiceTicketStatus,
  type MaintenanceChecklist,
} from '@tejas96/shared/types';
import { emptyMaintenanceChecklist, missingMaintenanceChecklist } from '@tejas96/shared/utils';
```

and add `type UpdateMaintenanceChecklistDto` to the `../dto` import.

In `create`, add to `manager.create(ServiceTicketEntity, { ... })`:

```ts
        kind: ServiceTicketKind.ISSUE,
```

In `updateStatus`, directly after `const note = dto.note?.trim() || null;`:

```ts
    if (
      ticket.kind === ServiceTicketKind.MAINTENANCE &&
      (dto.status === ServiceTicketStatus.RESOLVED || dto.status === ServiceTicketStatus.CLOSED)
    ) {
      const missing = missingMaintenanceChecklist(ticket.checklist);
      if (missing.length > 0) {
        throw new BadRequestException(
          `Finish the inspection checklist first. Missing: ${missing.join(', ')}.`,
        );
      }
    }
```

Change `getStats`:

```ts
  async getStats(kind?: ServiceTicketKind): Promise<ServiceTicketStatsDto> {
    return this.ticketRepository.getStats(kind);
  }
```

In `softDelete`, after `findById`:

```ts
    // The job would make the same visit again within the hour.
    if (ticket.kind === ServiceTicketKind.MAINTENANCE) {
      throw new BadRequestException('Checkup tickets cannot be deleted.');
    }
```

Add a new section after `updateStatus`:

```ts
  /**
   * Saves part of a checkup's inspection. Each tap on web or mobile sends one
   * item, so answers merge by key rather than replacing the whole list.
   */
  async updateChecklist(
    id: string,
    dto: UpdateMaintenanceChecklistDto,
    userId: string,
  ): Promise<ServiceTicketEntity> {
    const ticket = await this.findById(id);
    this.assertNotClosed(ticket);
    if (ticket.kind !== ServiceTicketKind.MAINTENANCE) {
      throw new BadRequestException('Only checkup tickets have an inspection checklist.');
    }

    const current: MaintenanceChecklist = ticket.checklist ?? emptyMaintenanceChecklist();
    const items = { ...current.items };

    for (const [key, answer] of Object.entries(dto.items ?? {})) {
      if (!MAINTENANCE_CHECKLIST_ITEM_KEYS.includes(key)) {
        throw new BadRequestException(`Unknown checklist item: ${key}`);
      }
      if (answer?.result !== 'ok' && answer?.result !== 'issue') {
        throw new BadRequestException(`Checklist item ${key} must be ok or issue`);
      }
      const note = typeof answer.note === 'string' ? answer.note.trim().slice(0, 500) : null;
      items[key] = { result: answer.result, note: answer.result === 'issue' ? note || null : null };
    }

    const readings = { ...current.readings };
    for (const key of ['generationKwh', 'netMeterReading'] as const) {
      if (!dto.readings || !Object.prototype.hasOwnProperty.call(dto.readings, key)) continue;
      const value = dto.readings[key];
      if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
        throw new BadRequestException(`${key} must be a number of 0 or more`);
      }
      readings[key] = value ?? null;
    }

    await this.dataSource
      .getRepository(ServiceTicketEntity)
      .update(id, { checklist: { items, readings }, updatedBy: userId });

    return this.findById(id);
  }
```

- [ ] **Step 7: Controller.** Add `ServiceTicketStatsQueryDto` and `UpdateMaintenanceChecklistDto` to the `../dto` import. Replace the stats handler:

```ts
  async getStats(@Query() query: ServiceTicketStatsQueryDto): Promise<ServiceTicketStatsDto> {
    return this.ticketService.getStats(query.kind);
  }
```

Add after `updateStatus`:

```ts
  @Patch(':id/checklist')
  @ApiOperation({ summary: 'Save part of a checkup inspection checklist' })
  @ApiResponse({ status: HttpStatus.OK, type: ServiceTicketResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Not a checkup, or a bad item' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Ticket is closed' })
  async updateChecklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceChecklistDto,
    @CurrentUser() user: { id: string },
  ): Promise<ServiceTicketResponseDto> {
    return this.ticketService.toResponseDto(
      await this.ticketService.updateChecklist(id, dto, user.id),
    );
  }
```

- [ ] **Step 8: Typecheck, lint, test.**

```bash
cd /Volumes/works-space/oneohm/oneohm
npm run typecheck:backend && npx nx lint backend && npx nx test backend
```

Expected: all pass. If a mobile or web type error appears later for `kind`/`visitNumber`, that is fixed in Tasks 6 and 9.

- [ ] **Step 9: API check.** With the backend restarted, list issues:

```bash
curl -s "http://localhost:8085/api/v1/service-tickets?kind=issue&limit=1" -H "Authorization: Bearer $TOKEN" | head -c 400
```

(Mint `$TOKEN` as in the `oneohm-local-verification` memory.) Expected: an item with `"kind":"issue","visitNumber":null`. Then `PATCH /service-tickets/<that id>/checklist` with `{"items":{}}` returns 400 `Only checkup tickets have an inspection checklist.`

- [ ] **Step 10: Commit.**

```bash
git add apps/backend/src/modules/service-tickets
git commit -m "feat(service-tickets): kind filter, checkup checklist and guards

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: The hourly job — make checkup tickets

**Files:**
- Create: `apps/backend/src/modules/service-tickets/constants/maintenance.constants.ts`
- Create: `apps/backend/src/modules/service-tickets/services/maintenance-ticket.service.ts`
- Modify: `apps/backend/src/modules/service-tickets/services/index.ts`
- Modify: `apps/backend/src/modules/service-tickets/service-tickets.module.ts`

**Interfaces:**
- Consumes: `ServiceTicketRepository.generateTicketNumber(companyCode, manager)`; Task 1 utils.
- Produces: `MaintenanceTicketService.run()` (cron), private `createDueVisits()`. Task 5 adds the send steps to the same class.

- [ ] **Step 1: Constants.** Create `constants/maintenance.constants.ts`:

```ts
/**
 * Every hour. The env override exists only so a developer can set
 * `MAINTENANCE_CRON="* * * * *"` locally instead of waiting an hour.
 */
export const MAINTENANCE_CRON = process.env.MAINTENANCE_CRON || '0 * * * *';
export const MAINTENANCE_TIMEZONE = 'Asia/Kolkata';

export const MAINTENANCE_OPENED_TEMPLATE = { name: 'maintenance_visit_opened', language: 'en' } as const;
export const MAINTENANCE_CLOSED_TEMPLATE = { name: 'maintenance_visit_closed', language: 'en' } as const;

/** Sends only between these India hours (start inclusive, end exclusive). */
export const MAINTENANCE_SEND_HOUR_START = 9;
export const MAINTENANCE_SEND_HOUR_END = 20;

export const MAINTENANCE_SEND_BATCH_SIZE = 200;
export const MAINTENANCE_STUCK_MINUTES = 10;
export const MAINTENANCE_MAX_AGE_HOURS = 48;
```

- [ ] **Step 2: Create the service** `services/maintenance-ticket.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { COMPANY, MAINTENANCE_LEAD_DAYS, MAINTENANCE_VISIT_COUNT } from '@tejas96/shared/constants';
import {
  ServiceTicketKind,
  ServiceTicketPriority,
  ServiceTicketStatus,
} from '@tejas96/shared/types';
import {
  addDaysToIsoDate,
  emptyMaintenanceChecklist,
  indiaToday,
  nextMaintenanceVisit,
} from '@tejas96/shared/utils';
import { DataSource, QueryFailedError } from 'typeorm';

import { MAINTENANCE_CRON, MAINTENANCE_TIMEZONE } from '../constants/maintenance.constants';
import { ServiceTicketEntity, ServiceTicketStatusHistoryEntity } from '../entities';
import { ServiceTicketRepository } from '../repositories';

interface CompletedProject {
  projectId: string;
  customerId: string;
  endDate: string;
}

/**
 * Routine checkups: makes the next visit for each completed project 14 days
 * before it is due, and (Task 5) WhatsApps the customer when a checkup opens
 * and when it is done.
 *
 * Only the NEXT visit is ever made, so a project completed 13 months ago starts
 * at visit 5. The unique index on (project_id, visit_number) is the real guard
 * against doubles; the pre-read below only saves pointless ticket-number locks.
 */
@Injectable()
export class MaintenanceTicketService {
  private readonly logger = new Logger(MaintenanceTicketService.name);
  private running = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ticketRepository: ServiceTicketRepository,
  ) {}

  @Cron(MAINTENANCE_CRON, { name: 'service-tickets:maintenance', timeZone: MAINTENANCE_TIMEZONE })
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.step('create visits', () => this.createDueVisits());
    } finally {
      this.running = false;
    }
  }

  /** One step failing is logged and does not stop the next. */
  private async step(name: string, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      this.logger.error(`Maintenance job step "${name}" failed`, error);
    }
  }

  private async createDueVisits(): Promise<void> {
    const today = indiaToday();
    const horizon = addDaysToIsoDate(today, MAINTENANCE_LEAD_DAYS);

    const projects: CompletedProject[] = await this.dataSource.query(
      `SELECT p.id AS "projectId",
              cp.customer_id AS "customerId",
              to_char(p.end_date, 'YYYY-MM-DD') AS "endDate"
         FROM projects p
         JOIN customer_properties cp ON cp.id = p.property_id
        WHERE p.deleted_at IS NULL
          AND p.status = 'completed'
          AND p.end_date IS NOT NULL
          AND p.end_date > (CURRENT_DATE - make_interval(months => $1::int * 3 + 1))`,
      [MAINTENANCE_VISIT_COUNT],
    );

    const existingRows: { projectId: string; visitNumber: number }[] = await this.dataSource.query(
      `SELECT project_id AS "projectId", visit_number AS "visitNumber"
         FROM service_tickets
        WHERE kind = 'maintenance'`,
    );
    const existing = new Set(existingRows.map((row) => `${row.projectId}:${row.visitNumber}`));

    let created = 0;
    for (const project of projects) {
      const next = nextMaintenanceVisit(project.endDate, today);
      if (!next || next.dueDate > horizon) continue;
      if (existing.has(`${project.projectId}:${next.visitNumber}`)) continue;
      if (await this.createVisit(project, next.visitNumber, next.dueDate)) created += 1;
    }

    if (created > 0) this.logger.log(`Created ${created} routine checkup ticket(s)`);
  }

  private async createVisit(
    project: CompletedProject,
    visitNumber: number,
    dueDate: string,
  ): Promise<boolean> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const ticketNumber = await this.ticketRepository.generateTicketNumber(COMPANY.code, manager);
        const saved = await manager.save(
          ServiceTicketEntity,
          manager.create(ServiceTicketEntity, {
            ticketNumber,
            kind: ServiceTicketKind.MAINTENANCE,
            visitNumber,
            title: `Routine checkup ${visitNumber} of ${MAINTENANCE_VISIT_COUNT}`,
            description: `Routine solar checkup, visit ${visitNumber} of ${MAINTENANCE_VISIT_COUNT}. Fill the inspection checklist before resolving.`,
            priority: ServiceTicketPriority.MEDIUM,
            status: ServiceTicketStatus.OPEN,
            customerId: project.customerId,
            projectId: project.projectId,
            assignedToEmployeeId: null,
            assignedAt: null,
            dueDate,
            photos: null,
            checklist: emptyMaintenanceChecklist(),
            customerWhatsapp: null,
            createdBy: null,
            updatedBy: null,
          }),
        );
        await manager.save(ServiceTicketStatusHistoryEntity, {
          ticketId: saved.id,
          fromStatus: null,
          toStatus: ServiceTicketStatus.OPEN,
          note: null,
          changedBy: null,
        });
      });
      return true;
    } catch (error) {
      // Another instance made this visit first.
      if (error instanceof QueryFailedError && (error as { code?: string }).code === '23505') {
        return false;
      }
      throw error;
    }
  }
}
```

- [ ] **Step 3: Export and register.** Add to `services/index.ts`:

```ts
export * from './maintenance-ticket.service';
```

In `service-tickets.module.ts`: import `MaintenanceTicketService` from `./services` and `IntegrationsModule` from `../integrations/integrations.module`; add `IntegrationsModule` to `imports` (needed by Task 5 — it imports neither this module nor projects, so there is no cycle) and `MaintenanceTicketService` to `providers`.

- [ ] **Step 4: Typecheck and lint.**

```bash
npm run typecheck:backend && npx nx lint backend
```

Expected: pass. If lint flags `error.code` access, keep the cast shown above.

- [ ] **Step 5: Run it locally.** Pick two completed test projects you own (for example `PRJ-ONEOHM_EPC-2026-0238` and `-0239`). On the web project edit screen set:
  - project A end date = today minus 3 months plus 5 days (visit 1 due in 5 days),
  - project B end date = today minus 13 months plus 5 days (visit 5 due in 5 days).

Put `MAINTENANCE_CRON="* * * * *"` in `apps/backend/.env`, restart the backend, wait 1 minute.

Check:

```sql
SELECT p.project_number, t.ticket_number, t.title, t.visit_number, t.due_date, t.created_by
  FROM service_tickets t JOIN projects p ON p.id = t.project_id
 WHERE t.kind = 'maintenance' AND p.project_number IN ('PRJ-ONEOHM_EPC-2026-0238','PRJ-ONEOHM_EPC-2026-0239');
```

Expected: A has `Routine checkup 1 of 20`, B has `Routine checkup 5 of 20`, both with the due date 5 days from today and `created_by` NULL. Wait another minute: the row count does not change.

Also note the total: `SELECT count(*) FROM service_tickets WHERE kind='maintenance'` — the whole local DB also got its due visits. That is expected.

- [ ] **Step 6: Commit** (do not commit `.env`).

```bash
git add apps/backend/src/modules/service-tickets
git commit -m "feat(service-tickets): hourly job makes routine checkup tickets

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The hourly job — WhatsApp opened / closed, and delivery updates

**Files:**
- Modify: `apps/backend/src/modules/service-tickets/services/maintenance-ticket.service.ts`
- Modify: `apps/backend/src/modules/notifications/listeners/whatsapp-status.listener.ts`

**Interfaces:**
- Consumes: `IntegrationService.sendTemplateMessage(msg, IntegrationProvider.WHATSAPP_BUSINESS)` returning `{ messageId }`; Task 4 constants; `TicketWhatsappRecord`, `MaintenanceWhatsappEvent`.
- Produces: steps `unstick`, `send('opened')`, `send('closed')` in `run()`; listener updates `service_tickets.customer_whatsapp.<event>` by `providerMessageId`.

- [ ] **Step 1: Imports and constructor.** In `maintenance-ticket.service.ts` add:

```ts
import {
  IntegrationProvider,
  MessageType,
  ProjectStatus,
  type MaintenanceWhatsappEvent,
  type TicketWhatsappRecord,
} from '@tejas96/shared/types';
import { indiaHour, normalizePhoneToE164 } from '@tejas96/shared/utils';

import { IntegrationService } from '../../integrations/services';
import {
  MAINTENANCE_CLOSED_TEMPLATE,
  MAINTENANCE_MAX_AGE_HOURS,
  MAINTENANCE_OPENED_TEMPLATE,
  MAINTENANCE_SEND_BATCH_SIZE,
  MAINTENANCE_SEND_HOUR_END,
  MAINTENANCE_SEND_HOUR_START,
  MAINTENANCE_STUCK_MINUTES,
} from '../constants/maintenance.constants';
```

(merge with the existing imports from the same modules). Add `private readonly integrationService: IntegrationService` to the constructor.

- [ ] **Step 2: Extend `run()`.**

```ts
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.step('create visits', () => this.createDueVisits());
      if (this.sendsAllowed()) {
        await this.step('unstick sends', () => this.unstick());
        await this.step('send opened', () => this.send('opened'));
        await this.step('send closed', () => this.send('closed'));
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * The local database is a production restore with real phones, so sends need
   * production or the explicit local flag. No start date means Meta has not
   * approved the templates yet: sending would fail and never be retried.
   */
  private sendsAllowed(): boolean {
    if (process.env.NODE_ENV !== 'production' && process.env.TASK_WHATSAPP_ALLOW_LOCAL !== 'true') {
      return false;
    }
    if (!this.sendSince()) return false;
    const hour = indiaHour();
    return hour >= MAINTENANCE_SEND_HOUR_START && hour < MAINTENANCE_SEND_HOUR_END;
  }

  private sendSince(): Date | null {
    const raw = process.env.MAINTENANCE_WHATSAPP_SINCE;
    if (!raw) return null;
    const since = new Date(raw);
    return Number.isFinite(since.getTime()) ? since : null;
  }
```

- [ ] **Step 3: Add the send code** to the class. `event` is always the literal `'opened'` or `'closed'`, never user input, so interpolating it into SQL is safe.

```ts
  private async unstick(): Promise<void> {
    for (const event of ['opened', 'closed'] as const) {
      const result: unknown = await this.dataSource.query(
        `UPDATE service_tickets
            SET customer_whatsapp = jsonb_set(
                  customer_whatsapp, '{${event}}',
                  (customer_whatsapp -> '${event}') || jsonb_build_object(
                    'status', 'failed', 'reason', 'Send interrupted',
                    'updatedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
          WHERE customer_whatsapp -> '${event}' ->> 'status' = 'sending'
            AND (customer_whatsapp -> '${event}' ->> 'updatedAt')::timestamptz
                < now() - make_interval(mins => $1)`,
        [MAINTENANCE_STUCK_MINUTES],
      );
      const stranded = Array.isArray(result) && typeof result[1] === 'number' ? result[1] : 0;
      if (stranded > 0) {
        this.logger.error(
          `${stranded} checkup "${event}" WhatsApp(s) were interrupted mid-send and will not be retried.`,
        );
      }
    }
  }

  /** When the event happened: creation for opened, first of resolved/closed for closed. */
  private eventTimeSql(event: MaintenanceWhatsappEvent): string {
    return event === 'opened' ? 't.created_at' : 'LEAST(t.resolved_at, t.closed_at)';
  }

  private async send(event: MaintenanceWhatsappEvent): Promise<void> {
    const since = this.sendSince() as Date;
    const statusFilter = event === 'closed' ? `AND t.status IN ('resolved', 'closed')` : '';

    const due: { ticketId: string; eventAt: Date }[] = await this.dataSource.query(
      `SELECT t.id AS "ticketId", ${this.eventTimeSql(event)} AS "eventAt"
         FROM service_tickets t
        WHERE t.kind = 'maintenance'
          AND t.deleted_at IS NULL
          ${statusFilter}
          AND ${this.eventTimeSql(event)} IS NOT NULL
          AND ${this.eventTimeSql(event)} >= $1
          AND t.customer_whatsapp -> '${event}' IS NULL
        ORDER BY 2 ASC
        LIMIT $2`,
      [since, MAINTENANCE_SEND_BATCH_SIZE],
    );

    for (const ticket of due) {
      await this.process(event, ticket.ticketId, new Date(ticket.eventAt));
    }
  }

  /** A single UPDATE whose WHERE repeats the due test, so only one instance wins. */
  private async claim(event: MaintenanceWhatsappEvent, ticketId: string): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `UPDATE service_tickets
          SET customer_whatsapp = jsonb_set(
                COALESCE(customer_whatsapp, '{}'::jsonb), '{${event}}',
                jsonb_build_object(
                  'status', 'sending',
                  'updatedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
        WHERE id = $1
          AND customer_whatsapp -> '${event}' IS NULL
       RETURNING id`,
      [ticketId],
    );
    return rows.length > 0;
  }

  /** Applies only while still `sending`, so a webhook outcome is never overwritten. */
  private async record(
    event: MaintenanceWhatsappEvent,
    ticketId: string,
    patch: Partial<TicketWhatsappRecord>,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE service_tickets
          SET customer_whatsapp = jsonb_set(
                customer_whatsapp, '{${event}}', (customer_whatsapp -> '${event}') || $2::jsonb)
        WHERE id = $1
          AND customer_whatsapp -> '${event}' ->> 'status' = 'sending'`,
      [ticketId, JSON.stringify({ ...patch, updatedAt: new Date().toISOString() })],
    );
  }

  private async process(
    event: MaintenanceWhatsappEvent,
    ticketId: string,
    eventAt: Date,
  ): Promise<void> {
    if (!(await this.claim(event, ticketId))) return;

    try {
      const rows: {
        projectStatus: ProjectStatus;
        projectNumber: string;
        projectName: string | null;
        firstName: string | null;
        phone: string | null;
        dueDate: string | null;
      }[] = await this.dataSource.query(
        `SELECT p.status AS "projectStatus", p.project_number AS "projectNumber",
                p.name AS "projectName", c.first_name AS "firstName", c.phone AS "phone",
                to_char(t.due_date, 'YYYY-MM-DD') AS "dueDate"
           FROM service_tickets t
           JOIN projects p          ON p.id = t.project_id
           JOIN customer_profiles c ON c.id = t.customer_id
          WHERE t.id = $1`,
        [ticketId],
      );
      const context = rows[0];
      const phone = normalizePhoneToE164(context?.phone);

      const skip = !context
        ? 'Ticket not found'
        : context.projectStatus === ProjectStatus.CANCELLED
          ? 'Project cancelled'
          : Date.now() - eventAt.getTime() > MAINTENANCE_MAX_AGE_HOURS * 3_600_000
            ? `More than ${MAINTENANCE_MAX_AGE_HOURS} hours old`
            : !/^\+\d{11,15}$/.test(phone)
              ? 'No valid phone'
              : null;
      if (skip || !context) {
        await this.record(event, ticketId, { status: 'skipped', reason: skip ?? 'Ticket not found' });
        return;
      }

      const template = event === 'opened' ? MAINTENANCE_OPENED_TEMPLATE : MAINTENANCE_CLOSED_TEMPLATE;
      const projectName = (context.projectName ?? '').replace(/\s+/g, ' ').trim();
      const body: Record<string, string> = {
        customer_name: context.firstName?.trim() || 'Customer',
        project_name: projectName ? `"${projectName}"` : context.projectNumber,
      };
      if (event === 'opened') {
        body.due_date = formatIndiaDate(context.dueDate ? `${context.dueDate}T12:00:00Z` : eventAt);
      } else {
        body.visit_date = formatIndiaDate(eventAt);
      }

      const result = await this.integrationService.sendTemplateMessage(
        {
          to: phone,
          type: MessageType.TEMPLATE,
          templateName: template.name,
          templateLanguage: template.language,
          templateParameters: { body },
          metadata: { entityType: 'service_ticket', entityId: ticketId },
        },
        IntegrationProvider.WHATSAPP_BUSINESS,
      );

      await this.record(event, ticketId, {
        status: 'sent',
        providerMessageId: result.messageId,
        sentAt: new Date().toISOString(),
        phone,
        reason: null,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Send failed';
      await this.record(event, ticketId, { status: 'failed', reason });
      this.logger.warn(`Checkup "${event}" WhatsApp for ticket ${ticketId} failed: ${reason}`);
    }
  }
```

Add below the class (file scope):

```ts
/** "17 Dec 2026", in India time. */
function formatIndiaDate(value: Date | string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}
```

- [ ] **Step 4: Listener.** In `whatsapp-status.listener.ts`, change `apply` so it takes the statuses that block the write instead of a SQL string, and also updates tickets. Replace the three call sites and `apply`:

```ts
      if (event.status === 'delivered') {
        await this.apply(
          event.providerMessageId,
          { status: 'delivered', deliveredAt: at.toISOString() },
          ['delivered', 'read'],
        );
      } else if (event.status === 'read') {
        await this.apply(event.providerMessageId, { status: 'read', readAt: at.toISOString() }, [
          'read',
        ]);
      } else if (event.status === 'failed') {
        await this.apply(
          event.providerMessageId,
          { status: 'failed', reason: describeWhatsappError(event.errors) },
          ['delivered', 'read'],
        );
      }
```

```ts
  /**
   * Merges Meta's outcome into the task or checkup ticket carrying that message
   * id. `blocked` lists the statuses that must not be overwritten. A status for
   * someone else's message (a quote, an OTP) matches nothing.
   */
  private async apply(
    providerMessageId: string,
    patch: Partial<TaskWhatsappRecord>,
    blocked: string[],
  ): Promise<void> {
    const json = JSON.stringify({ ...patch, updatedAt: new Date().toISOString() });

    await this.dataSource.query(
      `UPDATE project_tasks
          SET customer_whatsapp = customer_whatsapp || $2::jsonb
        WHERE customer_whatsapp ->> 'providerMessageId' = $1
          AND customer_whatsapp ->> 'status' <> ALL($3::text[])`,
      [providerMessageId, json, blocked],
    );

    for (const key of ['opened', 'closed'] as const) {
      await this.dataSource.query(
        `UPDATE service_tickets
            SET customer_whatsapp = jsonb_set(
                  customer_whatsapp, '{${key}}', (customer_whatsapp -> '${key}') || $2::jsonb)
          WHERE customer_whatsapp -> '${key}' ->> 'providerMessageId' = $1
            AND customer_whatsapp -> '${key}' ->> 'status' <> ALL($3::text[])`,
        [providerMessageId, json, blocked],
      );
    }
  }
```

Update the class comment's first sentence to: `Moves a customer step update or checkup message along as Meta reports it.`

- [ ] **Step 5: Typecheck, lint, test.**

```bash
npm run typecheck:backend && npx nx lint backend && npx nx test backend
```

- [ ] **Step 6: Check the guards locally without sending.**
  1. Leave `MAINTENANCE_WHATSAPP_SINCE` unset, keep `MAINTENANCE_CRON="* * * * *"`, set `TASK_WHATSAPP_ALLOW_LOCAL=true`, restart, wait 1 minute. `SELECT count(*) FROM service_tickets WHERE customer_whatsapp IS NOT NULL` → `0`.
  2. Before the templates exist, prove the path with project A's customer set to the owner's own phone (customer edit screen). Set `MAINTENANCE_WHATSAPP_SINCE` to 5 minutes before project A's ticket `created_at`, restart during 09:00–19:59 India time, wait 1 minute. Expected on project A's ticket: `customer_whatsapp.opened.status = 'failed'` with reason containing `Template name does not exist` (Meta has no template yet). Every other maintenance ticket made before that time stays NULL.
  3. Remove `TASK_WHATSAPP_ALLOW_LOCAL`, `MAINTENANCE_WHATSAPP_SINCE` and `MAINTENANCE_CRON` from `.env`. Restore the customer's phone. Reset the test record: `UPDATE service_tickets SET customer_whatsapp = NULL WHERE id = '<project A ticket id>'`.

- [ ] **Step 7: Commit.**

```bash
git add apps/backend/src/modules/service-tickets apps/backend/src/modules/notifications/listeners/whatsapp-status.listener.ts
git commit -m "feat(service-tickets): WhatsApp the customer when a checkup opens and is done

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Web — Issues / Routine Maintenance tabs

**Files:**
- Modify: `apps/web/components/features/service-tickets/hooks/use-service-tickets.ts`
- Modify: `apps/web/components/features/service-tickets/constants.ts`
- Modify: `apps/web/components/features/service-tickets/components/service-tickets-page.tsx`

**Interfaces:**
- Consumes: `GET /service-tickets?kind=`, `GET /service-tickets/stats?kind=`.
- Produces: `ServiceTicket.kind`, `ServiceTicket.visitNumber`, `ServiceTicketDetail.checklist`, `ServiceTicketDetail.customerWhatsapp`, `ServiceTicketListParams.kind`, `useServiceTicketStats(kind?, enabled?)`, `serviceTicketKeys.stats(kind?)`, `TICKET_FILTER_KEYS.kind`.

- [ ] **Step 1: Hook types.** In `use-service-tickets.ts` extend the shared import with `type MaintenanceChecklist, type ServiceTicketKind, type TicketCustomerWhatsappStatus`. Add to `ServiceTicket` after `priority`:

```ts
  kind: ServiceTicketKind;
  visitNumber: number | null;
```

Add to `ServiceTicketDetail` after `closedAt`:

```ts
  checklist: MaintenanceChecklist | null;
  customerWhatsapp: TicketCustomerWhatsappStatus | null;
```

Add to `ServiceTicketListParams` as its first field:

```ts
  kind?: ServiceTicketKind;
```

Change the stats key and hook:

```ts
  stats: (kind?: ServiceTicketKind) => [...serviceTicketKeys.all(), 'stats', kind ?? 'all'] as const,
```

```ts
export function useServiceTicketStats(kind?: ServiceTicketKind, enabled = true) {
  return useQuery({
    queryKey: serviceTicketKeys.stats(kind),
    enabled,
    queryFn: async (): Promise<ServiceTicketStats> => {
      const { data } = await apiClient.get<ServiceTicketStats>('/service-tickets/stats', {
        params: kind ? { kind } : undefined,
      });
      return data;
    },
  });
}
```

Run `grep -rn "useServiceTicketStats(" apps/web` and fix any other caller that passed `enabled` as the first argument (pass `undefined, enabled`).

- [ ] **Step 2: Filter key.** In `constants.ts` add `kind: 'kind',` to `TICKET_FILTER_KEYS`.

- [ ] **Step 3: Tabs on the page.** In `service-tickets-page.tsx`:

Imports: add `Tab, Tabs` to the `@mui/material` import and `ServiceTicketKind` to the `@tejas96/shared/types` import. Add `const KIND_FILTER_KEY = TICKET_FILTER_KEYS.kind;` beside the other filter-key constants.

Inside `ServiceTicketsPage`, after `createdByFilter`:

```ts
  // No value in the URL is the Issues tab, so every old link keeps working.
  const kind =
    urlState.state.filters[KIND_FILTER_KEY] === ServiceTicketKind.MAINTENANCE
      ? ServiceTicketKind.MAINTENANCE
      : ServiceTicketKind.ISSUE;

  const handleKindChange = useCallback(
    (_: React.SyntheticEvent, next: ServiceTicketKind) => {
      const filters: FilterState = { ...urlState.state.filters };
      if (next === ServiceTicketKind.MAINTENANCE) filters[KIND_FILTER_KEY] = next;
      else delete filters[KIND_FILTER_KEY];
      urlState.setFilters(filters);
    },
    [urlState],
  );
```

Change the stats call to `useServiceTicketStats(kind)`. Add `kind,` as the first field of `params` and `kind` to its dependency array.

In the JSX, show **New Ticket** only on the Issues tab — wrap the `<Button …>New Ticket</Button>` in `{kind === ServiceTicketKind.ISSUE && ( … )}`.

Directly after the header `</Stack>` and before `<ServiceTicketStatTiles`, add:

```tsx
      <Tabs value={kind} onChange={handleKindChange} aria-label="Ticket type">
        <Tab value={ServiceTicketKind.ISSUE} label="Issues" />
        <Tab value={ServiceTicketKind.MAINTENANCE} label="Routine Maintenance" />
      </Tabs>
```

Change the table's `emptyMessage` to:

```tsx
        emptyMessage={
          kind === ServiceTicketKind.MAINTENANCE ? 'No routine checkups yet.' : 'No service tickets yet.'
        }
```

Check the filter panel does not show `kind` as a chip or count it as an active filter: open the page with `?tkt_filters=` containing `kind` and look at the filter button's count. If it counts, exclude `KIND_FILTER_KEY` where the page computes active filters (search the file for `filters` usage around `activeSecondaryQuickFilter`) — the tab is the control for it.

- [ ] **Step 4: Typecheck and lint.**

```bash
npm run typecheck:web && npx nx lint web
```

- [ ] **Step 5: See it.** Open `http://localhost:3001/service`.
  - Issues tab is selected. Row count and tiles match before the change.
  - Click **Routine Maintenance**. The URL gains the kind filter. Rows show `Routine checkup 1 of 20` (project A) and `Routine checkup 5 of 20` (project B). Tiles show maintenance counts. **New Ticket** is gone.
  - Reload: still on Routine Maintenance. Click **Issues**: back to the old list.

- [ ] **Step 6: Commit.**

```bash
git add apps/web/components/features/service-tickets
git commit -m "feat(web): Issues and Routine Maintenance tabs on the service dashboard

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Web — inspection checklist card

**Files:**
- Modify: `apps/web/components/features/service-tickets/hooks/use-service-tickets.ts`
- Create: `apps/web/components/features/service-tickets/components/service-ticket-checklist-card.tsx`
- Modify: `apps/web/components/features/service-tickets/components/service-ticket-detail-page.tsx`
- Modify: `apps/web/components/features/tasks/components/task-drawer-whatsapp.tsx`

**Interfaces:**
- Consumes: `PATCH /service-tickets/:id/checklist`; Task 1 `MAINTENANCE_CHECKLIST`, `MAINTENANCE_READINGS`, `MAINTENANCE_CHECKLIST_TOTAL`, `maintenanceChecklistDoneCount`.
- Produces: `useServiceTicketMutations().saveChecklist` taking `{ id: string; items?: Record<string, MaintenanceChecklistAnswer>; readings?: Partial<MaintenanceChecklist['readings']> }`; `describeCustomerWhatsapp` exported from the tasks feature.

- [ ] **Step 1: Mutation.** In `use-service-tickets.ts` add `type MaintenanceChecklistAnswer` to the shared import. Inside `useServiceTicketMutations`, before `return`:

```ts
  /**
   * One tap = one request. No success toast: the card updates in place, and a
   * toast per tap would bury the page.
   */
  const saveChecklist = useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      items?: Record<string, MaintenanceChecklistAnswer>;
      readings?: Partial<MaintenanceChecklist['readings']>;
    }): Promise<ServiceTicketDetail> => {
      const { data } = await apiClient.patch<ServiceTicketDetail>(
        `/service-tickets/${id}/checklist`,
        body,
      );
      return data;
    },
    onSuccess: (ticket) => {
      queryClient.setQueryData(serviceTicketKeys.detail(ticket.id), ticket);
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });
```

Return `{ create, update, updateStatus, remove, saveChecklist }`.

- [ ] **Step 2: Export the WhatsApp sentence.** In `task-drawer-whatsapp.tsx` change `function describeCustomerWhatsapp` to `export function describeCustomerWhatsapp`. If the tasks feature has an `index.ts` barrel that the service-tickets feature must import through (check `apps/web/components/features/tasks/index.ts`), add `export { describeCustomerWhatsapp } from './components/task-drawer-whatsapp';` there.

- [ ] **Step 3: Create the card** `service-ticket-checklist-card.tsx`:

```tsx
'use client';

import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { Box, Button, Card, CardContent, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import {
  MAINTENANCE_CHECKLIST,
  MAINTENANCE_CHECKLIST_TOTAL,
  MAINTENANCE_READINGS,
} from '@tejas96/shared/constants';
import {
  ServiceTicketStatus,
  type MaintenanceChecklist,
  type MaintenanceItemResult,
} from '@tejas96/shared/types';
import { emptyMaintenanceChecklist, maintenanceChecklistDoneCount } from '@tejas96/shared/utils';
import { type JSX, useEffect, useState } from 'react';

import { useServiceTicketMutations, type ServiceTicketDetail } from '../hooks/use-service-tickets';

import { describeCustomerWhatsapp } from '@/components/features/tasks/components/task-drawer-whatsapp';
import { MUITypography } from '@/components/ui/mui-typography';
import { color } from '@/lib/theme/tokens';

export function ServiceTicketChecklistCard({ ticket }: { ticket: ServiceTicketDetail }): JSX.Element {
  const { saveChecklist } = useServiceTicketMutations();
  const checklist: MaintenanceChecklist = ticket.checklist ?? emptyMaintenanceChecklist();
  const locked = ticket.status === ServiceTicketStatus.CLOSED;
  const done = maintenanceChecklistDoneCount(checklist);

  // Notes and readings are typed locally and saved on blur, not per key.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [readings, setReadings] = useState<Record<string, string>>({});
  useEffect(() => {
    setNotes(
      Object.fromEntries(Object.entries(checklist.items).map(([key, a]) => [key, a.note ?? ''])),
    );
    setReadings({
      generationKwh: checklist.readings.generationKwh?.toString() ?? '',
      netMeterReading: checklist.readings.netMeterReading?.toString() ?? '',
    });
    // Re-seed only when the server copy changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.updatedAt]);

  const setResult = (key: string, result: MaintenanceItemResult): void => {
    saveChecklist.mutate({
      id: ticket.id,
      items: { [key]: { result, note: result === 'issue' ? (notes[key] ?? null) : null } },
    });
  };

  const allOk = (keys: string[]): void => {
    saveChecklist.mutate({
      id: ticket.id,
      items: Object.fromEntries(keys.map((key) => [key, { result: 'ok' as const, note: null }])),
    });
  };

  const saveNote = (key: string): void => {
    const current = checklist.items[key];
    if (!current || current.result !== 'issue' || (current.note ?? '') === (notes[key] ?? '')) return;
    saveChecklist.mutate({ id: ticket.id, items: { [key]: { result: 'issue', note: notes[key] } } });
  };

  const saveReading = (key: 'generationKwh' | 'netMeterReading'): void => {
    const raw = (readings[key] ?? '').trim();
    const value = raw === '' ? null : Number(raw);
    if (value !== null && !Number.isFinite(value)) return;
    if (value === checklist.readings[key]) return;
    saveChecklist.mutate({ id: ticket.id, readings: { [key]: value } });
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <MUITypography variant="sectionTitle">Inspection checklist</MUITypography>
          <MUITypography variant="finePrint">
            {done} of {MAINTENANCE_CHECKLIST_TOTAL} done
          </MUITypography>
        </Stack>

        {ticket.customerWhatsapp && (
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {(['opened', 'closed'] as const).map((event) => {
              const status = ticket.customerWhatsapp?.[event];
              if (!status) return null;
              const problem = status.state === 'failed' || status.state === 'skipped';
              return (
                <Stack key={event} direction="row" spacing={1} alignItems="center">
                  <WhatsAppIcon sx={{ fontSize: 16, color: problem ? 'error.main' : color['text-secondary'] }} />
                  <MUITypography variant="finePrint" sx={{ color: problem ? 'error.main' : undefined }}>
                    {event === 'opened' ? 'Checkup opened' : 'Checkup done'}:{' '}
                    {describeCustomerWhatsapp(status)}
                  </MUITypography>
                </Stack>
              );
            })}
          </Stack>
        )}

        <Stack spacing={2.5} sx={{ mt: 2 }}>
          {MAINTENANCE_CHECKLIST.map((group) => {
            const keys = group.items.map((item) => item.key);
            return (
              <Box key={group.key}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <MUITypography variant="metaLabel">{group.title.toUpperCase()}</MUITypography>
                  <Button size="small" disabled={locked} onClick={() => allOk(keys)}>
                    All OK
                  </Button>
                </Stack>
                <Stack spacing={1} sx={{ mt: 0.5 }}>
                  {group.items.map((item) => {
                    const answer = checklist.items[item.key];
                    return (
                      <Box key={item.key}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                          <MUITypography variant="body">{item.label}</MUITypography>
                          <ToggleButtonGroup
                            exclusive
                            size="small"
                            disabled={locked}
                            value={answer?.result ?? null}
                            onChange={(_, next: MaintenanceItemResult | null) => {
                              if (next) setResult(item.key, next);
                            }}
                          >
                            <ToggleButton value="ok" color="success">OK</ToggleButton>
                            <ToggleButton value="issue" color="error">Issue</ToggleButton>
                          </ToggleButtonGroup>
                        </Stack>
                        {answer?.result === 'issue' && (
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="What is wrong?"
                            disabled={locked}
                            value={notes[item.key] ?? ''}
                            onChange={(event) => setNotes((prev) => ({ ...prev, [item.key]: event.target.value }))}
                            onBlur={() => saveNote(item.key)}
                            inputProps={{ maxLength: 500 }}
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            );
          })}

          <Box>
            <MUITypography variant="metaLabel">READINGS</MUITypography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
              {MAINTENANCE_READINGS.map((reading) => (
                <TextField
                  key={reading.key}
                  label={reading.label}
                  size="small"
                  type="number"
                  disabled={locked}
                  value={readings[reading.key] ?? ''}
                  onChange={(event) =>
                    setReadings((prev) => ({ ...prev, [reading.key]: event.target.value }))
                  }
                  onBlur={() => saveReading(reading.key)}
                  inputProps={{ min: 0, step: 'any' }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
```

If `color['text-secondary']` is not a key of `color` in `@/lib/theme/tokens`, use the same token the page header uses (`color['text-secondary']` is used in `service-tickets-page.tsx`, so it exists).

- [ ] **Step 4: Show it.** In `service-ticket-detail-page.tsx` import `ServiceTicketKind` from `@tejas96/shared/types` and `ServiceTicketChecklistCard` from `./service-ticket-checklist-card`. In the main column, directly after the `Issue` card, add:

```tsx
          {ticket.kind === ServiceTicketKind.MAINTENANCE && (
            <ServiceTicketChecklistCard ticket={ticket} />
          )}
```

For a checkup, change the first card's title from `Issue` to `Checkup`:

```tsx
              <MUITypography variant="sectionTitle">
                {ticket.kind === ServiceTicketKind.MAINTENANCE ? 'Checkup' : 'Issue'}
              </MUITypography>
```

- [ ] **Step 5: Typecheck, lint, knip.**

```bash
npm run typecheck:web && npx nx lint web && npx knip
```

Ignore knip's 21 known duplicated root deps.

- [ ] **Step 6: See it.** Open project A's checkup from the Routine Maintenance tab.
  - Card shows `0 of 20 done`. No WhatsApp lines (nothing sent).
  - Click **All OK** on Panels → 5 items turn OK, counter `5 of 20 done`. Reload: still there.
  - Mark `DC cables` **Issue**, type `Rat bite near inverter`, click away. Reload: note is still there.
  - **Change Status** → Resolved with a note → red toast `Finish the inspection checklist first. Missing: …` listing the unanswered items and both readings.
  - Answer the rest, enter `4210.5` and `1033`, resolve again → succeeds.
  - Open an Issues ticket: no checklist card, title card says `Issue`.

- [ ] **Step 7: Commit.**

```bash
git add apps/web/components/features
git commit -m "feat(web): inspection checklist card on checkup tickets

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Backend + web PR, and publish shared from the branch

**Files:** none new.

- [ ] **Step 1: Full checks.**

```bash
cd /Volumes/works-space/oneohm/oneohm
npm run typecheck:libs && npm run typecheck:backend && npm run typecheck:web
npx nx lint backend && npx nx lint web && npx nx test shared && npx nx test backend && npx knip
```

Expected: pass (knip: only the known root deps).

- [ ] **Step 2: Count completed projects with no end date** (reported in the PR):

```sql
SELECT count(*) FROM projects WHERE deleted_at IS NULL AND status = 'completed' AND end_date IS NULL;
```

- [ ] **Step 3: Push and open the PR.**

```bash
git push -u origin feat/routine-maintenance
gh pr create --title "Routine maintenance: 3-monthly checkup tickets with checklist and WhatsApp" --body "$(cat <<'EOF'
## What
- Completed projects get a checkup ticket every 3 months for 5 years (20 visits), made 14 days before due by an hourly job.
- Service dashboard: Issues / Routine Maintenance tabs. Checkup detail: inspection checklist card.
- Resolve/close is blocked until the checklist is complete. Checkups cannot be deleted.
- Customer WhatsApp when a checkup opens and when it is done (templates `maintenance_visit_opened`, `maintenance_visit_closed`).

## Rollout
- Sends are OFF until `MAINTENANCE_WHATSAPP_SINCE` is set on Fly, after Meta approves both templates.
- Sends only 09:00–19:59 India time.
- Completed projects with no end date (get no checkups): <COUNT FROM STEP 2>.
- Mobile PR follows once shared 1.13.0 is published.

Spec: docs/superpowers/specs/2026-09-17-routine-maintenance-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Replace `<COUNT FROM STEP 2>` with the number before running.

- [ ] **Step 4: Publish shared from the branch** so mobile can build against it without merging (merging main deploys):

```bash
gh workflow run publish-shared.yml --ref feat/routine-maintenance
```

Wait for the run to finish, then check:

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile
export GITHUB_PACKAGES_TOKEN=$(grep -E '^GITHUB_PACKAGES_TOKEN=' .env | cut -d= -f2-)
npm view '@tejas96/shared' versions --json | tail -3
```

Expected: `1.13.0` is listed. If the workflow bumped it (409), note the real version and use it in Task 9. Remember: this PR must merge before any other shared PR.

---

### Task 9: Mobile — types, Type filter, Checkup badge

All commands in `/Volumes/works-space/oneohm/oneohm-mobile`.

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `src/features/serviceTickets/list/tickets.api.ts`
- Modify: `src/features/serviceTickets/list/ticketsModel.ts`
- Modify: `src/features/serviceTickets/list/TicketsFilterSheet.tsx`
- Modify: `src/features/serviceTickets/list/TicketRow.tsx`

**Interfaces:**
- Consumes: `@tejas96/shared` 1.13.0 (`ServiceTicketKind`).
- Produces: `TicketListItem.kind`, `TicketListItem.visitNumber`; `FilterKey` gains `'issues' | 'checkups'`; `FilterGroup` gains `'type'`.

- [ ] **Step 1: Install the published shared version.**

```bash
export GITHUB_PACKAGES_TOKEN=$(grep -E '^GITHUB_PACKAGES_TOKEN=' .env | cut -d= -f2-)
npm install '@tejas96/shared@^1.13.0'
node -e "console.log(require('./node_modules/@tejas96/shared/package.json').version)"
```

Expected: `1.13.0` (or the version Task 8 published). Never copy a hand-built package into `node_modules`.

- [ ] **Step 2: List type.** In `tickets.api.ts` import `ServiceTicketKind` as a type and add to `TicketListItem` after `priority`:

```ts
  kind: ServiceTicketKind;
  visitNumber: number | null;
```

- [ ] **Step 3: Filter model.** In `ticketsModel.ts`:

Add `ServiceTicketKind` to the shared import. Extend `FilterKey` with `| 'issues' | 'checkups'`, and `FilterGroup` with `| 'type'`. Append to `FILTER_OPTIONS`:

```ts
  { key: 'issues', label: 'Issues', group: 'type' },
  { key: 'checkups', label: 'Checkups', group: 'type' },
```

In `applyFilters`, after the `attention` const:

```ts
  const kinds = (['issues', 'checkups'] as FilterKey[])
    .filter(key => selected.includes(key))
    .map(key => (key === 'checkups' ? ServiceTicketKind.MAINTENANCE : ServiceTicketKind.ISSUE));
```

and inside the `tickets.filter` callback, before `return true;`:

```ts
    if (kinds.length > 0 && !kinds.includes(ticket.kind)) {
      return false;
    }
```

In `chipCounts`, inside the loop:

```ts
    if (ticket.kind === ServiceTicketKind.MAINTENANCE) {
      counts.checkups += 1;
    } else {
      counts.issues += 1;
    }
```

- [ ] **Step 4: Sheet.** In `TicketsFilterSheet.tsx`, after the `Needs attention` group (`{group('attention')}`), add:

```tsx
          <Text style={styles.overline}>Type</Text>
          {group('type')}
```

- [ ] **Step 5: Row badge.** In `TicketRow.tsx`, import `ServiceTicketKind` from `@tejas96/shared/types`. Add `const checkup = ticket.kind === ServiceTicketKind.MAINTENANCE;` after `const orphan`. Change the badge-row condition to `priority.showsPill || raisedByYouOnly(ticket) || checkup` and add inside the badge row, first:

```tsx
              {checkup ? (
                <View style={styles.quietPill}>
                  <Text style={styles.quietText}>Checkup</Text>
                </View>
              ) : null}
```

- [ ] **Step 6: Checks.**

```bash
npx tsc --noEmit && npm run lint && npm test
```

Expected: pass. Fix any `Record<FilterKey, …>` object literal elsewhere that now misses `issues`/`checkups` (search `grep -rn "Record<FilterKey" src`).

- [ ] **Step 7: Commit.**

```bash
git add package.json package-lock.json src/features/serviceTickets/list
git commit -m "feat(service-tickets): Checkup badge and Type filter

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Mobile — inspection checklist card

**Files:**
- Modify: `src/core/api/endpoints.ts`
- Modify: `src/features/serviceTickets/detail/ticketDetail.api.ts`
- Create: `src/features/serviceTickets/detail/ChecklistCard.tsx`
- Modify: `src/features/serviceTickets/detail/ServiceTicketDetailScreen.tsx`

**Interfaces:**
- Consumes: `PATCH /service-tickets/:id/checklist`; shared `MAINTENANCE_CHECKLIST`, `MAINTENANCE_READINGS`, `MAINTENANCE_CHECKLIST_TOTAL`, `maintenanceChecklistDoneCount`, `emptyMaintenanceChecklist`.
- Produces: `endpoints.serviceTickets.checklist(id)`, `TicketDetail.checklist`, `useSaveChecklist(id)`, `<ChecklistCard ticket disabled />`.

- [ ] **Step 1: Endpoint.** In `endpoints.ts` inside `serviceTickets`, add:

```ts
    /** Checkup tickets only. Merges answers by item key. */
    checklist: (id: string) => `/service-tickets/${id}/checklist`,
```

- [ ] **Step 2: API.** In `ticketDetail.api.ts` import `MaintenanceChecklist, MaintenanceChecklistAnswer` as types from `@tejas96/shared/types`. Add to `TicketDetail` after `closedAt`:

```ts
  checklist: MaintenanceChecklist | null;
```

Append:

```ts
/**
 * One tap, one request. The response is the whole ticket, written straight into
 * the detail cache so the counter and the buttons show the server's copy.
 */
export function useSaveChecklist(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      items?: Record<string, MaintenanceChecklistAnswer>;
      readings?: Partial<MaintenanceChecklist['readings']>;
    }): Promise<TicketDetail> => {
      const { data } = await apiClient.patch<TicketDetail>(endpoints.serviceTickets.checklist(id), body);
      return data;
    },
    onSuccess: ticket => queryClient.setQueryData(queryKeys.serviceTickets.detail(id), ticket),
  });
}
```

- [ ] **Step 3: Create** `detail/ChecklistCard.tsx`:

```tsx
import {
  MAINTENANCE_CHECKLIST,
  MAINTENANCE_CHECKLIST_TOTAL,
  MAINTENANCE_READINGS,
} from '@tejas96/shared/constants';
import type { MaintenanceChecklist, MaintenanceItemResult } from '@tejas96/shared/types';
import { emptyMaintenanceChecklist, maintenanceChecklistDoneCount } from '@tejas96/shared/utils';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fontFamily, radius, surfaceCard } from '@/core/theme/tokens';

import type { TicketDetail } from './ticketDetail.api';
import { useSaveChecklist } from './ticketDetail.api';

/**
 * The inspection, filled on site.
 *
 * Big OK / Issue targets, one "All OK" per group so a clean visit is six taps
 * plus two readings. Every tap saves at once: a phone that dies mid-visit loses
 * nothing already tapped.
 */
export function ChecklistCard({ ticket, disabled }: { ticket: TicketDetail; disabled: boolean }) {
  const save = useSaveChecklist(ticket.id);
  const checklist: MaintenanceChecklist = ticket.checklist ?? emptyMaintenanceChecklist();
  const done = maintenanceChecklistDoneCount(checklist);

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [readings, setReadings] = useState<Record<string, string>>({});
  useEffect(() => {
    setNotes(Object.fromEntries(Object.entries(checklist.items).map(([k, a]) => [k, a.note ?? ''])));
    setReadings({
      generationKwh: checklist.readings.generationKwh?.toString() ?? '',
      netMeterReading: checklist.readings.netMeterReading?.toString() ?? '',
    });
    // Re-seed only when the server copy changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.updatedAt]);

  const setResult = (key: string, result: MaintenanceItemResult) =>
    save.mutate({ items: { [key]: { result, note: result === 'issue' ? (notes[key] ?? null) : null } } });

  const saveNote = (key: string) => {
    const current = checklist.items[key];
    if (current?.result !== 'issue' || (current.note ?? '') === (notes[key] ?? '')) {
      return;
    }
    save.mutate({ items: { [key]: { result: 'issue', note: notes[key] } } });
  };

  const saveReading = (key: 'generationKwh' | 'netMeterReading') => {
    const raw = (readings[key] ?? '').replace(',', '.').trim();
    const value = raw === '' ? null : Number(raw);
    if ((value !== null && !Number.isFinite(value)) || value === checklist.readings[key]) {
      return;
    }
    save.mutate({ readings: { [key]: value } });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.progress}>
        {done} of {MAINTENANCE_CHECKLIST_TOTAL} done
      </Text>
      {save.isError ? <Text style={styles.error}>That answer did not save. Tap it again.</Text> : null}

      {MAINTENANCE_CHECKLIST.map(group => (
        <View key={group.key} style={styles.group}>
          <View style={styles.groupHead}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={disabled}
              hitSlop={8}
              onPress={() =>
                save.mutate({
                  items: Object.fromEntries(
                    group.items.map(item => [item.key, { result: 'ok' as const, note: null }]),
                  ),
                })
              }
            >
              <Text style={[styles.allOk, disabled && styles.off]}>All OK</Text>
            </Pressable>
          </View>

          {group.items.map(item => {
            const answer = checklist.items[item.key];
            return (
              <View key={item.key} style={styles.item}>
                <Text style={styles.label}>{item.label}</Text>
                <View style={styles.choices}>
                  {(['ok', 'issue'] as const).map(result => {
                    const on = answer?.result === result;
                    return (
                      <Pressable
                        key={result}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on, disabled }}
                        disabled={disabled}
                        style={[
                          styles.choice,
                          on && (result === 'ok' ? styles.okOn : styles.issueOn),
                        ]}
                        onPress={() => setResult(item.key, result)}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            on && { color: result === 'ok' ? colors.success : colors.danger },
                          ]}
                        >
                          {result === 'ok' ? 'OK' : 'Issue'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {answer?.result === 'issue' ? (
                  <TextInput
                    editable={!disabled}
                    maxLength={500}
                    placeholder="What is wrong?"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.input}
                    value={notes[item.key] ?? ''}
                    onBlur={() => saveNote(item.key)}
                    onChangeText={text => setNotes(prev => ({ ...prev, [item.key]: text }))}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Readings</Text>
        {MAINTENANCE_READINGS.map(reading => (
          <View key={reading.key} style={styles.item}>
            <Text style={styles.label}>{reading.label}</Text>
            <TextInput
              editable={!disabled}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              value={readings[reading.key] ?? ''}
              onBlur={() => saveReading(reading.key)}
              onChangeText={text => setReadings(prev => ({ ...prev, [reading.key]: text }))}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaceCard, borderRadius: radius.md, padding: 14, gap: 14 },
  progress: { fontFamily: fontFamily.medium, fontSize: 12.5, color: colors.textSecondary },
  error: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.danger },
  group: { gap: 10 },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupTitle: { fontFamily: fontFamily.bold, fontSize: 13.5, color: colors.textPrimary },
  allOk: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.success },
  off: { color: colors.textTertiary },
  item: { gap: 8 },
  label: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: colors.textPrimary },
  choices: { flexDirection: 'row', gap: 8 },
  choice: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okOn: { backgroundColor: colors.successBg, borderColor: colors.success },
  issueOn: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  choiceText: { fontFamily: fontFamily.medium, fontSize: 14, color: colors.textSecondary },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 12,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
```

- [ ] **Step 4: Show it.** In `ServiceTicketDetailScreen.tsx` import `ServiceTicketKind` (add to the existing shared import) and `ChecklistCard` from `./ChecklistCard`. Add `const checkup = ticket.kind === ServiceTicketKind.MAINTENANCE;` next to `const closed`. Change the description section title:

```tsx
        <Section title={checkup ? 'Checkup' : 'What is wrong'}>
```

Directly after that section, add:

```tsx
        {checkup ? (
          <Section title="Inspection checklist">
            <ChecklistCard disabled={!canAct} ticket={ticket} />
          </Section>
        ) : null}
```

The status sheet already shows the server's refusal through `serverMessage` → `errorMessage`, so an incomplete checklist shows `Finish the inspection checklist first. Missing: …` with no extra code.

- [ ] **Step 5: Checks.**

```bash
npx tsc --noEmit && npm run lint && npm test && npx knip
```

- [ ] **Step 6: Run on Android** (see the `mobile-local-verification` memory: backend on 8085; start Metro yourself).
  - On web, assign project B's checkup to the test employee you log in as on the phone.
  - Phone: the ticket shows in the list with a `Checkup` badge. Filter sheet → `Type` → `Checkups` shows only checkups; `Issues` hides them.
  - Open it: section `Inspection checklist`, `0 of 20 done`. Tap **All OK** on each group, mark one item **Issue** with a note, enter both readings.
  - Web: open the same ticket — the same answers, note and readings show.
  - Phone: before answering everything, **Update status** → Resolved → the sheet shows `Finish the inspection checklist first. Missing: …`. After answering everything, Resolved succeeds.
  - Turn on airplane mode: the buttons are disabled.

- [ ] **Step 7: Commit.**

```bash
git add src
git commit -m "feat(service-tickets): inspection checklist on checkup tickets

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Mobile PR, rollout, and cleanup

- [ ] **Step 1: Push and open the mobile PR.**

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile
git push -u origin feat/routine-maintenance
gh pr create --title "Checkup tickets: inspection checklist and Type filter" --body "$(cat <<'EOF'
## What
- Checkup tickets show a `Checkup` badge; the filter sheet has a Type group.
- Checkup detail has the inspection checklist: OK / Issue per item, All OK per group, two readings. Each tap saves.
- Needs `@tejas96/shared` 1.13.0 and the backend PR in oneohm (merge that first).

## After release
Raise the EPC app min + recommended version on Fly (`oneohm-epc-backend`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Put local test data back.**
  - Project A and B end dates back to their old values (project edit screen).
  - Resolve/close state of the two test tickets is test data: note their ticket numbers in the PR.
  - `.env`: no `MAINTENANCE_CRON`, `MAINTENANCE_WHATSAPP_SINCE` or `TASK_WHATSAPP_ALLOW_LOCAL`.

- [ ] **Step 3: Meta templates** (owner approves before submitting). Create both in WhatsApp Manager or via the Graph API with the credentials in `apps/backend/.env`, copying `project_step_update`'s settings (`en`, UTILITY, `parameter_format: NAMED`):
  - `maintenance_visit_opened`: `Hi {{customer_name}}, the routine solar checkup for {{project_name}} is due on {{due_date}}. Our team will call you to fix a time.`
  - `maintenance_visit_closed`: `Hi {{customer_name}}, the routine solar checkup for {{project_name}} was done on {{visit_date}}. Thank you.`

- [ ] **Step 4: Rollout order** (owner runs merges):
  1. Merge oneohm PR (deploys backend + web; tickets start being made, no sends).
  2. Merge mobile PR, release Android, raise EPC min + recommended.
  3. When Meta shows both templates APPROVED: `fly secrets set MAINTENANCE_WHATSAPP_SINCE=<now, ISO> -a <backend app>`.
  4. Next working hour: check one real opened message arrived on a test phone.
```
