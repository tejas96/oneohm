import {
  Body,
  Controller,
  HttpStatus,
  Req,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SecurityEventType } from '@oneohm-epc/shared-types';
import { ApiCreate, ApiGet, SecurityRateLimit } from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';
import { Request as ExpressRequest } from 'express';

import { SecurityRateLimitGuard } from '../../security-events/guards';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { UserService } from '../../users/services/user.service';
import { CurrentUser, Public } from '../decorators';
import {
  LoginDto,
  LoginResponseDto,
  RequestOtpDto,
  VerifyOtpDto,
  OtpRequestResponseDto,
} from '../dto/login.dto';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  PasswordResetResponseDto,
} from '../dto/password-reset.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from '../dto/refresh-token.dto';
import { JwtAuthGuard, LocalAuthGuard, OtpAuthGuard } from '../guards';
import { AuthService } from '../services/auth.service';
import { OtpService } from '../services/otp.service';
import type { CurrentUserType, LocalAuthRequest, OtpAuthRequest } from '../types';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Login with email/password
   * Uses LocalStrategy (Passport)
   * Recommended for admin and employee users
   */
  @Public()
  @UseGuards(SecurityRateLimitGuard, LocalAuthGuard)
  @SecurityRateLimit({
    eventType: SecurityEventType.LOGIN_FAILED,
    trackBy: ['ipAddress'],
    limits: [
      { count: 5, windowSeconds: 300, message: 'Too many login attempts. Wait 5 minutes before trying again.' },
      { count: 20, windowSeconds: 86400, message: 'Daily login attempt limit reached.' },
    ],
    blockOnExceed: true,
    blockDurationSeconds: 300,
  })
  @ApiCreate({
    path: 'login',
    summary: 'User login with email/password',
    description: 'Uses LocalStrategy (Passport). Recommended for admin and employee users. Rate limited: 5 per 5 min.',
    responseType: LoginResponseDto,
    statusCode: HttpStatus.OK,
    successMessage: 'Login successful',
    additionalErrors: [
      { status: HttpStatus.UNAUTHORIZED, description: 'Invalid credentials' },
      { status: HttpStatus.TOO_MANY_REQUESTS, description: 'Too many login attempts' },
    ],
  })
  async login(
    @Body() _loginDto: LoginDto,
    @Request() req: LocalAuthRequest,
  ): Promise<LoginResponseDto> {
    // User is already validated by LocalStrategy (guard ensures req.user exists)
    // LocalAuthRequest types req.user as UserEntity
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return this.authService.generateTokensForUser(req.user);
  }

  @Public()
  @ApiCreate({
    path: 'refresh',
    summary: 'Refresh access token',
    responseType: RefreshTokenResponseDto,
    statusCode: HttpStatus.OK,
    successMessage: 'Token refreshed successfully',
    additionalErrors: [{ status: HttpStatus.UNAUTHORIZED, description: 'Invalid refresh token' }],
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreate({
    path: 'logout',
    summary: 'User logout',
    responseType: LoginResponseDto,
    statusCode: HttpStatus.NO_CONTENT,
    successMessage: 'Logout successful',
  })
  logout(@CurrentUser() user: CurrentUserType): void {
    this.authService.logout(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiGet({
    path: 'me',
    summary: 'Get current user profile',
    responseType: UserResponseDto,
  })
  async getCurrentUser(@CurrentUser() user: CurrentUserType): Promise<UserResponseDto> {
    const fullUser = await this.userService.findById(user.id);
    return plainToInstance(UserResponseDto, fullUser, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Request OTP for phone or email
   * Creates user account if doesn't exist (Firebase-like behavior)
   * Rate Limited: 1 per minute, 5 per day per phone/IP
   */
  @Public()
  @UseGuards(SecurityRateLimitGuard)
  @SecurityRateLimit({
    eventType: SecurityEventType.OTP_SENT,
    trackBy: ['phone', 'ipAddress'],
    limits: [
      {
        count: 1,
        windowSeconds: 60,
        message: 'Please wait 60 seconds before requesting another OTP',
      },
      {
        count: process.env.NODE_ENV === 'development' ? 50 : 5,
        windowSeconds: 86400,
        message: 'Maximum 5 OTP requests per day. Try again after 24 hours',
      },
    ],
    blockOnExceed: true,
    blockDurationSeconds: 86400,
  })
  @ApiCreate({
    path: 'otp/request',
    summary: 'Request OTP',
    description:
      'Request OTP for phone or email. Creates user if doesnt exist. Rate limited: 1/min, 5/day',
    responseType: OtpRequestResponseDto,
    statusCode: HttpStatus.OK,
    successMessage: 'OTP sent successfully',
    additionalErrors: [
      { status: HttpStatus.BAD_REQUEST, description: 'Invalid request or rate limit exceeded' },
      { status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' },
    ],
  })
  async requestOtp(
    @Body() dto: RequestOtpDto,
    @Req() req: ExpressRequest,
  ): Promise<OtpRequestResponseDto> {
    return this.otpService.requestOtp(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Verify OTP and login
   * Uses OtpStrategy (Passport)
   * Rate Limited: 5 attempts per 5 minutes per phone/IP
   */
  @Public()
  @UseGuards(SecurityRateLimitGuard, OtpAuthGuard)
  @SecurityRateLimit({
    eventType: SecurityEventType.OTP_VERIFY_ATTEMPT,
    trackBy: ['phone', 'ipAddress'],
    limits: [
      {
        count: 5,
        windowSeconds: 300,
        message: 'Too many failed attempts. Wait 5 minutes before trying again',
      },
    ],
    blockOnExceed: true,
    blockDurationSeconds: 300,
  })
  @ApiCreate({
    path: 'otp/verify',
    summary: 'Verify OTP and login',
    description: 'Verify OTP and return JWT tokens. Rate limited: 5 attempts per 5 minutes',
    responseType: LoginResponseDto,
    statusCode: HttpStatus.OK,
    successMessage: 'OTP verified, login successful',
    additionalErrors: [
      { status: HttpStatus.BAD_REQUEST, description: 'Invalid OTP' },
      { status: HttpStatus.UNAUTHORIZED, description: 'OTP expired or incorrect' },
      { status: HttpStatus.TOO_MANY_REQUESTS, description: 'Too many verification attempts' },
    ],
  })
  async verifyOtp(
    @Body() _dto: VerifyOtpDto,
    @Request() req: OtpAuthRequest,
  ): Promise<LoginResponseDto> {
    // User is already validated by OtpStrategy (guard ensures req.user exists)
    // OtpAuthRequest types req.user as UserEntity
    return this.authService.generateTokensForUser(req.user);
  }

  /**
   * Request password reset
   * Sends reset link to email (email sending is TODO)
   * Always returns success for security
   */
  @Public()
  @UseGuards(SecurityRateLimitGuard)
  @SecurityRateLimit({
    eventType: SecurityEventType.PASSWORD_RESET_REQUESTED,
    trackBy: ['ipAddress'],
    limits: [
      { count: 3, windowSeconds: 900, message: 'Too many password reset requests. Try again in 15 minutes.' },
      { count: 10, windowSeconds: 86400, message: 'Daily password reset limit reached.' },
    ],
  })
  @ApiCreate({
    path: 'forgot-password',
    summary: 'Request password reset',
    description:
      'Request a password reset link. Always returns success for security reasons (does not reveal if email exists).',
    responseType: PasswordResetResponseDto,
    statusCode: HttpStatus.OK,
    successMessage: 'Password reset email sent',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: ExpressRequest,
  ): Promise<PasswordResetResponseDto> {
    return this.authService.forgotPassword(dto.email, req.ip, req.headers['user-agent']);
  }

  /**
   * Reset password with token
   * Validates token and updates password
   */
  @Public()
  @UseGuards(SecurityRateLimitGuard)
  @SecurityRateLimit({
    eventType: SecurityEventType.PASSWORD_RESET_REQUESTED,
    trackBy: ['ipAddress'],
    limits: [
      { count: 5, windowSeconds: 900, message: 'Too many reset attempts. Try again in 15 minutes.' },
    ],
    blockOnExceed: true,
    blockDurationSeconds: 900,
  })
  @ApiCreate({
    path: 'reset-password',
    summary: 'Reset password with token',
    description: 'Reset password using the token received via email. Rate limited: 5 per 15 min.',
    responseType: PasswordResetResponseDto,
    statusCode: HttpStatus.OK,
    successMessage: 'Password reset successfully',
    additionalErrors: [
      { status: HttpStatus.BAD_REQUEST, description: 'Invalid or expired reset token' },
      { status: HttpStatus.TOO_MANY_REQUESTS, description: 'Too many reset attempts' },
    ],
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: ExpressRequest,
  ): Promise<PasswordResetResponseDto> {
    return this.authService.resetPassword(dto.token, dto.newPassword, req.ip, req.headers['user-agent']);
  }
}
