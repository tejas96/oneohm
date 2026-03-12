import * as crypto from 'crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '../../../config';

/**
 * Integration Credential Service
 * Handles encryption/decryption of integration credentials
 * Uses AES-256-GCM for secure credential storage
 */
@Injectable()
export class IntegrationCredentialService {
  private readonly logger = new Logger(IntegrationCredentialService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer;
  private readonly ivLength = 16; // 128 bits for GCM
  private readonly authTagLength = 16; // 128 bits for GCM

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.integrations.encryptionKey;

    if (!key) {
      throw new BadRequestException(
        'INTEGRATION_ENCRYPTION_KEY is not configured in environment variables',
      );
    }

    // Ensure key is 32 bytes (256 bits) for AES-256
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
  }

  /**
   * Encrypt credentials
   * @param credentials - Plain credentials object
   * @returns Encrypted string in format: iv:authTag:encryptedData
   */
  encrypt(credentials: Record<string, unknown>): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      const plaintext = JSON.stringify(credentials);
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:encryptedData (all base64 encoded)
      return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
    } catch (error) {
      this.logger.error('Failed to encrypt credentials', error);
      throw new BadRequestException('Failed to encrypt credentials');
    }
  }

  /**
   * Decrypt credentials
   * @param encryptedCredentials - Encrypted string from database
   * @returns Decrypted credentials object
   */
  decrypt(encryptedCredentials: string): Record<string, unknown> {
    try {
      const parts = encryptedCredentials.split(':');
      if (parts.length !== 3) {
        throw new BadRequestException('Invalid encrypted credential format');
      }

      const [ivBase64, authTagBase64, encryptedBase64] = parts;

      if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
        throw new BadRequestException('Invalid encrypted credential format: missing parts');
      }

      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');
      const encrypted = Buffer.from(encryptedBase64, 'base64');

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      return JSON.parse(decrypted.toString('utf8')) as Record<string, unknown>;
    } catch (error) {
      this.logger.error('Failed to decrypt credentials', error);
      throw new BadRequestException('Failed to decrypt credentials');
    }
  }

  /**
   * Validate that credentials can be encrypted and decrypted
   * @param credentials - Credentials to validate
   * @returns true if valid
   */
  validateEncryption(credentials: Record<string, unknown>): boolean {
    try {
      const encrypted = this.encrypt(credentials);
      const decrypted = this.decrypt(encrypted);
      return JSON.stringify(credentials) === JSON.stringify(decrypted);
    } catch (error) {
      this.logger.error('Encryption validation failed', error);
      return false;
    }
  }
}
