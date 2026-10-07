/**
 * One row of `GET /notifications`, as web and mobile read it.
 * Unread is `readAt === null`; there is no `isRead`.
 */
export interface NotificationItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string | null;
  /** Web path. Customer notifications carry `/consumer/...`, which web skips. */
  link: string | null;
  /** Staff notifications: `mobilePath` plus entity ids only. */
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}
