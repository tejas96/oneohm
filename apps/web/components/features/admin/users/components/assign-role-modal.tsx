/* eslint-disable @typescript-eslint/no-unsafe-return -- role assignment from API response */
'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState, type JSX } from 'react';

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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { showToast } from '@/components/ui/sonner';
import { useUserRoles, useUserRoleMutations, useRoles } from '@/lib/hooks/resources';

interface AssignRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function AssignRoleModal({
  open,
  onOpenChange,
  userId,
  userName,
}: AssignRoleModalProps): JSX.Element {
  const { items: userRoles, isLoading } = useUserRoles(userId);
  const userRoleMutations = useUserRoleMutations();
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(['']);
  const [isAssigning, setIsAssigning] = useState(false);

  const { items: allRoles } = useRoles({ syncToUrl: false, defaultPageSize: 100 });
  const availableRoles = allRoles.filter(() => true);

  const assignedRoleIds = new Set(userRoles.map((ur) => ur.roleId));

  const allSelectedIds = new Set(selectedRoleIds.filter(Boolean));

  const getFilteredRoles = (currentIndex: number): typeof availableRoles => {
    return availableRoles.filter((r) => {
      if (assignedRoleIds.has(r.id)) return false;
      if (allSelectedIds.has(r.id) && selectedRoleIds[currentIndex] !== r.id) return false;
      return true;
    });
  };

  const handleRoleChange = (index: number, roleId: string): void => {
    const updated = [...selectedRoleIds];
    updated[index] = roleId;

    if (index === updated.length - 1 && roleId) {
      updated.push('');
    }
    setSelectedRoleIds(updated);
  };

  const handleRemoveRow = (index: number): void => {
    if (selectedRoleIds.length <= 1) {
      setSelectedRoleIds(['']);
      return;
    }
    setSelectedRoleIds(selectedRoleIds.filter((_, i) => i !== index));
  };

  const rolesToAssign = selectedRoleIds.filter(Boolean);

  const handleAssignAll = useCallback(async (): Promise<void> => {
    if (rolesToAssign.length === 0) return;
    setIsAssigning(true);
    let successCount = 0;
    let failCount = 0;

    for (const roleId of rolesToAssign) {
      try {
        await userRoleMutations.create.mutateAsync({
          userId,
          roleId,
        } as unknown as Record<string, unknown> & { id: string });
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsAssigning(false);
    if (successCount > 0) {
      showToast.success(`${successCount} role${successCount > 1 ? 's' : ''} assigned successfully`);
      setSelectedRoleIds(['']);
      onOpenChange(false);
    }
    if (failCount > 0 && successCount === 0) {
      showToast.error('Failed to assign roles');
    }
  }, [rolesToAssign, userRoleMutations, userId, onOpenChange]);

  const handleClose = (isOpen: boolean): void => {
    if (!isOpen) {
      setSelectedRoleIds(['']);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Assign Roles — {userName}</DialogTitle>
          <DialogDescription>
            Select one or more roles to assign. Role removal is managed from the user detail page.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Roles</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            ) : !userRoles?.length ? (
              <p className="text-sm text-foreground-tertiary py-3">No roles assigned</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userRoles.map((ur) => (
                  <Badge key={ur.id} variant="secondary" size="sm">
                    {ur.roleName ?? ur.roleCode}
                    <span className="ml-1 text-[10px] opacity-60">{'Platform'}</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Add Roles</Label>
            <div className="space-y-2">
              {selectedRoleIds.map((roleId, index) => {
                const filteredRoles = getFilteredRoles(index);
                const isLastEmpty = index === selectedRoleIds.length - 1 && !roleId;
                return (
                  <div key={index} className="flex items-center gap-2">
                    <Select value={roleId} onValueChange={(v) => handleRoleChange(index, v)}>
                      <SelectTrigger className="flex-1 h-9 text-sm">
                        <SelectValue placeholder="Select a role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                            {role.isSystemRole ? ' (System)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!isLastEmpty && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-9 p-0 shrink-0 text-foreground-tertiary hover:text-error"
                        onClick={() => handleRemoveRow(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                    {isLastEmpty && <div className="size-9 shrink-0" />}
                  </div>
                );
              })}
            </div>
            {rolesToAssign.length > 0 && (
              <p className="text-xs text-foreground-tertiary">
                {rolesToAssign.length} role{rolesToAssign.length > 1 ? 's' : ''} selected to assign
              </p>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isAssigning}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleAssignAll()}
            disabled={rolesToAssign.length === 0 || isAssigning}
          >
            {isAssigning ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Plus className="mr-1 size-4" />
                Assign Roles ({rolesToAssign.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
