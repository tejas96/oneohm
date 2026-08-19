import { BadRequestException } from '@nestjs/common';
import {
  DocumentEntityType,
  IntegrationStatus,
  type PaymentMilestoneConfig,
  QuoteStatus,
} from '@tejas96/shared/types';

import { QuoteService } from './quote.service';
import { todayIst } from '../../ledger/domain/dates';

/**
 * Guards on sharing a quote, and the payment schedule a quote starts from.
 *
 * Three defects are covered here, all of which shipped and all of which put a
 * wrong number in front of a customer:
 *
 *  1. `shareOnWhatsapp` never checked the property lock, so a stale draft on a
 *     property that had already signed a different quote could still be sent —
 *     and the send flipped it DRAFT → SENT through a raw repository update that
 *     bypassed both the lock and `validateStatusTransition`.
 *  2. The status guard named only ACCEPTED and REJECTED. Since nothing in the
 *     system ever writes EXPIRED, a quote long past its validity date still read
 *     `sent` and went out looking current.
 *  3. The financed payment schedule was never serialised and the server-side
 *     branch that picks it only ran when the request omitted milestones, which
 *     the payment-terms dialog never does — so financed quotes saved the
 *     self-financed advance.
 *
 * The service is constructed directly rather than through a Nest testing
 * module: every guard runs before any collaborator is touched except the two
 * repository reads, so a full DI graph would add setup without adding coverage.
 */

function isoDate(offsetDays: number): string {
  const [year, month, day] = todayIst().split('-').map(Number);
  return new Date(Date.UTC(year as number, (month as number) - 1, (day as number) + offsetDays))
    .toISOString()
    .slice(0, 10);
}

type Overrides = {
  status?: QuoteStatus;
  validUntil?: string;
  propertyId?: string | null;
};

function makeQuote(overrides: Overrides = {}) {
  return {
    id: 'quote-1',
    quoteNumber: 'QT-OO-2026-0001',
    status: overrides.status ?? QuoteStatus.DRAFT,
    validUntil: overrides.validUntil ?? isoDate(30),
    propertyId: overrides.propertyId === undefined ? 'property-1' : overrides.propertyId,
    customerId: 'customer-1',
    customer: { firstName: 'Asha', lastName: 'Kulkarni', phone: '9876543210' },
  };
}

function makeService(opts: {
  quote?: ReturnType<typeof makeQuote>;
  acceptedSibling?: { quoteNumber: string } | null;
  queryRows?: Array<{ wants_loan: boolean }>;
}) {
  const update = jest.fn().mockResolvedValue(undefined);
  const sendTemplateMessage = jest.fn().mockResolvedValue({
    messageId: 'wamid.TEST',
    status: IntegrationStatus.SENT,
  });
  const emit = jest.fn();

  const quoteRepository = {
    findById: jest.fn().mockResolvedValue(opts.quote ?? makeQuote()),
    findAcceptedByPropertyId: jest.fn().mockResolvedValue(opts.acceptedSibling ?? null),
    update,
  };

  const documentService = {
    findById: jest.fn().mockResolvedValue({
      id: 'document-1',
      entityType: DocumentEntityType.QUOTE,
      entityId: 'quote-1',
      mimeType: 'application/pdf',
      fileName: 'quote.pdf',
      fileUrl: 'https://files.example/quote.pdf',
    }),
  };

  const dataSource = { query: jest.fn().mockResolvedValue(opts.queryRows ?? []) };

  const service = new QuoteService(
    quoteRepository as never,
    {} as never,
    {} as never,
    documentService as never,
    { sendTemplateMessage } as never,
    {} as never,
    dataSource as never,
    { emit } as never,
    {} as never,
  );

  return { service, quoteRepository, sendTemplateMessage, update, emit, dataSource };
}

async function shareError(setup: ReturnType<typeof makeService>): Promise<string> {
  try {
    await setup.service.shareOnWhatsapp('quote-1', { documentId: 'document-1' }, 'user-1');
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).message;
  }
  throw new Error('expected shareOnWhatsapp to reject, but it resolved');
}

describe('QuoteService.shareOnWhatsapp — status guard', () => {
  it.each([
    [QuoteStatus.ACCEPTED, 'accepted'],
    [QuoteStatus.REJECTED, 'rejected'],
    [QuoteStatus.EXPIRED, 'expired'],
  ])('refuses a %s quote', async (status) => {
    const setup = makeService({ quote: makeQuote({ status }) });
    expect(await shareError(setup)).toContain(`Cannot send quote with status ${status}`);
    expect(setup.sendTemplateMessage).not.toHaveBeenCalled();
  });

  it('lets a draft through', async () => {
    const setup = makeService({ quote: makeQuote({ status: QuoteStatus.DRAFT }) });
    const result = await setup.service.shareOnWhatsapp(
      'quote-1',
      { documentId: 'document-1' },
      'user-1',
    );

    expect(setup.sendTemplateMessage).toHaveBeenCalledTimes(1);
    expect(result.quoteStatus).toBe(QuoteStatus.SENT);
    expect(setup.update).toHaveBeenCalledWith('quote-1', {
      status: QuoteStatus.SENT,
      updatedBy: 'user-1',
    });
  });

  it('leaves a sent quote on sent when resending', async () => {
    const setup = makeService({ quote: makeQuote({ status: QuoteStatus.SENT }) });
    const result = await setup.service.shareOnWhatsapp(
      'quote-1',
      { documentId: 'document-1' },
      'user-1',
    );

    expect(result.quoteStatus).toBe(QuoteStatus.SENT);
    expect(setup.update).not.toHaveBeenCalled();
  });
});

