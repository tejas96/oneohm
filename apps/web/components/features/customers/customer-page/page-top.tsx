'use client';

import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import { Menu, MenuItem, Tooltip } from '@mui/material';
import { bankLabel } from '@tejas96/shared/constants';
import { CustomerStatus, PropertyStatus } from '@tejas96/shared/types';
import { formatPhoneForDisplay, SITE_JOURNEY_STEPS } from '@tejas96/shared/utils';
import { type JSX, type ReactNode, useRef, useState } from 'react';

import { journeyStepLines, siteJourneyText } from '../components/list/format';
import { JourneyTrack } from '../components/list/journey-track';
import { CUSTOMER_STATUS_TONE } from '../constants';
import type { Customer, CustomerPropertyResponse } from '../hooks';
import type { AttentionAction, AttentionLine } from './build-attention';
import { EYEBROW, MoreToggle, PillButton, TEXT_ACTION } from './parts';
import { TemperatureChips } from './site-cards';

import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { QuietPill } from '@/components/shared/calm-list';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { useGatedAction } from '@/lib/rbac';
import { cn, formatDate, formatPhoneForWhatsApp, toTitleLabel } from '@/lib/utils';

const INACTIVE_TOOLTIP = 'Blocked while the customer is inactive';

/** The pill-shaped button of the header. */
const HEADER_BUTTON =
  'inline-flex items-center gap-2 whitespace-nowrap rounded-pill px-4 py-2.5 text-[14px] font-medium shadow-e1 transition-transform duration-200 ease-calm hover:-translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

// ============================================================================
// Header
// ============================================================================

export interface PageHeaderProps {
  customer: Customer & { customerCode?: string };
  name: string;
  /** The journey has gone further than the status tag says. */
  statusBehind: boolean;
  resellerName?: string;
  /** "Handled by … · Change", owned by the page so the attention list can open it. */
  owner: ReactNode;
  onEdit: () => void;
  onAddSite: () => void;
  onNewQuote: () => void;
  onLogFollowup: () => void;
  /** Org admins only; undefined hides the item. */
  onDelete?: () => void;
  deleteBlockedBy?: string;
}

