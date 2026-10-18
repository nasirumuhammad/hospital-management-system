import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { LOGIN_THROTTLE, REFRESH_COOKIE_NAME, SENSITIVE_THROTTLE } from '../common/constants/auth.constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AuthCookieService } from './auth-cookie.service';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

const FORGOT_PASSWORD_RESPONSE = { message: 'If an account exists for that email, a reset link has been sent.' };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Public()
  @Throttle({ default: LOGIN_THROTTLE })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const { user, tokens } = await this.auth.login(dto);
    this.cookies.attach(response, tokens);
    return { user };
  }

  @Public()
  @Throttle({ default: LOGIN_THROTTLE })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      const { user, tokens } = await this.auth.refresh(request.cookies?.[REFRESH_COOKIE_NAME]);
      this.cookies.attach(response, tokens);
      return { user };
    } catch (error) {
      this.cookies.clear(response);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.logout(request.cookies?.[REFRESH_COOKIE_NAME]);
    this.cookies.clear(response);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser() actor: AuthenticatedUser, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.logoutEverywhere(actor);
    this.cookies.clear(response);
  }

  @Get('me')
  me(@CurrentUser() actor: AuthenticatedUser) {
    return this.auth.getProfile(actor);
  }

  @Patch('password')
  async changePassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, tokens } = await this.auth.changePassword(actor, dto);
    this.cookies.attach(response, tokens);
    return { user };
  }

  @Public()
  @Throttle({ default: SENSITIVE_THROTTLE })
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return FORGOT_PASSWORD_RESPONSE;
  }

  @Public()
  @Throttle({ default: SENSITIVE_THROTTLE })
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.auth.resetPassword(dto);
  }

  @Public()
  @Throttle({ default: SENSITIVE_THROTTLE })
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    return this.auth.verifyEmail(dto.token);
  }

  @Throttle({ default: SENSITIVE_THROTTLE })
  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  async resendVerification(@CurrentUser() actor: AuthenticatedUser) {
    await this.auth.resendVerification(actor);
    return { message: 'If your email is not yet verified, a new link has been sent.' };
  }
}
