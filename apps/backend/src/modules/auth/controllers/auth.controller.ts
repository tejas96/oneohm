import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { UserResponseDto } from '../../users/dto/user-response.dto';
import { UserService } from '../../users/services/user.service';
import { CurrentUser, Public } from '../decorators';
import { LoginDto, LoginResponseDto } from '../dto/login.dto';
import { RequestOtpDto, VerifyOtpDto, OtpResponseDto } from '../dto/otp.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from '../dto/refresh-token.dto';
import { JwtAuthGuard, LocalAuthGuard, OtpAuthGuard } from '../guards';
import { AuthService } from '../services/auth.service';
import { OtpService } from '../services/otp.service';
import type { CurrentUserType } from '../types';

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
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login with email/password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Request() req: any): Promise<LoginResponseDto> {
    // User is already validated by LocalStrategy
    // Available in req.user
    return this.authService.generateTokensForUser(req.user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  logout(@CurrentUser() user: CurrentUserType): void {
    this.authService.logout(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() user: CurrentUserType): Promise<UserResponseDto> {
    const fullUser = await this.userService.findById(user.id);
    return plainToInstance(UserResponseDto, fullUser, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Request OTP for phone or email
   * Creates user account if doesn't exist (Firebase-like behavior)
   */
  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request OTP',
    description: 'Request OTP for phone or email. Creates user if doesnt exist.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: OtpResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request or rate limit exceeded' })
  async requestOtp(@Body() dto: RequestOtpDto): Promise<OtpResponseDto> {
    return this.otpService.requestOtp(dto);
  }

  /**
   * Verify OTP and login
   * Uses OtpStrategy (Passport)
   */
  @Public()
  @UseGuards(OtpAuthGuard)
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and login',
    description: 'Verify OTP and return JWT tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified, login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  @ApiResponse({ status: 401, description: 'OTP expired or incorrect' })
  async verifyOtp(@Body() dto: VerifyOtpDto, @Request() req: any): Promise<LoginResponseDto> {
    // User is already validated by OtpStrategy
    // Available in req.user
    return this.authService.generateTokensForUser(req.user);
  }
}
