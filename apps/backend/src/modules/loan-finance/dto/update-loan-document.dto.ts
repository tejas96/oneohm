import { PartialType } from '@nestjs/swagger';

import { CreateLoanDocumentDto } from './create-loan-document.dto';
export class UpdateLoanDocumentDto extends PartialType(CreateLoanDocumentDto) {}
