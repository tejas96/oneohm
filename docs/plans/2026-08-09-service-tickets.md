# Service Tickets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unused `service-maintenance` module with a service ticket system — its own screen under a rail-menu entry, plus active-ticket visibility on the customers list, projects list, and the customer/property/project detail screens.

**Architecture:** A new `service_tickets` table with a companion `service_ticket_status_history` table. Property is derived through `project.property_id` rather than stored. The customers-list and projects-list queries each gain a lateral count over active tickets, backed by partial indexes — no denormalized counters. On the web side, one `EntityServiceTicketsTab` component serves all three detail screens and one `ActiveTicketsChip` serves both list screens.

**Tech Stack:** NestJS 11 + TypeORM + Postgres (`apps/backend`), Next.js App Router + MUI + TanStack Query (`apps/web`), shared enums in `libs/shared` imported as `@tejas96/shared/types`. Nx monorepo.

## Global Constraints

- **No unit tests.** Every task is verified by running the build and exercising the real endpoint (curl) or the real screen (browser). A correct database row that nothing renders is not a pass.
- Statuses are exactly `open`, `in_progress`, `resolved`, `closed`. "Active" means `open` or `in_progress` and is defined once, in `ACTIVE_TICKET_STATUSES`.
- `closed` is terminal: no field edits and no further transitions once a ticket is closed.
- Customer and project are both required on a ticket. There is **no `property_id` column** — property derives via `project.property_id`.
- Ticket numbers are `TKT-{COMPANY.code}-{year}-{4-digit seq}`, e.g. `TKT-ONEOHM-2026-0001`. The sequence scans with `withDeleted()` so soft-deleted rows never release a number.
- Photos: maximum 5 per ticket, images only, editable until the ticket is closed.
- Soft delete via `deleted_at`; soft-deleted tickets are excluded from every list, count, and chip.
- Detail tab label is **"Service Tickets"** on customer, property, and project.
- Backend files follow the existing module layout: `entities/`, `dto/`, `repositories/`, `services/`, `controllers/`, each with an `index.ts` barrel.
- Run `npx nx run-many -t lint typecheck -p backend web shared` before each commit; both must pass. (Nx project names are exactly `backend`, `shared`, `web`.)

### Local environment (verified 2026-08-09)

- **API base URL is `http://localhost:8085/api/v1`** — `BACKEND_PORT=8085` in `apps/backend/.env`, and `main.ts:34` sets the global prefix `api/v1`.
- **Start the backend** with `npm run backend:dev` from the repo root. There is no `backend:serve` nx target alias worth using directly.
- **Migrations run from the backend workspace**, not through nx:
  ```bash
  cd apps/backend && npm run migration:run     # and migration:revert / migration:show
  ```
- **Postgres is a local install on `localhost:5432`** (db `oneohm_epc`), not the docker-compose service — `docker compose ps` is empty. **`psql` is not installed on this machine.** For schema and data checks use the node helper at
  `/private/tmp/claude-501/-Volumes-works-space-oneohm/93021524-f844-433f-adc4-67ee93b270e9/scratchpad/db.js`, which reads `apps/backend/.env` and takes SQL as its first argument:
  ```bash
  node <scratchpad>/db.js "SELECT COUNT(*) FROM service_tickets"
  ```
- **The local database is a prod sync** (1188 customers, 224 projects, 1156 properties, 41 employees — `scripts/sync-prod-to-local.sh` exists). Real data is available for verification. Run no destructive SQL beyond the migrations in this plan.
- The properties table is named **`customer_properties`**, not `properties`.
- `service_requests`, `maintenance_tasks` and `project_maintenance_configs` were each confirmed to hold **0 rows** before Task 1, so the drop destroys nothing.

## Deviation from the spec (read before Task 11)

The spec says the projects list gets "the same quick filter" as the customers list. In reality the two screens use different table components:

- `customer-list-page.tsx` uses **`CrmTable`**, which has `quickFilters` chips.
- `project-list-page.tsx` uses **`AdvancedTable`**, which has no chip row — it filters through `ColumnConfig.filterable` + `filterType: 'select'` in a filter panel.

So: customers gets a quick-filter **chip**, projects gets a **select filter column**. Both write the same `hasActiveTickets` boolean to the same API contract, and both screens render the identical `ActiveTicketsChip` on the row, which is the part that had to match visually.

---

## File Structure

**Created — backend**
```
apps/backend/src/database/migrations/1853000000000-DropServiceMaintenanceTables.ts
apps/backend/src/database/migrations/1853000000001-CreateServiceTicketTables.ts
apps/backend/src/modules/service-tickets/
  service-tickets.module.ts
  entities/{service-ticket.entity.ts,service-ticket-status-history.entity.ts,index.ts}
  dto/{create-service-ticket.dto.ts,update-service-ticket.dto.ts,update-ticket-status.dto.ts,
       service-ticket-query.dto.ts,service-ticket-response.dto.ts,
       service-ticket-list-item.dto.ts,service-ticket-stats.dto.ts,index.ts}
  repositories/{service-ticket.repository.ts,index.ts}
  services/{service-ticket.service.ts,index.ts}
  controllers/{service-ticket.controller.ts,index.ts}
```

**Created — shared**
```
libs/shared/src/types/enums/service-ticket.enum.ts
```

**Created — web**
```
apps/web/app/(dashboard)/service/page.tsx
apps/web/app/(dashboard)/service/[id]/page.tsx
apps/web/components/features/service-tickets/
  index.ts
  constants.ts
  hooks/use-service-tickets.ts
  components/service-tickets-page.tsx
  components/service-ticket-stat-tiles.tsx
  components/service-ticket-detail-page.tsx
  components/service-ticket-form-dialog.tsx
  components/service-ticket-status-dialog.tsx
  components/service-ticket-photos.tsx
  components/service-ticket-timeline.tsx
  components/entity-service-tickets-tab.tsx
  components/active-tickets-chip.tsx
```

**Deleted**
```
apps/backend/src/modules/service-maintenance/           (27 files)
libs/shared/src/types/enums/service-maintenance.enum.ts
apps/web/components/features/customers/customer-detail/tabs/service-tab.tsx
```

**Modified**
```
apps/backend/src/app.module.ts
apps/backend/src/modules/customers/repositories/customer-profile.repository.ts
apps/backend/src/modules/customers/dto/... (customer list item DTO)
apps/backend/src/modules/projects/repositories/project.repository.ts
apps/backend/src/modules/projects/dto/projects/project-list-item.dto.ts
apps/backend/src/modules/storage/services/storage.service.ts
libs/shared/src/types/enums/index.ts
libs/shared/src/types/enums/file.enum.ts
apps/web/lib/config/routes.ts
apps/web/lib/config/navigation.ts
apps/web/lib/types/navigation-counts.ts
apps/web/lib/hooks/use-navigation-counts.ts
apps/web/components/features/customers/constants.ts
apps/web/components/features/customers/customer-detail/customer-detail-page.tsx
apps/web/components/features/customers/customer-detail/tabs/index.ts
apps/web/components/features/customers/customer-detail/tabs/overview-tab.tsx
apps/web/components/features/customers/hooks/... (drop useCustomerServiceRequests)
apps/web/components/features/customers/components/customer-list-page.tsx
apps/web/components/features/customers/components/customer-kpi-cards.tsx
apps/web/components/features/properties/constants.ts
apps/web/components/features/properties/property-detail/property-detail-page.tsx
apps/web/components/features/projects/constants.ts
apps/web/components/features/projects/components/project-detail/project-detail-tabs.tsx
apps/web/components/features/projects/components/project-detail/project-detail-content.tsx
apps/web/components/features/projects/components/project-list-page.tsx
```

---

## Task 1: Backend teardown

**Files:**
- Delete: `apps/backend/src/modules/service-maintenance/` (entire directory)
- Delete: `libs/shared/src/types/enums/service-maintenance.enum.ts`
- Modify: `apps/backend/src/app.module.ts:40` (import), `:92` (providers array)
- Modify: `libs/shared/src/types/enums/index.ts:24`
- Modify: `apps/backend/src/modules/customers/repositories/customer-profile.repository.ts` (~lines 811-990)
- Create: `apps/backend/src/database/migrations/1853000000000-DropServiceMaintenanceTables.ts`

**Interfaces:**
- Consumes: nothing
- Produces: a backend with no `service-maintenance` module and no `service_requests` / `maintenance_tasks` / `project_maintenance_configs` tables. `ServiceRequestStatus` and `ServiceRequestPriority` no longer exist anywhere.

- [ ] **Step 1: Delete the module directory**

```bash
cd /Volumes/works-space/oneohm/oneohm
rm -rf apps/backend/src/modules/service-maintenance
rm libs/shared/src/types/enums/service-maintenance.enum.ts
```

- [ ] **Step 2: Unregister the module**

In `apps/backend/src/app.module.ts`, delete the import line:

```ts
import { ServiceMaintenanceModule } from './modules/service-maintenance/service-maintenance.module';
```

and delete `ServiceMaintenanceModule,` from the `imports` array.

In `libs/shared/src/types/enums/index.ts`, delete:

```ts
export * from './service-maintenance.enum';
```

- [ ] **Step 3: Strip `hasServiceRequests` from the customer delete-blocker flags**

In `apps/backend/src/modules/customers/repositories/customer-profile.repository.ts` there are five references. Remove all of them:

1. The `hasServiceRequests: boolean;` field in the `mapDeleteBlockerFlags` parameter type (~line 816).
2. The branch inside `mapDeleteBlockerFlags`:

```ts
    if (row?.hasServiceRequests) {
      reasons.push('Cannot delete: customer has service requests');
    }
```

3. The `hasServiceRequests: boolean;` field in the `queryDeleteBlockerFlags` return-type `Map` value (~line 862).
4. The two further `hasServiceRequests: boolean;` occurrences in the inner row types (~lines 876, 966) and the `'hasServiceRequests',` entry in the select list (~line 933).
5. The `hasServiceRequests: row.hasServiceRequests,` mapping (~line 978).

Also remove the corresponding `EXISTS (SELECT 1 FROM service_requests ...)` fragment from the raw SQL in that method — grep for `service_requests` in the file to find it. The file must contain zero occurrences of `service_request` when you are done.

- [ ] **Step 4: Write the drop migration**

Create `apps/backend/src/database/migrations/1853000000000-DropServiceMaintenanceTables.ts`:

```ts
import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * DropServiceMaintenanceTables
 *
 * Removes the unused service & maintenance schema. The module had controllers
 * and entities but no web screens ever shipped against it, so there is no
 * production data worth migrating into the new service_tickets tables.
 *
 * Irreversible by design — `down` throws rather than recreating three tables
 * whose module no longer exists in the codebase.
 */
export class DropServiceMaintenanceTables1853000000000 implements MigrationInterface {
  name = 'DropServiceMaintenanceTables1853000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "maintenance_tasks" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "service_requests" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "project_maintenance_configs" CASCADE');
  }

  public async down(): Promise<void> {
    throw new Error(
      'DropServiceMaintenanceTables is irreversible — the service-maintenance module was deleted in the same change.',
    );
  }
}
```

- [ ] **Step 5: Verify nothing still references the deleted code**

```bash
cd /Volumes/works-space/oneohm/oneohm
grep -rn "service-maintenance\|ServiceRequestStatus\|ServiceRequestPriority\|ServiceMaintenanceModule\|service_requests" apps/backend/src libs/shared/src
```