export function PageHeader({
  customer,
  name,
  statusBehind,
  resellerName,
  owner,
  onEdit,
  onAddSite,
  onNewQuote,
  onLogFollowup,
  onDelete,
  deleteBlockedBy,
}: PageHeaderProps): JSX.Element {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  /*
   * On a narrow page the header hides New quote, Add site and Edit, and the
   * menu carries them. The menu is drawn outside the page, where the page's
   * own width rules do not reach, so this is asked when the menu opens.
   */
  const editButton = useRef<HTMLButtonElement>(null);
  const [narrow, setNarrow] = useState(false);
  const inactive = customer.status === CustomerStatus.INACTIVE;
  const edit = useGatedAction('customers.edit', onEdit, 'Edit customer');
  const addSite = useGatedAction('properties.create', onAddSite, 'Add site');
  const newQuote = useGatedAction('quotes.create', onNewQuote, 'New quote');
  const logFollowup = useGatedAction('followups.manage', onLogFollowup, 'Log follow-up');
  const deleteCustomer = useGatedAction('customers.delete', () => onDelete?.(), 'Delete customer');
  const closeMenu = (): void => setMenuAnchor(null);
  const location = [customer.city, customer.state].filter(Boolean).join(', ');
  const whatsapp = customer.phone ? formatPhoneForWhatsApp(customer.phone) : '';

  return (
    <header className="mb-4">
      <div className="flex flex-wrap items-start gap-x-[18px] gap-y-3 @[720px]:items-center">
        <MUIAvatar
          name={name}
          size={56}
          aria-hidden
          sx={{ flexShrink: 0, fontSize: 19, fontWeight: 600 }}
        />
        <div className="min-w-[240px] flex-1">
          <h1 className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[22px] font-semibold leading-tight tracking-[-0.02em] @[720px]:text-[26px]">
            <span className="[overflow-wrap:anywhere]">{name}</span>
            <QuietPill
              label={toTitleLabel(customer.status)}
              tone={CUSTOMER_STATUS_TONE[customer.status] ?? 'neutral'}
              whole
            />
            {statusBehind ? (
              <span
                title="The status tag was not updated when the work moved on. The journey below is the fact."
                className="text-[12px] font-medium tracking-normal text-[var(--ds-warning)]"
              >
                Status is behind the journey
              </span>
            ) : null}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px] text-foreground-secondary">
            {customer.phone ? (
              <span className="inline-flex items-center gap-1.5">
                <a
                  href={`tel:${customer.phone}`}
                  aria-label={`Call ${name}`}
                  className="rounded-pill bg-surface px-2.5 py-1 font-medium tabular-nums text-foreground shadow-e1 hover:text-primary-dark"
                >
                  {formatPhoneForDisplay(customer.phone)}
                </a>
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-pill bg-surface px-2.5 py-1 font-medium text-[#15803D] shadow-e1 hover:underline"
                >
                  WhatsApp
                </a>
              </span>
            ) : (
              <span className="text-[var(--ds-warning)]">No phone</span>
            )}
            {location ? <span>{location}</span> : null}
            {owner}
            {resellerName ? (
              <span>
                Reseller <b className="font-medium text-foreground">{resellerName}</b>
              </span>
            ) : null}
            <span>
              Since <b className="font-medium text-foreground">{formatDate(customer.createdAt)}</b>
            </span>
            {customer.customerCode ? (
              <span className="tabular-nums text-foreground-tertiary">{customer.customerCode}</span>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 @[720px]:w-auto">
          <button
            type="button"
            aria-disabled={!logFollowup.allowed}
            onClick={logFollowup.onGatedClick}
            className={cn(
              HEADER_BUTTON,
              'flex-1 justify-center bg-primary text-white shadow-calm-cta @[720px]:flex-none',
            )}
          >
            Log follow-up
          </button>
          <Tooltip title={inactive ? INACTIVE_TOOLTIP : ''}>
            <span className="hidden @[720px]:inline-flex">
              <button
                type="button"
                disabled={inactive}
                aria-disabled={!newQuote.allowed}
                onClick={newQuote.onGatedClick}
                className={cn(HEADER_BUTTON, 'bg-surface text-foreground-secondary')}
              >
                New quote
              </button>
            </span>
          </Tooltip>
          <Tooltip title={inactive ? INACTIVE_TOOLTIP : ''}>
            <span className="hidden @[720px]:inline-flex">
              <button
                type="button"
                disabled={inactive}
                aria-disabled={!addSite.allowed}
                onClick={addSite.onGatedClick}
                className={cn(HEADER_BUTTON, 'bg-surface text-foreground-secondary')}
              >
                Add site
              </button>
            </span>
          </Tooltip>
          <button
            ref={editButton}
            type="button"
            aria-disabled={!edit.allowed}
            onClick={edit.onGatedClick}
            className={cn(
              HEADER_BUTTON,
              'hidden bg-surface text-foreground-secondary @[720px]:inline-flex',
            )}
          >
            Edit
          </button>
          <button
            type="button"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={Boolean(menuAnchor)}
            onClick={(event) => {
              // A hidden button has no layout box.
              setNarrow(editButton.current?.offsetParent === null);
              setMenuAnchor(event.currentTarget);
            }}
            className={cn(
              'grid size-[38px] flex-none place-items-center rounded-full bg-surface text-foreground-secondary shadow-e1',
              // On a wide page the only item left for the menu is Delete.
              !onDelete && '@[720px]:hidden',
            )}
          >
            <MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        {/* The three header buttons, for a page too narrow to show them. */}
        {narrow
          ? [
              <MenuItem
                key="new-quote"
                disabled={inactive}
                onClick={() => {
                  closeMenu();
                  newQuote.onGatedClick();
                }}
              >
                New quote
              </MenuItem>,
              <MenuItem
                key="add-site"
                disabled={inactive}
                onClick={() => {
                  closeMenu();
                  addSite.onGatedClick();
                }}
              >
                Add site
              </MenuItem>,
              <MenuItem
                key="edit"
                onClick={() => {
                  closeMenu();
                  edit.onGatedClick();
                }}
              >
                Edit
              </MenuItem>,
            ]
          : null}
        {onDelete ? (
          // Blocked, it stays reachable by keyboard so its reason can be read.
          <MenuItem
            aria-disabled={Boolean(deleteBlockedBy) || !deleteCustomer.allowed}
            onClick={() => {
              if (deleteBlockedBy) return;
              closeMenu();
              deleteCustomer.onGatedClick();
            }}
            sx={{ display: 'block', maxWidth: 280, whiteSpace: 'normal' }}
          >
            <span className={deleteBlockedBy ? 'text-foreground-tertiary' : 'text-error'}>
              Delete customer
            </span>
            {deleteBlockedBy ? (
              <span className="block text-[12px] text-foreground-tertiary">{deleteBlockedBy}</span>
            ) : null}
          </MenuItem>
        ) : null}
      </Menu>

      {inactive ? (
        <div
          role="alert"
          className="mt-3 rounded-[14px] bg-[var(--ds-warning-bg)] px-3.5 py-2.5 text-[13px] text-[var(--ds-warning)]"
        >
          This customer is inactive. Adding sites, creating quotes and site visits stay blocked
          until you reactivate them.
        </div>
      ) : null}
    </header>
  );
}

// ============================================================================
// Site switch
// ============================================================================

/** Only for a customer with two or more sites: the cards below follow the choice. */
export function SiteSwitch({
  sites,
  chosenId,
  onChoose,
  onAddSite,
}: {
  sites: CustomerPropertyResponse[];
  chosenId: string;
  onChoose: (siteId: string) => void;
  onAddSite: () => void;
}): JSX.Element {
  const addSite = useGatedAction('properties.create', onAddSite, 'Add site');
  return (
    <nav aria-label="Sites" className="mb-2.5 flex flex-wrap items-center gap-2 text-[13px]">
      {sites.map((site) => {
        const chosen = site.id === chosenId;
        const journey = siteJourneyText(site);
        return (
          <button
            key={site.id}
            type="button"
            aria-pressed={chosen}
            onClick={() => onChoose(site.id)}
            className={cn(
              'flex max-w-[240px] flex-col items-start rounded-[14px] px-3.5 py-2 text-left shadow-e1',
              chosen ? 'bg-foreground' : 'bg-surface',
            )}
          >
            <b
              className={cn(
                'max-w-full truncate text-[14px] font-semibold',
                chosen ? 'text-white' : 'text-foreground',
              )}
            >
              {getPropertyDisplayName(site)}
            </b>
            <span
              className={cn('text-[12px]', chosen ? 'text-white/70' : 'text-foreground-tertiary')}
            >
              {journey?.title ?? toTitleLabel(site.status)}
              {site.isPrimary ? ' · primary' : ''}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        className={cn(TEXT_ACTION, 'px-1.5 py-2')}
        aria-disabled={!addSite.allowed}
        onClick={addSite.onGatedClick}
      >
        + Add site
      </button>
      <span className="text-foreground-tertiary">
        The cards under the journey are for the chosen site.
      </span>
    </nav>
  );
}

// ============================================================================
// Where it stands
// ============================================================================

export interface StandsProps {
  site: CustomerPropertyResponse | undefined;
  /** The customer has more than one site: the band names the one it shows. */
  many: boolean;
  /** A day per step, in step order; null where no record carries one. */
  stepDates: Array<string | null>;
  /** One line under the stage: the meter date, or why and when it was lost. */
  summary: string | null;
  onAddSite: () => void;
}

export function Stands({ site, many, stepDates, summary, onAddSite }: StandsProps): JSX.Element {
  const addSite = useGatedAction('properties.create', onAddSite, 'Add site');

  if (!site) {
    return (
      <div className="px-6 py-[22px]">
        <p className={EYEBROW}>Where it stands</p>
        <div className="mt-2.5 text-[24px] font-semibold tracking-[-0.02em]">No site yet</div>
        <p className="m-0 mt-0.5 text-[13px] text-foreground-secondary">
          The journey starts when a site is added.
        </p>
        <JourneyTrack stageIndex={0} hasSite={false} className="mx-2 mb-2.5 mt-[22px]" />
        <div className="mt-3">
          <PillButton variant="dark" ariaDisabled={!addSite.allowed} onClick={addSite.onGatedClick}>
            Add site
          </PillButton>
        </div>
      </div>
    );
  }

  const journey = siteJourneyText(site);
  const known = site.stageIndex !== undefined;
  const stage = site.stageIndex ?? 0;
  const lost = Boolean(site.lost);
  const lines = journeyStepLines(stage, lost, true, site.journeySteps);
  const inPlay =
    site.status === PropertyStatus.ACTIVE || site.status === PropertyStatus.PENDING_VERIFICATION;
  const loanTag = site.financingBank
    ? `Loan · ${bankLabel(site.financingBank)}`
    : site.wantsLoan
      ? 'Wants loan'
      : null;

  return (
    <div className="min-w-0 px-6 py-[22px]">
      <p className={cn(EYEBROW, 'flex flex-wrap items-center gap-2')}>
        Where it stands{many ? ` · ${getPropertyDisplayName(site)}` : ''}
        {loanTag ? <QuietPill label={loanTag} tone="neutral" whole /> : null}
        {inPlay ? <TemperatureChips site={site} /> : null}
      </p>
      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5">
        <span className="text-[24px] font-semibold tracking-[-0.02em]">
          {journey?.title ?? 'Stage not available'}
        </span>
        {summary ? <span className="text-[13px] text-foreground-secondary">{summary}</span> : null}
      </div>
      {/* With no picklist reason the typed text is already the summary above. */}
      {lost && site.lostReason && site.lostReason !== site.journeyLostReason ? (
        <p className="m-0 mt-1 text-[13px] text-foreground-secondary">“{site.lostReason}”</p>
      ) : null}

      <JourneyTrack
        stageIndex={stage}
        lost={lost}
        known={known}
        animateIn
        className="mx-2 mb-2.5 mt-[22px]"
      />
      <ol className="m-0 flex list-none justify-between gap-1 p-0 text-[11px] text-foreground-tertiary">
        {SITE_JOURNEY_STEPS.map((step, index) => {
          const line = lines[index];
          const here = known && index === stage;
          const date = stepDates[index];
          return (
            <li
              key={step}
              className={cn(
                'min-w-0 flex-1 text-center first:text-left last:text-right',
                here && 'font-semibold text-foreground',
                !here && line?.state === 'done' && 'text-foreground-secondary',
                // A narrow band has room for one name only: where it stands.
                !here && 'hidden @[560px]:block',
              )}
            >
              {step}
              <span className="block text-[10px] font-normal text-foreground-tertiary">
                {!known || line?.state === 'todo'
                  ? ''
                  : line?.state === 'missing'
                    ? 'not recorded'
                    : date
                      ? formatDate(date)
                      : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ============================================================================
// Needs attention
// ============================================================================

const TONE_BOX = {
  danger: 'bg-[var(--ds-danger-bg)]',
  warning: 'bg-[var(--ds-warning-bg)]',
  info: 'bg-background-tertiary',
  ok: 'bg-[var(--ds-success-bg)]',
} as const;

const TONE_DOT = {
  danger: 'bg-error',
  warning: 'bg-[#F59E0B]',
  info: 'bg-[var(--ds-info)]',
} as const;

/** Lines shown before "N more". */
const FIRST_SHOWN = 4;

/** "Follow-ups, money and tasks are on time." — naming only what was looked at. */
function onTime(checked: string[]): string {
  if (checked.length === 0) return 'Nothing you have access to needs attention.';
  const list =
    checked.length === 1
      ? checked[0]
      : `${checked.slice(0, -1).join(', ')} and ${checked[checked.length - 1]}`;
  const sentence = `${list} ${checked.length === 1 && checked[0] === 'money' ? 'is' : 'are'} on time.`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export function AttentionBox({
  lines,
  isLoading,
  failed,
  onRetry,
  closedSite,
  checked,
  onAct,
}: {
  lines: AttentionLine[];
  /** Some source has not answered yet: an empty list is not yet "nothing". */
  isLoading: boolean;
  /** A source failed: the list may be short, and an empty one is not "nothing". */
  failed: boolean;
  onRetry: () => void;
  /** The chosen site is lost: "nothing to do" has a reason. */
  closedSite: boolean;
  /** What this user's permissions let the list check: "follow-ups", "money", "tasks". */
  checked: string[];
  onAct: (action: AttentionAction) => void;
}): JSX.Element {
  const [all, setAll] = useState(false);
  const worst = lines[0]?.tone;
  const shown = all || lines.length <= FIRST_SHOWN ? lines : lines.slice(0, FIRST_SHOWN - 1);
  const hidden = lines.length - shown.length;

  return (
    <aside
      aria-label="Needs attention"
      className={cn(
        'flex min-w-0 flex-col gap-1.5 border-t border-border px-6 py-[22px] @[980px]:border-l @[980px]:border-t-0',
        worst ? TONE_BOX[worst] : isLoading || failed ? 'bg-background-tertiary' : TONE_BOX.ok,
      )}
    >
      <p className={EYEBROW}>Needs attention{lines.length > 0 ? ` · ${lines.length}` : ''}</p>
      {lines.length === 0 ? (
        isLoading ? (
          <p className="m-0 text-[13px] text-foreground-secondary">Checking…</p>
        ) : failed ? null : (
          <>
            <p className="m-0 text-[16px] font-semibold text-primary-dark">
              Nothing needs attention
            </p>
            <p className="m-0 text-[13px] text-foreground-secondary">
              {closedSite ? 'This site is closed. Reopen it to work on it again.' : onTime(checked)}
            </p>
          </>
        )
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {shown.map((line) => (
            <li
              key={line.id}
              className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-start gap-2.5 border-t border-black/[0.07] py-2 first:border-t-0 first:pt-0"
            >
              <i
                aria-hidden
                className={cn('mt-1.5 block size-2 rounded-full', TONE_DOT[line.tone])}
              />
              <div className="min-w-0">
                <b
                  className={cn(
                    'block text-[14px] font-semibold [overflow-wrap:anywhere]',
                    line.tone === 'danger' && 'text-error',
                  )}
                >
                  {line.title}
                </b>
                {line.detail ? (
                  <span className="block text-[12.5px] text-foreground-secondary [overflow-wrap:anywhere]">
                    {line.detail}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                className={cn(TEXT_ACTION, 'whitespace-nowrap pt-px')}
                // Several lines can share a label ("Mark complete"): name the line too.
                aria-label={`${line.actionLabel}: ${line.title}`}
                onClick={() => onAct(line.action)}
              >
                {line.actionLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
      {lines.length > FIRST_SHOWN ? (
        <MoreToggle
          open={all}
          onToggle={() => setAll((value) => !value)}
          closedLabel={`${hidden} more`}
        />
      ) : null}
      {failed && !isLoading ? (
        <p className="m-0 text-[13px] text-foreground-secondary">
          Some checks could not load, so this list is not complete.{' '}
          <button type="button" className={TEXT_ACTION} onClick={onRetry}>
            Try again
          </button>
        </p>
      ) : null}
    </aside>
  );
}
