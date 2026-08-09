import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * CreateServiceTicketTables
 *
 * The two partial indexes are what make the CRM chip and the "has active
 * tickets" filter cheap: both list queries probe only open/in_progress rows
 * that have not been soft-deleted, which stays a small slice of the table even
 * as closed tickets accumulate.
 *
 * There is deliberately no property_id column — property derives through
 * projects.property_id, which is NOT NULL.
 */
export class CreateServiceTicketTables1854000000001 implements MigrationInterface {
  name = 'CreateServiceTicketTables1854000000001';

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

    // Partial indexes — these drive the chip counts and both list filters.
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
