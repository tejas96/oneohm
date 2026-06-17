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
          </MUIDialogBody>
          <MUIDialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              disabled={updateStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? 'Updating...' : 'Confirm Status Change'}
            </Button>
          </MUIDialogFooter>
        </MUIDialog>
      </>
    );
  },
);

ProjectStatusDropdown.displayName = 'ProjectStatusDropdown';