Expected: no output. If the grep prints anything, fix it before moving on.

- [ ] **Step 6: Build and run the migration**

```bash
npx nx run-many -t lint typecheck -p backend shared
```

Expected: both pass.

```bash
cd apps/backend && npm run migration:run && cd ../..
```

Expected: `DropServiceMaintenanceTables1853000000000` reported as executed. Then confirm the tables are gone:

```bash
npm run backend:dev
```

Expected: the app boots with no `EntityMetadataNotFound` error.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(service): remove unused service-maintenance module and tables"
```

---

## Task 2: Web teardown

**Files:**
- Delete: `apps/web/components/features/customers/customer-detail/tabs/service-tab.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/customer-detail-page.tsx:81,96,492-494`
- Modify: `apps/web/components/features/customers/customer-detail/tabs/index.ts`
- Modify: `apps/web/components/features/customers/customer-detail/tabs/overview-tab.tsx:318,416-457`
- Modify: `apps/web/components/features/customers/constants.ts:32`
- Modify: `apps/web/components/features/customers/hooks/` (remove `useCustomerServiceRequests`)
- Modify: `apps/web/lib/config/routes.ts:137-142`, `apps/web/lib/config/navigation.ts:429-449`
- Modify: `apps/web/lib/types/navigation-counts.ts:60-63,135-136`, `apps/web/lib/hooks/use-navigation-counts.ts:41-42,137-140`

**Interfaces:**
- Consumes: Task 1's deleted shared enums — the web must no longer import them.
- Produces: a web app with no Service tab on customer detail, no AMC nav entry, and `ROUTES.SERVICE = { HOME, DETAIL }` ready for Task 7 to fill.

- [ ] **Step 1: Delete the customer Service tab and its wiring**

```bash
rm apps/web/components/features/customers/customer-detail/tabs/service-tab.tsx
```

In `customer-detail-page.tsx` remove the three references:

```ts
// line ~81 — delete this block
const ServiceTab = dynamic(() => import('./tabs/service-tab').then((m) => m.ServiceTab), {
  loading: () => <TabSkeleton />,
  ssr: false,
});
```

```ts
// line ~96 — delete this entry from the prefetch map
  service: () => import('./tabs/service-tab'),
```

```tsx
// line ~492 — delete this render branch
            {activeTab === 'service' && (
              <ServiceTab customerId={customerId} enabled={isTabEnabled('service')} />
            )}
```

Remove the `ServiceTab` export from `tabs/index.ts`, and remove `{ value: 'service', label: 'Service' }` from `CUSTOMER_DETAIL_TABS` in `customers/constants.ts:32`.

- [ ] **Step 2: Remove the Open Service Tickets card from the customer overview tab**

In `tabs/overview-tab.tsx`, delete the `openTickets` `useMemo` (~line 318) and the entire card block that renders `title="Open Service Tickets"` (~lines 416-457). Also remove the now-unused `useCustomerServiceRequests` import and `SupportAgentOutlinedIcon` if nothing else in the file uses it.

- [ ] **Step 3: Remove the `useCustomerServiceRequests` hook**

```bash
grep -rn "useCustomerServiceRequests" apps/web
```

Delete the hook definition and its barrel export. The grep must return nothing afterwards.

- [ ] **Step 4: Trim routes, nav, and the mock counts**

In `apps/web/lib/config/routes.ts`, replace the SERVICE block with:

```ts
  // Service
  SERVICE: {
    HOME: '/service',
    DETAIL: '/service/[id]',
  },
```

Then remove the now-dangling `[ROUTES.SERVICE.AMC]: 'service',` entry from the route-to-section map further down the file (~line 445).

In `apps/web/lib/config/navigation.ts`, replace the whole `service:` section (~lines 429-449) with:

```ts
    service: {
      title: 'Service',
      sections: [
        {
          title: 'Tickets',
          items: [
            { id: 'all-service', icon: Wrench, label: 'All Tickets', href: ROUTES.SERVICE.HOME },
          ],
        },
      ],
    },
```

Remove the `FileText` import only if no other section in the file still uses it.

In `apps/web/lib/types/navigation-counts.ts`, delete the `openTickets` and `urgentTickets` fields from the service counts interface (~lines 60-63) and their `0` defaults (~lines 135-136). In `apps/web/lib/hooks/use-navigation-counts.ts`, delete the `openTickets: 14,` / `urgentTickets: 3,` mock values (~lines 41-42) and the selector hook that returns `counts.service.urgentTickets` (~lines 137-140), plus any call sites the next grep finds.

- [ ] **Step 5: Verify no dangling references**

```bash
cd /Volumes/works-space/oneohm/oneohm
grep -rn "service-tab\|useCustomerServiceRequests\|SERVICE.AMC\|urgentTickets\|openTickets" apps/web/app apps/web/components apps/web/lib
```

Expected: no output.

- [ ] **Step 6: Build and exercise the screens**

```bash
npx nx run-many -t lint typecheck -p web
```

Expected: both pass.

Start the dev server via the preview tooling (not `npm run dev` in a shell), then:

- Open a customer detail page. Expected: tabs read Overview / Properties / Quotes / Projects / Documents / Follow-ups / Finance / Activity — **no Service tab** — and the Overview tab renders with no "Open Service Tickets" card and no console errors.
- Open the rail menu. Expected: the Service section shows a single "All Tickets" item and **no AMC Contracts** item.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(web): remove service-maintenance UI remnants"
```

---

## Task 3: Shared enums, entities, and the create migration

**Files:**
- Create: `libs/shared/src/types/enums/service-ticket.enum.ts`
- Modify: `libs/shared/src/types/enums/index.ts`, `libs/shared/src/types/enums/file.enum.ts`
- Modify: `apps/backend/src/modules/storage/services/storage.service.ts:23-47`
- Create: `apps/backend/src/modules/service-tickets/entities/service-ticket.entity.ts`
- Create: `apps/backend/src/modules/service-tickets/entities/service-ticket-status-history.entity.ts`
- Create: `apps/backend/src/modules/service-tickets/entities/index.ts`
- Create: `apps/backend/src/database/migrations/1853000000001-CreateServiceTicketTables.ts`

**Interfaces:**
- Consumes: Task 1's clean slate.
- Produces:
  - `ServiceTicketStatus` (`OPEN`/`IN_PROGRESS`/`RESOLVED`/`CLOSED`), `ServiceTicketPriority` (`LOW`/`MEDIUM`/`HIGH`/`URGENT`), `ACTIVE_TICKET_STATUSES`, `isActiveTicketStatus(status)`, `ServiceTicketPhoto` — all from `@tejas96/shared/types`.
  - `FileCategory.SERVICE`.
  - `ServiceTicketEntity` and `ServiceTicketStatusHistoryEntity`.
  - Tables `service_tickets` and `service_ticket_status_history`.

- [ ] **Step 1: Add the shared enums**

Create `libs/shared/src/types/enums/service-ticket.enum.ts`:

```ts
/**
 * ============================================
 * SERVICE TICKET ENUMS
 * ============================================
 */

export enum ServiceTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum ServiceTicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * The single definition of "active". Backend filters, count queries and the
 * frontend chip all import this, so they cannot drift apart.
 */
export const ACTIVE_TICKET_STATUSES: readonly ServiceTicketStatus[] = [
  ServiceTicketStatus.OPEN,
  ServiceTicketStatus.IN_PROGRESS,
] as const;

export function isActiveTicketStatus(status: ServiceTicketStatus): boolean {
  return ACTIVE_TICKET_STATUSES.includes(status);
}

/** Shape of one entry in `service_tickets.photos`. */
export interface ServiceTicketPhoto {
  fileName: string;
  fileKey: string;
  publicUrl: string;
  fileSize?: number;
  mimeType?: string;
}

export const MAX_SERVICE_TICKET_PHOTOS = 5;
```

Add to `libs/shared/src/types/enums/index.ts`, keeping the file's alphabetical ordering:

```ts
export * from './service-ticket.enum';
```

- [ ] **Step 2: Add the `service` file category**

In `libs/shared/src/types/enums/file.enum.ts`:

```ts
export enum FileCategory {
  SITE = 'site',
  DOCUMENT = 'document',
  PROFILE = 'profile',
  QUOTE = 'quote',
  PROJECT = 'project',
  SERVICE = 'service',
  OTHER = 'other',
}
```

Both maps in `apps/backend/src/modules/storage/services/storage.service.ts` are typed `Record<FileCategory, …>`, so typecheck will fail until you add entries. Add to `ALLOWED_MIME_TYPES`:

```ts
  [FileCategory.SERVICE]: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
```

and to `MAX_FILE_SIZES`:

```ts
  [FileCategory.SERVICE]: 10 * 1024 * 1024, // 10MB
```

- [ ] **Step 3: Write the ticket entity**

Create `apps/backend/src/modules/service-tickets/entities/service-ticket.entity.ts`:

```ts
import {
  ServiceTicketPriority,
  ServiceTicketStatus,
  type ServiceTicketPhoto,
} from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { EmployeeProfileEntity } from '../../employees/entities/employee-profile.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';

import { ServiceTicketStatusHistoryEntity } from './service-ticket-status-history.entity';

/**
 * Service Ticket
 *
 * Post-handover complaints, AMC queries and general issues raised against a
 * completed project. Property is intentionally NOT stored here — it is derived
 * through `project.propertyId` (which is NOT NULL) so it cannot go stale if a
 * project is ever re-pointed at a different property.
 */
@Entity('service_tickets')
export class ServiceTicketEntity extends BaseEntity {
  @Column({ name: 'ticket_number', type: 'varchar', length: 50, unique: true })
  ticketNumber: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 20, default: ServiceTicketPriority.MEDIUM })
  priority: ServiceTicketPriority;

  @Column({ type: 'varchar', length: 20, default: ServiceTicketStatus.OPEN })
  status: ServiceTicketStatus;

  // ============================================
  // RELATIONS
  // ============================================

  @ManyToOne(() => CustomerProfileEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerProfileEntity;

  @Index('idx_service_tickets_customer')
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Index('idx_service_tickets_project')
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => EmployeeProfileEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to_employee_id' })
  assignedToEmployee: EmployeeProfileEntity | null;

  @Column({ name: 'assigned_to_employee_id', type: 'uuid', nullable: true })
  assignedToEmployeeId: string | null;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt: Date | null;

  // ============================================
  // PHOTOS
  // ============================================

  @Column({ type: 'jsonb', nullable: true })
  photos: ServiceTicketPhoto[] | null;

  // ============================================
  // RESOLUTION
  // ============================================

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  // ============================================
  // HISTORY
  // ============================================

  @OneToMany(() => ServiceTicketStatusHistoryEntity, (entry) => entry.ticket)
  statusHistory: ServiceTicketStatusHistoryEntity[];

  // ============================================
  // AUDIT
  // ============================================

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: UserEntity;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: UserEntity;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;
}
```

- [ ] **Step 4: Write the status history entity**

Create `apps/backend/src/modules/service-tickets/entities/service-ticket-status-history.entity.ts`:

