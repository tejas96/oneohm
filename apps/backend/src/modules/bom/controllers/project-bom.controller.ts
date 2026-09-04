import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { ProjectTeamGuard } from '../../projects/guards';
import { AddBomItemDto, PatchBomItemDto, RemoveBomItemDto } from '../dto/bom-edit.dto';
import { BomChangeResponseDto, BomResponseDto } from '../dto/bom-response.dto';
import { RebaselineBomDto } from '../dto/rebaseline-bom.dto';
import { BomBaselineService, RebaselinePreview } from '../services/bom-baseline.service';
import { BomEditService } from '../services/bom-edit.service';
import { BomReadService } from '../services/bom-read.service';

/**
 * A project's bill of materials, and everything done to it.
 *
 * The BOM is reached through its project because that is the only way it
 * exists: one BOM per project, `bom.project_id` a real foreign key. The route
 * this replaces was `GET /bom?entityType=project&entityId=...`, a polymorphic
 * lookup over a column pair that carried no foreign key in either direction
 * and, since Task 11, is NULL on every BOM written.
 *
 * ProjectTeamGuard on top of JwtAuthGuard: reads are open to anyone with
 * org-wide `projects.view`, writes need admin or actual team membership. That
 * is deliberately the same rule the project's own tabs use — a BOM edit is a
 * project edit.
 *
 * `source` is not exposed on the wire. Everything arriving over HTTP is a site
 * edit and takes the service default; applyRebaseline is the only caller that
 * passes 'office', and it drives the services directly.
 */
@ApiTags('BOM')
@ApiBearerAuth()
@Controller('projects/:projectId/bom')
@UseGuards(JwtAuthGuard, ProjectTeamGuard)
export class ProjectBomController {
  constructor(
    private readonly readService: BomReadService,
    private readonly editService: BomEditService,
    private readonly baselineService: BomBaselineService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "The project's BOM: quoted, current, and the variance between them",
  })
  async getBom(@Param('projectId', ParseUUIDPipe) projectId: string): Promise<BomResponseDto> {
    const bom = await this.readService.getForProject(projectId);
    if (!bom) {
      throw new NotFoundException(`Project ${projectId} has no BOM yet`);
    }
    return bom;
  }

  @Get('changes')
  @ApiOperation({ summary: 'Every change made to this BOM, newest first, each with its reason' })
  async getChanges(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<BomChangeResponseDto[]> {
    return this.readService.getChanges(projectId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a product to the project BOM' })
  async addItem(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: AddBomItemDto,
  ): Promise<{ itemId: string; costImpactPaise: number }> {
    return this.editService.addItem(projectId, dto, currentUser.id);
  }

  /**
   * Change a line's quantity, or swap its product — one route because from the
   * screen they are the same gesture on the same row, and both keep the line's
   * place in the list.
   */
  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Change a BOM line quantity, or replace its product' })
  async patchItem(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: PatchBomItemDto,
  ): Promise<{ costImpactPaise: number } | { newItemId: string; costImpactPaise: number }> {
    // `!= null`, NOT `!== undefined`. @IsOptional() treats null as ABSENT and
    // skips the field's other validators, so {"quantity": null} passes
    // validation with the property still sitting there as null. A presence test
    // that disagreed with the validator called that PRESENT, sent it past the
    // XOR check into changeQuantity, and String(null) reached Postgres as the
    // text "null" — a 500 for a body that is plainly a 400. The validator and
    // this test have to answer "is it there?" the same way.
    const hasQuantity = body.quantity != null;
    const hasReplacement = body.replaceWithProductId != null;

    if (hasQuantity === hasReplacement) {
      throw new BadRequestException(
        'Send either quantity or replaceWithProductId, not both and not neither',
      );
    }

    return hasQuantity
      ? this.editService.changeQuantity(
          projectId,
          itemId,
          { quantity: body.quantity as number, reason: body.reason },
          currentUser.id,
        )
      : this.editService.replaceItem(
          projectId,
          itemId,
          { replaceWithProductId: body.replaceWithProductId as string, reason: body.reason },
          currentUser.id,
        );
  }

  /**
   * Take a line off the BOM.
   *
   * Nothing is deleted: the line is set to quantity 0 so a removed quoted line
   * stays visible against its baseline and stock_allocations.bom_id cannot
   * dangle. DELETE names the intent; the body carries the mandatory reason,
   * which is why callers must send one (axios and fetch both do — a client
   * that strips DELETE bodies will get the same 400 as one that omits the
   * reason, which is the honest answer either way).
   */
  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Take a line off the BOM (kept at quantity 0, never deleted)' })
  async removeItem(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: RemoveBomItemDto,
  ): Promise<{ costImpactPaise: number }> {
    return this.editService.removeItem(projectId, itemId, dto, currentUser.id);
  }

  /**
   * Move the BOM's baseline onto a different quote version.
   *
   * Previews by default and applies only on `apply: true`, because this is the
   * operation that replaced POST :id/sync-bom — which rebuilt the BOM from
   * whatever version happened to be newest, deleted every line the calculation
   * did not name, and so destroyed site additions along with their stock
   * allocations, with no way to see what it would do first.
   */
  @Post('rebaseline')
  // 200, not Nest's default 201 for POST. Neither branch creates a resource: a
  // preview writes nothing at all, and an apply moves quantities on lines that
  // already exist. A 201 would tell a client to look for a Location.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview, or apply, re-baselining the BOM onto a quote version',
    description:
      'Without apply:true nothing is written. Site-added lines are listed under ' +
      'protectedSiteLines and are never touched.',
  })
  async rebaseline(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: RebaselineBomDto,
  ): Promise<RebaselinePreview | { applied: number }> {
    if (!dto.apply) {
      return this.baselineService.previewRebaseline(projectId, dto.quoteVersionId);
    }

    // Mandatory only on the applying branch — a preview writes nothing, so
    // there is no change for a reason to explain. applyRebaseline enforces the
    // same rule; this states it at the edge so the message names the field.
    if (!dto.reason || dto.reason.trim().length < 3) {
      throw new BadRequestException(
        'Give a reason of at least 3 characters to apply a re-baseline',
      );
    }

    return this.baselineService.applyRebaseline(
      projectId,
      dto.quoteVersionId,
      currentUser.id,
      dto.reason,
    );
  }
}
