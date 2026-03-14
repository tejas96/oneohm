/**
 * Location Controller
 *
 * REST endpoints for Google Places autocomplete and place details.
 *
 * @module modules/location/controllers
 */

import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards';
import type { PlaceDetails, PlaceSuggestion } from '../services/location.service';
import { LocationService } from '../services/location.service';

@ApiTags('Location')
@ApiBearerAuth()
@Controller('location')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('autocomplete')
  @ApiOperation({ summary: 'Google Places address autocomplete suggestions' })
  @ApiQuery({
    name: 'input',
    description: 'Partial address text (min 3 chars)',
    example: 'MG Road Pune',
  })
  @ApiResponse({ status: 200, description: 'List of address suggestions' })
  async autocomplete(@Query('input') input: string): Promise<PlaceSuggestion[]> {
    if (!input || input.trim().length < 3) {
      throw new BadRequestException('input must be at least 3 characters');
    }
    return this.locationService.autocomplete(input.trim());
  }

  @Get('details')
  @ApiOperation({
    summary: 'Fetch address components for a Google Places placeId',
  })
  @ApiQuery({
    name: 'placeId',
    description: 'Google Places placeId',
    example: 'ChIJxxx',
  })
  @ApiResponse({ status: 200, description: 'Parsed address components + lat/lng' })
  async details(@Query('placeId') placeId: string): Promise<PlaceDetails> {
    if (!placeId?.trim()) {
      throw new BadRequestException('placeId is required');
    }
    return this.locationService.details(placeId.trim());
  }
}
