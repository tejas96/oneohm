import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiCreate, ApiUpdate, OrganizationContext } from '../../../common/decorators';
import { toDto } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import {
  CreateQuoteConfigurationDto,
  QuoteConfigurationResponseDto,
  UpdateQuoteConfigurationDto,
} from '../dto/quote-configuration';
import { QuoteConfigurationService } from '../services/quote-configuration.service';

@ApiTags('Quote Configuration')
@Controller('quote-configurations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class QuoteConfigurationController {
  constructor(private readonly quoteConfigurationService: QuoteConfigurationService) {}

  @Get('active')
  @ApiResponse({ status: 200, type: QuoteConfigurationResponseDto })
  async getActive(
    @OrganizationContext() organizationId: string,
  ): Promise<QuoteConfigurationResponseDto> {
    const config = await this.quoteConfigurationService.getActive(organizationId);
    return toDto(QuoteConfigurationResponseDto, config);
  }

  @Post()
  @ApiCreate({
    summary: 'Create quote configuration',
    description: 'Create a new quote configuration and deactivate any existing active config',
    responseType: QuoteConfigurationResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() body: CreateQuoteConfigurationDto,
  ): Promise<QuoteConfigurationResponseDto> {
    const config = await this.quoteConfigurationService.create(
      organizationId,
      body,
      currentUser.id,
    );
    return toDto(QuoteConfigurationResponseDto, config);
  }

  @Patch(':id')
  @ApiUpdate({
    summary: 'Update quote configuration',
    description: 'Update an existing quote configuration',
    responseType: QuoteConfigurationResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateQuoteConfigurationDto,
  ): Promise<QuoteConfigurationResponseDto> {
    const config = await this.quoteConfigurationService.update(
      id,
      organizationId,
      body,
      currentUser.id,
    );
    return toDto(QuoteConfigurationResponseDto, config);
  }
}
