import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';

class CredentialsDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}

class AddressDto {
  @IsOptional() @IsString() label?: string;
  @IsString() @IsNotEmpty() @MinLength(2) line1!: string;
  @IsOptional() @IsString() line2?: string;
  @IsString() @IsNotEmpty() @MinLength(2) city!: string;
  @IsString() @IsNotEmpty() @MinLength(2) state!: string;
  @IsString() @IsNotEmpty() @MinLength(3) postalCode!: string;
  @IsString() @IsNotEmpty() @MinLength(2) country!: string;
  @IsOptional() @IsString() phone?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: CredentialsDto) {
    return this.authService.register(dto.email, dto.password, dto.fullName);
  }

  @Post('login')
  login(@Body() dto: CredentialsDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('google')
  google(@Res() res: Response) {
    return res.redirect(this.authService.getGoogleAuthUrl());
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string | undefined, @Query('error') error: string | undefined, @Res() res: Response) {
    const frontendBaseUrl = this.config.get<string>('FRONTEND_URL');

    try {
      const result = await this.authService.handleGoogleCallback(code, error);
      if (frontendBaseUrl) {
        const frontendUrl = new URL('/account', frontendBaseUrl);
        frontendUrl.searchParams.set('token', result.accessToken);
        return res.redirect(frontendUrl.toString());
      }
      return res.redirect(`/account?token=${encodeURIComponent(result.accessToken)}`);
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

  @Delete('addresses/:id')
  @UseGuards(JwtAuthGuard)
  removeAddress(@Req() req: Request & { user: { id: string } }, @Param('id') id: string) {
    return this.authService.removeAddress(req.user.id, id);
  }
}