```ts
import { ServiceTicketStatus } from '@tejas96/shared/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';

import { ServiceTicketEntity } from './service-ticket.entity';

/**
 * One row per status transition, including the ticket's creation
 * (`fromStatus` null, `toStatus` open). Append-only — never updated.
 */
@Entity('service_ticket_status_history')
@Index('idx_ticket_status_history_ticket', ['ticketId', 'createdAt'])
export class ServiceTicketStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ServiceTicketEntity, (ticket) => ticket.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: ServiceTicketEntity;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId: string;

  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus: ServiceTicketStatus | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus: ServiceTicketStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changedByUser: UserEntity;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

Create `apps/backend/src/modules/service-tickets/entities/index.ts`:

```ts
export * from './service-ticket.entity';
export * from './service-ticket-status-history.entity';
```

- [ ] **Step 5: Write the create migration**

Create `apps/backend/src/database/migrations/1853000000001-CreateServiceTicketTables.ts`:

```ts
import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * CreateServiceTicketTables
 *
 * The two partial indexes are what make the CRM chip and the "has active
 * tickets" filter cheap: both list queries probe only open/in_progress rows
 * that have not been soft-deleted, which is a small slice of the table.
 */
export class CreateServiceTicketTables1853000000001 implements MigrationInterface {
  name = 'CreateServiceTicketTables1853000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "service_tickets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_number" varchar(50) NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "priority" varchar(20) NOT NULL DEFAULT 'medium',
        "status" varchar(20) NOT NULL DEFAULT 'open',
        "customer_id" uuid NOT NULL REFERENCES "customer_profiles"("id"),
        "project_id" uuid NOT NULL REFERENCES "projects"("id"),
        "assigned_to_employee_id" uuid NULL REFERENCES "employee_profiles"("id"),
        "assigned_at" timestamptz NULL,
        "photos" jsonb NULL,
        "resolution_note" text NULL,
        "resolved_at" timestamptz NULL,
        "closed_at" timestamptz NULL,
        "created_by" uuid NULL REFERENCES "users"("id"),
        "updated_by" uuid NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" timestamptz NULL,
        CONSTRAINT "uq_service_tickets_number" UNIQUE ("ticket_number")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_service_tickets_customer_active"
        ON "service_tickets" ("customer_id")
        WHERE "status" IN ('open', 'in_progress') AND "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_service_tickets_project_active"
        ON "service_tickets" ("project_id")
        WHERE "status" IN ('open', 'in_progress') AND "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_service_tickets_customer" ON "service_tickets" ("customer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_service_tickets_project" ON "service_tickets" ("project_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_service_tickets_status"
        ON "service_tickets" ("status") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_service_tickets_assignee"
        ON "service_tickets" ("assigned_to_employee_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "service_ticket_status_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_id" uuid NOT NULL REFERENCES "service_tickets"("id") ON DELETE CASCADE,
        "from_status" varchar(20) NULL,
        "to_status" varchar(20) NOT NULL,
        "note" text NULL,
        "changed_by" uuid NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ticket_status_history_ticket"
        ON "service_ticket_status_history" ("ticket_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "service_ticket_status_history"');
    await queryRunner.query('DROP TABLE IF EXISTS "service_tickets"');
  }
}
```

- [ ] **Step 6: Run the migration and inspect the schema**

```bash
npx nx run-many -t lint typecheck -p backend shared
cd apps/backend && npm run migration:run && cd ../..
```

Expected: `CreateServiceTicketTables1853000000001` executes without error.

Confirm the partial indexes actually exist — this is the part that silently degrades if the predicate is wrong:

```bash
node <scratchpad>/db.js "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'service_tickets' ORDER BY indexname"
```

Expected: `idx_service_tickets_customer_active` and `idx_service_tickets_project_active` are both listed, and each `indexdef` ends with `WHERE (((status)::text = ANY (...)) AND (deleted_at IS NULL))`. If the `WHERE` clause is missing the index is not partial and the filter will seq-scan.

- [ ] **Step 7: Verify rollback works**

```bash
cd apps/backend && npm run migration:revert && cd ../..
cd apps/backend && npm run migration:run && cd ../..
```

Expected: revert drops both tables cleanly, re-run recreates them.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(service-tickets): add ticket schema, entities and shared enums"
```

---

## Task 4: Backend CRUD

**Files:**
- Create: `apps/backend/src/modules/service-tickets/dto/*.ts` + `index.ts`
- Create: `apps/backend/src/modules/service-tickets/repositories/service-ticket.repository.ts` + `index.ts`
- Create: `apps/backend/src/modules/service-tickets/services/service-ticket.service.ts` + `index.ts`
- Create: `apps/backend/src/modules/service-tickets/controllers/service-ticket.controller.ts` + `index.ts`
- Create: `apps/backend/src/modules/service-tickets/service-tickets.module.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Consumes: `ServiceTicketEntity`, `ServiceTicketStatusHistoryEntity`, `ServiceTicketStatus`, `ServiceTicketPriority`, `ServiceTicketPhoto`, `MAX_SERVICE_TICKET_PHOTOS` from Task 3.
- Produces:
  - `ServiceTicketRepository.generateTicketNumber(companyCode: string, manager?: EntityManager): Promise<string>`
  - `ServiceTicketRepository.findPaginated(query: ServiceTicketQueryDto): Promise<{ items: ServiceTicketEntity[]; total: number }>`
  - `ServiceTicketService.create`, `.findAll`, `.findById`, `.update`, `.softDelete`
  - `ServiceTicketListItemDto`, `ServiceTicketResponseDto`
  - Endpoints `POST/GET/PATCH/DELETE /service-tickets`

- [ ] **Step 1: Write the DTOs**

`dto/create-service-ticket.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceTicketPriority, type ServiceTicketPhoto } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ServiceTicketPhotoDto implements ServiceTicketPhoto {
  @ApiProperty({ example: 'inverter-fault.jpg' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'service/8f0c.../issue-photo/1723200000_ab12_inverter-fault.jpg' })
  @IsString()
  @IsNotEmpty()
  fileKey: string;

  @ApiProperty({ example: 'https://cdn.example.com/service/8f0c.../inverter-fault.jpg' })
  @IsString()
  @IsNotEmpty()
  publicUrl: string;

  @ApiPropertyOptional({ example: 284913 })
  @IsOptional()
  fileSize?: number;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class CreateServiceTicketDto {
  @ApiProperty({ example: 'Inverter tripping every morning' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Customer reports the inverter trips around 7am and needs a manual reset.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: ServiceTicketPriority, default: ServiceTicketPriority.MEDIUM })
  @IsEnum(ServiceTicketPriority)
  priority: ServiceTicketPriority = ServiceTicketPriority.MEDIUM;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedToEmployeeId?: string;

  @ApiPropertyOptional({ type: [ServiceTicketPhotoDto], maxItems: 5 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ServiceTicketPhotoDto)
  photos?: ServiceTicketPhotoDto[];
}
```

`dto/update-service-ticket.dto.ts`:

```ts
import { PartialType, OmitType } from '@nestjs/swagger';

import { CreateServiceTicketDto } from './create-service-ticket.dto';

/**
 * Customer and project are fixed at creation — re-pointing a ticket at a
 * different project would silently move it between property and project tabs.
 */
export class UpdateServiceTicketDto extends PartialType(
  OmitType(CreateServiceTicketDto, ['customerId', 'projectId'] as const),
) {}
```

`dto/update-ticket-status.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceTicketStatus } from '@tejas96/shared/types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: ServiceTicketStatus })
  @IsEnum(ServiceTicketStatus)
  status: ServiceTicketStatus;

  @ApiPropertyOptional({
    description: 'Free-text note recorded against the transition. Required when moving to resolved.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
```

`dto/service-ticket-query.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceTicketPriority, ServiceTicketStatus } from '@tejas96/shared/types';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

/** Accepts `?status=open&status=in_progress` and `?status=open,in_progress`. */
function toArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value as string[];
  return String(value).split(',').filter(Boolean);
}

export class ServiceTicketQueryDto {
  @ApiPropertyOptional({ enum: ServiceTicketStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(ServiceTicketStatus, { each: true })
  status?: ServiceTicketStatus[];

  @ApiPropertyOptional({ enum: ServiceTicketPriority, isArray: true })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(ServiceTicketPriority, { each: true })
  priority?: ServiceTicketPriority[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filters via project.property_id' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Matches title or ticket number, case-insensitive' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
```

`dto/service-ticket-list-item.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceTicketPriority, ServiceTicketStatus } from '@tejas96/shared/types';

export class ServiceTicketListItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TKT-ONEOHM-2026-0001' })
  ticketNumber: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ServiceTicketStatus })
  status: ServiceTicketStatus;

  @ApiProperty({ enum: ServiceTicketPriority })
  priority: ServiceTicketPriority;

  @ApiProperty({ format: 'uuid' })
  customerId: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ example: 'PRJ-ONEOHM-2026-0001' })
  projectNumber: string;

  @ApiProperty({ format: 'uuid' })
  propertyId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  assignedToEmployeeId?: string | null;

  @ApiPropertyOptional()
  assigneeName?: string | null;

  @ApiProperty()
  createdAt: string;
}
```

`dto/service-ticket-response.dto.ts` — extend the list item with the full record:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceTicketStatus, type ServiceTicketPhoto } from '@tejas96/shared/types';

import { ServiceTicketListItemDto } from './service-ticket-list-item.dto';

export class ServiceTicketStatusHistoryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ enum: ServiceTicketStatus, nullable: true })
  fromStatus: ServiceTicketStatus | null;

  @ApiProperty({ enum: ServiceTicketStatus })
  toStatus: ServiceTicketStatus;

  @ApiPropertyOptional({ nullable: true })
  note: string | null;

  @ApiPropertyOptional({ nullable: true })
  changedByName: string | null;

  @ApiProperty()
  createdAt: string;
}

export class ServiceTicketResponseDto extends ServiceTicketListItemDto {
  @ApiProperty()
  description: string;

  @ApiProperty({ example: 'Sunrise Villa, Pune' })
  propertyLabel: string;

  @ApiProperty()
  projectName: string;

  @ApiPropertyOptional({ type: 'array', nullable: true })
  photos: ServiceTicketPhoto[] | null;

  @ApiPropertyOptional({ nullable: true })
  resolutionNote: string | null;

  @ApiPropertyOptional({ nullable: true })
  resolvedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  closedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdByName: string | null;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ type: [ServiceTicketStatusHistoryDto] })
  statusHistory: ServiceTicketStatusHistoryDto[];
}
```

`dto/service-ticket-stats.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class ServiceTicketStatsDto {
  @ApiProperty({ example: 12 })
  open: number;

  @ApiProperty({ example: 5 })
  inProgress: number;

  @ApiProperty({ example: 31 })
  resolved: number;

  @ApiProperty({ example: 74 })
  closed: number;

  @ApiProperty({ example: 3, description: 'Active tickets at urgent priority' })
  urgent: number;
}
```

`dto/index.ts` re-exports all of the above.

- [ ] **Step 2: Write the repository**

Create `repositories/service-ticket.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ACTIVE_TICKET_STATUSES, ServiceTicketPriority } from '@tejas96/shared/types';
import { type EntityManager, Repository } from 'typeorm';

import { ServiceTicketEntity } from '../entities';
import { type ServiceTicketQueryDto } from '../dto';

const SORT_FIELD_MAP: Record<string, string> = {
  createdAt: 'ticket.createdAt',
  ticketNumber: 'ticket.ticketNumber',
  title: 'ticket.title',
  status: 'ticket.status',
  priority: 'ticket.priority',
};

@Injectable()
export class ServiceTicketRepository {
  constructor(
    @InjectRepository(ServiceTicketEntity)
    private readonly repository: Repository<ServiceTicketEntity>,
  ) {}

  /**
   * Generate the next ticket number. Must run inside a transaction so the
   * pessimistic lock actually serialises concurrent creates.
   *
   * `withDeleted()` matters: a soft-deleted ticket keeps its number, so the
   * sequence must see it or two tickets would collide on the unique index.
   */
  async generateTicketNumber(companyCode: string, manager?: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TKT-${companyCode}-${year}`;

