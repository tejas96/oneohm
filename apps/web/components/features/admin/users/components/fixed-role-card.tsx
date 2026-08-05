'use client';

import type { FixedRoleDefinition } from '@tejas96/shared';
import { type JSX } from 'react';

import { Badge, MUISwitch } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface FixedRoleCardProps {
  role: FixedRoleDefinition;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function FixedRoleCard({
  role,
  checked,
  disabled = false,
  onCheckedChange,
}: FixedRoleCardProps): JSX.Element {
  const isComingSoon = role.availability === 'coming_soon';
  const switchId = `fixed-role-${role.code}`;

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors duration-fast',
        checked
          ? 'border-primary bg-primary/5'
          : 'border-border-light bg-background hover:border-primary/40 hover:bg-primary/[0.03]',
        disabled && 'opacity-60',
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={switchId} className="text-sm font-medium text-foreground">
            {role.label}
          </label>
          {isComingSoon ? (
            <Badge variant="pending" size="xs">
              Coming soon
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-foreground-tertiary">{role.shortDescription}</p>
      </div>

      <MUISwitch
        id={switchId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        inputProps={{
          'aria-label': `${checked ? 'Remove' : 'Assign'} ${role.label} role`,
        }}
      />
    </div>
  );
}
