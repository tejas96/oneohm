'use client';

import NextLink from 'next/link';
import { type JSX, useMemo, useState } from 'react';

import { handledBy } from '../components/list/format';
import { DOCUMENT_TYPE_LABELS, LEAD_SOURCE_LABELS } from '../constants';
import { type Customer, type CustomerPropertyResponse, useAssignCustomer } from '../hooks';
import {
  Blank,
  CardBones,
  CardError,
  EmptyNote,
  Kv,
  Line,
  Missing,
  MoreToggle,
  PageCard,
  TEXT_ACTION,
} from './parts';

import { useEmployees } from '@/components/features/employees';
import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { ServiceTicketFormDialog } from '@/components/features/service-tickets/components/service-ticket-form-dialog';
import {
  isTicketOverdue,
  LIVE_TICKET_STATUSES,
  SERVICE_TICKET_PRIORITY_LABELS,
  SERVICE_TICKET_STATUS_LABELS,
  SERVICE_TICKET_STATUS_TONE,
} from '@/components/features/service-tickets/constants';
import { useServiceTickets } from '@/components/features/service-tickets/hooks/use-service-tickets';
import { QuietPill } from '@/components/shared/calm-list';
import { PropertyDocumentHub } from '@/components/shared/document-manager/property-document-hub';
import { MUIUserAssigneeSelector } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useGatedAction } from '@/lib/rbac';
import { formatBusinessDate, formatDate, toTitleLabel } from '@/lib/utils';

// ============================================================================
// Owner
// ============================================================================

/**
 * Who handles the customer, and the way to change it. The picker only loads
 * the employee list once someone asks for it.
 */