    const repo = manager ? manager.getRepository(ServiceTicketEntity) : this.repository;

    const latest = await repo
      .createQueryBuilder('ticket')
      .withDeleted()
      .where('ticket.ticketNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('ticket.ticketNumber', 'DESC')
      .setLock('pessimistic_write')
      .getOne();

    let sequence = 1;
    if (latest?.ticketNumber) {
      const parts = latest.ticketNumber.split('-');
      sequence = parseInt(parts[parts.length - 1] || '0', 10) + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  private baseQuery() {
    return this.repository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.customer', 'customer')
      .leftJoinAndSelect('ticket.project', 'project')
      .leftJoinAndSelect('project.property', 'property')
      .leftJoinAndSelect('ticket.assignedToEmployee', 'assignee')
      .leftJoinAndSelect('assignee.user', 'assigneeUser')
      .where('ticket.deletedAt IS NULL');
  }

  async findPaginated(
    query: ServiceTicketQueryDto,
  ): Promise<{ items: ServiceTicketEntity[]; total: number }> {
    const qb = this.baseQuery();

    if (query.status?.length) {
      qb.andWhere('ticket.status IN (:...statuses)', { statuses: query.status });
    }
    if (query.priority?.length) {
      qb.andWhere('ticket.priority IN (:...priorities)', { priorities: query.priority });
    }
    if (query.customerId) {
      qb.andWhere('ticket.customerId = :customerId', { customerId: query.customerId });
    }
    if (query.projectId) {
      qb.andWhere('ticket.projectId = :projectId', { projectId: query.projectId });
    }
    if (query.propertyId) {
      qb.andWhere('project.property_id = :propertyId', { propertyId: query.propertyId });
    }
    if (query.assigneeId) {
      qb.andWhere('ticket.assignedToEmployeeId = :assigneeId', { assigneeId: query.assigneeId });
    }
    if (query.createdBy) {
      qb.andWhere('ticket.createdBy = :createdBy', { createdBy: query.createdBy });
    }
    if (query.search) {
      qb.andWhere('(ticket.title ILIKE :search OR ticket.ticketNumber ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.fromDate) {
      qb.andWhere('ticket.createdAt >= :fromDate', { fromDate: query.fromDate });
    }
    if (query.toDate) {
      qb.andWhere('ticket.createdAt < (:toDate::date + INTERVAL \'1 day\')', {
        toDate: query.toDate,
      });
    }

    const sortField = SORT_FIELD_MAP[query.sortBy] ?? 'ticket.createdAt';
    qb.orderBy(sortField, query.sortOrder === 'ASC' ? 'ASC' : 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findById(id: string): Promise<ServiceTicketEntity | null> {
    return this.baseQuery()
      .leftJoinAndSelect('ticket.statusHistory', 'history')
      .leftJoinAndSelect('history.changedByUser', 'historyUser')
      .leftJoinAndSelect('ticket.createdByUser', 'creator')
      .andWhere('ticket.id = :id', { id })
      .orderBy('history.createdAt', 'ASC')
      .getOne();
  }

  async getStats(): Promise<{
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    urgent: number;
  }> {
    const rows = await this.repository
      .createQueryBuilder('ticket')
      .select('ticket.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('ticket.deletedAt IS NULL')
      .groupBy('ticket.status')
      .getRawMany<{ status: string; count: number }>();

    const byStatus = new Map(rows.map((row) => [row.status, row.count]));

    const urgent = await this.repository
      .createQueryBuilder('ticket')
      .where('ticket.deletedAt IS NULL')
      .andWhere('ticket.priority = :priority', { priority: ServiceTicketPriority.URGENT })
      .andWhere('ticket.status IN (:...statuses)', { statuses: [...ACTIVE_TICKET_STATUSES] })
      .getCount();

    return {
      open: byStatus.get('open') ?? 0,
      inProgress: byStatus.get('in_progress') ?? 0,
      resolved: byStatus.get('resolved') ?? 0,
      closed: byStatus.get('closed') ?? 0,
      urgent,
    };
  }
}
```

Note: `assignee.user` assumes `EmployeeProfileEntity` has a `user` relation carrying the display name. Open `apps/backend/src/modules/employees/entities/employee-profile.entity.ts` and confirm the relation name before running — if the name lives directly on the employee profile, drop the `assigneeUser` join and read it from `assignee`.

- [ ] **Step 3: Write the service**

Create `services/service-ticket.service.ts`. The create path runs in a transaction so number generation and the first history row commit together:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { COMPANY } from '@tejas96/shared/constants';
import { ServiceTicketStatus } from '@tejas96/shared/types';
import { DataSource, Repository } from 'typeorm';

import { ProjectEntity } from '../../projects/entities/project.entity';
import {
  type CreateServiceTicketDto,
  type ServiceTicketQueryDto,
  type UpdateServiceTicketDto,
} from '../dto';
import { ServiceTicketEntity, ServiceTicketStatusHistoryEntity } from '../entities';
import { ServiceTicketRepository } from '../repositories';

@Injectable()
export class ServiceTicketService {
  constructor(
    private readonly ticketRepository: ServiceTicketRepository,
    private readonly dataSource: DataSource,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
  ) {}

  async create(
    dto: CreateServiceTicketDto,
    userId: string,
  ): Promise<ServiceTicketEntity> {
    const project = await this.projectRepository.findOne({
      where: { id: dto.projectId },
      select: { id: true, customerId: true, propertyId: true },
    });

    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    await this.assertProjectBelongsToCustomer(dto.projectId, dto.customerId);

    return this.dataSource.transaction(async (manager) => {
      const ticketNumber = await this.ticketRepository.generateTicketNumber(
        COMPANY.code,
        manager,
      );

      const ticket = manager.create(ServiceTicketEntity, {
        ...dto,
        ticketNumber,
        status: ServiceTicketStatus.OPEN,
        assignedToEmployeeId: dto.assignedToEmployeeId ?? null,
        assignedAt: dto.assignedToEmployeeId ? new Date() : null,
        photos: dto.photos ?? null,
        createdBy: userId,
        updatedBy: userId,
      });

      const saved = await manager.save(ServiceTicketEntity, ticket);

      await manager.save(ServiceTicketStatusHistoryEntity, {
        ticketId: saved.id,
        fromStatus: null,
        toStatus: ServiceTicketStatus.OPEN,
        note: null,
        changedBy: userId,
      });

      return saved;
    });
  }

  /**
   * The property and project tabs both key off this relationship, so a ticket
   * pointing at a project the customer does not own would appear under the
   * wrong customer.
   */
  private async assertProjectBelongsToCustomer(
    projectId: string,
    customerId: string,
  ): Promise<void> {
    const match = await this.projectRepository
      .createQueryBuilder('project')
      .innerJoin('project.property', 'property')
      .where('project.id = :projectId', { projectId })
      .andWhere('property.customer_id = :customerId', { customerId })
      .getCount();

    if (match === 0) {
      throw new BadRequestException(
        'The selected project does not belong to the selected customer.',
      );
    }
  }

  async findAll(query: ServiceTicketQueryDto): Promise<{
    items: ServiceTicketEntity[];
    total: number;
  }> {
    return this.ticketRepository.findPaginated(query);
  }

  async findById(id: string): Promise<ServiceTicketEntity> {
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException(`Service ticket ${id} not found`);
    }
    return ticket;
  }

  async update(
    id: string,
    dto: UpdateServiceTicketDto,
    userId: string,
  ): Promise<ServiceTicketEntity> {
    const ticket = await this.findById(id);
    this.assertNotClosed(ticket);

    const nextAssignee = dto.assignedToEmployeeId ?? ticket.assignedToEmployeeId;
    const assigneeChanged = nextAssignee !== ticket.assignedToEmployeeId;

    await this.dataSource.getRepository(ServiceTicketEntity).update(id, {
      ...dto,
      ...(assigneeChanged && nextAssignee ? { assignedAt: new Date() } : {}),
      updatedBy: userId,
    });

    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    const ticket = await this.findById(id);
    await this.dataSource.getRepository(ServiceTicketEntity).softDelete(ticket.id);
  }

  protected assertNotClosed(ticket: ServiceTicketEntity): void {
    if (ticket.status === ServiceTicketStatus.CLOSED) {
      throw new BadRequestException(
        `Ticket ${ticket.ticketNumber} is closed and can no longer be modified.`,
      );
    }
  }
}
```

`assertNotClosed` throws `BadRequestException` (400) here; Task 5 changes it to a 409 `ConflictException` once the status endpoint needs the same rule. Leave it as written for now.

Verify the `COMPANY` import path resolves — it is defined at `libs/shared/src/constants/company.ts`. Check how `quote.service.ts` imports it and match that exactly.

- [ ] **Step 4: Write the mapper, controller and module**

Add a `toResponseDto` / `toListItemDto` mapping pair to the service (or a small `service-ticket.mapper.ts` in `services/`) that converts `ServiceTicketEntity` into the DTOs from Step 1. `customerName` comes from the customer profile's display name — check what `quotes/dto/quotes/quote-response.dto.ts` uses for the same purpose and reuse that helper rather than re-deriving the name format.

Create `controllers/service-ticket.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import {
  CreateServiceTicketDto,
  ServiceTicketQueryDto,
  ServiceTicketResponseDto,
  UpdateServiceTicketDto,
} from '../dto';
import { ServiceTicketService } from '../services';

@ApiTags('Service Tickets')
@Controller('service-tickets')
@UseGuards(JwtAuthGuard)
export class ServiceTicketController {
  constructor(private readonly ticketService: ServiceTicketService) {}

  @Post()
  @ApiOperation({ summary: 'Create a service ticket' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ServiceTicketResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Project does not belong to customer' })
  async create(
    @Body() dto: CreateServiceTicketDto,
    @CurrentUser() user: { id: string },
  ): Promise<ServiceTicketResponseDto> {
    const ticket = await this.ticketService.create(dto, user.id);
    return this.ticketService.toResponseDto(await this.ticketService.findById(ticket.id));
  }

  @Get()
  @ApiOperation({ summary: 'List service tickets' })
  async findAll(@Query() query: ServiceTicketQueryDto): Promise<{
    items: unknown[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { items, total } = await this.ticketService.findAll(query);
    return {
      items: items.map((ticket) => this.ticketService.toListItemDto(ticket)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service ticket with its status history' })
  @ApiResponse({ status: HttpStatus.OK, type: ServiceTicketResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ServiceTicketResponseDto> {
    return this.ticketService.toResponseDto(await this.ticketService.findById(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service ticket' })
  @ApiResponse({ status: HttpStatus.OK, type: ServiceTicketResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceTicketDto,
    @CurrentUser() user: { id: string },
  ): Promise<ServiceTicketResponseDto> {
    return this.ticketService.toResponseDto(await this.ticketService.update(id, dto, user.id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a service ticket' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ticketService.softDelete(id);
  }
}
```

Create `service-tickets.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectEntity } from '../projects/entities/project.entity';

import { ServiceTicketController } from './controllers';
import { ServiceTicketEntity, ServiceTicketStatusHistoryEntity } from './entities';
import { ServiceTicketRepository } from './repositories';
import { ServiceTicketService } from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceTicketEntity,
      ServiceTicketStatusHistoryEntity,
      ProjectEntity,
    ]),
  ],
  controllers: [ServiceTicketController],
  providers: [ServiceTicketService, ServiceTicketRepository],
  exports: [ServiceTicketService, ServiceTicketRepository],
})
export class ServiceTicketsModule {}
```

Register it in `apps/backend/src/app.module.ts` — add the import alongside the other module imports and `ServiceTicketsModule,` to the `imports` array, keeping the file's existing ordering.

- [ ] **Step 5: Build and exercise the endpoints**

```bash
npx nx run-many -t lint typecheck -p backend shared
npm run backend:dev
```

Get a token and pick a real customer + project pair from the database, then:

```bash
curl -s -X POST http://localhost:8085/api/v1/service-tickets \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Inverter tripping","description":"Trips every morning around 7am.","priority":"high","customerId":"<CUSTOMER_ID>","projectId":"<PROJECT_ID>"}'
```

Expected: 201 with `ticketNumber` `TKT-ONEOHM-2026-0001`, `status` `open`.

Create a second ticket and confirm the number increments to `-0002`.

```bash
curl -s "http://localhost:8085/api/v1/service-tickets?status=open&limit=10" -H "Authorization: Bearer $TOKEN"
```

Expected: both tickets, with `customerName`, `projectNumber` and `propertyId` populated — not null.

Now the negative case, using a project belonging to a *different* customer:

```bash
curl -s -X POST http://localhost:8085/api/v1/service-tickets \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Wrong pairing","description":"x","priority":"low","customerId":"<CUSTOMER_A>","projectId":"<PROJECT_OF_CUSTOMER_B>"}'
```

Expected: 400 with "The selected project does not belong to the selected customer."

Then `PATCH` a title, `GET /:id` to confirm it changed and that `statusHistory` has one entry (`fromStatus: null`, `toStatus: "open"`), and `DELETE` one ticket and confirm it disappears from the list.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(service-tickets): add ticket CRUD API"
```

---

## Task 5: Status transitions, history, and stats

**Files:**
- Modify: `apps/backend/src/modules/service-tickets/services/service-ticket.service.ts`
- Modify: `apps/backend/src/modules/service-tickets/controllers/service-ticket.controller.ts`

**Interfaces:**
- Consumes: Task 4's `ServiceTicketService`, `ServiceTicketRepository.getStats()`, `UpdateTicketStatusDto`.
- Produces:
  - `ServiceTicketService.updateStatus(id, dto, userId): Promise<ServiceTicketEntity>`
  - `ServiceTicketService.getStats(): Promise<ServiceTicketStatsDto>`
  - `PATCH /service-tickets/:id/status`, `GET /service-tickets/stats`

- [ ] **Step 1: Add the transition logic**

In `service-ticket.service.ts`, switch `assertNotClosed` to throw `ConflictException` (import it from `@nestjs/common`) so both the edit path and the status path return 409, then add:

```ts
  /**
   * Transitions are unrestricted among open / in_progress / resolved.
   * `closed` is terminal — the only rule the API enforces.
   */
  async updateStatus(
    id: string,
    dto: UpdateTicketStatusDto,
    userId: string,
  ): Promise<ServiceTicketEntity> {
    const ticket = await this.findById(id);
    this.assertNotClosed(ticket);

    if (dto.status === ticket.status) {
      return ticket;
    }

    if (dto.status === ServiceTicketStatus.RESOLVED && !dto.note?.trim()) {
      throw new BadRequestException('A resolution note is required when resolving a ticket.');
    }

    const now = new Date();

    return this.dataSource.transaction(async (manager) => {
      await manager.update(ServiceTicketEntity, id, {
        status: dto.status,
        updatedBy: userId,
        ...(dto.status === ServiceTicketStatus.RESOLVED
          ? { resolvedAt: now, resolutionNote: dto.note ?? null }
          : {}),
        ...(dto.status === ServiceTicketStatus.CLOSED ? { closedAt: now } : {}),
      });

      await manager.save(ServiceTicketStatusHistoryEntity, {
        ticketId: id,
        fromStatus: ticket.status,
        toStatus: dto.status,
        note: dto.note?.trim() || null,
        changedBy: userId,
      });

      return this.findById(id);
    });
  }

  async getStats(): Promise<ServiceTicketStatsDto> {
    return this.ticketRepository.getStats();
  }
```

Add the missing imports: `ConflictException`, `UpdateTicketStatusDto`, `ServiceTicketStatsDto`.

- [ ] **Step 2: Add the endpoints**

In the controller, add the stats route **above** `@Get(':id')` — otherwise Nest matches `/stats` as an id and `ParseUUIDPipe` returns 400:

```ts
  @Get('stats')
  @ApiOperation({ summary: 'Ticket counts by status, plus active urgent count' })
  @ApiResponse({ status: HttpStatus.OK, type: ServiceTicketStatsDto })
  async getStats(): Promise<ServiceTicketStatsDto> {
    return this.ticketService.getStats();
  }
```

and after the `@Patch(':id')` handler:

```ts
  @Patch(':id/status')
  @ApiOperation({ summary: 'Change ticket status' })
  @ApiResponse({ status: HttpStatus.OK, type: ServiceTicketResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Ticket is closed' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: { id: string },
  ): Promise<ServiceTicketResponseDto> {
    return this.ticketService.toResponseDto(
      await this.ticketService.updateStatus(id, dto, user.id),
    );
  }
```

- [ ] **Step 3: Build and exercise the transitions**

```bash
npx nx run-many -t lint typecheck -p backend
npm run backend:dev
```

Walk a ticket through the whole lifecycle:

```bash
TICKET=<TICKET_ID>
curl -s -X PATCH "http://localhost:8085/api/v1/service-tickets/$TICKET/status" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"in_progress","note":"Technician dispatched"}'
```
Expected: 200, `status` `in_progress`.

```bash
curl -s -X PATCH "http://localhost:8085/api/v1/service-tickets/$TICKET/status" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"resolved"}'
```
Expected: **400** — "A resolution note is required when resolving a ticket."

```bash
curl -s -X PATCH "http://localhost:8085/api/v1/service-tickets/$TICKET/status" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"resolved","note":"Replaced faulty MCB"}'
```
Expected: 200, `resolvedAt` set, `resolutionNote` populated.

Move it back to `in_progress` (expected: 200 — backwards is allowed), then to `closed`, then try any further transition:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH "http://localhost:8085/api/v1/service-tickets/$TICKET/status" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"open"}'
```
Expected: `409`. Repeat with `PATCH /service-tickets/$TICKET` sending a new title — also expected `409`.

```bash
curl -s "http://localhost:8085/api/v1/service-tickets/$TICKET" -H "Authorization: Bearer $TOKEN" | jq '.statusHistory'
```
Expected: entries in chronological order — `null→open`, `open→in_progress`, `in_progress→resolved` (with the note), `resolved→in_progress`, `in_progress→closed` — each carrying `changedByName`.

```bash
curl -s "http://localhost:8085/api/v1/service-tickets/stats" -H "Authorization: Bearer $TOKEN"
```
Expected: counts that match what you created, and `urgent` counting only active urgent tickets.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(service-tickets): add status transitions, history and stats"
```

---

## Task 6: Active-ticket counts on the customer and project list queries

**Files:**
- Modify: `apps/backend/src/modules/customers/repositories/customer-profile.repository.ts`
- Modify: the customer list item DTO (find it with `grep -rn "class CustomerListItemDto" apps/backend/src`)
- Modify: `apps/backend/src/modules/customers/dto/...` filter DTO (the one carrying `hasProperty`)
- Modify: `apps/backend/src/modules/projects/repositories/project.repository.ts`
- Modify: `apps/backend/src/modules/projects/dto/projects/project-list-item.dto.ts`
- Modify: the project query/filter DTO

**Interfaces:**
- Consumes: the `service_tickets` table and its two partial indexes from Task 3.
- Produces:
  - Customer list rows gain `activeTicketCount: number`; the customer list API accepts `hasActiveTickets?: boolean`.
  - Project list rows gain `activeTicketCount: number`; the project list API accepts `hasActiveTickets?: boolean`.

- [ ] **Step 1: Add the count and filter to the customer list query**

Find the query builder behind the customer list (grep for `getManyAndCount` in `customer-profile.repository.ts`). Add the lateral count as a selected sub-expression:

```ts
    qb.leftJoin(
      (sub) =>
        sub
          .select('t.customer_id', 'customer_id')
          .addSelect('COUNT(*)::int', 'active_ticket_count')
          .from('service_tickets', 't')
          .where("t.status IN ('open', 'in_progress')")
          .andWhere('t.deleted_at IS NULL')
          .groupBy('t.customer_id'),
      'tickets',
      'tickets.customer_id = customer.id',
    ).addSelect('COALESCE(tickets.active_ticket_count, 0)', 'activeTicketCount');
```

Then the filter, driven by the same predicate so chip and filter cannot disagree:

```ts
    if (filters.hasActiveTickets === true) {
      qb.andWhere(
        `EXISTS (
           SELECT 1 FROM service_tickets st
           WHERE st.customer_id = customer.id
             AND st.status IN ('open', 'in_progress')
             AND st.deleted_at IS NULL
         )`,
      );
    }
```

Map `activeTicketCount` onto each row in whatever raw-to-entity mapping the method already uses — if it returns entities via `getMany()`, switch that call to `getRawAndEntities()` and merge the raw `activeTicketCount` onto each entity, following whatever pattern the file already uses for other computed columns (grep the file for `getRawAndEntities` first; it may already do this).

Add `activeTicketCount: number` to the customer list item DTO and `hasActiveTickets?: boolean` (with `@IsOptional() @IsBoolean() @Type(() => Boolean)`) to the customer filter DTO.

- [ ] **Step 2: Do the same for projects**

Apply the identical pattern in `project.repository.ts`, keying on `t.project_id = project.id`, and add `activeTicketCount: number` to `project-list-item.dto.ts` plus `hasActiveTickets?: boolean` to the project query DTO.

- [ ] **Step 3: Verify the counts and the filter agree**

```bash
npx nx run-many -t lint typecheck -p backend
npm run backend:dev
```

Using the tickets you created in Tasks 4-5 (make sure at least one is `open` and its customer has no other active tickets):

```bash
curl -s "http://localhost:8085/api/v1/customers?limit=100" -H "Authorization: Bearer $TOKEN" \
  | jq '[.items[] | select(.activeTicketCount > 0) | {id, activeTicketCount}]'
```
Expected: exactly the customers you raised tickets for, with the right counts.

```bash
curl -s "http://localhost:8085/api/v1/customers?hasActiveTickets=true&limit=100" -H "Authorization: Bearer $TOKEN" \
  | jq '[.items[].id] | sort'
```
Expected: **the same set of ids** as the previous command. If they differ, the chip and the filter are using different predicates — fix before continuing.

Repeat both for `/api/projects`.

Then close a ticket and re-run: that customer/project must drop out of the filtered set and its count must fall to 0.

Confirm the partial index is actually being used:

```bash
node <scratchpad>/db.js "EXPLAIN SELECT 1 FROM service_tickets st WHERE st.customer_id = gen_random_uuid() AND st.status IN ('open','in_progress') AND st.deleted_at IS NULL"
```
Expected: an `Index Scan using idx_service_tickets_customer_active`. A `Seq Scan` on a nearly-empty table is Postgres choosing correctly, not a bug — this check only becomes meaningful once the table has a few dozen rows.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(service-tickets): expose active ticket counts on customer and project lists"
```

---

## Task 7: Web data layer, `/service` list screen, routes and nav

**Files:**
- Create: `apps/web/components/features/service-tickets/constants.ts`
- Create: `apps/web/components/features/service-tickets/hooks/use-service-tickets.ts`
- Create: `apps/web/components/features/service-tickets/components/service-ticket-stat-tiles.tsx`
- Create: `apps/web/components/features/service-tickets/components/service-tickets-page.tsx`
- Create: `apps/web/components/features/service-tickets/index.ts`
- Create: `apps/web/app/(dashboard)/service/page.tsx`

**Interfaces:**
- Consumes: `GET /service-tickets`, `GET /service-tickets/stats` from Tasks 4-5; `ROUTES.SERVICE` from Task 2.
- Produces:
  - `ServiceTicket`, `ServiceTicketDetail`, `ServiceTicketStats`, `ServiceTicketListParams` types
  - `useServiceTickets(params)`, `useServiceTicketStats()`, `useServiceTicket(id)`, `useServiceTicketMutations()` returning `{ create, update, updateStatus, remove }`
  - `SERVICE_TICKET_STATUS_LABELS`, `SERVICE_TICKET_PRIORITY_LABELS`, `SERVICE_TICKET_STATUS_TONE`
  - `<ServiceTicketsPage />` at `/service`

- [ ] **Step 1: Write the constants**

`constants.ts`:

```ts
import { ServiceTicketPriority, ServiceTicketStatus } from '@tejas96/shared/types';

import type { CrmTone } from '@/components/shared/crm-table';

export const SERVICE_TICKET_STATUS_LABELS: Record<ServiceTicketStatus, string> = {
  [ServiceTicketStatus.OPEN]: 'Open',
  [ServiceTicketStatus.IN_PROGRESS]: 'In Progress',
  [ServiceTicketStatus.RESOLVED]: 'Resolved',
  [ServiceTicketStatus.CLOSED]: 'Closed',
};

export const SERVICE_TICKET_PRIORITY_LABELS: Record<ServiceTicketPriority, string> = {
  [ServiceTicketPriority.LOW]: 'Low',
  [ServiceTicketPriority.MEDIUM]: 'Medium',
  [ServiceTicketPriority.HIGH]: 'High',
  [ServiceTicketPriority.URGENT]: 'Urgent',
};

export const SERVICE_TICKET_STATUS_TONE: Record<ServiceTicketStatus, CrmTone> = {
  [ServiceTicketStatus.OPEN]: 'warning',
  [ServiceTicketStatus.IN_PROGRESS]: 'info',
  [ServiceTicketStatus.RESOLVED]: 'success',
  [ServiceTicketStatus.CLOSED]: 'neutral',
};

export const SERVICE_TICKET_SORT_FIELD_MAP: Record<string, string> = {
  ticketNumber: 'ticketNumber',
  title: 'title',
  status: 'status',
  priority: 'priority',
  createdAt: 'createdAt',
};
```

Open `apps/web/components/shared/crm-table/types.ts` and confirm the `CrmTone` union actually contains `warning | info | success | neutral`; substitute the real member names if it differs.

- [ ] **Step 2: Write the hooks**

`hooks/use-service-tickets.ts` — follow `use-discoms-admin.ts` exactly for shape (`apiClient`, `showToast`, `getErrorMessage`, `keepPreviousData`):

```ts
'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  type ServiceTicketPhoto,
  type ServiceTicketPriority,
  type ServiceTicketStatus,
} from '@tejas96/shared/types';

import { showToast } from '@/components/ui';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';

export interface ServiceTicket {
  id: string;
  ticketNumber: string;
  title: string;
  status: ServiceTicketStatus;
  priority: ServiceTicketPriority;
  customerId: string;
  customerName: string;
  projectId: string;
  projectNumber: string;
  propertyId: string;
  assignedToEmployeeId?: string | null;
  assigneeName?: string | null;
  createdAt: string;
}

export interface ServiceTicketHistoryEntry {
  id: string;
  fromStatus: ServiceTicketStatus | null;
  toStatus: ServiceTicketStatus;
  note: string | null;
  changedByName: string | null;
  createdAt: string;
}

export interface ServiceTicketDetail extends ServiceTicket {
  description: string;
  propertyLabel: string;
  projectName: string;
  photos: ServiceTicketPhoto[] | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdByName: string | null;
  updatedAt: string;
  statusHistory: ServiceTicketHistoryEntry[];
}

export interface ServiceTicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  urgent: number;
}

export interface ServiceTicketListParams {
  status?: ServiceTicketStatus[];
  priority?: ServiceTicketPriority[];
  customerId?: string;
  projectId?: string;
  propertyId?: string;
  assigneeId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface ServiceTicketListResponse {
  items: ServiceTicket[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const KEY = 'service-tickets';

export function useServiceTickets(params: ServiceTicketListParams, enabled = true) {
  return useQuery({
    queryKey: [KEY, 'list', params],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ServiceTicketListResponse> => {
      const { data } = await apiClient.get<ServiceTicketListResponse>('/service-tickets', {
        params,
      });
      return data;
    },
  });
}

export function useServiceTicketStats(enabled = true) {
  return useQuery({
    queryKey: [KEY, 'stats'],
    enabled,
    queryFn: async (): Promise<ServiceTicketStats> => {
      const { data } = await apiClient.get<ServiceTicketStats>('/service-tickets/stats');
      return data;
    },
  });
}

export function useServiceTicket(id: string | null) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<ServiceTicketDetail> => {
      const { data } = await apiClient.get<ServiceTicketDetail>(`/service-tickets/${id}`);
      return data;
    },
  });
}

export interface CreateServiceTicketInput {
  title: string;
  description: string;
  priority: ServiceTicketPriority;
  customerId: string;
  projectId: string;
  assignedToEmployeeId?: string;
  photos?: ServiceTicketPhoto[];
}

export function useServiceTicketMutations() {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: [KEY] });
    void queryClient.invalidateQueries({ queryKey: ['customers'] });
    void queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const create = useMutation({
    mutationFn: async (input: CreateServiceTicketInput): Promise<ServiceTicketDetail> => {
      const { data } = await apiClient.post<ServiceTicketDetail>('/service-tickets', input);
      return data;
    },
    onSuccess: (ticket) => {
      invalidate();
      showToast.success(`Ticket ${ticket.ticketNumber} created`);
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<CreateServiceTicketInput> & { id: string }): Promise<ServiceTicketDetail> => {
      const { data } = await apiClient.patch<ServiceTicketDetail>(`/service-tickets/${id}`, input);
      return data;
    },
    onSuccess: () => {
      invalidate();
      showToast.success('Ticket updated');
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: ServiceTicketStatus;
      note?: string;
    }): Promise<ServiceTicketDetail> => {
      const { data } = await apiClient.patch<ServiceTicketDetail>(
        `/service-tickets/${id}/status`,
        { status, note },
      );
      return data;
    },
    onSuccess: () => {
      invalidate();
      showToast.success('Status updated');
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/service-tickets/${id}`);
    },
    onSuccess: () => {
      invalidate();
      showToast.success('Ticket deleted');
    },
    onError: (error) => showToast.error(getErrorMessage(error)),
  });

  return { create, update, updateStatus, remove };
}
```

The `invalidate` helper also busts the customers and projects caches — without that, closing the last active ticket leaves a stale chip on those lists. Check the actual query-key prefixes used by `use-customers.ts` and `use-projects.ts` and match them exactly.

- [ ] **Step 3: Write the stat tiles**

`components/service-ticket-stat-tiles.tsx` — copy the `StatCard` structure from `customer-kpi-cards.tsx` (same `crm['kpi-height']`, `color.surface`, `radius['card-functional']`, `shadow.e2` tokens) and render five tiles: Open, In Progress, Resolved, Closed, Urgent. Each takes an `onClick`. Props:

```ts
interface ServiceTicketStatTilesProps {
  stats: ServiceTicketStats | undefined;
  loading: boolean;
  activeKey: string;
  onSelect: (key: 'all' | 'open' | 'in_progress' | 'resolved' | 'closed' | 'urgent') => void;
}
```

Counts are global — do **not** recompute them from the filtered rows.

- [ ] **Step 4: Write the list page**

`components/service-tickets-page.tsx` — model it on `admin-discom-list-page.tsx`: `useTableUrlState({ prefix: 'tkt', defaultPageSize: 20 })`, `CrmTable` with `quickFilters`, `activeQuickFilter`, `onQuickFilterChange`, `columns`, `page`, `pageSize`, `onSearchChange`.

Columns: `ticketNumber` (link to `buildRoute(ROUTES.SERVICE.DETAIL, { id })`), `title`, `customerName`, `projectNumber`, `priority` (`MUIStatusChip` with `colorSeed={row.priority}`), `status` (`MUIStatusChip`), `assigneeName` (`MUIAvatar` + name, `-` when unassigned), `createdAt` (`formatDate`).

Quick filters: `All`, `Open`, `In Progress`, `Resolved`, `Closed`, each with its count from `stats`.

Tile clicks and quick-filter clicks write to the **same** URL filter field so they stay in sync — except Urgent, which sets `priority=urgent` and clears `status`:

```ts
const handleTileSelect = useCallback(
  (key: string): void => {
    if (key === 'urgent') {
      urlState.setFilters({ status: '', priority: 'urgent' });
      return;
    }
    urlState.setFilters({ status: key === 'all' ? '' : key, priority: '' });
  },
  [urlState],
);
```

Match `setFilters` to the real `useTableUrlState` API — open `apps/web/lib/hooks/use-table-url-state.ts` and use whatever setter it exposes.

Export everything from `index.ts`, and create the route wrapper `app/(dashboard)/service/page.tsx`:

```tsx
import { ServiceTicketsPage } from '@/components/features/service-tickets';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function ServicePage(): React.JSX.Element {
  return <ServiceTicketsPage />;
}
```

- [ ] **Step 5: Build and exercise the screen**

```bash
npx nx run-many -t lint typecheck -p web
```

Start the dev server through the preview tooling, then in the browser:

- Click **Service → All Tickets** in the rail. Expected: `/service` loads with five tiles showing the counts from `GET /service-tickets/stats`, and the table listing the tickets created in Tasks 4-5.
- Click the **Open** tile. Expected: the URL gains `?tkt_status=open` (or the prefix `useTableUrlState` actually uses), the table narrows to open tickets, and the Open quick-filter chip becomes active — tile and chip in sync.
- Click the **Urgent** tile. Expected: status clears, priority becomes `urgent`, and only urgent active tickets show.
- Type a ticket number into search. Expected: the table narrows to that ticket.
- Check the browser console. Expected: no errors and no React key warnings.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): add service tickets list screen"
```

