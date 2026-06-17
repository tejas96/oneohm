import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IntegrationCategory, IntegrationProvider } from '@tejas96/shared/types';

import { IntegrationService } from '../services';

@ApiTags('WhatsApp Webhooks')
@Controller('integrations/whatsapp')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(private readonly integrationService: IntegrationService) {}

  @Get('webhook/:organizationId')
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Verify WhatsApp webhook callback URL' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook challenge accepted' })
  async verifyWebhook(
    @Param('organizationId') organizationId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ): Promise<string> {
    const expectedToken = await this.getWebhookVerifyToken(organizationId);

    if (mode !== 'subscribe' || !expectedToken || verifyToken !== expectedToken) {
      throw new UnauthorizedException('Invalid WhatsApp webhook verification token');
    }

    if (!challenge || !/^[a-zA-Z0-9_-]+$/.test(challenge)) {
      throw new BadRequestException('Invalid challenge parameter');
    }

    return challenge;
  }

  @Post('webhook/:organizationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive WhatsApp webhook events' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook event accepted' })
  async receiveWebhook(
    @Param('organizationId') organizationId: string,
    @Body() payload: Record<string, unknown>,
  ): Promise<{ received: true }> {
    this.logger.log(
      `Received WhatsApp webhook for org ${organizationId}: ${JSON.stringify(
        this.summarizePayload(payload),
      )}`,
    );

    return { received: true };
  }

  private async getWebhookVerifyToken(organizationId: string): Promise<string | undefined> {
    const integrations = await this.integrationService.getIntegrationsByCategory(
      IntegrationCategory.MESSAGING,
      organizationId,
    );
    const whatsapp = integrations.find(
      (integration) =>
        (integration.provider as IntegrationProvider) === IntegrationProvider.WHATSAPP_BUSINESS &&
        integration.isActive,
    );

    const token = whatsapp?.configuration?.webhookVerifyToken;
    return typeof token === 'string' ? token : undefined;
  }

  private summarizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const entries = Array.isArray(payload.entry) ? payload.entry : [];
    return {
      object: payload.object,
      entries: entries.length,
    };
  }
}
