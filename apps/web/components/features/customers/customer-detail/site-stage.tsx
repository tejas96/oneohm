'use client';

import { Box, Stack, Tooltip, Typography } from '@mui/material';
import type { JSX } from 'react';

import { SITE_STAGES, getSiteStageIndex } from '../constants';
import { TONE_INK, type DetailTone } from './primitives';
import type { CustomerPropertyResponse } from '../hooks';

/**
 * How far a site has travelled, drawn as a segmented rail.
 *
 * Reuses `SITE_STAGES` / `getSiteStageIndex` — the same stage model the
 * customer **list**'s expanded row runs on — rather than the chip chain in
 * `PropertyPipelineStrip`. Two reasons: that component is shared with the
 * property detail page and repainting it would restyle a page outside this
 * work, and its chips ("No quote → No project yet") spend a full row of width
 * telling you what has *not* happened. A rail shows the same thing in a
 * glance, and a site now reads identically whether you meet it in the list or
 * here.
 */

const STAGE_TONE: DetailTone = 'success';

export interface SiteStageBarProps {
  property: CustomerPropertyResponse;
  /** Hide the stage caption and render the rail alone — for dense table cells. */
  compact?: boolean;
}

export function SiteStageBar({ property, compact }: SiteStageBarProps): JSX.Element {
  const index = getSiteStageIndex(property);
  const stageLabel = SITE_STAGES[index] ?? SITE_STAGES[0];
  const total = SITE_STAGES.length;
  const isComplete = index === total - 1;
  const tone: DetailTone = isComplete ? STAGE_TONE : 'accent';
  const { ink } = TONE_INK[tone];

  return (
    <Box sx={{ minWidth: 0, width: '100%' }}>
      <Tooltip title={`${stageLabel} — step ${index + 1} of ${total}`}>
        <Stack direction="row" gap={0.5} sx={{ width: '100%' }} aria-hidden>
          {SITE_STAGES.map((stage, stageIndex) => (
            <Box
              key={stage}
              sx={{
                flex: 1,
                height: 4,
                borderRadius: 'var(--radius-pill)',
                bgcolor: stageIndex <= index ? ink : 'var(--ds-canvas-sunken)',
                transition: 'background-color 200ms var(--ease-standard)',
              }}
            />
          ))}
        </Stack>
      </Tooltip>
      {!compact && (
        <Typography
          sx={{
            mt: 0.625,
            fontSize: '0.6875rem',
            fontWeight: 500,
            color: isComplete ? ink : 'var(--ds-text-secondary)',
            lineHeight: 1.3,
          }}
        >
          {stageLabel}
          <Box
            component="span"
            sx={{
              ml: 0.625,
              fontFamily: 'var(--font-mono)',
              fontWeight: 400,
              color: 'var(--ds-text-tertiary)',
            }}
          >
            {index + 1}/{total}
          </Box>
        </Typography>
      )}
    </Box>
  );
}