---

## Task 8: Create/edit form dialog with photo upload

**Files:**
- Create: `apps/web/components/features/service-tickets/components/service-ticket-photos.tsx`
- Create: `apps/web/components/features/service-tickets/components/service-ticket-form-dialog.tsx`
- Modify: `apps/web/components/features/service-tickets/components/service-tickets-page.tsx`
- Modify: `apps/web/components/features/service-tickets/index.ts`

**Interfaces:**
- Consumes: `useServiceTicketMutations()` from Task 7; `uploadFile` and `FileCategory` from `@/lib/api/storage`; `MUIUserAssigneeSelector`; `MAX_SERVICE_TICKET_PHOTOS` from `@tejas96/shared/types`.
- Produces:
  ```ts
  interface ServiceTicketFormDialogProps {
    open: boolean;
    onClose: () => void;
    /** Ticket being edited; omit to create. */
    ticket?: ServiceTicketDetail;
    /** Pre-selects and locks the customer — used by the entity tabs. */
    lockedCustomerId?: string;
    /** Pre-selects and locks the project — used by the project tab. */
    lockedProjectId?: string;
  }
  ```

- [ ] **Step 1: Write the photo picker**

`service-ticket-photos.tsx` — a controlled component:

```ts
interface ServiceTicketPhotosProps {
  value: ServiceTicketPhoto[];
  onChange: (photos: ServiceTicketPhoto[]) => void;
  ticketId?: string;
  disabled?: boolean;
}
```

