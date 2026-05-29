import { existsSync } from 'fs';
import { isAbsolute, resolve } from 'path';

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';

import type { Configuration } from '../../../config/config.interface';
import { DeviceTokenService } from '../../users/services/device-token.service';

export interface SendPushNotificationInput {
  userId: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private app?: App;
  private initialized = false;

  constructor(
    private readonly configService: ConfigService<Configuration>,
    @Inject(forwardRef(() => DeviceTokenService))
    private readonly deviceTokenService: DeviceTokenService,
  ) {}

  async sendToUser(input: SendPushNotificationInput): Promise<void> {
    const app = this.getApp();
    if (!app) return;

    const tokens = await this.deviceTokenService.getActiveTokensForUser(input.userId);
    if (tokens.length === 0) return;

    const message: MulticastMessage = {
      tokens,
      notification: {
        title: input.title,
        body: input.body,
      },
      data: this.serializeData(input.data),
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    const response = await getMessaging(app).sendEachForMulticast(message);
    const invalidTokens = response.responses
      .map((result, index) => ({ result, token: tokens[index] }))
      .filter(({ result }) => {
        const code = result.error?.code;
        return (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        );
      })
      .map(({ token }) => token)
      .filter((token): token is string => Boolean(token));

    if (invalidTokens.length > 0) {
      await this.deviceTokenService.deactivateTokens(invalidTokens);
    }

    if (response.failureCount > 0) {
      this.logger.warn(
        `FCM push completed with ${response.failureCount} failures for user ${input.userId}`,
      );
    }
  }

  private getApp(): App | undefined {
    if (this.app) return this.app;
    if (this.initialized) return undefined;

    this.initialized = true;

    const firebase = this.configService.get('firebase', { infer: true });
    const projectId = firebase?.projectId;

    if (!projectId) {
      this.logger.warn('FCM is disabled: FIREBASE_PROJECT_ID is not configured');
      return undefined;
    }

    if (getApps().length > 0) {
      this.app = getApps()[0];
      return this.app;
    }

    if (firebase?.serviceAccountPath) {
      const serviceAccountPath = this.resolveServiceAccountPath(firebase.serviceAccountPath);
      this.app = initializeApp({
        credential: cert(serviceAccountPath),
        projectId,
      });
      return this.app;
    }

    if (firebase?.clientEmail && firebase.privateKey) {
      this.app = initializeApp({
        credential: cert({
          projectId,
          clientEmail: firebase.clientEmail,
          privateKey: firebase.privateKey.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
      return this.app;
    }

    this.logger.warn(
      'FCM is disabled: configure FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY',
    );
    return undefined;
  }

  private resolveServiceAccountPath(serviceAccountPath: string): string {
    if (isAbsolute(serviceAccountPath)) return serviceAccountPath;

    const candidates = [
      resolve(process.cwd(), serviceAccountPath),
      resolve(process.cwd(), 'apps/backend', serviceAccountPath),
    ];

    return (
      candidates.find((candidate) => existsSync(candidate)) ??
      resolve(process.cwd(), serviceAccountPath)
    );
  }

  private serializeData(data?: Record<string, unknown>): Record<string, string> | undefined {
    if (!data) return undefined;

    return Object.entries(data).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value === undefined || value === null) return acc;
      acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
      return acc;
    }, {});
  }
}
