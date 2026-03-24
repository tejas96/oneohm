import { Module, forwardRef } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type ms from 'ms';

import { AuthController } from './controllers';
import { JwtAuthGuard } from './guards';
import { AuthService, OtpService } from './services';
import { JwtStrategy, LocalStrategy, OtpStrategy } from './strategies';
import { ConfigService } from '../../config/config.service';
import { CustomersModule } from '../customers/customers.module';
import { EmployeesModule } from '../employees/employees.module';
import { IamModule } from '../iam/iam.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ResellersModule } from '../resellers/resellers.module';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { UsersModule } from '../users/users.module';
import { SmsService } from './services/sms.service';

/**
 * Auth Module
 * Handles all authentication logic
 *
 * Features:
 * - Email/Password authentication (LocalStrategy) - For admin/employee users
 * - OTP-based authentication (OtpStrategy) - For customer users
 * - JWT token generation & validation
 * - Refresh tokens with rotation
 * - Session management
 *
 * Uses Passport.js strategies for extensibility
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.jwt.secret;
        if (!secret) {
          throw new Error('JWT_SECRET is not configured');
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.jwt.expiresIn as ms.StringValue,
          },
        };
      },
    }),
    forwardRef(() => UsersModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => ResellersModule),
    forwardRef(() => EmployeesModule),
    forwardRef(() => IamModule),
    SecurityEventsModule,
    IntegrationsModule,
  ],
  controllers: [AuthController],
  providers: [
    // Services
    AuthService,
    OtpService,
    SmsService,

    // Strategies
    JwtStrategy,
    LocalStrategy,
    OtpStrategy,

    // Guards
    JwtAuthGuard,
  ],
  exports: [
    // Services
    AuthService,
    OtpService,
    SmsService,
    // Guards
    JwtAuthGuard,

    // Strategies (for testing)
    JwtStrategy,
  ],
})
export class AuthModule {}
