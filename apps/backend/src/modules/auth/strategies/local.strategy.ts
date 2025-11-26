import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { UserEntity } from '../../users/entities/user.entity';
import { AuthService } from '../services/auth.service';

/**
 * Local Strategy (Email/Password Authentication)
 * Uses Passport's passport-local strategy
 *
 * Validates user credentials (email + password)
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email', // Use 'email' instead of default 'username'
      passwordField: 'password',
    });
  }

  /**
   * Validate user credentials
   * Called automatically by Passport
   *
   * @param email - User email
   * @param password - User password
   * @returns User object if valid, throws UnauthorizedException if invalid
   */
  async validate(email: string, password: string): Promise<UserEntity> {
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user; // Attached to request.user
  }
}
