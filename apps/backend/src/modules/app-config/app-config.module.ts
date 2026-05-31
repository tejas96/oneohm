import { Module } from '@nestjs/common';

import { ConfigModule } from '../../config';
import { AppConfigController } from './controllers/app-config.controller';
import { AppConfigService } from './services/app-config.service';

@Module({
  imports: [ConfigModule],
  controllers: [AppConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
