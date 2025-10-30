import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { ConfigService } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get ConfigService
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: configService.app.corsOrigin.split(','),
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix(configService.app.apiPrefix);

  // Start server
  const port = configService.app.port;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📝 API Documentation: http://localhost:${port}/api`);
  console.log(`🌍 Environment: ${configService.environment}`);
}

void bootstrap();
