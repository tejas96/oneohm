import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { IntegrationService } from '../services';

@ApiTags('WhatsApp Webhooks')
@Controller('integrations/whatsapp')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(private readonly integrationService: IntegrationService) {}

  @Get('webhook')
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Verify WhatsApp webhook callback URL' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook challenge accepted' })
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ): Promise<string> {
    const expectedToken = await this.integrationService.getWebhookVerifyToken();

    if (mode !== 'subscribe' || !expectedToken || verifyToken !== expectedToken) {
      throw new UnauthorizedException('Invalid WhatsApp webhook verification token');
    }

    if (!challenge || !/^[a-zA-Z0-9_-]+$/.test(challenge)) {
      throw new BadRequestException('Invalid challenge parameter');
    }

    return challenge;
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive WhatsApp webhook events' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook event accepted' })
  async receiveWebhook(@Body() payload: Record<string, unknown>): Promise<{ received: true }> {
    this.processWebhookEvents(payload);
    return { received: true };
  }

  /**
   * Process webhook payloads. Delivery status and inbound messages are logged here;
   * extend this handler when adding chatbot or notification side-effects.
   */
  private processWebhookEvents(payload: Record<string, unknown>): void {
    const entries = Array.isArray(payload.entry) ? payload.entry : [];

    for (const entry of entries) {
      if (!this.isRecord(entry)) continue;
      const changes = Array.isArray(entry.changes) ? entry.changes : [];

      for (const change of changes) {
        if (!this.isRecord(change) || !this.isRecord(change.value)) continue;
        const value = change.value;

        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        for (const status of statuses) {
          if (!this.isRecord(status)) continue;
          const recipient = status.recipient_id;
          const messageStatus = status.status;
          const messageId = status.id;
          const errors = Array.isArray(status.errors) ? status.errors : [];

          if (typeof messageId !== 'string' || typeof messageStatus !== 'string') {
            continue;
          }

          if (messageStatus === 'failed') {
            this.logger.error(
              `WhatsApp delivery failed, recipient ${String(recipient)}, message ${messageId}: ${JSON.stringify(errors)}`,
            );
          } else {
            this.logger.log(
              `WhatsApp ${messageStatus}, recipient ${String(recipient)}, message ${messageId}`,
            );
          }
        }

        const messages = Array.isArray(value.messages) ? value.messages : [];
        for (const message of messages) {
          if (!this.isRecord(message)) continue;
          this.logger.log(`WhatsApp inbound message: ${JSON.stringify(message)}`);
        }
      }
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
