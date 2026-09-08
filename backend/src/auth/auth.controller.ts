import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
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
    const frontendBaseUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    try {
      const result = await this.authService.handleGoogleCallback(code, error);
      const frontendUrl = new URL('/account', frontendBaseUrl);
      frontendUrl.searchParams.set('token', result.accessToken);
      return res.redirect(frontendUrl.toString());
    } catch (errorResponse) {
      const message = errorResponse instanceof Error ? errorResponse.message : 'Google authentication failed';
      const frontendUrl = new URL('/login', frontendBaseUrl);
      frontendUrl.searchParams.set('googleError', message);
      return res.redirect(frontendUrl.toString());
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: { id: string } }) {
    return this.authService.getProfile(req.user.id);
  }
}
