'use client';

import { type JSX, useState } from 'react';

import { AddSiteLink } from './add-site-link';
import { SiteSkeleton } from './list-skeleton';
import { SiteBlock } from './site-block';
import { useCustomerProperties } from '../../hooks/use-customer-properties';

import type { PropertyRowActionsTarget } from '@/components/features/properties/components/property-row-actions-menu';
import { useDeleteProperty } from '@/components/features/properties/hooks/use-properties';
import { MarkAsLostDialog } from '@/components/features/properties/property-detail/mark-as-lost-dialog';
import { ReopenPropertyDialog } from '@/components/features/properties/property-detail/reopen-property-dialog';
import { ORG_ADMIN_ROLES } from '@/components/features/properties/utils/delete-eligibility';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import { useAuth } from '@/providers/auth-provider';

const HEADING = 'm-0 text-[12px] font-medium uppercase tracking-[0.04em] text-foreground-muted';

/**
 * The customer's sites, fetched when the panel opens — never with the list. A
 * customer can own dozens of sites and the list only needs their roll-up, which
 * it already has.
 */
export function PanelSites({
  customerId,
  expectedSiteCount,
}: {
  customerId: string;
  /** From the list's roll-up: sizes the skeleton and the heading while loading. */
  expectedSiteCount: number;
}): JSX.Element {
  const { hasAnyRole } = useAuth();
  const isOrgAdmin = hasAnyRole([...ORG_ADMIN_ROLES]);

  const {
    data: properties = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCustomerProperties(customerId);

  const deletePropertyMutation = useDeleteProperty();
  const deleteConfirmation = useDeleteConfirmation<PropertyRowActionsTarget>({
    mutation: deletePropertyMutation,
    getId: (property) => property.id,
  });
  const [markLostTarget, setMarkLostTarget] = useState<PropertyRowActionsTarget | null>(null);
  const [reopenTarget, setReopenTarget] = useState<PropertyRowActionsTarget | null>(null);

  const count = isLoading || isError ? expectedSiteCount : properties.length;

  let body: JSX.Element;
  if (isLoading) {
    body = (
      <div role="status" aria-label="Loading sites" className="divide-y divide-border">
        {Array.from({ length: Math.min(Math.max(expectedSiteCount || 2, 1), 4) }, (_, index) => (
          <SiteSkeleton key={index} />
        ))}
      </div>
    );
  } else if (isError) {
    body = (
      <div role="alert" className="flex items-center gap-3 text-[13px]">
        <span className="min-w-0 flex-1 text-error">
          {error?.message || 'Failed to load sites'}
        </span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="flex-none rounded-pill px-3 py-1 font-medium text-error ring-1 ring-inset ring-error/50 hover:bg-[var(--ds-danger-bg)]"
        >
          Retry
        </button>
      </div>
    );
  } else if (properties.length === 0) {
    body = (
      <div>
        <div className="font-medium">No sites for this customer yet</div>
        <div className="text-[13px] text-foreground-secondary">
          Add the first rooftop or plant address to start a survey.
        </div>
      </div>
    );
  } else {
    body = (
      <div>
        {properties.map((property) => (
          <SiteBlock
            key={property.id}
            property={property}
            showDelete={isOrgAdmin}
            onMarkAsLost={setMarkLostTarget}
            onReopen={setReopenTarget}
            onRequestDelete={deleteConfirmation.requestDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <h3 className={`${HEADING} mb-3`}>Sites · {count}</h3>
      {body}
      {!isLoading && !isError ? (
        <AddSiteLink customerId={customerId} className="mt-3 inline-block text-[14px]" />
      ) : null}

      {markLostTarget ? (
        <MarkAsLostDialog
          open
          onClose={() => setMarkLostTarget(null)}
          propertyId={markLostTarget.id}
          propertyName={markLostTarget.propertyName ?? markLostTarget.propertyCode}
        />
      ) : null}

      {reopenTarget ? (
        <ReopenPropertyDialog
          open
          onClose={() => setReopenTarget(null)}
          propertyId={reopenTarget.id}
          propertyName={reopenTarget.propertyName ?? reopenTarget.propertyCode}
        />
      ) : null}

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        title="Delete Property"
        itemName={
          deleteConfirmation.target?.propertyName ||
          deleteConfirmation.target?.propertyCode ||
          'this property'
        }
        isPending={deleteConfirmation.isPending}
        onCancel={deleteConfirmation.cancel}
        onConfirm={() => void deleteConfirmation.confirm()}
      />
    </>
  );
}