export function OwnerControl({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer;
  /** Held by the page, so the attention list's "Assign" can open it. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const assign = useAssignCustomer();
  const reassign = useGatedAction('customers.assign', () => onOpenChange(true), 'Assign customer');
  const { data: employees = [], isLoading } = useEmployees({ enabled: open });
  // "<name> (archived)" when the assignee's account is archived: the name is
  // shown and cannot be picked. The customer is not unassigned.
  const handler = handledBy(customer);

  if (open) {
    return (
      <span className="inline-flex items-center gap-2">
        <MUIUserAssigneeSelector
          value={customer.assigneeId ?? null}
          onChange={(assigneeId) => {
            assign.mutate(
              { id: customer.id, assigneeId },
              { onSuccess: () => onOpenChange(false) },
            );
          }}
          // Active employees only: an archived user is never one of the choices.
          options={employees.map((employee) => ({
            id: employee.userId,
            displayName: [employee.user?.firstName, employee.user?.lastName]
              .filter(Boolean)
              .join(' '),
          }))}
          optionsLoading={isLoading}
          loading={assign.isPending}
          allowUnassign
          placeholder={handler.archived && handler.label ? handler.label : 'Unassigned'}
          triggerMinWidth={0}
        />
        <button type="button" className={TEXT_ACTION} onClick={() => onOpenChange(false)}>
          Done
        </button>
      </span>
    );
  }

  return (
    <span>
      Handled by{' '}
      {handler.label ? (
        <b className="font-medium text-foreground">{handler.label}</b>
      ) : customer.assigneeId ? (
        // Assigned, but the server could not name the user: never "nobody".
        <b className="font-medium text-foreground">someone (name not available)</b>
      ) : (
        <b className="font-medium text-[var(--ds-warning)]">nobody</b>
      )}
      {' · '}
      <button
        type="button"
        className={TEXT_ACTION}
        aria-disabled={!reassign.allowed}
        onClick={reassign.onGatedClick}
      >
        {handler.label || customer.assigneeId ? 'Change' : 'Assign'}
      </button>
    </span>
  );
}

// ============================================================================
// Documents
// ============================================================================

/**
 * A site's documents: their names by group, and the full manager one click
 * away. The manager is the shared hub both old Documents tabs rendered, so
 * upload, preview, download, move, delete and print are unchanged.
 */
export function DocumentsCard({
  site,
  sites,
  delayMs,
}: {
  /** The chosen site; undefined when the customer has none. */
  site: CustomerPropertyResponse | undefined;
  sites: CustomerPropertyResponse[];
  delayMs?: number;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const documents = site?.documents ?? [];
  const many = sites.length > 1;

  return (
    <PageCard
      id="documents"
      title={`Documents${many && site ? ` · ${getPropertyDisplayName(site)}` : ''}`}
      delayMs={delayMs}
    >
      {!site ? (
        <EmptyNote
          title="No sites yet"
          hint="Documents belong to a site: bills, ID proofs, survey photos. Add a site first."
        />
      ) : open ? (
        <PropertyDocumentHub propertyId={site.id} allowUpload />
      ) : documents.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {documents.map((document, index) => (
            <span
              key={`${document.url}-${index}`}
              title={document.fileName}
              className="rounded-lg bg-background-tertiary px-2 py-1 text-[12px] text-foreground-secondary"
            >
              {DOCUMENT_TYPE_LABELS[document.tag] ?? toTitleLabel(document.tag)}
            </span>
          ))}
        </div>
      ) : (
        <EmptyNote
          title="No site papers yet"
          hint="Open the manager to upload, or to see quote, project and payment files."
        />
      )}
      {site ? (
        <MoreToggle
          open={open}
          onToggle={() => setOpen((value) => !value)}
          closedLabel="Open the document manager"
          openLabel="Close the document manager"
        />
      ) : null}
    </PageCard>
  );
}

// ============================================================================
// Service
// ============================================================================

/** Every ticket of the customer, issues and routine maintenance visits alike. */
export function ServiceCard({
  customerId,
  projectId,
  delayMs,
}: {
  customerId: string;
  /** The chosen site's live project, preset on a new ticket. */
  projectId: string | null;
  delayMs?: number;
}): JSX.Element {
  const [formOpen, setFormOpen] = useState(false);
  const params = useMemo(() => ({ customerId, limit: 50 }), [customerId]);
  const { data, isLoading, isError, refetch } = useServiceTickets(params, true);
  const tickets = data?.items ?? [];
  const live = tickets.filter((ticket) => LIVE_TICKET_STATUSES.includes(ticket.status)).length;

  return (
    <PageCard
      id="service"
      // No count until the list is in.
      title={
        isLoading || isError
          ? 'Service'
          : `Service · ${tickets.length}${live > 0 ? ` · ${live} open` : ''}`
      }
      delayMs={delayMs}
      action={
        // The form's Save is what the `service.manage` permission guards, as before.
        <button type="button" className={TEXT_ACTION} onClick={() => setFormOpen(true)}>
          + New ticket
        </button>
      }
    >
      {isLoading ? (
        <CardBones rows={2} />
      ) : isError ? (
        <CardError what="the tickets" onRetry={() => void refetch()} />
      ) : tickets.length === 0 ? (
        <EmptyNote
          title="No tickets"
          hint="Tickets raised against any of this customer's installations show here."
        />
      ) : (
        tickets.map((ticket) => (
          <Line
            key={ticket.id}
            title={
              <NextLink
                href={buildRoute(ROUTES.SERVICE.DETAIL, { id: ticket.id })}
                prefetch={false}
                className="text-foreground hover:text-primary-dark hover:underline"
              >
                {ticket.title}
              </NextLink>
            }
            sub={
              <>
                <span className="tabular-nums">{ticket.ticketNumber}</span>
                {' · '}
                {[
                  ticket.visitNumber ? `Maintenance visit ${ticket.visitNumber}` : null,
                  SERVICE_TICKET_PRIORITY_LABELS[ticket.priority],
                ]
                  .filter(Boolean)
                  .join(' · ')}
                {' · '}
                {ticket.assigneeName ?? (
                  // An open ticket with nobody on it is the thing to notice.
                  <span
                    className={
                      LIVE_TICKET_STATUSES.includes(ticket.status)
                        ? 'text-[var(--ds-warning)]'
                        : undefined
                    }
                  >
                    Unassigned
                  </span>
                )}
                {' · '}
                {ticket.dueDate ? (
                  <span className={isTicketOverdue(ticket) ? 'text-error' : undefined}>
                    due {formatBusinessDate(ticket.dueDate)}
                    {isTicketOverdue(ticket) ? ' · overdue' : ''}
                  </span>
                ) : (
                  'no due date'
                )}
                {' · '}
                {[
                  ticket.projectNumber,
                  `raised ${formatDate(ticket.createdAt)}${ticket.createdByName ? ` by ${ticket.createdByName}` : ''}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </>
            }
            right={
              <QuietPill
                label={SERVICE_TICKET_STATUS_LABELS[ticket.status]}
                tone={SERVICE_TICKET_STATUS_TONE[ticket.status]}
                whole
              />
            }
          />
        ))
      )}
      {formOpen ? (
        <ServiceTicketFormDialog
          open
          onClose={() => setFormOpen(false)}
          lockedCustomerId={customerId}
          lockedProjectId={projectId ?? undefined}
        />
      ) : null}
    </PageCard>
  );
}

// ============================================================================
// Profile
// ============================================================================

/** The facts about the person. Phone, city and owner are in the header. */
export function ProfileCard({
  customer,
  resellerName,
  onEdit,
  delayMs,
}: {
  customer: Customer;
  resellerName?: string;
  onEdit: () => void;
  delayMs?: number;
}): JSX.Element {
  const edit = useGatedAction('customers.edit', onEdit, 'Edit customer');
  const address = [customer.address, customer.city, customer.state, customer.pincode]
    .filter(Boolean)
    .join(', ');
  const source = customer.leadSource
    ? (LEAD_SOURCE_LABELS[customer.leadSource] ?? customer.leadSource)
    : null;
  const addAction = (
    <button
      type="button"
      className={TEXT_ACTION}
      aria-label="Add the billing address"
      aria-disabled={!edit.allowed}
      onClick={edit.onGatedClick}
    >
      + Add
    </button>
  );

  return (
    <PageCard
      id="profile"
      title="Profile"
      delayMs={delayMs}
      action={
        <button
          type="button"
          className={TEXT_ACTION}
          aria-disabled={!edit.allowed}
          onClick={edit.onGatedClick}
        >
          Edit
        </button>
      }
    >
      <Kv
        rows={[
          {
            label: 'Email',
            value: customer.email ? (
              <a href={`mailto:${customer.email}`} className="hover:underline">
                {customer.email}
              </a>
            ) : (
              <Blank />
            ),
          },
          {
            label: 'Alternate phone',
            value: customer.alternatePhone ? (
              <a href={`tel:${customer.alternatePhone}`} className="tabular-nums hover:underline">
                {customer.alternatePhone}
              </a>
            ) : (
              <Blank />
            ),
          },
          {
            label: 'Aadhaar',
            value: customer.aadhaarNumber ? (
              <span className="tabular-nums">XXXX XXXX {customer.aadhaarNumber.slice(-4)}</span>
            ) : (
              <Blank />
            ),
          },
          { label: 'Billing address', value: address || <Missing action={addAction} /> },
          {
            label: 'Lead source',
            value: source ? resellerName ? `${source} · ${resellerName}` : source : <Blank />,
          },
          { label: 'Referral code', value: customer.referralCode || <Blank /> },
          {
            label: 'Customer group',
            value: customer.groupCode ? (
              customer.groupName ? (
                `${customer.groupName} (${customer.groupCode})`
              ) : (
                customer.groupCode
              )
            ) : (
              <Blank />
            ),
          },
          { label: 'Created by', value: customer.creatorName || 'Self' },
        ]}
      />
    </PageCard>
  );
}
