import { toast } from 'sonner';

import type { FeatureAccessKey } from './feature-policy';

export const ACCESS_DENIED_MESSAGE =
  'Access denied. Your assigned roles do not allow this action. Contact a Superadmin if you need access.';

export interface FeatureAccessDeniedOptions {
  feature?: FeatureAccessKey;
  label?: string;
}

let lastDeniedAt = 0;
const DEDUPE_MS = 1500;

export function showFeatureAccessDenied(options?: FeatureAccessDeniedOptions): void {
  const now = Date.now();
  if (now - lastDeniedAt < DEDUPE_MS) {
    return;
  }
  lastDeniedAt = now;

  const label = options?.label?.trim();
  toast.error(label ? `${ACCESS_DENIED_MESSAGE} (${label})` : ACCESS_DENIED_MESSAGE);
}

export function isAccessDeniedError(status: number | undefined): boolean {
  return status === 403;
}
