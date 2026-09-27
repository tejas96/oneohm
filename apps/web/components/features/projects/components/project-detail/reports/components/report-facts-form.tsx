'use client';

import { Box, Button, Typography } from '@mui/material';
import { FACT_GROUPS, type ReportWorkspace, type WorkspaceFact } from '@tejas96/shared/reports';
import { Check, Pencil } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { FactField } from './fact-field';
import { FactReadRow } from './fact-read-row';
import type { ReportFactDrafts } from '../hooks/use-report-fact-drafts';
import { isUtilityFact } from '../utils/utility-details';

import { useCan } from '@/lib/rbac';

interface ReportFactsFormProps {
  workspace: ReportWorkspace;
  /** null = every report. */
  reportId: string | null;
  /** Reports are being generated: nothing can change until they are filed. */
  disabled?: boolean;
  /** Owned by the tab, so drafts survive Preview and report picking. */
  drafts: ReportFactDrafts;
}

const CARD_SX = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 3,
  px: { xs: 2, md: 2.5 },
  py: 2,
  bgcolor: 'background.paper',
} as const;

const FIELD_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
  columnGap: 2,
  rowGap: 2,
} as const;

/**
 * Every fact the reports print, each once. What still needs typing sits in a
 * "To fill" card at the top; every other fact reads as plain text in its
 * group, and a group's Edit turns it into inputs. Changes wait for the tab's
 * Save (useReportFactDrafts). Manual facts and quote facts changed here save to
 * the project; customer and site facts save to their owner; BOM and company
 * facts are locked.
 */
export function ReportFactsForm({
  workspace,
  reportId,
  disabled,
  drafts,
}: ReportFactsFormProps): React.JSX.Element {
  const canEdit = useCan().can('projects.edit');
  const readOnly = !canEdit || !!disabled;
  const [editing, setEditing] = useState<ReadonlySet<string>>(new Set());

  // Saved or discarded: every group goes back to its calm read view.
  const hadChanges = useRef(false);
  useEffect(() => {
    const has = drafts.changedKeys.size > 0;
    if (hadChanges.current && !has && !drafts.saving) setEditing(new Set());
    hadChanges.current = has;
  }, [drafts.changedKeys.size, drafts.saving]);

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
  // While the site's utility details are incomplete or changed, all four show whatever report is picked.
  const visible = workspace.facts.filter(
    (f) =>
      !reportId ||
      f.usedBy.includes(reportId) ||
      (drafts.showUtilityFields && isUtilityFact(f.key)),
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
  const printedOn = (fact: WorkspaceFact): string =>
    allReports(fact)
      ? 'every report'
      : fact.usedBy.map((id) => reportNames.get(id) ?? id).join(', ');
  const helpText = (fact: WorkspaceFact): string =>
    fact.source === 'manual'
      ? `${fact.help} Typed once for this project and printed on ${printedOn(fact)}.`
      : `${fact.help} Printed on ${printedOn(fact)}.`;

  // One home per fact: what a report still needs and can be typed here lives in To fill only.
  const toFill = visible.filter((f) => f.editable && isRequired(f));
  const toFillKeys = new Set<string>(toFill.map((f) => f.key));

  // In To fill every field is required: the card says so once, not a tag per field.
  const field = (fact: WorkspaceFact): React.JSX.Element => (
    <FactField
      key={fact.key}
      fact={fact}
      help={helpText(fact)}
      usedBy={usedByText(fact)}
      required={isRequired(fact) && !toFillKeys.has(fact.key)}
      needed={drafts.neededKeys.has(fact.key)}
      readOnly={readOnly}
      busy={drafts.saving}
      draft={drafts.drafts.get(fact.key)}
      changed={drafts.changedKeys.has(fact.key)}
      error={drafts.errorFor(fact.key)}
      forceError={drafts.showAllErrors}
      onChange={(raw) => drafts.change(fact, raw)}
      onUndo={() => drafts.undo(fact.key)}
    />
  );

  const toggle = (groupId: string): void =>
    setEditing((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {toFill.length > 0 && (
        <Box
          component="section"
          aria-label="To fill"
          sx={{ ...CARD_SX, borderColor: 'warning.light' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              To fill
            </Typography>
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              {toFill.length === 1
                ? '1 detail a report still needs'
                : `${toFill.length} details the reports still need`}
            </Typography>
          </Box>
          <Box sx={FIELD_GRID_SX}>{toFill.map(field)}</Box>
        </Box>
      )}

      {FACT_GROUPS.map((group) => {
        const facts = visible.filter((f) => f.group === group.id && !toFillKeys.has(f.key));
        if (facts.length === 0) return null;

        const canEditGroup = !readOnly && facts.some((f) => f.editable);
        // A group with a field that needs attention stays open until it is fixed.
        const mustStayOpen = facts.some(
          (f) =>
            drafts.neededKeys.has(f.key) ||
            (drafts.changedKeys.has(f.key) && drafts.errorFor(f.key) !== null),
        );
        const open = canEditGroup && (editing.has(group.id) || mustStayOpen);
        const missing = facts.filter(isRequired).length;
        const unsaved = facts.filter((f) => drafts.changedKeys.has(f.key)).length;

        return (
          <Box component="section" key={group.id} aria-label={group.title} sx={CARD_SX}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: open ? 2 : 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {group.title}
              </Typography>
              {missing > 0 ? (
                <Typography variant="caption" sx={{ color: 'warning.main' }}>
                  {missing} missing
                </Typography>
              ) : unsaved > 0 ? (
                <Typography variant="caption" sx={{ color: 'info.main' }}>
                  {unsaved} unsaved
                </Typography>
              ) : (
                <Typography
                  variant="caption"
                  sx={{ color: 'success.main', display: 'inline-flex', gap: 0.5 }}
                >
                  <Check className="size-3.5" aria-hidden /> Complete
                </Typography>
              )}
              <Box sx={{ flex: 1 }} />
              {canEditGroup && !(open && mustStayOpen) && (
                <Button
                  size="small"
                  variant={open ? 'outlined' : 'text'}
                  startIcon={open ? <Check className="size-4" /> : <Pencil className="size-4" />}
                  onClick={() => toggle(group.id)}
                  aria-label={open ? `Done editing ${group.title}` : `Edit ${group.title}`}
                >
                  {open ? 'Done' : 'Edit'}
                </Button>
              )}
            </Box>

            {open ? (
              <Box sx={FIELD_GRID_SX}>{facts.map(field)}</Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  columnGap: 4,
                }}
              >
                {facts.map((fact) => (
                  <FactReadRow
                    key={fact.key}
                    fact={fact}
                    help={helpText(fact)}
                    draft={drafts.drafts.get(fact.key)}
                    changed={drafts.changedKeys.has(fact.key)}
                    missing={isRequired(fact)}
                  />
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
