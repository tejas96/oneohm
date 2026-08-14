import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Removes the `employee_basic` role and every assignment of it.
 *
 * It was never chosen by anyone. Both employee-creation paths attached it
 * automatically, so 43 people ended up holding a role nobody picked for them.
 * Those paths no longer assign anything — a superadmin decides — and this
 * clears the backlog they left behind.
 *
 * WHAT PEOPLE LOSE: the role currently grants `customers.view`, so all 43 lose
 * the customer list until a superadmin grants them a role. Three of them end up
 * with no roles at all. That is the intent, not a side effect: nobody should
 * keep access that was handed out by a default.
 *
 * Nobody is locked out. Sign-in checks for a profile, not a role, so a person
 * with zero roles still logs in and sees their own profile and tasks.
 *
 * ONE-WAY. `down()` recreates the empty role so the schema matches again, but
 * it cannot know who used to hold it — those 43 assignments are gone for good.
 */
export class RemoveEmployeeBasicRole1855100000000 implements MigrationInterface {
  name = 'RemoveEmployeeBasicRole1855100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ordered child-first so no foreign key is ever left dangling.

    // 1. Unassign it from everyone. Matches on the FK and on the legacy `role`
    //    string, because older rows were written before `role_id` existed and
    //    deleting only by FK would strand them.
    await queryRunner.query(`
      DELETE FROM user_roles
      WHERE role_id IN (SELECT id FROM roles WHERE code = 'employee_basic')
         OR role = 'employee_basic'
    `);

    // 2. Drop its permission grants.
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE role_id IN (SELECT id FROM roles WHERE code = 'employee_basic')
    `);

    // 3. Drop the role itself. A hard delete, not a soft one: a soft-deleted
    //    role still occupies its unique `code`, so recreating it later would
    //    collide.
    await queryRunner.query(`DELETE FROM roles WHERE code = 'employee_basic'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restores the row so the roles list looks as it did. It comes back empty:
    // the grants and the 43 assignments are not recoverable from here.
    await queryRunner.query(`
      INSERT INTO roles (id, code, name, description, is_system_role, level, created_at, updated_at)
      VALUES (gen_random_uuid(), 'employee_basic', 'Employee Basic', 'Basic employee access', false, 4, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING
    `);
  }
}
