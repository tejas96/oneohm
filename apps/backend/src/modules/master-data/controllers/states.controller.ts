import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { StatesService } from '../services/states.service';
import { GetStatesResponseDto } from '../dto/states.dto';

/**
 * States Controller
 * Public endpoints for retrieving Indian states
 * No authentication required (reference data)
 *
 * @controller
 */
@ApiTags('Master Data - States')
@Controller('states')
export class StatesController {
  constructor(private readonly statesService: StatesService) {}

  /**
   * Get all Indian states
   * Public endpoint - no auth required (reference data)
   * Route: GET /api/v1/states
   *
   * @returns Array of all Indian states sorted alphabetically
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all Indian states',
    description: 'Retrieve list of all 28 Indian states and union territories for address forms',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved states',
    type: GetStatesResponseDto,
  })
  getAllStates(): GetStatesResponseDto {
    const states = this.statesService.getAllStates();
    return {
      success: true,
      data: states,
      count: states.length,
    };
  }
}
