import { Global, Module } from '@nestjs/common';

import { ResellerContextService } from './reseller-context.service';
import { ResellerOwnershipService } from './reseller-ownership.service';

@Global()
@Module({
  providers: [ResellerContextService, ResellerOwnershipService],
  exports: [ResellerContextService, ResellerOwnershipService],
})
export class ResellerModule {}
