'use client';

import { Box, Typography } from '@mui/material';
import { FACT_GROUPS, type ReportWorkspace, type WorkspaceFact } from '@tejas96/shared/reports';
import { useMemo } from 'react';

import { FactField } from './fact-field';
import type { ReportFactSaves } from '../hooks/use-report-fact-saves';
import { isUtilityFact } from '../utils/utility-details';

import { useCan } from '@/lib/rbac';

interface ReportFactsFormProps {
  workspace: ReportWorkspace;
  /** null = every report. */
  reportId: string | null;
  /** Reports are being generated: nothing can change until they are filed. */
  disabled?: boolean;
  /** Owned by the tab, so held utility values survive Preview and report picking. */
  saves: ReportFactSaves;
}

/**
 * Every fact the reports print, each once, edited in place. Manual facts save
 * to the project; customer and site facts save to their owner; quote, BOM and
 * company facts are locked. Each field saves on its own and only that field
 * waits for the reply — except the site's utility details, which are held
 * and saved together while any of them is missing (useReportFactSaves).
 */
export function ReportFactsForm({
  workspace,
  reportId,
  disabled,
  saves,
}: ReportFactsFormProps): React.JSX.Element {
  const canEdit = useCan().can('projects.edit');

  const reportNames = useMemo(
    () => new Map(workspace.reports.map((r) => [r.id, r.shortName])),
    [workspace.reports],
  );
  const missingKeys = useMemo(
    () =>
      new Set<string>(
        workspace.reports
          .filter((r) => !reportId || r.id === reportId)
          .flatMap((r) => r.missing.map((m) => m.key)),
      ),
    [workspace.reports, reportId],
  );
  // While the site's utility details are incomplete or held, all four show whatever report is picked.
  const visible = workspace.facts.filter(
    (f) =>
      !reportId || f.usedBy.includes(reportId) || (saves.showUtilityFields && isUtilityFact(f.key)),
  );

  const isRequired = (fact: WorkspaceFact): boolean =>
    fact.covers.some((key) => missingKeys.has(key));
  const allReports = (fact: WorkspaceFact): boolean =>
    fact.usedBy.length === workspace.reports.length;
  const usedByText = (fact: WorkspaceFact): string =>
    fact.chip ??
    (allReports(fact)
      ? 'All reports'
      : fact.usedBy.map((id) => reportNames.get(id) ?? id).join(' · '));
  const helpText = (fact: WorkspaceFact): string =>
    fact.source === 'manual'
      ? `${fact.help} Typed once for this project and printed on ${
          allReports(fact)
            ? 'every report'
            : fact.usedBy.map((id) => reportNames.get(id) ?? id).join(', ')
        }.`
      : fact.help;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {FACT_GROUPS.map((group) => {
        const facts = visible.filter((f) => f.group === group.id);
        if (facts.length === 0) return null;
        const toFill = facts.filter(isRequired).length;

        return (
          <Box component="section" key={group.id}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
              <Typography variant="subtitle2">{group.title}</Typography>
              <Box sx={{ flex: 1 }} />
              <Typography
                variant="caption"
                sx={{ color: toFill > 0 ? 'warning.main' : 'text.secondary' }}
              >
                {toFill > 0 ? `${toFill} to fill` : 'Complete'}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                columnGap: 2,
                rowGap: 2,
              }}
            >
              {facts.map((fact) => (
                <FactField
                  key={fact.key}
                  fact={fact}
                  help={helpText(fact)}
                  usedBy={usedByText(fact)}
                  required={isRequired(fact)}
                  needed={saves.neededKeys.has(fact.key)}
                  readOnly={!canEdit || !!disabled}
                  onSave={(value) => saves.save(fact, value)}
                  onActivity={saves.activityHandlers.get(fact.key)}
                  held={saves.held.get(fact.key)}
                  note={saves.noteFor(fact.key)}
                  onDiscard={() => saves.discard(fact.key)}
                />
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
