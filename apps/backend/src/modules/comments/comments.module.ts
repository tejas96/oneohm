// ============================================
// IMPORTS
// ============================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommentController } from './controllers';
import { CommentEntity } from './entities';
import { CommentRepository } from './repositories';
import { CommentService } from './services';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';

/**
 * Comments Module
 * Universal commenting system with polymorphic references
 * Supports threading, mentions, attachments, and edit tracking
 */
@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity]), OrganizationsModule, UsersModule],
  controllers: [CommentController],
  providers: [CommentRepository, CommentService],
  exports: [CommentRepository, CommentService],
})
export class CommentsModule {}

