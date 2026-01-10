/**
 * Storage Controller
 *
 * REST API endpoints for file storage operations.
 * Handles presigned URL generation and file deletion.
 *
 * @module modules/storage/controllers
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards';
import {
  DeleteFileDto,
  PresignedDownloadUrlResponseDto,
  PresignedUploadUrlResponseDto,
  RequestUploadUrlDto,
} from '../dto';
import { StorageService } from '../services';

/**
 * Storage Controller
 *
 * Provides endpoints for:
 * - Generating presigned upload URLs
 * - Generating presigned download URLs
 * - Deleting files
 */
@ApiTags('Storage')
@ApiBearerAuth()
@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  // ============================================
  // PRESIGNED URL ENDPOINTS
  // ============================================

  /**
   * Get a presigned URL for uploading a file
   */
  @Post('presigned-url')
  @ApiOperation({
    summary: 'Get presigned URL for file upload',
    description:
      'Generates a presigned URL that allows direct upload to storage. ' +
      'The client should use PUT request with the file binary to upload.',
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL generated successfully',
    type: PresignedUploadUrlResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request (bad file type, size, etc.)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUploadUrl(@Body() dto: RequestUploadUrlDto): Promise<PresignedUploadUrlResponseDto> {
    return this.storageService.getUploadUrl(dto);
  }

  /**
   * Get a presigned URL for downloading a file
   */
  @Get('download-url/:fileKey')
  @ApiOperation({
    summary: 'Get presigned URL for file download',
    description: 'Generates a presigned URL that allows downloading a file from storage.',
  })
  @ApiParam({
    name: 'fileKey',
    description: 'The file key in storage (URL encoded)',
    example: 'site-visit/abc123/image.jpg',
  })
  @ApiQuery({
    name: 'filename',
    required: false,
    description: 'Custom filename for the download',
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL generated successfully',
    type: PresignedDownloadUrlResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getDownloadUrl(
    @Param('fileKey') fileKey: string,
    @Query('filename') downloadFilename?: string,
  ): Promise<PresignedDownloadUrlResponseDto> {
    const result = await this.storageService.getDownloadUrl(
      decodeURIComponent(fileKey),
      downloadFilename,
    );

    return {
      downloadUrl: result.url,
      expiresAt: result.expiresAt,
    };
  }

  // ============================================
  // FILE MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * Delete a file from storage
   */
  @Delete('files')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a file from storage',
    description: 'Permanently deletes a file from storage. This action cannot be undone.',
  })
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file key' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteFile(@Body() dto: DeleteFileDto): Promise<void> {
    await this.storageService.deleteFile(dto.fileKey);
  }

  /**
   * Check if a file exists
   */
  @Get('files/:fileKey/exists')
  @ApiOperation({
    summary: 'Check if a file exists',
    description: 'Returns whether a file exists in storage.',
  })
  @ApiParam({
    name: 'fileKey',
    description: 'The file key in storage (URL encoded)',
  })
  @ApiResponse({
    status: 200,
    description: 'Check completed',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkFileExists(@Param('fileKey') fileKey: string): Promise<{ exists: boolean }> {
    const exists = await this.storageService.fileExists(decodeURIComponent(fileKey));
    return { exists };
  }
}
