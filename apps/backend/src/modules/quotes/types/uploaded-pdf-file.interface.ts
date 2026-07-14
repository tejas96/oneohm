/**
 * Minimal uploaded file shape from NestJS FileInterceptor (memory storage).
 */
export interface UploadedPdfFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size?: number;
}
