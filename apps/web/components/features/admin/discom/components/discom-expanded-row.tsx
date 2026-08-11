'use client';

import { Box, Button } from '@mui/material';
import { type JSX } from 'react';

import type { DiscomAdmin } from '../hooks/use-discoms-admin';
import { buildDiscomPreviewLabel, formatDiscomGeo } from '../utils/discom-display.util';

import { color, crm, radius, shadow } from '@/lib/theme/tokens';
import { formatDate } from '@/lib/utils';

interface DiscomExpandedRowProps {
  discom: DiscomAdmin;
  onEdit: () => void;
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): JSX.Element {
  const isEmpty = value === '—' || value === 'Not pinned';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.375, minWidth: 0 }}>
      <Box
        component="span"
        sx={{
          fontSize: crm['text-row-xs'],
          fontWeight: 700,
          letterSpacing: crm['text-overline-sm-track'],
          textTransform: 'uppercase',
          color: color['text-tertiary'],
        }}
      >
        {label}
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: crm['text-row'],
          color: isEmpty ? color['text-tertiary'] : color['text-secondary'],
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
          fontVariantNumeric: 'tabular-nums',
          textWrap: 'pretty',
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

export function DiscomExpandedRow({ discom, onEdit }: DiscomExpandedRowProps): JSX.Element {
  const details = [
    { label: 'Testing unit', value: discom.testingUnitName?.trim() || '—' },
    { label: 'Subdivision', value: discom.subdivisionName?.trim() || '—' },
    {
      label: 'Subdivision in-charge (SDO)',
      value: discom.subdivisionInchargeName?.trim() || '—',
    },
    { label: 'AEQC engineer', value: discom.aeqcEngineerName?.trim() || '—' },
    { label: 'Section', value: discom.sectionName?.trim() || '—' },
    { label: 'Section engineer', value: discom.sectionEngineerName?.trim() || '—' },
    { label: 'Office address', value: discom.officeAddress?.trim() || '—' },
    { label: 'Office geo location', value: formatDiscomGeo(discom), mono: true },
    { label: 'Last updated', value: formatDate(discom.updatedAt) },
  ];

  return (
    <Box
      sx={{
        mx: 1,
        mb: 1,
        borderRadius: radius['rf-lg'],
        boxShadow: shadow.e3,
        backgroundColor: color.surface,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 2, py: 1.75 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            mb: 1.75,
          }}
        >
          <Box
            component="span"
            sx={{
              fontSize: crm['text-row-xs'],
              fontWeight: 700,
              letterSpacing: crm['text-overline-sm-track'],
              textTransform: 'uppercase',
              color: color['text-tertiary'],
              whiteSpace: 'nowrap',
            }}
          >
            Full hierarchy record
          </Box>
          <Box sx={{ flex: 1, height: '1px', backgroundColor: color['canvas-sunken'] }} />
          <Button size="small" variant="text" onClick={onEdit} sx={{ minWidth: 0 }}>
            Edit details
          </Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px 24px',
          }}
        >
          {details.map((d) => (
            <DetailField key={d.label} label={d.label} value={d.value} mono={d.mono} />
          ))}
        </Box>

        {discom.linkedPropertiesCount > 0 ? (
          <Box
            sx={{
              mt: 1.75,
              pt: 1.5,
              borderTop: `1px solid ${color['canvas-sunken']}`,
              fontSize: crm['text-row-sm'],
              color: color['text-secondary'],
              textWrap: 'pretty',
            }}
          >
            {discom.linkedPropertiesCount}{' '}
            {discom.linkedPropertiesCount === 1 ? 'site is' : 'sites are'} mapped to this hierarchy,
            so it cannot be deleted — deactivate it instead to keep the history intact.
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export function buildDiscomExpandedTitle(discom: DiscomAdmin): string {
  return buildDiscomPreviewLabel(discom) || discom.divisionName;
}
