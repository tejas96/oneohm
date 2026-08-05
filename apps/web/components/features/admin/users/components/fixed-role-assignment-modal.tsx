'use client';

import type { FixedRoleCode } from '@tejas96/shared';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState, type JSX } from 'react';

import { FixedRolePicker } from './fixed-role-picker';
import {
  dedupeFixedRoles,
  partitionRoleCodes,
  rolesAreEqual,
} from '../utils/fixed-role-picker-state';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import {
  FixedRolesAdapterError,
  getFixedRolesErrorMessage,
  useFixedRolesSupported,
  useFixedUserRoles,
  useReplaceFixedUserRoles,
} from '@/lib/hooks/resources/fixed-user-roles';


export interface FixedRoleAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onSaved?: (roles: FixedRoleCode[]) => void;
}

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof FixedRolesAdapterError) {
    switch (error.kind) {
      case 'forbidden':
        return 'You are not allowed to save these role changes.';
      case 'conflict':
        return 'Role assignment changed elsewhere. Review the current roles and try again.';
      case 'validation':
        return 'One or more selected roles are invalid.';
      case 'unsupported':
        return 'Role persistence is unavailable on this server.';
      case 'not_found':
        return 'This user or role endpoint was not found.';
      case 'network':
        return 'Network error while saving roles. Your selections were preserved.';
      case 'server':
        return 'Server error while saving roles. Your selections were preserved.';
    }
  }

  return getFixedRolesErrorMessage(error);
}

export function FixedRoleAssignmentModal({
  open,
  onOpenChange,
  userId,
  userName,
  onSaved,
}: FixedRoleAssignmentModalProps): JSX.Element {
  const { data: serverRoles = [], isLoading, isError, error: loadError } = useFixedUserRoles(
    open ? userId : undefined,
  );
  const { data: adapterSupported, isLoading: isSupportLoading } = useFixedRolesSupported();
  const replaceRoles = useReplaceFixedUserRoles();

  const [draftRoles, setDraftRoles] = useState<FixedRoleCode[]>([]);
  const [legacyRoles, setLegacyRoles] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [initializedForUserId, setInitializedForUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setInitializedForUserId(null);
      setSaveError(null);
      return;
    }

    if (isLoading || initializedForUserId === userId) {
      return;
    }

    const partitioned = partitionRoleCodes(serverRoles);
    setDraftRoles(partitioned.canonical);
    setLegacyRoles(partitioned.legacy);
    setInitializedForUserId(userId);
    setSaveError(null);
  }, [open, userId, serverRoles, isLoading, initializedForUserId]);

  const isSaving = replaceRoles.isPending;
  const isAdapterUnavailable = adapterSupported === false;
  const hasChanges = !rolesAreEqual(draftRoles, dedupeFixedRoles(serverRoles));
  const canSave =
    !isSaving &&
    !isLoading &&
    !isSupportLoading &&
    !isAdapterUnavailable &&
    hasChanges;

  const handleSave = useCallback(async (): Promise<void> => {
    setSaveError(null);

    try {
      const savedRoles = await replaceRoles.mutateAsync({
        userId,
        roles: dedupeFixedRoles(draftRoles),
      });
      setDraftRoles(savedRoles);
      setLegacyRoles([]);
      onSaved?.(savedRoles);
      onOpenChange(false);
    } catch (error) {
      setSaveError(getSaveErrorMessage(error));
    }
  }, [draftRoles, onOpenChange, onSaved, replaceRoles, userId]);

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen && isSaving) {
      return;
    }

    if (!nextOpen) {
      setSaveError(null);
    }

    onOpenChange(nextOpen);
  };

  const loadErrorMessage =
    loadError instanceof FixedRolesAdapterError
      ? loadError.message
      : isError
        ? 'Failed to load current roles.'
        : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl" size="lg">
        <DialogHeader>
          <DialogTitle>Manage Roles — {userName}</DialogTitle>
          <DialogDescription>
            Select one or more fixed roles. Changes are saved atomically when you click Save.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {isLoading || isSupportLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {loadErrorMessage ? (
                <p className="rounded-md border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
                  {loadErrorMessage}
                </p>
              ) : null}

              {legacyRoles.length > 0 ? (
                <p className="rounded-md border border-warning/20 bg-warning/5 px-3 py-2 text-sm text-warning">
                  Legacy roles on this account ({legacyRoles.join(', ')}) are shown for migration
                  only and will not be saved.
                </p>
              ) : null}

              {isAdapterUnavailable ? (
                <p className="rounded-md border border-border-light bg-muted px-3 py-2 text-sm text-foreground-secondary">
                  Role persistence is unavailable on this server. You can review selections, but
                  Save is disabled until the fixed-role API is deployed.
                </p>
              ) : null}

              <FixedRolePicker
                selectedRoles={draftRoles}
                onSelectedRolesChange={setDraftRoles}
                targetUserId={userId}
                disabled={isSaving}
              />

              {saveError ? (
                <p className="rounded-md border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
                  {saveError}
                </p>
              ) : null}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save roles'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
