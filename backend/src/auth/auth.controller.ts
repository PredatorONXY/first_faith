import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';

const normalizeText = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const normalizeEmail = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value;
const normalizeIndianPhone = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const compact = value.trim().replace(/[\s-]/g, '');
  return compact.startsWith('+91') ? compact.slice(3) : compact.startsWith('91') && compact.length === 12 ? compact.slice(2) : compact;
};

class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MaxLength(72)
  password!: string;
}

class RegisterDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: 'Password must include at least one letter and one number' })
  password!: string;

  @IsOptional()
  @Transform(normalizeText)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;
}

class AddressDto {
  @IsOptional() @Transform(normalizeText) @IsString() @MaxLength(50) label?: string;
  @Transform(normalizeText) @IsString() @IsNotEmpty() @MinLength(3) @MaxLength(160) line1!: string;
  @IsOptional() @Transform(normalizeText) @IsString() @MaxLength(160) line2?: string;
  @Transform(normalizeText) @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(80) city!: string;
  @Transform(normalizeText) @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(80) state!: string;
  @Transform(normalizeText) @Matches(/^\d{6}$/, { message: 'PIN code must be a 6-digit Indian PIN' }) postalCode!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value) @Matches(/^IN$/, { message: 'Country must be IN' }) country!: string;
  @IsOptional() @Transform(normalizeIndianPhone) @Matches(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' }) phone?: string;
  @IsOptional() isDefault?: boolean;
}

class UpdateAddressDto {
  @IsOptional() @Transform(normalizeText) @IsString() @MaxLength(50) label?: string;
  @IsOptional() @Transform(normalizeText) @IsString() @MinLength(3) @MaxLength(160) line1?: string;
  @IsOptional() @Transform(normalizeText) @IsString() @MaxLength(160) line2?: string;
  @IsOptional() @Transform(normalizeText) @IsString() @MinLength(2) @MaxLength(80) city?: string;
  @IsOptional() @Transform(normalizeText) @IsString() @MinLength(2) @MaxLength(80) state?: string;
  @IsOptional() @Transform(normalizeText) @Matches(/^\d{6}$/, { message: 'PIN code must be a 6-digit Indian PIN' }) postalCode?: string;
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value) @Matches(/^IN$/, { message: 'Country must be IN' }) country?: string;
  @IsOptional() @Transform(normalizeIndianPhone) @Matches(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' }) phone?: string;
  @IsOptional() isDefault?: boolean;
}

class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

class ResendVerificationDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

class UpdateProfileDto {
  @IsOptional()
  @Transform(normalizeText)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @Transform(normalizeIndianPhone)
  @Matches(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' })
  phone?: string;
}

import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    if ((req.body as any)?.role !== undefined) {
      throw new BadRequestException('Role cannot be specified during registration');
    }
    return this.authService.register(dto.email, dto.password, dto.fullName);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('login')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('admin/login')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  adminLogin(@Body() dto: LoginDto) {
    return this.authService.adminLogin(dto.email, dto.password);
  }

  @Get('google')
  google(@Req() req: Request, @Res() res: Response) {
    return res.redirect(this.authService.getGoogleAuthUrl(req));
  }

  @Get('google/callback')
  async googleCallback(
    @Req() req: Request,
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const frontendBaseUrl = this.config.get<string>('FRONTEND_URL');

    try {
      const result = await this.authService.handleGoogleCallback(req, code, error);
      if (frontendBaseUrl) {
        const frontendUrl = new URL('/account', frontendBaseUrl);
        frontendUrl.hash = `token=${encodeURIComponent(result.accessToken)}`;
        return res.redirect(frontendUrl.toString());
      }
      return res.redirect(`/account#token=${encodeURIComponent(result.accessToken)}`);
    } catch (errorResponse) {
      const message = errorResponse instanceof Error ? errorResponse.message : 'Google authentication failed';
      if (frontendBaseUrl) {
        const frontendUrl = new URL('/login', frontendBaseUrl);
        frontendUrl.searchParams.set('googleError', message);
        return res.redirect(frontendUrl.toString());
      }
      return res.redirect(`/login?googleError=${encodeURIComponent(message)}`);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: { id: string } }) {
    return this.authService.getProfile(req.user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Req() req: Request & { user: { id: string } }, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Get('addresses')
  @UseGuards(JwtAuthGuard)
  addresses(@Req() req: Request & { user: { id: string } }) {
    return this.authService.getAddresses(req.user.id);
  }

  @Post('addresses')
  @UseGuards(JwtAuthGuard)
  createAddress(@Req() req: Request & { user: { id: string } }, @Body() dto: AddressDto) {
    return this.authService.createAddress(req.user.id, dto);
  }

  @Patch('addresses/:id')
  @UseGuards(JwtAuthGuard)
  updateAddress(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.authService.updateAddress(req.user.id, id, dto);
  }

  @Patch('addresses/:id/default')
  @UseGuards(JwtAuthGuard)
  setDefaultAddress(@Req() req: Request & { user: { id: string } }, @Param('id') id: string) {
    return this.authService.setDefaultAddress(req.user.id, id);
  }

  @Delete('addresses/:id')
  @UseGuards(JwtAuthGuard)
  removeAddress(@Req() req: Request & { user: { id: string } }, @Param('id') id: string) {
    return this.authService.removeAddress(req.user.id, id);
  }
}
