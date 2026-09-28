import { Module } from '@nestjs/common';

import { CommissionBirthService } from './services/commission-birth.service';

/** Deliberately import-free; see CommissionBirthService. */
@Module({
  providers: [CommissionBirthService],
  exports: [CommissionBirthService],
})
export class CommissionBirthModule {}
