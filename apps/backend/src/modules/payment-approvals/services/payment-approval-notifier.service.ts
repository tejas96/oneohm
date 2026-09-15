import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { NotificationSeverity, NotificationType } from '@tejas96/shared/types';
import { formatCurrencyDecimal } from '@tejas96/shared/utils';
import { DataSource } from 'typeorm';

import { APPROVAL_BY_ID_SQL } from './payment-approval-queries.sql';
import type { ApprovalRow } from './payment-approval.service';
import { ADMIN_BYPASS_ROLES } from '../../iam/constants';
import { NotificationService } from '../../notifications/services/notification.service';

/**
 * Who may approve. Duplicated from `apps/web/lib/rbac/catalog.ts` on purpose —
 * the backend does not import from the web app (see `admin-roles.ts`).
 */
const APPROVE_PERMISSION = 'finance.approvals.process';

/**
 * The people who can act on a payment, and the submitter once it is decided.
 *
 * Every send happens AFTER the approval's transaction has committed, and never
 * throws: a notification is a courtesy, and must not be the reason a payment
 * fails to be recorded or approved. `NotificationService.create` already
 * swallows its own errors; this class catches the lookups around it.
 *
 * Permission rules mirror `IamService.getUserPermissions`: a soft-deleted role
 * grants nothing, and neither does an inactive permission.
 */
@Injectable()
export class PaymentApprovalNotifier {
  private readonly logger = new Logger(PaymentApprovalNotifier.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
  ) {}

  /** A payment is waiting. Goes to everyone who may approve it. */
  submitted(approvalId: string): void {
    this.fire(approvalId, 'submitted', async (row) => {
      const recipients = await this.approverIds(row.submittedBy);
      if (recipients.length === 0) {
        this.logger.warn(
          `${row.requestNo}: nobody else can approve it — no active user holds ${APPROVE_PERMISSION} or an admin role`,
        );
        return;
      }
      const who = row.submittedByName ?? 'Someone';
      const roles = row.submittedByRoles ? ` (${row.submittedByRoles})` : '';
      await Promise.all(
        recipients.map((userId) =>
          this.notificationService.create({
            userId,
            type: NotificationType.PAYMENT_APPROVAL_PENDING,
            title: `${describePayment(row)} waiting for approval`,
            body: joinParts([row.requestNo, where(row), `Recorded by ${who}${roles}`]),
            // Opens this request in the approvals drawer, not just the queue.
            link: `/finance/approvals?open=${row.id}`,
            metadata: metadataOf(row),
            dedupeKey: `payment-approval:${row.id}:submitted`,
          }),
        ),
      );
    });
  }

  /** Approved. Tells the person who recorded it. */
  approved(approvalId: string): void {
    this.fire(approvalId, 'approved', async (row) => {
      await this.notificationService.create({
        userId: row.submittedBy,
        type: NotificationType.PAYMENT_APPROVED,
        title: `Your ${describePayment(row)} was approved`,
        body: joinParts([
          row.requestNo,
          where(row),
          `Approved by ${row.reviewedByName ?? 'an approver'}`,
        ]),
        link: await this.linkForSubmitter(row, 'approved'),
        metadata: metadataOf(row),
        dedupeKey: `payment-approval:${row.id}:approved`,
      });
    });
  }

  /** Rejected. Tells the person who recorded it, reason first. */
  rejected(approvalId: string): void {
    this.fire(approvalId, 'rejected', async (row) => {
      await this.notificationService.create({
        userId: row.submittedBy,
        type: NotificationType.PAYMENT_REJECTED,
        title: `Your ${describePayment(row)} was rejected`,
        body: joinParts([
          `Reason: ${row.rejectionReason ?? 'none given'}`,
          row.requestNo,
          where(row),
          `Rejected by ${row.reviewedByName ?? 'an approver'}`,
        ]),
        severity: NotificationSeverity.WARNING,
        link: await this.linkForSubmitter(row, 'rejected'),
        metadata: metadataOf(row),
        dedupeKey: `payment-approval:${row.id}:rejected`,
      });
    });
  }

  private fire(approvalId: string, event: string, send: (row: ApprovalRow) => Promise<void>): void {
    void (async () => {
      const [row] = await this.dataSource.query<ApprovalRow[]>(APPROVAL_BY_ID_SQL, [approvalId]);
      if (row) await send(row);
    })().catch((error: unknown) =>
      this.logger.error(
        `Payment approval notification (${event}) failed for ${approvalId}`,
        error instanceof Error ? error.stack : error,
      ),
    );
  }

