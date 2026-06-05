import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateProjectChatAndFeedbackTables1834000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add rating and comment columns to project_team_members table
    await queryRunner.query(`
      ALTER TABLE "project_team_members"
      ADD COLUMN "rating" integer,
      ADD COLUMN "comment" text;
    `);

    // 2. Create project_chat_messages table
    await queryRunner.query(`
      CREATE TABLE "project_chat_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "message_text" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_project_chat_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_chat_messages_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_chat_messages_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // 3. Create indexes for chat messages
    await queryRunner.query(`
      CREATE INDEX "IDX_project_chat_messages_project" ON "project_chat_messages" ("project_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_project_chat_messages_created" ON "project_chat_messages" ("created_at" ASC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_chat_messages_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_chat_messages_project"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_chat_messages"`);
    await queryRunner.query(`
      ALTER TABLE "project_team_members"
      DROP COLUMN IF EXISTS "comment",
      DROP COLUMN IF EXISTS "rating";
    `);
  }
}
