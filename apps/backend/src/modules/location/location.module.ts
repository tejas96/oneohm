/**
 * Location Module
 *
 * Google Places API integration for address autocomplete and place details.
 * Used by customer/property forms for address suggestions.
 *
 * @module modules/location
 */

import { Module } from '@nestjs/common';

import { LocationController } from './controllers';
import { LocationService } from './services';

@Module({
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
