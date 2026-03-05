'use client';

import type { AdminPermission } from '../hooks/use-permissions';

import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';

interface PermissionDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission: AdminPermission;
}

export function PermissionDetailModal({
  open,
  onOpenChange,
  permission,
}: PermissionDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Permission Details</DialogTitle>
          <DialogDescription>View details for this permission.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid grid-cols-[120px_1fr] gap-y-2.5 text-sm">
            <span className="text-foreground-tertiary">Name</span>
            <span className="font-medium">{permission.name}</span>
            <span className="text-foreground-tertiary">Code</span>
            <Badge variant="outline" size="xs" className="font-mono w-fit">
              {permission.code}
            </Badge>
            <span className="text-foreground-tertiary">Action</span>
            <Badge variant="secondary" size="xs" className="w-fit capitalize">
              {permission.action}
            </Badge>
            <span className="text-foreground-tertiary">Scope</span>
            <Badge variant="secondary" size="xs" className="w-fit">
              {permission.scope}
            </Badge>
            <span className="text-foreground-tertiary">Level</span>
            <span>{permission.permissionLevel}</span>
            <span className="text-foreground-tertiary">Active</span>
            <span>{permission.isActive ? 'Yes' : 'No'}</span>
            <span className="text-foreground-tertiary">System</span>
            <span>{permission.isSystemPermission ? 'Yes' : 'No'}</span>
            {permission.menuLabel && (
              <>
                <span className="text-foreground-tertiary">Menu Label</span>
                <span>{permission.menuLabel}</span>
              </>
            )}
            {permission.description && (
              <>
                <span className="text-foreground-tertiary">Description</span>
                <span>{permission.description}</span>
              </>
            )}
            <span className="text-foreground-tertiary">Roles Using</span>
            <span>{permission.rolesCount ?? 0}</span>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
