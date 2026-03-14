import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { type AxiosError } from 'axios';

import type { Configuration } from '../../../config/config.interface';

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v19.0';

interface WhatsAppDocumentPayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'document';
  document: {
    link: string;
    filename: string;
    caption: string;
  };
}

interface WhatsAppApiResponse {
  messages: Array<{ id: string }>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly configService: ConfigService<Configuration, true>,
  ) {}

  async sendQuotationPdf(
    phone: string,
    quotationId: string,
    pdfUrl: string,
    quoteNumber: string,
    customerName: string,
    validUntil: string,
  ): Promise<{ messageId: string }> {
    const accessToken = this.configService.get('integrations.whatsappAccessToken', { infer: true });
    const phoneNumberId = this.configService.get('integrations.whatsappPhoneNumberId', { infer: true });

    if (!accessToken || !phoneNumberId) {
      throw new InternalServerErrorException(
        'WhatsApp integration not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.',
      );
    }

    // Sanitize pdfUrl — extract only the clean URL, strip any accidental trailing data
    let cleanPdfUrl: string;
    try {
      cleanPdfUrl = new URL(pdfUrl.trim()).href;
    } catch {
      this.logger.error(`Invalid pdfUrl received: ${pdfUrl}`);
      throw new InternalServerErrorException(`Invalid PDF URL: ${pdfUrl}`);
    }

    this.logger.log(`PDF URL → ${cleanPdfUrl}`);

    const validUntilFormatted = new Date(validUntil).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const caption =
      `Dear ${customerName},\n\n` +
      `Please find your solar energy quotation *${quoteNumber}* attached.\n\n` +
      `📅 Valid until: ${validUntilFormatted}\n\n` +
      `For any queries, feel free to contact us.\n\n` +
      `— *One Ohm EPC*`;

    const payload: WhatsAppDocumentPayload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'document',
      document: {
        link: cleanPdfUrl,
        filename: `Quotation-${quoteNumber}.pdf`,
        caption,
      },
    };

    try {
      const response = await axios.post<WhatsAppApiResponse>(
        `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const messageId = response.data.messages?.[0]?.id ?? `wa-${Date.now()}`;
      this.logger.log(
        `WhatsApp sent — quote=${quoteNumber} phone=${phone} msgId=${messageId} ref=${quotationId}`,
      );
      return { messageId };
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      const detail = axiosErr.response?.data?.error?.message ?? axiosErr.message;
      this.logger.error(`WhatsApp send failed for quote ${quoteNumber}: ${detail}`);
      throw new InternalServerErrorException(`WhatsApp delivery failed: ${detail}`);
    }
  }
}
