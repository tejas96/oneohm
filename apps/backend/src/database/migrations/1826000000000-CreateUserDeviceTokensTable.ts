import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserDeviceTokensTable1826000000000 implements MigrationInterface {
  name = 'CreateUserDeviceTokensTable1826000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_device_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token text NOT NULL,
        platform varchar(20) NOT NULL,
        device_model varchar(100),
        is_active boolean NOT NULL DEFAULT true,
        last_seen_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_user_device_tokens_user_token
      ON user_device_tokens(user_id, token)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_user_device_tokens_token
      ON user_device_tokens(token)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_user_device_tokens_user_active
      ON user_device_tokens(user_id, is_active)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_device_tokens`);
  }
}
