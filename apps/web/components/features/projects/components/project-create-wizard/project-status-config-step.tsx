'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { LookupTypeCode, type TaskStatus, type TaskStatusConfig } from '@tejas96/shared/types';
import { useEffect, useRef } from 'react';
import { type UseFormReturn } from 'react-hook-form';

import type { ProjectCreateFormData } from '../../schemas/project-create.schema';

import { useLookupOptions } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

// ============================================================================
// ProjectStatusConfigStep
// ============================================================================

interface ProjectStatusConfigStepProps {
  form: UseFormReturn<ProjectCreateFormData>;
}

export function ProjectStatusConfigStep({ form }: ProjectStatusConfigStepProps): React.JSX.Element {
  const { setValue, watch, formState } = form;
  const taskStatuses = watch('taskStatuses') as TaskStatusConfig[] | undefined;
  const currentStatuses: TaskStatusConfig[] = taskStatuses ?? [];

  const { items, isLoading, isError, error } = useLookupOptions(LookupTypeCode.DEFAULT_TASK_STATUS);

  // Track whether we've already pre-populated so we don't overwrite user edits
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    if (!isLoading && !isError && items.length > 0) {
      initializedRef.current = true;
      const mapped: TaskStatusConfig[] = items.map((item) => ({
        code: item.value as TaskStatus,
        label: item.label,
        color: item.color ?? '#6B7280',
        orderIndex: item.orderIndex,
      }));
      setValue('taskStatuses', mapped, { shouldDirty: false });
    }
  }, [isLoading, isError, items, setValue]);

  function handleRemove(code: string): void {
    const updated = currentStatuses.filter((s) => (s.code as string) !== code);
    setValue('taskStatuses', updated, { shouldValidate: true, shouldDirty: true });
  }

  function handleRestore(code: string): void {
    const lookupItem = items.find((item) => item.value === code);
    if (!lookupItem) return;
    const restored: TaskStatusConfig = {
      code: lookupItem.value as TaskStatus,
      label: lookupItem.label,
      color: lookupItem.color ?? '#6B7280',
      orderIndex: lookupItem.orderIndex,
    };
    const updated = [...currentStatuses, restored].sort((a, b) => a.orderIndex - b.orderIndex);
    setValue('taskStatuses', updated, { shouldValidate: true, shouldDirty: true });
  }

  const removedStatuses = items.filter(
    (item) => !currentStatuses.some((s) => (s.code as string) === item.value),
  );

  // The first status from the lookup is the default start status for new tasks.
  // Warn the user if they remove it.
  const defaultStartCode = items[0]?.value ?? null;
  const defaultStartRemoved =
    !isLoading &&
    !isError &&
    defaultStartCode !== null &&
    currentStatuses.length > 0 &&
    !currentStatuses.some((s) => (s.code as string) === defaultStartCode);
  const defaultStartLabel = items[0]?.label ?? 'first';

  const taskStatusesError = (formState.errors as Record<string, { message?: string }>).taskStatuses
    ?.message;

  return (
    <Stack spacing={1.5}>
      {/* Loading skeletons */}
      {isLoading && (
        <Stack spacing={1}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={40} />
          ))}
        </Stack>
      )}

      {/* Error state — shows the server error message, no silent fallback */}
      {isError && (
        <Alert severity="error" icon={false}>
          Failed to load default statuses: {getErrorMessage(error)}
        </Alert>
      )}

      {/* Empty lookup after successful load */}
      {!isLoading && !isError && items.length === 0 && (
        <Alert severity="warning" icon={false}>
          No default statuses found. Add them in Admin → Lookups under
          &apos;default_task_status&apos; before creating a project.
        </Alert>
      )}

      {/* Default start status removal warning */}
      {defaultStartRemoved && (
        <Alert severity="warning" icon={<ReportProblemOutlinedIcon fontSize="small" />}>
          New tasks start with &apos;{defaultStartLabel}&apos; status. Removing it means they will
          appear under your first column.
        </Alert>
      )}

      {/* Status rows */}
      {!isLoading && currentStatuses.length > 0 && (
        <Stack spacing={1}>
          {currentStatuses.map((s) => (
            <Box
              key={s.code}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1.5,
                py: 0.75,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  component="span"
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    flexShrink: 0,
                    backgroundColor: s.color,
                  }}
                />
                <Typography variant="body2">{s.label}</Typography>
              </Box>
              <IconButton
                size="small"
                disabled={currentStatuses.length <= 1}
                onClick={() => handleRemove(s.code)}
                aria-label={`Remove ${s.label}`}
                sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}

      {/* Removed statuses — allow restore */}
      {!isLoading && removedStatuses.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
            Removed — click to add back
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {removedStatuses.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                size="small"
                variant="outlined"
                icon={<AddIcon />}
                onClick={() => handleRestore(item.value)}
                sx={{
                  borderColor: item.color ?? 'divider',
                  color: item.color ?? 'text.secondary',
                  '& .MuiChip-icon': { color: item.color ?? 'text.secondary' },
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Validation error */}
      {taskStatusesError && (
        <Typography variant="caption" color="error">
          {taskStatusesError}
        </Typography>
      )}

      {/* Info note */}
      <Alert severity="info" icon={<InfoOutlinedIcon fontSize="small" />}>
        To add more statuses, add them in Admin → Lookups under &apos;default_task_status&apos;,
        then create a new project.
      </Alert>
    </Stack>
  );
}
