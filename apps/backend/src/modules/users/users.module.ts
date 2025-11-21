import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from '@oneohm-epc/shared-auth';

import { AuthController, UserController } from './controllers';
import { UserEntity, UserRoleEntity, EmployeeProfileEntity } from './entities';
import { UserRepository, UserRoleRepository, EmployeeProfileRepository } from './repositories';
import { AuthService, UserService, ProfileService } from './services';
import { CustomersModule } from '../customers/customers.module';
import { IamModule } from '../iam/iam.module';
import { ResellersModule } from '../resellers/resellers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserRoleEntity, EmployeeProfileEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    forwardRef(() => IamModule), // ← Use forwardRef to break circular dependency
    forwardRef(() => CustomersModule), // ← ProfileService needs CustomerProfileRepository
    forwardRef(() => ResellersModule), // ← ProfileService needs ResellerProfileRepository
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not configured');
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get('JWT_EXPIRES_IN') || '15m',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, UserController],
  providers: [
    UserRepository,
    UserRoleRepository,
    EmployeeProfileRepository,
    UserService,
    AuthService,
    ProfileService,
    JwtStrategy,
  ],
  exports: [
    UserService,
    AuthService,
    ProfileService,
    UserRepository,
    UserRoleRepository,
    EmployeeProfileRepository,
  ],
})
export class UsersModule {}
