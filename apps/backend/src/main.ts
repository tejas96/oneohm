import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { ConfigService } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Get ConfigService
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: configService.app.corsOrigin.split(','),
    credentials: true,
  });

  // Set global API prefix (e.g., /api/v1)
  app.setGlobalPrefix('api/v1');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert primitive types automatically
      },
    }),
  );

  // TODO: Add global filters and interceptors
  // app.useGlobalFilters(new HttpExceptionFilter());
  // app.useGlobalInterceptors(new RequestLoggingInterceptor());

  // TODO: Add rate limiting
  // app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

  // TODO: Add helmet for security headers
  // app.use(helmet());

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('OneOhm EPC API')
    .setDescription('OneOhm EPC Management System API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name must match the one used in @ApiBearerAuth()
    )
    .addTag('Organizations', 'Organization management endpoints')
    .addTag('Organization Settings', 'Organization settings management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Persist auth across page reloads
    },
  });

  // Start server
  const port = configService.app.port;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📝 API Documentation: http://localhost:${port}/api-docs`);
  logger.log(`🌍 Environment: ${configService.environment}`);
}

void bootstrap();
