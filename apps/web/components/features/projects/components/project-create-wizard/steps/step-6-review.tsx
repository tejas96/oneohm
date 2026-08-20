'use client';

import BoltIcon from '@mui/icons-material/Bolt';
import ChecklistIcon from '@mui/icons-material/Checklist';
import DescriptionIcon from '@mui/icons-material/Description';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import GroupsIcon from '@mui/icons-material/Groups';
import type { UseFormReturn } from 'react-hook-form';

import { PROJECT_PRIORITY_LABELS } from '../../../constants';
import type { ProjectCreateFormData } from '../../../schemas/project-create.schema';
import { ReviewSection } from '../components/review-section';
import { ReviewTeamChips } from '../components/review-team-chips';

import { MUITypography } from '@/components/ui';
import {
  useCustomerDetail,
  useCustomerPropertiesByCustomer,
  useCustomerQuotes,
  useEmployees,
} from '@/lib/hooks/resources';
import { formatDate } from '@/lib/utils';

// ── Props ──────────────────────────────────────────────────────

interface Step6ReviewProps {
  form: UseFormReturn<ProjectCreateFormData>;
}

// ── Component ─────────────────────────────────────────────────

export function Step6Review({ form }: Step6ReviewProps): React.JSX.Element {
  const { watch } = form;
  const customerId = watch('customerId');
  const propertyId = watch('propertyId');
  const quoteId = watch('quoteId');
  const name = watch('name');
  const priority = watch('priority');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const teamMembers = watch('teamMembers');
  const projectManagerId = watch('projectManagerId');
  const milestones = watch('milestones');
  const excludedStepIds = watch('excludedStepIds');

  const { data: customer } = useCustomerDetail(customerId || '');
  const { data: properties = [] } = useCustomerPropertiesByCustomer(customerId || '');
  const { data: quotesResponse } = useCustomerQuotes(customerId || '');
  const { items: employees } = useEmployees({ status: 'active' });

  const property = properties.find((p) => p.id === propertyId);
  const selectedQuote = (quotesResponse?.data ?? []).find((q) => q.id === quoteId);
  const customerName = customer ? `${customer.firstName} ${customer.lastName ?? ''}`.trim() : '—';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <FactCheckIcon className="text-primary" fontSize="small" />
        </div>
        <div>
          <MUITypography variant="sectionTitle">Review &amp; Confirm</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary">
            Review all details before creating the project.
          </MUITypography>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Source */}
        <ReviewSection id="source" title="Source" icon={<BoltIcon fontSize="small" />}>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <MUITypography variant="metaLabel">Customer</MUITypography>
              <MUITypography variant="bodyPrimary">{customerName}</MUITypography>
            </div>
            <div>
              <MUITypography variant="metaLabel">Property</MUITypography>
              <MUITypography variant="bodyPrimary">
                {property?.propertyName || property?.consumerName || '—'}
              </MUITypography>
            </div>
            <div>
              <MUITypography variant="metaLabel">Quote</MUITypography>
              <MUITypography variant="bodyPrimary">
                {selectedQuote?.quoteNumber || '—'}
              </MUITypography>
            </div>
          </div>
        </ReviewSection>

        {/* Details */}
        <ReviewSection
          id="details"
          title="Project Details"
          icon={<DescriptionIcon fontSize="small" />}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <MUITypography variant="metaLabel">Name</MUITypography>
              <MUITypography variant="bodyPrimary">{name}</MUITypography>
            </div>
            <div>
              <MUITypography variant="metaLabel">Priority</MUITypography>
              <MUITypography variant="bodyPrimary">
                {PROJECT_PRIORITY_LABELS[priority] ?? priority}
              </MUITypography>
            </div>
            <div>
              <MUITypography variant="metaLabel">Start Date</MUITypography>
              <MUITypography variant="bodyPrimary">
                {startDate ? formatDate(startDate) : '—'}
              </MUITypography>
            </div>
            <div>
              <MUITypography variant="metaLabel">End Date</MUITypography>
              <MUITypography variant="bodyPrimary">
                {endDate ? formatDate(endDate) : '—'}
              </MUITypography>
            </div>
          </div>
        </ReviewSection>

        {/* Team */}
        <ReviewSection id="team" title="Team" icon={<GroupsIcon fontSize="small" />}>
          <ReviewTeamChips
            teamMembers={teamMembers}
            projectManagerId={projectManagerId ?? ''}
            employees={employees}
          />
        </ReviewSection>

        {/* Tasks */}
        <ReviewSection
          id="tasks"
          title="Tasks &amp; Milestones"
          icon={<ChecklistIcon fontSize="small" />}
        >
          <div className="flex flex-col gap-2">
            {milestones.map((m) => (
              <div key={m.name} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                  {m.order}
                </div>
                <MUITypography variant="bodyPrimary">{m.name}</MUITypography>
              </div>
            ))}
            {excludedStepIds.length > 0 && (
              <MUITypography variant="finePrint" className="text-foreground-secondary mt-2">
                {excludedStepIds.length} task{excludedStepIds.length > 1 ? 's' : ''} excluded
              </MUITypography>
            )}
          </div>
        </ReviewSection>
      </div>
    </div>
  );
}
