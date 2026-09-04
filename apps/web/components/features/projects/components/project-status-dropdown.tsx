'use client';

import { Menu, MenuItem } from '@mui/material';
import { ProjectStatus } from '@tejas96/shared/types';
import { ChevronDown } from 'lucide-react';
import React, { useState } from 'react';

import {
  PROJECT_STATUS_BADGE_VARIANT,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TRANSITIONS,
} from '../constants';
import { useUpdateProjectStatus } from '../hooks';

import { useProjectLedger } from '@/lib/hooks/resources/ledger';
import { formatPaise } from '@/lib/utils/paise';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
} from '@/components/ui/mui-dialog';
import { useGatedAction } from '@/lib/rbac';

type BadgeVariant =
  | 'muted'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'pending'
  | 'blue-subtle'
  | 'green-subtle'
  | 'red-subtle';

interface ProjectStatusDropdownProps {
  projectId: string;
  status: ProjectStatus;
  /** Badge size — xs for list rows, sm for detail header */
  size?: 'xs' | 'sm' | 'default';
  disabled?: boolean;
}

export const ProjectStatusDropdown = React.memo(
  ({
    projectId,
    status,
    size = 'default',
    disabled = false,
  }: ProjectStatusDropdownProps): React.JSX.Element => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [pendingTargetStatus, setPendingTargetStatus] = useState<ProjectStatus | null>(null);

    const updateStatusMutation = useUpdateProjectStatus(projectId);

    /*
     * What the customer still owes, read only while the confirmation is open —
     * the dropdown itself sits on list rows too, and fetching a ledger per row
     * to answer a question nobody has asked yet would be wasteful.
     *
     * Marking a project complete with a balance is allowed: the crew finishing
     * and the final payment arriving are different days in EPC. But it should
     * never happen without the person seeing the number.
     */
    const ledger = useProjectLedger(projectId, { enabled: confirmModalOpen });
    const outstandingPaise = ledger.data?.outstandingPaise ?? 0;
    const completingWithBalance =
      pendingTargetStatus === ProjectStatus.COMPLETED && outstandingPaise > 0;

    const transitions = PROJECT_STATUS_TRANSITIONS[status] || [];
    const label = PROJECT_STATUS_LABELS[status] || status;
    const variant = (PROJECT_STATUS_BADGE_VARIANT[status] || 'secondary') as BadgeVariant;
    const isTerminal = transitions.length === 0;

    const handleOpen = (event: React.MouseEvent<HTMLButtonElement>): void => {
      event.stopPropagation();
      setAnchorEl(event.currentTarget);
    };

    const handleClose = (): void => {
      setAnchorEl(null);
    };

    const handleMenuClick = (event: React.MouseEvent): void => {
      event.stopPropagation();
    };

    const handleTransition = (event: React.MouseEvent, target: ProjectStatus): void => {
      event.stopPropagation();
      setAnchorEl(null);
      setPendingTargetStatus(target);
      setConfirmModalOpen(true);
    };

    const handleConfirm = (): void => {
      if (!pendingTargetStatus) return;
      updateStatusMutation.mutate(pendingTargetStatus, {
        onSuccess: () => {
          setConfirmModalOpen(false);
          setPendingTargetStatus(null);
        },
      });
    };

    const changeStatus = useGatedAction('projects.edit', handleConfirm, 'Change project status');

    if (disabled || isTerminal) {
      return (
        <Badge variant={variant as any} shape="pill" size={size}>
          {label}
        </Badge>
      );
    }

    return (
      <>
        <button
          type="button"
          className="group cursor-pointer focus:outline-none shrink-0"
          onClick={handleOpen}
        >
          <Badge
            variant={variant as any}
            shape="pill"
            size={size}
            className="gap-1 pr-1.5 hover:brightness-95 transition-all shadow-sm"
          >
            {label}
            <ChevronDown className="size-3 opacity-50 group-hover:opacity-100 transition-opacity" />
          </Badge>
        </button>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          onClick={handleMenuClick}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              elevation: 2,
              sx: { minWidth: 140, borderRadius: 1.5, mt: 0.5 },
            },
          }}
        >
          {transitions.map((target) => {
            const targetVariant = PROJECT_STATUS_BADGE_VARIANT[target] as BadgeVariant;
            return (
              <MenuItem
                key={target}
                dense
                onClick={(e) => handleTransition(e, target)}
                sx={{ gap: 1, px: 1.5 }}
              >
                <Badge variant={targetVariant as any} shape="pill" size="xs">
                  {PROJECT_STATUS_LABELS[target] || target}
                </Badge>
              </MenuItem>
            );
          })}
        </Menu>

        {/* Transition Confirmation Modal */}
        <MUIDialog
          open={confirmModalOpen}
          onOpenChange={(open) => {
            setConfirmModalOpen(open);
            if (!open) setPendingTargetStatus(null);
          }}
          size="sm"
        >
          <MUIDialogHeader>
            <MUIDialogTitle>Update Project Status</MUIDialogTitle>
            <MUIDialogDescription>
              Are you sure you want to transition this project status?
            </MUIDialogDescription>
          </MUIDialogHeader>
          <MUIDialogBody>
            <p className="text-sm text-foreground-secondary">
              This will transition the project from{' '}
              <span className="font-semibold text-foreground">
                {PROJECT_STATUS_LABELS[status] || status}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-foreground">
                {pendingTargetStatus
                  ? PROJECT_STATUS_LABELS[pendingTargetStatus] || pendingTargetStatus
                  : ''}
              </span>
              .
            </p>

            {completingWithBalance ? (
              <p
                className="mt-3 rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed"
                style={{ background: 'var(--ds-warning-bg)', color: 'var(--ds-warning)' }}
              >
                <span className="font-semibold">
                  {formatPaise(outstandingPaise)} is still outstanding on this contract.
                </span>{' '}
                Completing does not close the money — the balance stays collectable, and the
                project will show it until it is received or the remaining milestones are waived.
              </p>
            ) : null}
          </MUIDialogBody>
          <MUIDialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              disabled={updateStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={changeStatus.onGatedClick}
              aria-disabled={!changeStatus.allowed}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Updating...' : 'Confirm Status Change'}
            </Button>
          </MUIDialogFooter>
        </MUIDialog>
      </>
    );
  },
);

ProjectStatusDropdown.displayName = 'ProjectStatusDropdown';
