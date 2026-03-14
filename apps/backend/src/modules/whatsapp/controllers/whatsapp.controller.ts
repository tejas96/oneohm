import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards';
import { SendQuotationWhatsAppDto } from '../dto/send-quotation-whatsapp.dto';
import { WhatsAppService } from '../services/whatsapp.service';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Post('send-quotation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send quotation PDF to customer via WhatsApp',
    description:
      'Sends an already-uploaded PDF (provided via pdfUrl) as a WhatsApp document message to the customer.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message dispatched successfully',
    schema: { example: { messageId: 'wamid.xxx' } },
  })
  async sendQuotation(
    @Body() dto: SendQuotationWhatsAppDto,
  ): Promise<{ messageId: string }> {
    return this.whatsAppService.sendQuotationPdf(
      dto.phone,
      dto.quotationId,
      dto.pdfUrl,
      dto.quoteNumber,
      dto.customerName,
      dto.validUntil,
    );
  }
}
