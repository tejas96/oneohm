import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type OwnedKind =
  | 'customer'
  | 'property'
  | 'quote'
  | 'project'
  | 'followup'
  | 'ticket'
  | 'document';

/**
 * One SQL per kind: does this id belong to this reseller? 404 when not —
 * never 403, so an id he guessed does not confirm it exists (edge case 37).
 */
const OWNS: Record<OwnedKind, string> = {
  customer: `SELECT 1 FROM customer_profiles WHERE id = $1 AND reseller_id = $2 AND deleted_at IS NULL`,
  property: `SELECT 1 FROM customer_properties p JOIN customer_profiles c ON c.id = p.customer_id
              WHERE p.id = $1 AND c.reseller_id = $2`,
  quote: `SELECT 1 FROM quotes WHERE id = $1 AND reseller_id = $2 AND deleted_at IS NULL`,
  project: `SELECT 1 FROM projects p JOIN quotes q ON q.id = p.quote_id
             WHERE p.id = $1 AND q.reseller_id = $2 AND p.deleted_at IS NULL`,
  followup: `SELECT 1 FROM followups f JOIN customer_profiles c ON c.id = f.customer_id
              WHERE f.id = $1 AND c.reseller_id = $2`,
  ticket: `SELECT 1 FROM service_tickets t JOIN customer_profiles c ON c.id = t.customer_id
            WHERE t.id = $1 AND c.reseller_id = $2`,
  // Customer and property documents only; project documents stay closed (X8).
  document: `SELECT 1 FROM documents d
              WHERE d.id = $1 AND (
                (d.entity_type = 'customer' AND d.entity_id IN (SELECT id FROM customer_profiles WHERE reseller_id = $2))
             OR (d.entity_type = 'property' AND d.entity_id IN (
                   SELECT p.id FROM customer_properties p JOIN customer_profiles c ON c.id = p.customer_id
                    WHERE c.reseller_id = $2)))`,
};

@Injectable()
export class ResellerOwnershipService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async assertOwns(kind: OwnedKind, id: string, resellerId: string): Promise<void> {
    const rows = await this.dataSource.query(OWNS[kind], [id, resellerId]);
    if (!rows[0]) throw new NotFoundException('Not found');
  }

  /** Document lists and uploads name their parent: only his customer or property. */
  async assertOwnsDocumentParent(
    entityType: string,
    entityId: string,
    resellerId: string,
  ): Promise<void> {
    if (entityType === 'customer') return this.assertOwns('customer', entityId, resellerId);
    if (entityType === 'property') return this.assertOwns('property', entityId, resellerId);
    throw new NotFoundException('Not found');
  }
}
