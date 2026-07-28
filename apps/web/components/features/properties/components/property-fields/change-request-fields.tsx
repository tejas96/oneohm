'use client';

import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import { Box, FormHelperText, IconButton } from '@mui/material';
import { ChangeRequestType, type StoredChangeRequest } from '@tejas96/shared/types';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import {
  CHANGE_REQUEST_OPTIONS,
  formatChangeRequestSummary,
  getChangeRequestLabel,
  type ChangeRequestFormItem,
} from '../../utils/change-request-display';

import { ConnectionTypeSelector, SelectableChip } from '@/components/shared/forms';
import { MUIFieldLabel, MUIInput } from '@/components/ui';
import { PROPERTY_TYPE_OPTIONS } from '@/lib/config/constants';
import { color, radius } from '@/lib/theme/tokens';

/**
 * DISCOM change requests, added from a chip rail rather than a checkbox list:
 * most sites raise none, so the default state should read as "nothing to do"
 * instead of six empty checkboxes.
 *
 * Card chrome is supplied by the wizard's StepCard.
 */
export function ChangeRequestFields({
  convertedChangeRequests = [],
}: {
  convertedChangeRequests?: StoredChangeRequest[];
}): React.JSX.Element {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const changeRequests = (watch('changeRequests') as ChangeRequestFormItem[] | undefined) ?? [];
  const selectedTypes = changeRequests.map((item) => item.type);
  const convertedTypes = React.useMemo(
    () => new Set(convertedChangeRequests.map((item) => item.type)),
    [convertedChangeRequests],
  );
  const arrayError = errors.changeRequests?.message as string | undefined;

  const setRequests = React.useCallback(
    (next: ChangeRequestFormItem[]) => {
      setValue('changeRequests', next, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const addType = (type: ChangeRequestType): void => {
    if (convertedTypes.has(type) || selectedTypes.includes(type)) return;
    setRequests([...changeRequests, { type }]);
  };

  const removeType = (type: ChangeRequestType): void => {
    setRequests(changeRequests.filter((item) => item.type !== type));
  };

  const updateItem = (type: ChangeRequestType, patch: Partial<ChangeRequestFormItem>): void => {
    setRequests(
      changeRequests.map((item) => (item.type === type ? { ...item, ...patch, type } : item)),
    );
  };

  const renderItemFields = (item: ChangeRequestFormItem): React.JSX.Element | null => {
    switch (item.type) {
      case ChangeRequestType.CONSUMER_NAME_CHANGE:
        return (
          <MUIInput
            fieldLabel="New consumer name"
            required
            size="small"
            placeholder="Name it should read as"
            value={item.newName ?? ''}
            onChange={(e) => updateItem(item.type, { newName: e.target.value })}
          />
        );
      case ChangeRequestType.NAME_SPELLING_CORRECTION:
        return (
          <MUIInput
            fieldLabel="Corrected consumer name"
            required
            size="small"
            placeholder="Exact spelling"
            value={item.correctedName ?? ''}
            onChange={(e) => updateItem(item.type, { correctedName: e.target.value })}
          />
        );
      case ChangeRequestType.PROPERTY_TYPE_CHANGE:
        return (
          <Box>
            <MUIFieldLabel fieldLabel="New property type" required />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {PROPERTY_TYPE_OPTIONS.map((option) => (
                <SelectableChip
                  key={option.value}
                  active={item.newPropertyType === option.value}
                  onClick={() => updateItem(item.type, { newPropertyType: option.value })}
                >
                  {option.label}
                </SelectableChip>
              ))}
            </Box>
          </Box>
        );
      case ChangeRequestType.LOAD_CHANGE:
        return (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <ConnectionTypeSelector
              hideLabel={false}
              value={item.phase ?? null}
              onChange={(value) => updateItem(item.type, { phase: value })}
            />
            <Box sx={{ maxWidth: 220 }}>
              <MUIInput
                fieldLabel="New sanctioned load (kW)"
                type="number"
                size="small"
                placeholder="10"
                inputProps={{ min: 0, step: 0.1 }}
                value={item.newSanctionedLoad ?? ''}
                onChange={(e) =>
                  updateItem(item.type, {
                    newSanctionedLoad: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
            </Box>
          </Box>
        );
      case ChangeRequestType.NEW_EV_METER:
        return (
          <MUIInput
            fieldLabel="Note for the DISCOM desk"
            size="small"
            multiline
            minRows={2}
            placeholder="Optional"
            value={item.note ?? ''}
            onChange={(e) => updateItem(item.type, { note: e.target.value })}
          />
        );
      case ChangeRequestType.NEW_CONNECTION:
        return (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <ConnectionTypeSelector
              value={item.phase ?? null}
              onChange={(value) => updateItem(item.type, { phase: value })}
            />
            <MUIInput
              fieldLabel="Note for the DISCOM desk"
              size="small"
              multiline
              minRows={2}
              placeholder="Optional"
              value={item.note ?? ''}
              onChange={(e) => updateItem(item.type, { note: e.target.value })}
            />
          </Box>
        );
      default:
        return null;
    }
  };

  const hasAny = changeRequests.length > 0 || convertedChangeRequests.length > 0;

  return (
    <div className="space-y-4">
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {CHANGE_REQUEST_OPTIONS.map(({ type, label }) => {
          const used = selectedTypes.includes(type) || convertedTypes.has(type);
          return (
            <SelectableChip key={type} disabled={used} onClick={() => addType(type)}>
              + {label}
            </SelectableChip>
          );
        })}
      </Box>

      {/* Already converted to project tasks — shown read-only. */}
      {convertedChangeRequests.map((item) => (
        <Box
          key={`converted-${item.type}`}
          sx={{
            p: '14px 15px',
            borderRadius: radius['rf-lg'],
            background: color['warning-bg'],
          }}
        >
          <Box sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {getChangeRequestLabel(item.type)}
          </Box>
          <Box sx={{ fontSize: 12.5, color: color['text-secondary'], mt: '3px' }}>
            {formatChangeRequestSummary(item)} · already converted to a task
          </Box>
        </Box>
      ))}

      {changeRequests.map((item) => (
        <Box
          key={item.type}
          sx={{ p: '14px 15px', borderRadius: radius['rf-lg'], background: color['canvas-sunken'] }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.375 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: color['accent-subtle'],
                color: color['accent-ink'],
                flexShrink: 0,
              }}
            >
              <SwapHorizRoundedIcon sx={{ fontSize: 15 }} />
            </Box>
            <Box sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {getChangeRequestLabel(item.type)}
            </Box>
            <IconButton
              size="small"
              aria-label={`Remove ${getChangeRequestLabel(item.type)}`}
              onClick={() => removeType(item.type)}
              sx={{ ml: 'auto' }}
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          {renderItemFields(item)}
        </Box>
      ))}

      {!hasAny && (
        <Box
          sx={{
            p: 2.75,
            textAlign: 'center',
            borderRadius: radius['rf-lg'],
            background: color['canvas-sunken'],
          }}
        >
          <Box sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Nothing to change
          </Box>
          <Box sx={{ fontSize: 12.5, color: color['text-secondary'], mt: '3px' }}>
            Add one above only if the bill needs correcting. Most sites move straight on.
          </Box>
        </Box>
      )}

      {arrayError ? <FormHelperText error>{arrayError}</FormHelperText> : null}
    </div>
  );
}
