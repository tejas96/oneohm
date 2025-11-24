import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OTP Auth Guard
 * Uses OtpStrategy for phone/email OTP authentication
 *
 * Usage:
 * @UseGuards(OtpAuthGuard)
 * @Post('otp/verify')
 * async verifyOtp(@Request() req) {
 *   // req.user contains validated user from OtpStrategy
 * }
 */
@Injectable()
export class OtpAuthGuard extends AuthGuard('otp') {}
