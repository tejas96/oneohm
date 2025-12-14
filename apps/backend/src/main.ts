import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { ConfigService } from './config';

async function bootstrap(): Promise<void> {
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
    .setDescription(
      'OneOhm EPC Management System API Documentation\n\n' +
        '## Authentication\n' +
        '1. Use `/auth/login` with email/password OR `/auth/otp/request` + `/auth/otp/verify` for OTP login\n' +
        '2. Copy the `accessToken` from response\n' +
        '3. Click "Authorize" button and paste the token\n\n' +
        '## Test Credentials\n' +
        '- Email: `admin@oneohm.com`\n' +
        '- Password: `Admin@123`\n' +
        '- OTP (dev mode): `123456`',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'bearer', // Must match @ApiBearerAuth() default
    )
    .addTag('Authentication', 'Login, OTP, token refresh endpoints')
    .addTag('Users', 'User management and profile creation')
    .addTag('Organizations', 'Organization management endpoints')
    .addTag('Organization Settings', 'Organization settings management')
    .addTag('Customers', 'Customer profile management')
    .addTag('Customer Properties', 'Customer property/installation site management')
    .addTag('Employees', 'Employee profile management')
    .addTag('Resellers', 'Reseller profile management')
    .addTag('IAM - Roles', 'Role-based access control')
    .addTag('IAM - Permissions', 'Permission management')
    .addTag('IAM - Features', 'Feature flag management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Persist auth across page reloads
    },
  });

  // Start server
  const port = configService.app.port;
  const baseUrl = configService.app.baseUrl;
  await app.listen(port);

  logger.log(`🚀 Application is running on: ${baseUrl}`);
  logger.log(`📝 API Documentation: ${baseUrl}/api-docs`);
  logger.log(`🌍 Environment: ${configService.environment}`);
}

void bootstrap();

