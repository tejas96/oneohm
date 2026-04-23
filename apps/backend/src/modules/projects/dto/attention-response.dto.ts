import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AttentionKind, AttentionSeverity } from '@oneohm-epc/shared/types';

const ATTENTION_SEVERITIES: AttentionSeverity[] = ['critical', 'warning', 'info'];
const ATTENTION_KINDS: AttentionKind[] = [
  'task_blocked',
  'task_overdue',
  'milestone_late',
  'milestone_due_soon',
  'material_pending',
  'payment_due',
];

export class AttentionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ATTENTION_KINDS })
  kind!: AttentionKind;

  @ApiProperty({ enum: ATTENTION_SEVERITIES })
  severity!: AttentionSeverity;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  subtitle!: string;

  @ApiProperty()
  href!: string;

  @ApiPropertyOptional()
  dueDate?: string;

  @ApiPropertyOptional()
  assigneeName?: string;
}
