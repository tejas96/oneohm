'use client';

import type { FixedRoleCode } from '@tejas96/shared';
import { type JSX } from 'react';

import { FixedRoleCard } from './fixed-role-card';
import { FixedRoleGrantSummary } from './fixed-role-grant-summary';
import {
  buildFixedRoleGroupSections,
  toggleFixedRoleSelection,
  type OwnerGovernanceDenialReason,
} from '../utils/fixed-role-picker-state';

import { showFeatureAccessDenied } from '@/lib/access-control/access-feedback';
import { useAccessRoles } from '@/lib/hooks/use-feature-access';
import { useAuth } from '@/providers/auth-provider';


export interface FixedRolePickerProps {
  selectedRoles: readonly FixedRoleCode[];
  onSelectedRolesChange: (roles: FixedRoleCode[]) => void;
  targetUserId: string;
  disabled?: boolean;
}

function getGovernanceMessage(reason: OwnerGovernanceDenialReason): string {
  switch (reason) {
    case 'owner_roles':
      return 'Owner roles';
    case 'self_owner_removal':
      return 'Self owner-role removal';
    default:
      return 'Role assignment';
  }
}

export function FixedRolePicker({
  selectedRoles,
  onSelectedRolesChange,
  targetUserId,
  disabled = false,
}: FixedRolePickerProps): JSX.Element {
  const { user: currentUser } = useAuth();
  const actorRoles = useAccessRoles();
  const sections = buildFixedRoleGroupSections();

  const handleToggle = (role: FixedRoleCode, checked: boolean): void => {
    const result = toggleFixedRoleSelection(selectedRoles, role, checked, {
      actorRoles,
      actorUserId: currentUser?.id ?? '',
      targetUserId,
    });

    if (!result.ok) {
      showFeatureAccessDenied({
        feature: 'admin.ownerRoles.manage',
        label: getGovernanceMessage(result.reason),
      });
      return;
    }

    onSelectedRolesChange(result.roles);
  };

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.group} aria-labelledby={`fixed-role-group-${section.group}`}>
          <h3
            id={`fixed-role-group-${section.group}`}
            className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-secondary"
          >
            {section.label}
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {section.roles.map((role) => (
              <FixedRoleCard
                key={role.code}
                role={role}
                checked={selectedRoles.includes(role.code)}
                disabled={disabled}
                onCheckedChange={(checked) => handleToggle(role.code, checked)}
              />
            ))}
          </div>
        </section>
      ))}

      <FixedRoleGrantSummary selectedRoles={selectedRoles} />
    </div>
  );
}
