// ============================================
// IMPORTS
// ============================================
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CommentEntityType } from '@oneohm-epc/shared-types';
import {
  CurrentUser,
  type CurrentUserType,
  JwtAuthGuard,
  Role,
  Roles,
  RolesGuard,
} from '@oneohm-epc/shared-auth';
import { plainToInstance } from 'class-transformer';

import { CommentResponseDto, CreateCommentDto, UpdateCommentDto } from '../dto';
import { CommentService } from '../services/comment.service';

/**
 * Comment Controller
 * REST API endpoints for universal commenting system
 */
@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // ============================================
  // CREATE
  // ============================================
  @Post()
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiResponse({ status: 201, description: 'Comment created successfully', type: CommentResponseDto })
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.EXECUTION_ENGINEER,
    Role.DESIGN_ENGINEER,
    Role.ACCOUNTS,
    Role.FIELD_WORKER,
  )
  async create(
    @Body() dto: CreateCommentDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CommentResponseDto> {
    const comment = await this.commentService.create(dto, currentUser.id);
    return plainToInstance(CommentResponseDto, comment, { excludeExtraneousValues: true });
  }

  // ============================================
  // READ
  // ============================================
  @Get()
  @ApiOperation({ summary: 'Get all comments (filtered)' })
  @ApiQuery({ name: 'entityType', enum: CommentEntityType, required: false })
  @ApiQuery({ name: 'entityId', type: String, required: false })
  @ApiQuery({ name: 'userId', type: String, required: false })
  @ApiQuery({ name: 'includeReplies', type: Boolean, required: false })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully', type: [CommentResponseDto] })
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.EXECUTION_ENGINEER,
    Role.DESIGN_ENGINEER,
    Role.ACCOUNTS,
    Role.FIELD_WORKER,
  )
  async findAll(
    @Query('entityType') entityType?: CommentEntityType,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('includeReplies') includeReplies?: boolean,
  ): Promise<CommentResponseDto[]> {
    let comments;

    if (entityType && entityId) {
      comments = await this.commentService.findByEntity(entityType, entityId, includeReplies ?? true);
    } else if (userId) {
      comments = await this.commentService.findByUser(userId);
    } else {
      comments = await this.commentService.findAll();
    }

    return plainToInstance(CommentResponseDto, comments, { excludeExtraneousValues: true });
  }

  @Get('mentions')
  @ApiOperation({ summary: 'Get comments where current user is mentioned' })
  @ApiResponse({ status: 200, description: 'Mentions retrieved successfully', type: [CommentResponseDto] })
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.EXECUTION_ENGINEER,
    Role.DESIGN_ENGINEER,
    Role.ACCOUNTS,
    Role.FIELD_WORKER,
  )
  async getMentions(@CurrentUser() currentUser: CurrentUserType): Promise<CommentResponseDto[]> {
    const comments = await this.commentService.findMentions(currentUser.id);
    return plainToInstance(CommentResponseDto, comments, { excludeExtraneousValues: true });
  }

  @Get('mentions/count')
  @ApiOperation({ summary: 'Get count of unread mentions' })
  @ApiResponse({ status: 200, description: 'Mentions count retrieved successfully' })
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.EXECUTION_ENGINEER,
    Role.DESIGN_ENGINEER,
    Role.ACCOUNTS,
    Role.FIELD_WORKER,
  )
  async getMentionsCount(@CurrentUser() currentUser: CurrentUserType): Promise<{ count: number }> {
    const count = await this.commentService.getUnreadMentionsCount(currentUser.id);
    return { count };
  }

  @Get('entity/:entityType/:entityId/tree')
  @ApiOperation({ summary: 'Get threaded comment tree for entity' })
  @ApiParam({ name: 'entityType', enum: CommentEntityType })
  @ApiParam({ name: 'entityId', type: String })
  @ApiResponse({ status: 200, description: 'Comment tree retrieved successfully', type: [CommentResponseDto] })
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.EXECUTION_ENGINEER,
    Role.DESIGN_ENGINEER,
    Role.ACCOUNTS,
    Role.FIELD_WORKER,
  )
  async getCommentTree(
    @Param('entityType') entityType: CommentEntityType,
    @Param('entityId') entityId: string,
  ): Promise<CommentResponseDto[]> {
    const tree = await this.commentService.buildCommentTree(entityType, entityId);
    return plainToInstance(CommentResponseDto, tree, { excludeExtraneousValues: true });
  }

  @Get('entity/:entityType/:entityId/stats')
  @ApiOperation({ summary: 'Get comment statistics for entity' })
  @ApiParam({ name: 'entityType', enum: CommentEntityType })
  @ApiParam({ name: 'entityId', type: String })
  @ApiResponse({ status: 200, description: 'Comment stats retrieved successfully' })
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.EXECUTION_ENGINEER,
    Role.DESIGN_ENGINEER,
    Role.ACCOUNTS,
    Role.FIELD_WORKER,
  )
  async getStats(
    @Param('entityType') entityType: CommentEntityType,
    @Param('entityId') entityId: string,
  ): Promise<{ totalComments: number; topLevelComments: number; replies: number }> {
    return this.commentService.getCommentStats(entityType, entityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by ID' })
  @ApiResponse({ status: 200, description: 'Comment retrieved successfully', type: CommentResponseDto })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.EXECUTION_ENGINEER,
    Role.DESIGN_ENGINEER,
    Role.ACCOUNTS,
    Role.FIELD_WORKER,
  )
  async findById(@Param('id') id: string): Promise<CommentResponseDto> {
    const comment = await this.commentService.findById(id);
    return plainToInstance(CommentResponseDto, comment, { excludeExtraneousValues: true });
  }

  @Get(':id/replies')
  @ApiOperation({ summary: 'Get replies for a comment' })
  @ApiResponse({ status: 200, description: 'Replies retrieved successfully', type: [CommentResponseDto] })
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.EXECUTION_ENGINEER,
    Role.DESIGN_ENGINEER,
    Role.ACCOUNTS,
    Role.FIELD_WORKER,
  )
  async getReplies(@Param('id') id: string): Promise<CommentResponseDto[]> {
    const replies = await this.commentService.findReplies(id);
    return plainToInstance(CommentResponseDto, replies, { excludeExtraneousValues: true });
  }

  // ============================================
  // UPDATE
  // ============================================
  @Patch(':id')
  @ApiOperation({ summary: 'Update comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully', type: CommentResponseDto })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.EXECUTION_ENGINEER,
    Role.DESIGN_ENGINEER,
    Role.ACCOUNTS,
    Role.FIELD_WORKER,
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CommentResponseDto> {
    const comment = await this.commentService.update(id, dto, currentUser.id);
    return plainToInstance(CommentResponseDto, comment, { excludeExtraneousValues: true });
  }

  // ============================================
  // DELETE
  // ============================================
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete comment (soft delete)' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SALES,
    Role.EXECUTION_ENGINEER,
    Role.DESIGN_ENGINEER,
    Role.ACCOUNTS,
    Role.FIELD_WORKER,
  )
  async delete(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserType): Promise<void> {
    await this.commentService.delete(id, currentUser.id);
  }
}

