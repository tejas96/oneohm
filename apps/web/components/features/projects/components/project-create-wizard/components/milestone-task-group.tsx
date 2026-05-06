'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Tooltip from '@mui/material/Tooltip';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { useEffect, useRef, useState } from 'react';

import {
  TaskRowWizard,
  type TaskAssignment,
  type MilestoneOption,
  type TaskMilestoneOverride,
  type TeamMemberOption,
} from './task-row-wizard';

import { Accordion, AccordionContent, AccordionItem } from '@/components/ui';
import type { WorkflowStep } from '@/lib/hooks/resources';

// ── Types ──────────────────────────────────────────────────────

export interface MilestoneGroup {
  name: string;
  order: number;
}

interface MilestoneTaskGroupProps {
  milestone: MilestoneGroup;
  tasks: WorkflowStep[];
  excludedStepIds: string[];
  taskAssignments: TaskAssignment[];
  taskMilestoneOverrides: TaskMilestoneOverride[];
  milestoneOptions: MilestoneOption[];
  teamMemberOptions: TeamMemberOption[];
  memberRoleMap: Map<string, string>;
  userRoleLabelMap: Map<string, string>;
  canDelete: boolean;
  onToggleExclude: (stepId: string) => void;
  onAssignmentChange: (stepId: string, userId: string) => void;
  onMilestoneChange: (
    stepId: string,
    milestoneName: string | null,
    milestoneOrder: number | null,
  ) => void;
  onDelete: (milestoneName: string) => void;
  onRename: (oldName: string, newName: string) => void;
}

// ── Component ─────────────────────────────────────────────────

export function MilestoneTaskGroup({
  milestone,
  tasks,
  excludedStepIds,
  taskAssignments,
  taskMilestoneOverrides,
  milestoneOptions,
  teamMemberOptions,
  memberRoleMap,
  userRoleLabelMap,
  canDelete,
  onToggleExclude,
  onAssignmentChange,
  onMilestoneChange,
  onDelete,
  onRename,
}: MilestoneTaskGroupProps): React.JSX.Element {
  const includedCount = tasks.filter((t) => !excludedStepIds.includes(t.id)).length;
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(milestone.name);
  // Track open state explicitly so a rename (which changes milestone.name used as AccordionItem
  // value) doesn't collapse the accordion.
  const [openItems, setOpenItems] = useState<string[]>([milestone.name]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track the previous name so we can update openItems when a rename happens
  const prevNameRef = useRef(milestone.name);

  useEffect(() => {
    const prevName = prevNameRef.current;
    if (prevName !== milestone.name) {
      // Name changed (rename) — update openItems to use the new name, preserving open/closed state
      setOpenItems((prev) => prev.map((v) => (v === prevName ? milestone.name : v)));
      prevNameRef.current = milestone.name;
    }
    if (!isEditing) setDraftName(milestone.name);
  }, [milestone.name, isEditing]);

  function startEditing(e: React.MouseEvent): void {
    e.stopPropagation();
    e.preventDefault();
    setDraftName(milestone.name);
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }

  function commitEdit(): void {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== milestone.name) {
      onRename(milestone.name, trimmed);
    } else {
      setDraftName(milestone.name);
    }
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === 'Escape') {
      setDraftName(milestone.name);
      setIsEditing(false);
    }
  }

  return (
    <Accordion type="multiple" value={openItems} onValueChange={setOpenItems}>
      <AccordionItem value={milestone.name} className="border border-border-light rounded-lg mb-3">
        {/* Custom header: trigger + action buttons as siblings to avoid button-in-button */}
        <AccordionPrimitive.Header className="flex items-center">
          <AccordionPrimitive.Trigger className="flex flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors [&[data-state=open]>svg:last-child]:rotate-180">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
              {milestone.order}
            </div>

            {/* Inline editable name */}
            {isEditing ? (
              <InputBase
                inputRef={inputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                size="small"
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  border: '1px solid',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  px: 1,
                  py: 0.25,
                  minWidth: 140,
                  bgcolor: 'background.paper',
                }}
                inputProps={{ 'aria-label': 'Rename milestone' }}
              />
            ) : (
              <span className="text-sm font-medium text-foreground">{milestone.name}</span>
            )}

            <span className="text-xs text-foreground-secondary ml-auto">
              {includedCount}/{tasks.length} tasks
            </span>
            <ExpandMoreIcon
              className="shrink-0 text-foreground-tertiary transition-transform duration-200"
              sx={{ fontSize: 16 }}
            />
          </AccordionPrimitive.Trigger>

          {/* Action buttons live outside the trigger — no nested <button> */}
          <div className="flex items-center gap-0.5 pr-3">
            <Tooltip title="Rename milestone">
              <IconButton
                size="small"
                onClick={startEditing}
                aria-label={`Rename ${milestone.name}`}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={canDelete ? 'Delete milestone' : 'At least one milestone required'}>
              <span>
                <IconButton
                  size="small"
                  disabled={!canDelete}
                  onClick={() => onDelete(milestone.name)}
                  aria-label={`Delete ${milestone.name}`}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </div>
        </AccordionPrimitive.Header>

        <AccordionContent className="px-2 pb-3">
          {tasks.length === 0 ? (
            <div className="p-3 text-center">
              <span className="text-sm text-foreground-secondary">No tasks in this milestone.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {tasks.map((task) => (
                <TaskRowWizard
                  key={task.id}
                  step={task}
                  isExcluded={excludedStepIds.includes(task.id)}
                  assignment={taskAssignments.find((a) => a.workflowStepId === task.id)}
                  milestoneOverride={taskMilestoneOverrides.find(
                    (o) => o.workflowStepId === task.id,
                  )}
                  currentGroupMilestoneName={milestone.name}
                  milestoneOptions={milestoneOptions}
                  teamMemberOptions={teamMemberOptions}
                  memberRoleMap={memberRoleMap}
                  userRoleLabelMap={userRoleLabelMap}
                  onToggleExclude={onToggleExclude}
                  onAssignmentChange={onAssignmentChange}
                  onMilestoneChange={onMilestoneChange}
                />
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
