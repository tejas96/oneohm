// ============================================
// IMPORTS
// ============================================
import { PartialType } from '@nestjs/swagger';

import { CreatePaymentDto } from './create-payment.dto';

/**
 * DTO for updating a payment
 * All fields from CreatePaymentDto are optional
 */
export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}