Behaviour:
- A file input accepting `image/*`, disabled once `value.length >= MAX_SERVICE_TICKET_PHOTOS`.
- Each selected file goes through `uploadFile({ file, category: FileCategory.SERVICE, entityId: ticketId, entityType: 'service_ticket', subCategory: 'issue-photo' })`. `uploadFile` already omits `entityId` when it is not a UUID, so passing `undefined` during create is safe.
- Uploads run **per file with individual error handling** — one failure must not discard the others:

```tsx
const handleFiles = async (files: File[]): Promise<void> => {
  const room = MAX_SERVICE_TICKET_PHOTOS - value.length;
  const accepted = files.slice(0, room);
  if (files.length > room) {
    showToast.error(`Only ${MAX_SERVICE_TICKET_PHOTOS} photos allowed — extra files were skipped.`);
  }

  setUploading(true);
  const uploaded: ServiceTicketPhoto[] = [];
  for (const file of accepted) {
    try {
      const result = await uploadFile({
        file,
        category: FileCategory.SERVICE,
        entityId: ticketId,
        entityType: 'service_ticket',
        subCategory: 'issue-photo',
      });
      uploaded.push({
        fileName: result.fileName,
        fileKey: result.fileKey,
        publicUrl: result.publicUrl,
        fileSize: file.size,
        mimeType: file.type,
      });
    } catch (error) {
      showToast.error(`${file.name} failed to upload: ${getErrorMessage(error)}`);
    }
  }
  setUploading(false);
  if (uploaded.length) onChange([...value, ...uploaded]);
};
```

