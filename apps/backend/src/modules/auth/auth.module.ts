import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './controllers';
import { JwtAuthGuard } from './guards';
import { AuthService, OtpService } from './services';
import { JwtStrategy, LocalStrategy, OtpStrategy } from './strategies';
import { IamModule } from '../iam/iam.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { UsersModule } from '../users/users.module';

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
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not configured');
        }
        return {
          secret,
          signOptions: {
            expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '15m') as any,
          },
        };
      },
    }),
    forwardRef(() => UsersModule),
    forwardRef(() => IamModule),
    SecurityEventsModule,
    IntegrationsModule,
  ],
  controllers: [AuthController],
  providers: [
    // Services
    AuthService,
    OtpService,

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

    // Guards
    JwtAuthGuard,

    // Strategies (for testing)
    JwtStrategy,
  ],
})
export class AuthModule {}
