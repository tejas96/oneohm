import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { ProjectChatMessageEntity } from '../entities/project-chat-message.entity';

/**
 * ProjectChatRepository
 * Data access layer for project chat messages
 */
@Injectable()
export class ProjectChatRepository {
  constructor(
    @InjectRepository(ProjectChatMessageEntity)
    public readonly repository: Repository<ProjectChatMessageEntity>,
  ) {}

  /**
   * Create a new message in the chat
   */
  async create(data: Partial<ProjectChatMessageEntity>): Promise<ProjectChatMessageEntity> {
    const message = this.repository.create(data);
    const saved = await this.repository.save(message);
    // Reload to populate relationships (e.g. sender info)
    return this.findById(saved.id) as Promise<ProjectChatMessageEntity>;
  }

  /**
   * Find a chat message by ID
   */
  async findById(id: string): Promise<ProjectChatMessageEntity | null> {
    const message = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['sender'],
    });

    if (message?.sender) {
      const roleRows: Array<{
        role_code: string | null;
        legacy_role: string | null;
      }> = await this.repository.manager
        .createQueryBuilder()
        .select('r.code', 'role_code')
        .addSelect('ur.role', 'legacy_role')
        .from('user_roles', 'ur')
        .leftJoin('roles', 'r', 'r.id = ur.role_id AND r.deleted_at IS NULL')
        .where('ur.user_id = :userId', { userId: message.senderId })
        .getRawMany();

      message.sender.roles = roleRows
        .map((row) => row.role_code ?? row.legacy_role)
        .filter((r): r is string => r != null);
    }

    return message;
  }

  /**
   * Find all messages for a specific project
   */
  async findByProject(projectId: string): Promise<ProjectChatMessageEntity[]> {
    const messages = await this.repository.find({
      where: { projectId, deletedAt: IsNull() },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    if (messages.length > 0) {
      const userIds = Array.from(new Set(messages.map((m) => m.senderId).filter(Boolean)));
      if (userIds.length > 0) {
        const roleRows: Array<{
          user_id: string;
          role_code: string | null;
          legacy_role: string | null;
        }> = await this.repository.manager
          .createQueryBuilder()
          .select('ur.user_id', 'user_id')
          .addSelect('r.code', 'role_code')
          .addSelect('ur.role', 'legacy_role')
          .from('user_roles', 'ur')
          .leftJoin('roles', 'r', 'r.id = ur.role_id AND r.deleted_at IS NULL')
          .where('ur.user_id IN (:...userIds)', { userIds })
          .getRawMany();

        const roleMap = new Map<string, string[]>();
        for (const row of roleRows) {
          const code = row.role_code ?? row.legacy_role;
          if (code) {
            const arr = roleMap.get(row.user_id) ?? [];
            arr.push(code);
            roleMap.set(row.user_id, arr);
          }
        }

        for (const msg of messages) {
          if (msg.sender) {
            msg.sender.roles = roleMap.get(msg.senderId) ?? [];
          }
        }
      }
    }

    return messages;
  }
}
