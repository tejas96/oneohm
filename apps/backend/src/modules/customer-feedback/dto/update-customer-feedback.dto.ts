import { PartialType } from '@nestjs/swagger';

import { CreateCustomerFeedbackDto } from './create-customer-feedback.dto';

/**
 * DTO for Updating Customer Feedback
 */
export class UpdateCustomerFeedbackDto extends PartialType(CreateCustomerFeedbackDto) {}