- A thumbnail grid rendering `publicUrl`, each with a remove button that filters by `fileKey`.

- [ ] **Step 2: Write the form dialog**

`service-ticket-form-dialog.tsx` using `MUIDialog` (see `apps/web/components/ui/mui-dialog.tsx`) and react-hook-form + zod, matching the pattern in `discom-form-drawer.tsx`.

Fields, in order: Title (required, max 255) · Description (required, multiline) · Customer (search select; hidden and pre-set when `lockedCustomerId`) · Project (search select; **disabled until a customer is chosen**, options scoped to that customer; hidden and pre-set when `lockedProjectId`) · Priority (select, default Medium) · Assignee (`MUIUserAssigneeSelector`, optional) · Photos.

For the customer and project selects, reuse the existing search-select components — grep for how `project-create-wizard` picks a customer and property and follow it rather than writing new ones.

Key behaviours:
- Changing the customer **clears the selected project**, so a stale pairing can never be submitted.
- In edit mode, customer and project render read-only (the API rejects changing them).
- Submit calls `create.mutateAsync` or `update.mutateAsync`, closes on success, and leaves the dialog open on error so the typed values survive.

Wire a **New Ticket** button into `service-tickets-page.tsx` header that opens the dialog with no locked ids.

- [ ] **Step 3: Build and exercise the form**

```bash
npx nx run-many -t lint typecheck -p web
```

In the browser at `/service`:

- Click **New Ticket**. Expected: the dialog opens with Priority defaulted to Medium and the Project select **disabled**.
- Pick a customer. Expected: Project enables and lists only that customer's projects.
- Change the customer. Expected: the previously chosen project clears.
- Fill in title and description, attach two photos, submit. Expected: a success toast naming the new `TKT-…` number, the dialog closes, the new ticket appears at the top of the table, and the Open tile count increases by one.
- Reopen that ticket in edit mode, attach a third photo, remove one, save. Expected: two photos persist after a page reload.
- Try attaching six photos at once. Expected: five are accepted and a toast explains the rest were skipped.
- Check the console and the network tab. Expected: no errors; the `PUT` to the presigned URL returns 200.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): add service ticket form with photo upload"
```

---

## Task 9: Ticket detail screen with status timeline

**Files:**
- Create: `apps/web/components/features/service-tickets/components/service-ticket-timeline.tsx`
- Create: `apps/web/components/features/service-tickets/components/service-ticket-status-dialog.tsx`
- Create: `apps/web/components/features/service-tickets/components/service-ticket-detail-page.tsx`
- Create: `apps/web/app/(dashboard)/service/[id]/page.tsx`
- Modify: `apps/web/components/features/service-tickets/index.ts`

**Interfaces:**
- Consumes: `useServiceTicket(id)`, `useServiceTicketMutations().updateStatus` from Task 7; `ServiceTicketFormDialog` from Task 8.
- Produces: `<ServiceTicketDetailPage ticketId={id} />` at `/service/[id]`.

- [ ] **Step 1: Write the timeline**

`service-ticket-timeline.tsx` renders `ServiceTicketHistoryEntry[]` newest-first as a vertical list: a tone-coloured dot, the transition (`Open → In Progress`, or `Created` when `fromStatus` is null) using `SERVICE_TICKET_STATUS_LABELS`, then `changedByName` and `formatDate(createdAt)`, then the note when present.

- [ ] **Step 2: Write the status dialog**

`service-ticket-status-dialog.tsx`:

```ts
interface ServiceTicketStatusDialogProps {
  open: boolean;
  onClose: () => void;
  ticket: ServiceTicketDetail;
}
```

A status select offering the three statuses other than the current one, plus a note field. The note is **required when the chosen status is `resolved`** — validate client-side and label it "Resolution note". When the ticket is already `closed`, the dialog must not be reachable at all (guard at the button).

Add a confirmation line when `closed` is selected: "Closing is final — this ticket cannot be reopened or edited afterwards."

- [ ] **Step 3: Write the detail page**

`service-ticket-detail-page.tsx`:

- Header: ticket number, title, status chip, priority chip, and — when `status !== 'closed'` — **Change Status** and **Edit** buttons. When closed, render both as disabled with a tooltip reading "Closed tickets cannot be modified."
- Body: description; customer, project and property (linking to their detail routes via `buildRoute`); assignee; created by and created at; resolution note when present.
- Photo gallery from `photos`, clicking a thumbnail opens the full image.
- The timeline.
- Loading skeleton while `isLoading`; a not-found state when the query 404s.

Route wrapper `app/(dashboard)/service/[id]/page.tsx`:

```tsx
import { ServiceTicketDetailPage } from '@/components/features/service-tickets';

interface ServiceTicketPageProps {
  params: Promise<{ id: string }>;
}

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default async function ServiceTicketPage({
  params,
}: ServiceTicketPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <ServiceTicketDetailPage ticketId={id} />;
}
```

Check whether this Next.js version passes `params` as a promise — compare against `app/(dashboard)/customers/[id]/page.tsx` and match it exactly.

- [ ] **Step 4: Build and exercise the screen**

```bash
npx nx run-many -t lint typecheck -p web
```

In the browser:

- From `/service`, click a ticket number. Expected: the detail page loads with all fields, the photos you uploaded in Task 8, and a timeline whose oldest entry is "Created".
- Click **Change Status**, choose In Progress with a note, save. Expected: the status chip updates, a new timeline entry appears at the top with your name and the note, and going back to `/service` shows the moved ticket with the In Progress count up by one.
- Change status to Resolved with the note field empty. Expected: client-side validation blocks submit with a message about the resolution note.
- Resolve it properly, then reopen it to In Progress. Expected: allowed — backwards transitions work.
- Change status to Closed. Expected: the confirmation line shows, and after saving both **Change Status** and **Edit** are disabled with the tooltip.
- Reload the closed ticket. Expected: still disabled; the timeline shows every hop.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): add service ticket detail screen with status timeline"
```

---

## Task 10: Active-ticket chip and filter on the customers list

**Files:**
- Create: `apps/web/components/features/service-tickets/components/active-tickets-chip.tsx`
- Modify: `apps/web/components/features/service-tickets/index.ts`
- Modify: `apps/web/components/features/customers/components/customer-list-page.tsx`
- Modify: `apps/web/components/features/customers/components/customer-kpi-cards.tsx`
- Modify: the customer list types/hooks file that declares the row shape and `CustomerFilters`

**Interfaces:**
- Consumes: `activeTicketCount` on customer rows and the `hasActiveTickets` filter from Task 6.
- Produces: `<ActiveTicketsChip count={number} />` — exported from `@/components/features/service-tickets`, reused unchanged by Task 11.

- [ ] **Step 1: Write the chip**

`active-tickets-chip.tsx`:

```tsx
'use client';

import { type JSX } from 'react';

import { MUIStatusChip } from '@/components/ui';

interface ActiveTicketsChipProps {
  /** Number of open or in-progress tickets. Renders nothing at zero. */
  count: number;
}

/**
 * Shared by the customers list and the projects list so the two screens cannot
 * drift apart visually. Do not fork this — change it here.
 */
export function ActiveTicketsChip({ count }: ActiveTicketsChipProps): JSX.Element | null {
  if (!count || count <= 0) return null;

  return (
    <MUIStatusChip
      label={`${count} active ticket${count === 1 ? '' : 's'}`}
      colorSeed="open"
    />
  );
}
```

Open `apps/web/components/ui/mui-status-chip.tsx` first and confirm the prop names — if it takes an explicit tone rather than a `colorSeed`, use the warning tone so the chip reads as "needs attention", and make sure it matches the tone the Open status uses elsewhere.

- [ ] **Step 2: Add the chip and filter to the customers list**

In `customer-list-page.tsx`:

1. Add `activeTicketCount: number` to the customer row type (and to the `Customer` interface in the customers hooks file).
2. Render `<ActiveTicketsChip count={customer.activeTicketCount} />` in the customer name cell, next to the existing status chips.
3. Add the quick filter. `quickFilters` is built in a `useMemo` around line 969 — append:

```ts
      {
        key: 'active-tickets',
        label: 'Has active tickets',
        count: ticketCustomerCount,
        tone: 'warning',
        dot: true,
      },
```

4. In `toCustomerFilters` (line ~149), map the URL field through:

```ts
    hasActiveTickets:
      filters.hasActiveTickets === 'true' || filters.hasActiveTickets === true ? true : undefined,
```

5. Add `hasActiveTickets?: boolean` to the `CustomerFilters` type and make sure the hook forwards it as a query param.

Quick-filter chips in this codebase write into the same filter model the popover uses — read the comment on `CrmQuickFilter` in `crm-table/types.ts` and follow it, so selecting the chip and setting the filter in the popover are the same action.

