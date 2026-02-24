import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-local';

import { SecurityEventService } from '../../security-events/services/security-event.service';
import { UserEntity } from '../../users/entities/user.entity';
import { AuthService } from '../services/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(
    private readonly authService: AuthService,
    private readonly securityEventService: SecurityEventService,
  ) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, email: string, password: string): Promise<UserEntity> {
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      await this.securityEventService.logLoginAttempt({
        identifier: email,
        success: false,
        method: 'password',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }
}