describe('QuoteService.shareOnWhatsapp — property lock', () => {
  it('refuses when another quote on the property is already accepted', async () => {
    const setup = makeService({ acceptedSibling: { quoteNumber: 'QT-OO-2026-0009' } });

    const message = await shareError(setup);
    expect(message).toContain('QT-OO-2026-0009');
    expect(message).toContain('cannot be shared');
    expect(setup.sendTemplateMessage).not.toHaveBeenCalled();
  });

  it('does not silently promote the draft it refused', async () => {
    const setup = makeService({ acceptedSibling: { quoteNumber: 'QT-OO-2026-0009' } });
    await shareError(setup);

    // The original defect: the send flipped DRAFT -> SENT even on a locked
    // property, through a raw update that ran past every other check.
    expect(setup.update).not.toHaveBeenCalled();
    expect(setup.emit).not.toHaveBeenCalled();
  });

  it('excludes the quote itself when looking for an accepted sibling', async () => {
    const setup = makeService({});
    await setup.service.shareOnWhatsapp('quote-1', { documentId: 'document-1' }, 'user-1');

    expect(setup.quoteRepository.findAcceptedByPropertyId).toHaveBeenCalledWith(
      'property-1',
      'quote-1',
    );
  });

  it('skips the lock check for a quote with no property', async () => {
    const setup = makeService({ quote: makeQuote({ propertyId: null }) });
    await setup.service.shareOnWhatsapp('quote-1', { documentId: 'document-1' }, 'user-1');

    expect(setup.quoteRepository.findAcceptedByPropertyId).not.toHaveBeenCalled();
    expect(setup.sendTemplateMessage).toHaveBeenCalledTimes(1);
  });
});

describe('QuoteService.shareOnWhatsapp — validity date', () => {
  it('refuses a quote whose validity has passed, naming the date', async () => {
    const setup = makeService({ quote: makeQuote({ validUntil: isoDate(-1) }) });

    const message = await shareError(setup);
    expect(message).toContain('QT-OO-2026-0001');
    expect(message).toContain('expired on');
    expect(setup.sendTemplateMessage).not.toHaveBeenCalled();
  });

  it('refuses a long-dead quote that still reads sent', async () => {
    // The realistic case. Nothing ever writes EXPIRED, so a quote eight months
    // past its date is still `sent` and a status-only guard waves it through.
    const setup = makeService({
      quote: makeQuote({ status: QuoteStatus.SENT, validUntil: isoDate(-240) }),
    });

    expect(await shareError(setup)).toContain('expired on');
  });

  it('still allows the final valid day', async () => {
    const setup = makeService({ quote: makeQuote({ validUntil: isoDate(0) }) });
    await setup.service.shareOnWhatsapp('quote-1', { documentId: 'document-1' }, 'user-1');

    expect(setup.sendTemplateMessage).toHaveBeenCalledTimes(1);
  });
});

describe('QuoteService.resolveMilestoneTemplate', () => {
  const cash: PaymentMilestoneConfig[] = [
    { stage: 'advance', name: 'Advance', percentage: 10, order: 1 },
    { stage: 'installation_complete', name: 'Installation Complete', percentage: 85, order: 2 },
    { stage: 'commissioning', name: 'Commissioning', percentage: 5, order: 3 },
  ];
  const loan: PaymentMilestoneConfig[] = [
    { stage: 'advance', name: 'Advance', percentage: 10, order: 1 },
    { stage: 'installation_complete', name: 'Installation Complete', percentage: 70, order: 2 },
    { stage: 'commissioning', name: 'Commissioning', percentage: 20, order: 3 },
  ];

  it('returns the financed schedule for a financed property', async () => {
    const setup = makeService({ queryRows: [{ wants_loan: true }] });

    const result = await setup.service.resolveMilestoneTemplate('property-1', {
      paymentMilestones: cash,
      paymentMilestonesLoan: loan,
    });

    expect(result.isLoan).toBe(true);
    expect(result.milestones).toBe(loan);
    expect(result.milestones[0]?.percentage).toBe(10);
    expect(result.milestones[1]?.percentage).toBe(70);
  });

  it('returns the self-financed schedule for an unfinanced property', async () => {
    const setup = makeService({ queryRows: [{ wants_loan: false }] });

    const result = await setup.service.resolveMilestoneTemplate('property-1', {
      paymentMilestones: cash,
      paymentMilestonesLoan: loan,
    });

    expect(result.isLoan).toBe(false);
    expect(result.milestones).toBe(cash);
  });

  it('does not query at all without a property', async () => {
    const setup = makeService({});

    const result = await setup.service.resolveMilestoneTemplate(undefined, {
      paymentMilestones: cash,
      paymentMilestonesLoan: loan,
    });

    expect(result).toEqual({ milestones: cash, isLoan: false });
    expect(setup.dataSource.query).not.toHaveBeenCalled();
  });

  it('falls back to self-financed when no loan schedule is configured', async () => {
    const setup = makeService({ queryRows: [{ wants_loan: true }] });

    const result = await setup.service.resolveMilestoneTemplate('property-1', {
      paymentMilestones: cash,
      paymentMilestonesLoan: [],
    });

    expect(result).toEqual({ milestones: cash, isLoan: false });
  });

  it('treats a missing property row as unfinanced rather than throwing', async () => {
    const setup = makeService({ queryRows: [] });

    const result = await setup.service.resolveMilestoneTemplate('gone', {
      paymentMilestones: cash,
      paymentMilestonesLoan: loan,
    });

    expect(result).toEqual({ milestones: cash, isLoan: false });
  });
});