- [ ] **Step 3: Add the KPI tile**

In `customer-kpi-cards.tsx`, add a tile labelled **"Customers with active tickets"** whose value is the count of customers matching `hasActiveTickets`. Source that number from the customer overview stats endpoint if it already returns it; otherwise call `useCustomers({ hasActiveTickets: true, limit: 1 })` and read `meta.total`, which avoids a new backend endpoint.

Note this tile counts **customers**, not tickets. Give it `deltaDir="down"` — the number rising is bad news, matching the existing convention documented on `StatCardProps`.

Clicking the tile applies the `hasActiveTickets` filter, exactly like the quick-filter chip.

- [ ] **Step 4: Build and exercise the screen**

```bash
npx nx run-many -t lint typecheck -p web
```

In the browser at `/customers`, with at least one customer holding an open ticket and one holding none:

- Expected: the chip reads "1 active ticket" (singular) on the right customer and is **absent** on the others.
- Click the **Has active tickets** chip. Expected: the list narrows to exactly the customers showing a chip — no row without a chip survives, and no chipped row disappears.
- Expected: the **Customers with active tickets** KPI tile value equals the number of rows now showing.
- Open one of those customers, close its only active ticket from the ticket detail screen, then go back to `/customers`. Expected: the chip is gone, the filtered list no longer contains that customer, and the KPI tile has decreased by one. (If the value is stale, the cache invalidation in Task 7 Step 2 is targeting the wrong query key.)
- Create a second ticket for one customer. Expected: the chip reads "2 active tickets" (plural).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): show active ticket chip, filter and KPI on customers list"
```

---

## Task 11: Active-ticket indicator and filter on the projects list

**Files:**
- Modify: `apps/web/components/features/projects/components/project-list-page.tsx`
- Modify: `apps/web/components/features/projects/hooks/` (the `ProjectListItem` and `ProjectFilters` types)

**Interfaces:**
- Consumes: `ActiveTicketsChip` from Task 10; `activeTicketCount` and `hasActiveTickets` on projects from Task 6.
- Produces: nothing new — this task only consumes.

Read the deviation note near the top of this plan first: this screen uses `AdvancedTable`, which has no quick-filter chip row, so the filter is a select column instead.

- [ ] **Step 1: Add the chip to the project row**

Add `activeTicketCount: number` to `ProjectListItem`. In the `COLUMNS` array (~line 222), inside the `projectNumber` cell's `<Stack direction="row" spacing={0.5}>` that already holds the status and priority chips, append:

```tsx
            <ActiveTicketsChip count={project.activeTicketCount} />
```

Import it from `@/components/features/service-tickets`. Do not restyle it — it must render identically to the customers list.

- [ ] **Step 2: Add the filter column**

Add a filterable column to `COLUMNS`:

```ts
  {
    field: 'hasActiveTickets',
    headerName: 'Service Tickets',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Has active tickets', value: 'true' },
      { label: 'No active tickets', value: 'false' },
    ],
    defaultHidden: true,
    renderCell: ({ row }): JSX.Element => (
      <ActiveTicketsChip count={(row as ProjectListItem).activeTicketCount} />
    ),
  },
```

`defaultHidden: true` keeps the column out of the grid (the chip already lives in the project cell) while still offering it in the filter panel — confirm against `ColumnConfig` in `advanced-table/types.ts` that `defaultHidden` behaves that way here; if hidden columns are excluded from the filter panel too, drop `defaultHidden` and give the column a narrow `width` instead.

In `toProjectFilters` (~line 117), map it:

```ts
  if (raw.hasActiveTickets === 'true') result.hasActiveTickets = true;
  else if (raw.hasActiveTickets === 'false') result.hasActiveTickets = false;
```

Add `hasActiveTickets?: boolean` to `ProjectFilters` and make sure `useProjects` forwards it.

Backend note: Task 6 only implemented `hasActiveTickets === true`. Add the `false` branch to `project.repository.ts` as a `NOT EXISTS` with the identical predicate, and do the same in `customer-profile.repository.ts` for symmetry.

- [ ] **Step 3: Build and exercise the screen**

```bash
npx nx run-many -t lint typecheck -p web
```

In the browser at `/projects/list`:

- Expected: projects with an open ticket show the chip next to their status/priority chips, rendered **identically** to the customers list — compare the two screens side by side.
- Open the filter panel, set Service Tickets to **Has active tickets**. Expected: only chipped projects remain.
- Set it to **No active tickets**. Expected: the complement — no chipped project appears.
- Clear the filter, close a project's last active ticket, return. Expected: its chip is gone and it moves into the "No active tickets" set.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): show active ticket chip and filter on projects list"
```

---

## Task 12: Service Tickets tabs on customer, property and project detail

**Files:**
- Create: `apps/web/components/features/service-tickets/components/entity-service-tickets-tab.tsx`
- Modify: `apps/web/components/features/service-tickets/index.ts`
- Modify: `apps/web/components/features/customers/constants.ts`, `customer-detail/customer-detail-page.tsx`
- Modify: `apps/web/components/features/properties/constants.ts`, `property-detail/property-detail-page.tsx`
- Modify: `apps/web/components/features/projects/constants.ts`, `project-detail/project-detail-tabs.tsx`, `project-detail/project-detail-content.tsx`

**Interfaces:**
- Consumes: `useServiceTickets` from Task 7, `ServiceTicketFormDialog` from Task 8.
- Produces:
  ```ts
  interface EntityServiceTicketsTabProps {
    scope: 'customer' | 'property' | 'project';
    /** The customer / property / project id, per `scope`. */
    id: string;
    /** Lets the project and property tabs pre-select the customer on create. */
    customerId?: string;
    enabled: boolean;
  }
  ```

- [ ] **Step 1: Write the shared tab**

`entity-service-tickets-tab.tsx`. One component; all three detail screens render it. It must not branch on `scope` beyond choosing the query param and the empty-state wording:

```tsx
const params = useMemo<ServiceTicketListParams>(() => {
  if (scope === 'customer') return { customerId: id, limit: 50 };
  if (scope === 'property') return { propertyId: id, limit: 50 };
  return { projectId: id, limit: 50 };
}, [scope, id]);

const { data, isLoading } = useServiceTickets(params, enabled);
```

Renders:
- A header row with the count and a **New Ticket** button. The button opens `ServiceTicketFormDialog` with `lockedCustomerId` / `lockedProjectId` set from the scope: customer scope locks the customer; project scope locks both (`customerId` prop supplies the customer); property scope locks the customer and leaves project selectable, scoped to that customer.
- A compact list of tickets — number, title, status chip, priority chip, assignee, created date — each row linking to `buildRoute(ROUTES.SERVICE.DETAIL, { id: ticket.id })`.
- `TabSkeleton` while loading.
- Empty state: "No service tickets for this customer." / "…for this property." / "…for this project."

- [ ] **Step 2: Register the tab on all three detail screens**

**Customer** — add `{ value: 'service', label: 'Service Tickets' }` back into `CUSTOMER_DETAIL_TABS` in `customers/constants.ts` (Task 2 removed it), then in `customer-detail-page.tsx` add the dynamic import, the prefetch-map entry, and the render branch, matching the surrounding tabs:

```tsx
const ServiceTicketsTab = dynamic(
  () =>
    import('@/components/features/service-tickets').then((m) => m.EntityServiceTicketsTab),
  { loading: () => <TabSkeleton />, ssr: false },
);
```

```tsx
            {activeTab === 'service' && (
              <ServiceTicketsTab
                scope="customer"
                id={customerId}
                enabled={isTabEnabled('service')}
              />
            )}
```

**Property** — add `{ value: 'service', label: 'Service Tickets' }` to `PROPERTY_DETAIL_TABS` and wire it the same way in `property-detail-page.tsx`, passing `scope="property"`, `id={propertyId}` and the property's `customerId`.

**Project** — add `{ value: 'service', label: 'Service Tickets' }` to `PROJECT_DETAIL_TABS` in `projects/constants.ts`. `project-detail-tabs.tsx` maps over that constant, so the tab appears automatically; add an entry to `TAB_ICONS` (use the same `Wrench`-style icon the rail uses) or the `Record<ProjectDetailTab, …>` type will fail to typecheck. Then add the render branch in `project-detail-content.tsx` with `scope="project"`, `id={projectId}` and the project's `customerId`.

- [ ] **Step 3: Build and exercise all three tabs**

```bash
npx nx run-many -t lint typecheck -p web
```

In the browser, for a customer who owns a property with a project that has tickets:

- Customer detail → **Service Tickets**. Expected: every ticket for that customer, regardless of project. Click one — it opens `/service/[id]`.
- Click **New Ticket** from that tab. Expected: the dialog opens with the customer pre-filled and locked, and the project select enabled and scoped to that customer. Create a ticket; it appears in the tab without a manual reload.
- Property detail → **Service Tickets**. Expected: only tickets whose project sits at that property — a ticket on a different property of the same customer must **not** appear. This is the derived-property join; if it shows everything, `propertyId` is not reaching the API.
- Project detail → **Service Tickets**. Expected: only that project's tickets. **New Ticket** pre-fills and locks both customer and project.
- Check a customer, property, and project with no tickets. Expected: the correct empty-state wording, no spinner stuck on screen, no console errors.

- [ ] **Step 4: Full-feature regression pass**

Walk the whole feature once, end to end:

1. `/service` — tiles and table load; filters and search work.
2. Create a ticket with photos from `/service`.
3. Open it, move it through in_progress → resolved → closed; confirm the timeline and that closed disables editing.
4. `/customers` — chip, filter, and KPI tile all agree.
5. `/projects/list` — chip and filter agree.
6. All three detail tabs list the right tickets and create with the right context.
7. Delete a ticket; confirm it vanishes from every list, chip, count, and tab.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): add service tickets tab to customer, property and project detail"
```

---

## Self-Review Notes

Checked against `docs/plans/2026-08-09-service-tickets-design.md`:

- Every spec section maps to a task. Teardown → Tasks 1-2. Data model → Task 3. API → Tasks 4-5. Active-count architecture → Task 6. Routes/nav/list screen → Task 7. Form and photos → Task 8. Detail and timeline → Task 9. Customers list surface → Task 10. Projects list surface → Task 11. Three detail tabs → Task 12.
- **One correction to the spec:** the projects list uses `AdvancedTable`, not `CrmTable`, so it gets a select filter column rather than a quick-filter chip. The row chip is identical on both screens. Documented at the top of this plan.
- **One gap the spec left open:** it only specified `hasActiveTickets=true`. Task 11 Step 2 adds the `false` branch to both repositories, since the projects filter panel offers a negative option.
- Names used consistently across tasks: `activeTicketCount`, `hasActiveTickets`, `ACTIVE_TICKET_STATUSES`, `ServiceTicketStatus`, `ServiceTicketPriority`, `ServiceTicketPhoto`, `ActiveTicketsChip`, `EntityServiceTicketsTab`, `ServiceTicketFormDialog`, `generateTicketNumber`, `updateStatus`, `getStats`.
- Several steps say to confirm a local convention before writing (the `EmployeeProfileEntity.user` relation, `CrmTone` members, `MUIStatusChip` props, `useTableUrlState`'s setter, Next.js `params` promise, `ColumnConfig.defaultHidden` behaviour, the customers/projects query keys). Those are verification instructions against real files, not placeholders — each names the exact file to open.