  /**
   * Holders of the approve permission, never the submitter — the four-eyes
   * check would refuse them anyway. Admins are the fallback only when nobody
   * holds the permission, so a payment never waits with nobody told.
   */
  private async approverIds(submitterId: string): Promise<string[]> {
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      `WITH approvers AS (
         SELECT DISTINCT u.id
           FROM users u
           JOIN user_roles ur ON ur.user_id = u.id
           JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
           JOIN role_permissions rp ON rp.role_id = r.id
           JOIN permissions p ON p.id = rp.permission_id AND p.is_active IS TRUE
          WHERE p.code = $1
            AND u.deleted_at IS NULL AND u.status = 'active'
            AND u.id <> $2
       ),
       admins AS (
         SELECT DISTINCT u.id
           FROM users u
           JOIN user_roles ur ON ur.user_id = u.id
           LEFT JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
          WHERE COALESCE(r.code, ur.role) = ANY($3::text[])
            AND u.deleted_at IS NULL AND u.status = 'active'
            AND u.id <> $2
       )
       SELECT id FROM approvers
       UNION ALL
       SELECT id FROM admins WHERE NOT EXISTS (SELECT 1 FROM approvers)`,
      [APPROVE_PERMISSION, submitterId, [...ADMIN_BYPASS_ROLES]],
    );
    return rows.map((r) => r.id);
  }

  /**
   * A link the submitter can actually open. The project's Finance tab is where
   * they recorded it; the approvals list is the fallback for someone who can see
   * approvals but not projects. Neither, and there is no link — the body already
   * says what happened, which beats a link to "access denied".
   */
  private async linkForSubmitter(
    row: ApprovalRow,
    status: 'approved' | 'rejected',
  ): Promise<string | undefined> {
    const [access] = await this.dataSource.query<Array<{ isAdmin: boolean; codes: string[] }>>(
      `SELECT
         EXISTS (SELECT 1 FROM user_roles ur
                   LEFT JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                  WHERE ur.user_id = $1 AND COALESCE(r.code, ur.role) = ANY($2::text[])) AS "isAdmin",
         ARRAY(SELECT DISTINCT p.code FROM user_roles ur
                 JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                 JOIN role_permissions rp ON rp.role_id = r.id
                 JOIN permissions p ON p.id = rp.permission_id AND p.is_active IS TRUE
                WHERE ur.user_id = $1
                  AND p.code IN ('projects.view', 'finance.approvals.view')) AS "codes"`,
      [row.submittedBy, [...ADMIN_BYPASS_ROLES]],
    );
    if (access?.isAdmin || access?.codes.includes('projects.view')) {
      return `/projects/${row.projectId}?tab=finance`;
    }
    if (access?.codes.includes('finance.approvals.view')) {
      return `/finance/approvals?status=${status}&open=${row.id}`;
    }
    return undefined;
  }
}

/** "₹25,000 receipt", "₹4,500.50 credit bill". */
function describePayment(row: ApprovalRow): string {
  const amount = formatCurrencyDecimal(Math.abs(Number(row.amountPaise)) / 100);
  let kind: string;
  if (row.kind === 'receipt') kind = 'receipt';
  else if (row.kind === 'vendor_payment') kind = 'vendor payment';
  else if (row.kind === 'reversal') kind = 'reversal';
  else kind = row.isCredit ? 'credit bill' : 'expense';
  return `${amount} ${kind}`;
}

/** "Vendor ABC Traders · P-0012, Ramesh Patil" — whatever of it is known. */
function where(row: ApprovalRow): string {
  const project = [row.projectNumber ?? row.projectName, row.customerName]
    .filter(Boolean)
    .join(', ');
  return joinParts([row.vendorName ? `Vendor ${row.vendorName}` : null, project]);
}

/** Joins the known parts with a middot, skipping blanks so no "a ·  · b". */
function joinParts(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}

function metadataOf(row: ApprovalRow): Record<string, unknown> {
  return {
    approvalId: row.id,
    requestNo: row.requestNo,
    projectId: row.projectId,
    kind: row.kind,
    amountPaise: Math.abs(Number(row.amountPaise)),
  };
}
