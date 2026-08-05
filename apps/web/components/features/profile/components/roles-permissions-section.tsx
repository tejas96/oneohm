'use client';

import SecurityIcon from '@mui/icons-material/Security';
import { Card, CardContent, Divider } from '@mui/material';
import { getRolePresentation } from '@tejas96/shared';
import { type JSX, useMemo } from 'react';

import { FixedRoleBadges } from '@/components/features/admin/users/components/fixed-role-badges';
import { MUITypography } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export function RolesPermissionsSection(): JSX.Element {
  const { user } = useAuth();

  const roles = user?.roles ?? [];

  const roleResponsibilities = useMemo(
    () =>
      roles.map((roleCode) => ({
        code: roleCode,
        presentation: getRolePresentation(roleCode),
      })),
    [roles],
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <SecurityIcon sx={{ fontSize: 20 }} className="text-foreground-secondary" />
            <MUITypography variant="sectionTitle">Roles &amp; Permissions</MUITypography>
          </div>

          <div className="flex flex-col gap-2">
            <MUITypography variant="bodyPrimary" className="text-foreground-secondary">
              Assigned Roles
            </MUITypography>
            {roles.length === 0 ? (
              <MUITypography variant="finePrint" className="text-foreground-tertiary italic">
                No roles assigned — contact your administrator.
              </MUITypography>
            ) : (
              <FixedRoleBadges roles={roles} />
            )}
          </div>

          {roles.length > 0 ? (
            <>
              <Divider />
              <div className="flex flex-col gap-2">
                <MUITypography variant="bodyPrimary" className="text-foreground-secondary">
                  Role Responsibilities
                </MUITypography>
                <div className="flex flex-col gap-3">
                  {roleResponsibilities.map(({ code, presentation }) => (
                    <div key={code}>
                      <MUITypography variant="bodyPrimary">
                        {presentation.isLegacy
                          ? `${presentation.label} (Legacy role)`
                          : presentation.label}
                      </MUITypography>
                      {presentation.shortDescription ? (
                        <MUITypography variant="body" className="text-foreground-secondary">
                          {presentation.shortDescription}
                        </MUITypography>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
