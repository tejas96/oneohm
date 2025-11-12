// ============================================
// IMPORTS
// ============================================
import { PartialType } from '@nestjs/swagger';

import { CreateDocumentDto } from './create-document.dto';

/**
 * Update Document DTO
 * Allows partial updates to document properties
 */
export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
