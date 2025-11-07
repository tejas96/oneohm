import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtStrategy } from '@oneohm-epc/shared-auth';

import { AuthController, UserController } from './controllers';
import { UserEntity, UserRoleEntity } from './entities';
import { UserRepository, UserRoleRepository } from './repositories';
import { AuthService, UserService } from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserRoleEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
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
  providers: [UserRepository, UserRoleRepository, UserService, AuthService, JwtStrategy],
  exports: [UserService, AuthService, UserRepository],
})
export class UsersModule {}
