import type { JSX } from 'react';

import type { CrmTone } from '@/components/shared/crm-table';
import { color } from '@/lib/theme/tokens';

const PILL_PALETTE: Record<CrmTone, { ink: string; bg: string }> = {
  neutral: { ink: color.neutral, bg: color['neutral-bg'] },
  accent: { ink: color['accent-ink'], bg: color['accent-subtle'] },
  success: { ink: color.success, bg: color['success-bg'] },
  info: { ink: color.info, bg: color['info-bg'] },
  warning: { ink: color.warning, bg: color['warning-bg'] },
  danger: { ink: color.danger, bg: color['danger-bg'] },
};

/** A status or priority beside a row's name: present on every row, never louder than it. */
export function QuietPill({ label, tone }: { label: string; tone: CrmTone }): JSX.Element {
  const palette = PILL_PALETTE[tone];
  return (
    <span
      title={label}
      // Gives way long before the name does (the name shrinks 1 for its 999).
      className="block min-w-7 shrink-[999] truncate rounded-pill px-2 py-0.5 text-[11px] font-medium leading-[13px]"
      style={{ color: palette.ink, backgroundColor: palette.bg }}
    >
      {label}
    </span>
  );
}
