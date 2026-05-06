'use client';

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SecurityIcon from '@mui/icons-material/Security';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { type JSX, useMemo } from 'react';

import { MUIStatusChip, MUITypography } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

// ── Dynamic helpers — no static lookup tables ──────────────────

/**
 * Converts any snake_case or kebab-case string into a human-readable title.
 * "field_worker" → "Field Worker", "site-visits" → "Site Visits"
 */
function toReadableLabel(str: string): string {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extracts the resource prefix from a permission string.
 * "employees:read" → "employees", "quotes:create" → "quotes", "admin" → "admin"
 */
function getResourcePrefix(permission: string): string {
  const idx = permission.indexOf(':');
  return idx !== -1 ? permission.slice(0, idx) : permission;
}

/**
 * Extracts the action part from a permission string and makes it human-readable.
 * "employees:read" → "View", "quotes:create" → "Create"
 */
function getActionLabel(permission: string): string {
  const idx = permission.indexOf(':');
  if (idx === -1) return toReadableLabel(permission);
  const action = permission.slice(idx + 1);
  // Map common actions to cleaner verbs dynamically
  const actionMap: Record<string, string> = {
    read: 'View',
    create: 'Create',
    update: 'Edit',
    delete: 'Delete',
    archive: 'Archive',
    export: 'Export',
    import: 'Import',
    manage: 'Manage',
    approve: 'Approve',
    reject: 'Reject',
    assign: 'Assign',
    restore: 'Restore',
  };
  return actionMap[action] ?? toReadableLabel(action);
}

interface PermissionGroup {
  resource: string;
  label: string;
  permissions: string[];
}

function groupPermissions(permissions: string[]): PermissionGroup[] {
  const map = new Map<string, string[]>();
  for (const perm of permissions) {
    const resource = getResourcePrefix(perm);
    const existing = map.get(resource);
    if (existing) {
      existing.push(perm);
    } else {
      map.set(resource, [perm]);
    }
  }
  return Array.from(map.entries())
    .map(([resource, perms]) => ({
      resource,
      label: toReadableLabel(resource),
      permissions: perms.sort(),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// ── Component ──────────────────────────────────────────────────

export function RolesPermissionsSection(): JSX.Element {
  const { user } = useAuth();

  const roles = user?.roles ?? [];
  const permissions = user?.permissions ?? [];

  const permissionGroups = useMemo(() => groupPermissions(permissions), [permissions]);

  return (
    <Card variant="outlined">
      <CardContent>
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center gap-2">
            <SecurityIcon sx={{ fontSize: 20 }} className="text-foreground-secondary" />
            <MUITypography variant="sectionTitle">Roles &amp; Permissions</MUITypography>
          </div>

          {/* Roles */}
          <div className="flex flex-col gap-2">
            <MUITypography variant="bodyPrimary" className="text-foreground-secondary">
              Assigned Roles
            </MUITypography>
            {roles.length === 0 ? (
              <MUITypography variant="finePrint" className="text-foreground-tertiary italic">
                No roles assigned — contact your administrator.
              </MUITypography>
            ) : (
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <MUIStatusChip
                    key={role}
                    label={toReadableLabel(role)}
                    colorSeed={role}
                    size="small"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Permissions */}
          {permissionGroups.length > 0 && (
            <>
              <Divider />
              <div className="flex flex-col gap-2">
                <MUITypography variant="bodyPrimary" className="text-foreground-secondary">
                  Access Permissions
                  <span className="ml-2 text-xs font-normal text-foreground-tertiary">
                    ({permissions.length} total)
                  </span>
                </MUITypography>
                <div className="flex flex-col gap-1">
                  {permissionGroups.map((group) => (
                    <Accordion
                      key={group.resource}
                      disableGutters
                      elevation={0}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '8px !important',
                        '&:before': { display: 'none' },
                        '&:not(:last-child)': { mb: 0.5 },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
                        sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}
                      >
                        <div className="flex items-center gap-2">
                          <MUITypography variant="bodyPrimary">{group.label}</MUITypography>
                          <MUIStatusChip
                            label={String(group.permissions.length)}
                            size="small"
                            autoColor={false}
                          />
                        </div>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
                        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                          {group.permissions.map((perm) => (
                            <div key={perm} className="flex items-center gap-1.5">
                              <CheckCircleOutlineIcon
                                sx={{ fontSize: 14 }}
                                className="shrink-0 text-primary"
                              />
                              <MUITypography variant="body">{getActionLabel(perm)}</MUITypography>
                            </div>
                          ))}
                        </div>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </div>
              </div>
            </>
          )}

          {permissions.length === 0 && roles.length > 0 && (
            <MUITypography variant="finePrint" className="text-foreground-tertiary italic">
              No specific permissions assigned.
            </MUITypography>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
